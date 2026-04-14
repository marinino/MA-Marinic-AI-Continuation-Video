import type { Project } from "@ma/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getParamTransitionPairs } from "./transitionPairs";
import { getVideoPathForClip } from "../utils/clipVideoPath";
import { extractBoundaryFrames } from "../utils/ffmpeg";
import { runPythonJson } from "../utils/python";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TransitionEvaluation = {
  parentClipId: string;
  childClipId: string;
  paramsNodeId: string;
  frameCount: number;

  appearanceScore: number;
  motionScore: number;
  boundaryJumpScore: number;

  overallScore: number;
  label: "smooth" | "moderate" | "rough";

  details: {
    pairwiseSsimMean: number;
    boundarySsim: number;

    parentMotionDx: number;
    parentMotionDy: number;
    parentMotionMagnitude: number;

    childMotionDx: number;
    childMotionDy: number;
    childMotionMagnitude: number;

    motionDxDelta: number;
    motionDyDelta: number;
    motionMagnitudeDelta: number;
  };
};

type PythonTransitionMetrics = Omit<
  TransitionEvaluation,
  "parentClipId" | "childClipId" | "paramsNodeId" | "frameCount"
>;

export type TransitionEvaluationDebug = {
  pairCount: number;
  pairs: Array<{
    parentClipId: string;
    paramsNodeId: string;
    childClipId: string;
  }>;
  resolvedVideoPaths: Array<{
    childClipId: string;
    parentVideoPath: string | null;
    childVideoPath: string | null;
  }>;
  skipped: Array<{
    childClipId: string;
    reason: string;
    details?: any;
  }>;
};

export async function evaluateProjectTransitions(
  project: Project,
  opts: { frameCount: number }
): Promise<{
  evaluations: Record<string, TransitionEvaluation>;
  debug: TransitionEvaluationDebug;
}> {
  const frameCount = Math.max(2, opts.frameCount || 5);
  const pairs = getParamTransitionPairs(project);

  const evaluations: Record<string, TransitionEvaluation> = {};
  const debug: TransitionEvaluationDebug = {
    pairCount: pairs.length,
    pairs: pairs.map((p) => ({
      parentClipId: p.parentClipId,
      paramsNodeId: p.paramsNodeId,
      childClipId: p.childClipId,
    })),
    resolvedVideoPaths: [],
    skipped: [],
  };

  const scriptPath =
  process.env.TRANSITION_EVAL_SCRIPT ||
  path.resolve(__dirname, "../../../../scripts/transition_eval.py");

console.log("transition eval scriptPath", scriptPath);

  for (const pair of pairs) {
    try {
      const parentVideoPath = getVideoPathForClip(project, pair.parentClipId);
      const childVideoPath = getVideoPathForClip(project, pair.childClipId);

      debug.resolvedVideoPaths.push({
        childClipId: pair.childClipId,
        parentVideoPath,
        childVideoPath,
      });

      if (!parentVideoPath || !childVideoPath) {
        debug.skipped.push({
          childClipId: pair.childClipId,
          reason: "missing_video_path",
          details: {
            parentVideoPath,
            childVideoPath,
          },
        });
        continue;
      }

      const parentFrames = await extractBoundaryFrames(parentVideoPath, frameCount, "last", 224);
      const childFrames = await extractBoundaryFrames(childVideoPath, frameCount, "first", 224);

      if (parentFrames.length < frameCount || childFrames.length < frameCount) {
        debug.skipped.push({
          childClipId: pair.childClipId,
          reason: "not_enough_frames",
          details: {
            parentFrames: parentFrames.length,
            childFrames: childFrames.length,
            frameCount,
          },
        });
        continue;
      }

      const metrics = await runPythonJson<PythonTransitionMetrics>(scriptPath, {
        parentFrames,
        childFrames,
      });

      evaluations[pair.childClipId] = {
        parentClipId: pair.parentClipId,
        childClipId: pair.childClipId,
        paramsNodeId: pair.paramsNodeId,
        frameCount,
        ...metrics,
      };
    } catch (err) {
      debug.skipped.push({
        childClipId: pair.childClipId,
        reason: "analysis_failed",
        details: String(err),
      });
    }
  }

  return { evaluations, debug };
}
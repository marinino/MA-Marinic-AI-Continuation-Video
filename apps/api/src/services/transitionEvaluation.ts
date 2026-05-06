import type { Project } from "@ma/shared";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import fs from "node:fs/promises";

import { getParamTransitionPairs } from "./transitionPairs";
import { getVideoPathForClip } from "../utils/clipVideoPath";
import {
  extractBoundaryFrames,
  extractFramesFromOffset,
  probeVideoMetadata,
} from "../utils/ffmpeg";
import { runPythonJson } from "../utils/python";
import { getGeneratedFramesForParamsNode } from "../utils/paramNodeData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type TransitionEvaluationFrame = {
  index: number;
  side: "before" | "after";
  framePath: string;
  frameUrl: string;
  label: string;
  relativeIndex: number;
};

export type TransitionEvaluation = {
  parentClipId: string;
  childClipId: string;
  paramsNodeId: string;
  frameCount: number;

  appearanceScore: number;
  motionScore: number;
  boundaryJumpScore: number;

  frames: TransitionEvaluationFrame[];

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
  "parentClipId" | "childClipId" | "paramsNodeId" | "frameCount" | "frames"
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

async function fileHash(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
}

function framePathToUrl(filePath: string): string {
  return `/api/transition-frames?path=${encodeURIComponent(filePath)}`;
}

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

  for (const pair of pairs) {
    try {
      const parentVideoPath = getVideoPathForClip(project, pair.parentClipId);
      const childVideoPath = getVideoPathForClip(project, pair.childClipId);

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

      const parentMeta = await probeVideoMetadata(parentVideoPath);
      const childMeta = await probeVideoMetadata(childVideoPath);

      const parentTotalFrames = parentMeta.totalFrames ?? 0;
      const childTotalFrames = childMeta.totalFrames ?? 0;

      const generatedFrameCount =
        getGeneratedFramesForParamsNode(project, pair.paramsNodeId) ?? frameCount;

      const childStartFrame =
        childTotalFrames > 0
          ? Math.max(0, childTotalFrames - generatedFrameCount)
          : parentTotalFrames;

      const expectedContinuationFrames = Math.max(0, childTotalFrames - childStartFrame);

      console.log("transition cut debug", {
        parentClipId: pair.parentClipId,
        paramsNodeId: pair.paramsNodeId,
        childClipId: pair.childClipId,

        parentMeta,
        childMeta,

        generatedFrameCount,
        firstPartFramesInChild: childStartFrame,
        secondPartFramesInChild: expectedContinuationFrames,

        requestedAnalysisFrames: frameCount,
      });

      const parentFrames = await extractBoundaryFrames(parentVideoPath, frameCount, "last", 224);

      const childFrames = await extractFramesFromOffset(
        childVideoPath,
        Math.min(frameCount, generatedFrameCount),
        childStartFrame,
        224
      );

      const parentFrameHashes = await Promise.all(parentFrames.map(fileHash));
      const childFrameHashes = await Promise.all(childFrames.map(fileHash));

      console.log("transition frame debug", {
        parentClipId: pair.parentClipId,
        paramsNodeId: pair.paramsNodeId,
        childClipId: pair.childClipId,
        parentVideoPath,
        childVideoPath,
        parentFrames,
        childFrames,
        parentFrameHashes,
        childFrameHashes,
      });

      const usableFrameCount = Math.min(frameCount, parentFrames.length, childFrames.length);

      debug.resolvedVideoPaths.push({
        childClipId: pair.childClipId,
        parentVideoPath,
        childVideoPath,

        parentMeta,
        childMeta,

        firstPartFramesInChild: childStartFrame,
        secondPartFramesInChild: expectedContinuationFrames,

        requestedAnalysisFrames: frameCount,
        usableFrameCount,

        parentFrames,
        childFrames,
        parentFrameHashes,
        childFrameHashes,
      } as any);

      console.log("transition extraction debug", {
        parentClipId: pair.parentClipId,
        paramsNodeId: pair.paramsNodeId,
        childClipId: pair.childClipId,

        cutFrame: childStartFrame,

        parentFramesExtracted: parentFrames.length,
        childFramesExtractedFromContinuation: childFrames.length,

        expectedContinuationFrames,
        requestedAnalysisFrames: frameCount,
        usableFrameCount,

        parentFirstUsed: parentFrames.slice(-usableFrameCount)[0],
        parentLastUsed: parentFrames.slice(-usableFrameCount).at(-1),

        childFirstUsed: childFrames[0],
        childLastUsed: childFrames.slice(0, usableFrameCount).at(-1),
      });

      if (usableFrameCount < 2) {
        debug.skipped.push({
          childClipId: pair.childClipId,
          reason: "not_enough_frames",
          details: {
            parentFrames: parentFrames.length,
            childFrames: childFrames.length,
            requestedFrameCount: frameCount,
            usableFrameCount,
          },
        });
        continue;
      }

const parentFramesUsed = parentFrames.slice(-usableFrameCount);
const childFramesUsed = childFrames.slice(0, usableFrameCount);

const beforeFrames: TransitionEvaluationFrame[] = parentFramesUsed.map((framePath, index) => {
  const offset = usableFrameCount - index;

  return {
    index,
    side: "before",
    framePath,
    frameUrl: framePathToUrl(framePath),
    relativeIndex: -offset,
    label:
      offset === 1
        ? "Last frame before cut"
        : `${ordinal(offset)}-to-last frame before cut`,
  };
});

const afterFrames: TransitionEvaluationFrame[] = childFramesUsed.map((framePath, index) => {
  const offset = index + 1;

  return {
    index: usableFrameCount + index,
    side: "after",
    framePath,
    frameUrl: framePathToUrl(framePath),
    relativeIndex: offset,
    label:
      offset === 1
        ? "1st frame after cut"
        : `${ordinal(offset)} frame after cut`,
  };
});

const frameViewerFrames: TransitionEvaluationFrame[] = [
  ...beforeFrames,
  ...afterFrames,
];

      const metrics = await runPythonJson<PythonTransitionMetrics>(scriptPath, {
        parentFrames: parentFramesUsed,
        childFrames: childFramesUsed,
      });

      evaluations[pair.childClipId] = {
        parentClipId: pair.parentClipId,
        childClipId: pair.childClipId,
        paramsNodeId: pair.paramsNodeId,
        frameCount: usableFrameCount,
        frames: frameViewerFrames,
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

import type {
  BranchTimelineResponse,
  BranchTimelineTrack,
  Node,
  Project,
  TimelineSegment,
  TimelineVisualKind,
  TimelineSourceKind,
} from "@ma/shared";

import { getNodeDurationFrames, getNodeDurationSec } from "./getNodeDuration";
import { isGeneratedClipNode, isResetNode, isVisibleTimelineNode } from "./classifyNode";
import { buildNodeMap, getBranchPathThroughSelected, getParentNode } from "@ma/shared";
import { extractTimelinePreviewFrames } from "../utils/ffmpeg";
import path from "node:path";
import fs from "node:fs/promises";

function getNodeLabel(node: Node): string {
  return node.data.label ?? node.id;
}

function getVisualKind(node: Node): TimelineVisualKind {
  if (node.type === "clip") return "clip";
  if (node.type === "import") return "import";
  return "edit";
}

function getSourceKind(node: Node): TimelineSourceKind {
  if (node.type === "import") return "import-anchor";
  if (node.type === "edit") return "edit-anchor";
  return "parent-clip";
}

function findLastResetIndex(nodes: Node[]): number {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (isResetNode(nodes[i])) return i;
  }
  return -1;
}

function getActivePathNodes(project: Project): Node[] {
  const nodeMap = buildNodeMap(project);
  const ids = project.uiState.activePath ?? [];
  return ids.map((id) => nodeMap.get(id)).filter((node): node is Node => Boolean(node));
}

async function buildClipSegments(
  nodes: Node[],
  totalFrames: number,
  project: Project,
  nodeMap: Map<string, Node>
): Promise<TimelineSegment[]> {
  let cursor = 0;

  return await Promise.all( nodes.map(async (node, index) => {
    const durationFrames = getNodeDurationFrames(node, project, nodeMap);
    const startFrame = cursor;
    const endFrame = cursor + durationFrames;
    cursor = endFrame;

    const parent = getParentNode(node, project, nodeMap);
    const isRoot = !parent && node.type === "clip";
    const frameUrls = await getClipFrameUrls(node, project, nodeMap);

    return {
      id: `clip-${node.id}-${index}`,
      nodeId: node.id,
      label: getNodeLabel(node),
      kind: getVisualKind(node),
      durationFrames,
      durationSec: getNodeDurationSec(node, project, nodeMap),
      startFrame,
      endFrame,
      widthPct: totalFrames > 0 ? (durationFrames / totalFrames) * 100 : 0,
        firstFrameUrl: frameUrls.firstFrameUrl,
  lastFrameUrl: frameUrls.lastFrameUrl,
      isGenerated: isGeneratedClipNode(node),
      isImported: node.type === "import",
      isEdited: node.type === "edit",
      isResetAnchor: false,
      parentNodeId: parent?.id ?? null,
      isRoot,
    };
  }));
}

function buildSourceSegments(
  nodes: Node[],
  totalFrames: number,
  project: Project,
  nodeMap: Map<string, Node>
): TimelineSegment[] {
  let cursor = 0;

  return nodes.map((node, index) => {
    const durationFrames = getNodeDurationFrames(node, project, nodeMap);
    const startFrame = cursor;
    const endFrame = cursor + durationFrames;
    cursor = endFrame;

    const parent = getParentNode(node, project, nodeMap);

    let sourceNode: Node;
    let sourceLabel: string;
    let sourceKind: TimelineSourceKind;

    if (node.type === "import") {
      sourceNode = node;
      sourceLabel = getNodeLabel(node);
      sourceKind = "import-anchor";
    } else if (node.type === "edit") {
      sourceNode = node;
      sourceLabel = getNodeLabel(node);
      sourceKind = "edit-anchor";
    } else if (node.type === "clip") {
      sourceNode = parent ?? node;
      sourceLabel = parent ? getNodeLabel(parent) : getNodeLabel(node);
      sourceKind = "parent-clip";
    } else {
      sourceNode = node;
      sourceLabel = getNodeLabel(node);
      sourceKind = "parent-clip";
    }

    const sourceParent = getParentNode(sourceNode, project, nodeMap);
    const isRoot = !sourceParent && sourceNode.type === "clip";

    return {
      id: `source-${node.id}-${index}`,
      nodeId: sourceNode.id,
      label: sourceLabel,
      kind:
        sourceNode.type === "clip"
          ? "clip"
          : sourceNode.type === "import"
            ? "import"
            : sourceNode.type === "params"
              ? "params"
              : "edit",
      sourceKind,
      durationFrames,
      durationSec: getNodeDurationSec(node, project, nodeMap),
      startFrame,
      endFrame,
      widthPct: totalFrames > 0 ? (durationFrames / totalFrames) * 100 : 0,
      isGenerated: sourceNode.type === "clip",
      isImported: sourceNode.type === "import",
      isEdited: sourceNode.type === "edit",
      isResetAnchor: false,
      parentNodeId: sourceParent?.id ?? null,
      isRoot,
    };
  });
}

export async function buildBranchTimeline(
  project: Project,
  selectedNodeId: string
): Promise<BranchTimelineResponse> {
  const nodeMap = buildNodeMap(project);
  const selectedNode = nodeMap.get(selectedNodeId);

  if (!selectedNode) {
    return {
      selectedNodeId,
      status: "deprecated",
      reason: "Selected node not found.",
      totalDurationFrames: 0,
      totalDurationSec: 0,
      resetAnchorNodeId: null,
      blockingNodeId: null,
      tracks: [
        { key: "clips", label: "Clips", segments: [] },
      ],
    };
  }

  const branchPath = getBranchPathThroughSelected(selectedNodeId, project, nodeMap);

  const timelineBase = branchPath;

  const clipTrackNodes = timelineBase.filter((node) => node.type === "clip");

  const totalDurationFrames = clipTrackNodes.reduce(
    (sum, node) => sum + getNodeDurationFrames(node, project, nodeMap),
    0
  );

  const totalDurationSec = clipTrackNodes.reduce(
    (sum, node) => sum + getNodeDurationSec(node, project, nodeMap),
    0
  );

const clipSegments = await buildClipSegments(
  clipTrackNodes,
  totalDurationFrames,
  project,
  nodeMap
);
  const sourceSegments = buildSourceSegments(clipTrackNodes, totalDurationFrames, project, nodeMap);

  const resetAnchorNodeId = branchPath[0]?.id ?? null;

  for (const seg of clipSegments) {
    if (seg.nodeId === resetAnchorNodeId) {
      seg.isResetAnchor = true;
    }
  }

  for (const seg of sourceSegments) {
    if (seg.nodeId === resetAnchorNodeId) {
      seg.isResetAnchor = true;
    }
  }

  const tracks: [BranchTimelineTrack] = [
    {
      key: "clips",
      label: "Clips",
      segments: clipSegments,
    },
  ];

  return {
    selectedNodeId,
    status: "valid",
    totalDurationFrames,
    totalDurationSec,
    resetAnchorNodeId,
    blockingNodeId: null,
    tracks,
  };
}

const TIMELINE_FRAME_ROOT = path.join(process.cwd(), "data", "timeline-frames");

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function resolveComfyVideoPath(videoFile: any): Promise<string | null> {
  if (!videoFile?.filename) return null;

  const filename = videoFile.filename;
  const subfolder = videoFile.subfolder ?? "";
  const type = videoFile.type ?? "output";

  const rootsByType: Record<string, string | undefined> = {
    input: process.env.COMFY_INPUT_DIR,
    output: process.env.COMFY_OUTPUT_DIR,
    temp: process.env.COMFY_TEMP_DIR,
  };

  const candidates = [
    rootsByType[type] ? path.join(rootsByType[type]!, subfolder, filename) : null,
    process.env.COMFY_OUTPUT_DIR ? path.join(process.env.COMFY_OUTPUT_DIR, subfolder, filename) : null,
    process.env.COMFY_INPUT_DIR ? path.join(process.env.COMFY_INPUT_DIR, subfolder, filename) : null,
    process.env.COMFY_TEMP_DIR ? path.join(process.env.COMFY_TEMP_DIR, subfolder, filename) : null,
  ].filter((x): x is string => Boolean(x));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) return candidate;
  }

  console.warn("video file not found", { videoFile, candidates });
  return null;
}

async function getClipFrameUrls(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): Promise<{
  firstFrameUrl: string | null;
  lastFrameUrl: string | null;
}> {
  const data = node.data as any;

  const parent = getParentNode(node, project, nodeMap);
  const parentData = parent?.data as any;

  const generatedFrames =
    parent?.type === "params" && typeof parentData?.generatedFrames === "number"
      ? parentData.generatedFrames
      : undefined;

  const videoPath = await resolveComfyVideoPath(data.videoFile);

  if (!videoPath) {
    return {
      firstFrameUrl: null,
      lastFrameUrl: null,
    };
  }

  try {
    await extractTimelinePreviewFrames({
      clipId: node.id,
      videoPath,
      outputRoot: TIMELINE_FRAME_ROOT,
      size: 224,
      generatedFrames,
    });

    const safeClipId = node.id.replace(/[^a-zA-Z0-9._-]/g, "_");

    return {
      firstFrameUrl:
        typeof generatedFrames === "number" && generatedFrames > 0
          ? `/api/timeline-frames/${safeClipId}/first-generated-${generatedFrames}.png`
          : `/api/timeline-frames/${safeClipId}/first.png`,

      lastFrameUrl: `/api/timeline-frames/${safeClipId}/last.png`,
    };
  } catch (err) {
    console.error("timeline frame extraction failed", {
      nodeId: node.id,
      videoPath,
      generatedFrames,
      err,
    });

    return {
      firstFrameUrl: null,
      lastFrameUrl: null,
    };
  }
}
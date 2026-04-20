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
import { buildNodeMap, getAncestorChainInclusive, getParentNode } from "./graphHelpers";

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

function findBlockingResetAfterSelected(project: Project, selectedNodeId: string): Node | null {
  const activePath = getActivePathNodes(project);
  if (activePath.length === 0) return null;

  const selectedIndex = activePath.findIndex((n) => n.id === selectedNodeId);
  if (selectedIndex === -1) return null;

  for (let i = selectedIndex + 1; i < activePath.length; i++) {
    if (isResetNode(activePath[i])) {
      return activePath[i];
    }
  }

  return null;
}

function buildClipSegments(
  nodes: Node[],
  totalFrames: number,
  nodeMap: Map<string, Node>
): TimelineSegment[] {
  let cursor = 0;

  return nodes.map((node, index) => {
    const durationFrames = getNodeDurationFrames(node, nodeMap);
    const startFrame = cursor;
    const endFrame = cursor + durationFrames;
    cursor = endFrame;

    return {
      id: `clip-${node.id}-${index}`,
      nodeId: node.id,
      label: getNodeLabel(node),
      kind: getVisualKind(node),
      durationFrames,
      durationSec: getNodeDurationSec(node, nodeMap),
      startFrame,
      endFrame,
      widthPct: totalFrames > 0 ? (durationFrames / totalFrames) * 100 : 0,
      isGenerated: isGeneratedClipNode(node),
      isImported: node.type === "import",
      isEdited: node.type === "edit",
      isResetAnchor: false,
      parentNodeId: getParentNode(node, nodeMap)?.id ?? null,
    };
  });
}

function buildSourceSegments(
  clipNodes: Node[],
  totalFrames: number,
  nodeMap: Map<string, Node>
): TimelineSegment[] {
  let cursor = 0;

  return clipNodes.map((node, index) => {
    const durationFrames = getNodeDurationFrames(node, nodeMap);
    const startFrame = cursor;
    const endFrame = cursor + durationFrames;
    cursor = endFrame;

    const parent = getParentNode(node, nodeMap);

    let sourceNode = parent ?? node;
    let sourceLabel = parent ? getNodeLabel(parent) : getNodeLabel(node);
    let sourceKind: TimelineSourceKind =
      node.type === "import"
        ? "import-anchor"
        : node.type === "edit"
          ? "edit-anchor"
          : "parent-clip";

    if (!parent && isResetNode(node)) {
      sourceKind = getSourceKind(node);
      sourceNode = node;
      sourceLabel = getNodeLabel(node);
    }

    if (!parent && node.type === "clip") {
      sourceKind = "parent-clip";
      sourceNode = node;
      sourceLabel = getNodeLabel(node);
    }

    return {
      id: `source-${node.id}-${index}`,
      nodeId: sourceNode.id,
      label: sourceLabel,
      kind: sourceNode.type === "clip" ? "clip" : sourceNode.type === "import" ? "import" : "edit",
      sourceKind,
      durationFrames,
      durationSec: getNodeDurationSec(node, nodeMap),
      startFrame,
      endFrame,
      widthPct: totalFrames > 0 ? (durationFrames / totalFrames) * 100 : 0,
      isGenerated: sourceNode.type === "clip",
      isImported: sourceNode.type === "import",
      isEdited: sourceNode.type === "edit",
      isResetAnchor: false,
      parentNodeId: sourceNode.parentId ?? null,
    };
  });
}

export function buildBranchTimeline(
  project: Project,
  selectedNodeId: string
): BranchTimelineResponse {
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
        { key: "sources", label: "Sources", segments: [] },
      ],
    };
  }

  const ancestors = getAncestorChainInclusive(selectedNodeId, nodeMap);

  const lastResetIndex = findLastResetIndex(ancestors);
  const timelineBase = lastResetIndex >= 0 ? ancestors.slice(lastResetIndex) : ancestors;

  const visibleNodes = timelineBase.filter(isVisibleTimelineNode);

  const blockingReset = findBlockingResetAfterSelected(project, selectedNodeId);

  const totalDurationFrames = visibleNodes.reduce(
    (sum, node) => sum + getNodeDurationFrames(node, nodeMap),
    0
  );

  for (const node of visibleNodes) {
    console.log("timeline duration debug", {
      id: node.id,
      type: node.type,
      label: node.data.label,
      generatedFrames: node.type === "clip" ? node.data.generatedFrames : undefined,
      durationSec: "durationSec" in node.data ? node.data.durationSec : undefined,
      videoFile: "videoFile" in node.data ? node.data.videoFile : undefined,
      resolvedFrames: getNodeDurationFrames(node, nodeMap),
    });
  }

  const clipSegments = buildClipSegments(visibleNodes, totalDurationFrames, nodeMap);
  const sourceSegments = buildSourceSegments(visibleNodes, totalDurationFrames, nodeMap);

  const resetAnchorNodeId =
    lastResetIndex >= 0 ? (ancestors[lastResetIndex]?.id ?? null) : (ancestors[0]?.id ?? null);

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

  const tracks: [BranchTimelineTrack, BranchTimelineTrack] = [
    {
      key: "clips",
      label: "Clips",
      segments: clipSegments,
    },
    {
      key: "sources",
      label: "Sources",
      segments: sourceSegments,
    },
  ];

  const totalDurationSec = visibleNodes.reduce(
    (sum, node) => sum + getNodeDurationSec(node, nodeMap),
    0
  );

  return {
    selectedNodeId,
    status: blockingReset ? "deprecated" : "valid",
    reason: blockingReset
      ? "A later import/edit node exists in the active branch and resets temporal continuity."
      : undefined,
    totalDurationFrames,
    totalDurationSec: totalDurationFrames,
    resetAnchorNodeId,
    blockingNodeId: blockingReset?.id ?? null,
    tracks,
  };
}

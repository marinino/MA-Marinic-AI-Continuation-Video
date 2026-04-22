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

function buildClipSegments(
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
    const isRoot = !parent && node.type === "clip";

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
      isGenerated: isGeneratedClipNode(node),
      isImported: node.type === "import",
      isEdited: node.type === "edit",
      isResetAnchor: false,
      parentNodeId: parent?.id ?? null,
      isRoot,
    };
  });
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

  const clipSegments = buildClipSegments(clipTrackNodes, totalDurationFrames, project, nodeMap);
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

export type TimelineStatus = "valid" | "deprecated";

export type TimelineVisualKind = "clip" | "import" | "edit" | "params";

export type TimelineSourceKind = "parent-clip" | "import-anchor" | "edit-anchor";

export type TimelineSegment = {
  id: string;
  nodeId: string;
  label: string;

  kind: TimelineVisualKind;
  sourceKind?: TimelineSourceKind;

  durationFrames: number;
  durationSec: number;

  startFrame: number;
  endFrame: number;
  widthPct: number;

  firstFrameUrl?: string | null;
  lastFrameUrl?: string | null;

  isGenerated: boolean;
  isImported: boolean;
  isEdited: boolean;
  isResetAnchor: boolean;

  parentNodeId?: string | null;
  isRoot?: boolean;
};

export type BranchTimelineTrack = {
  key: "clips" | "sources";
  label: string;
  segments: TimelineSegment[];
};

export type BranchTimelineResponse = {
  selectedNodeId: string;
  status: TimelineStatus;
  reason?: string;

  totalDurationFrames: number;
  totalDurationSec: number;

  resetAnchorNodeId: string | null;
  blockingNodeId: string | null;

  tracks: [BranchTimelineTrack];
};

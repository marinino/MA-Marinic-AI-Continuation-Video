import type React from "react";
import type {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  Delta,
  EditMetaSummary,
  GraphCardContentMode,
  GraphCardDisplayMode,
  ParamDelats,
  ParameterHistoryMap,
  VideoSegmentPlayback,
} from "../types/ui";
import { NodeType, StoredMediaFile } from "@ma/shared";

export interface NodeDetailsDialogProps {
  open: boolean;
  onClose: () => void;

  nodeId: string;
  type: "clip" | "params" | "edit" | "import";

  d: Delta;

  videoUrl?: string | null;
  videoFile?: {
    filename?: string;
  } | null;
  videoStatus?: string;

  metaSummary?: EditMetaSummary;
  importedFileName?: string | null;

  prompt?: string;
  prevParamsId?: string | null;

  highNoiseCfg?: number;
  lowNoiseCfg?: number;
  highNoiseModelStrength?: number;
  lowNoiseModelStrength?: number;
  highNoiseShift?: number;
  lowNoiseShift?: number;
  highNoiseSteps?: number;
  lowNoiseSteps?: number;
  highNoiseStartStep?: number;
  lowNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseEndStep?: number;

  displayTotalSteps?: number;
  displayLowStepPct?: number;

  categoryScores?: CategoryScoreMap;
  categoryScoreDeltas?: CategoryDeltaMap | null;
  categoryLabels?: CategoryLabelMap;

  paramDeltas?: ParamDelats;
  promptChanged?: boolean;
  branchSuggestion?: BrachSuggestion;

  note?: string;
  onChangeNote?: (value: string) => void;
  onSaveNote?: () => void;

  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
  parameterHistory?: ParameterHistoryMap;

  compareBaseNodeLabel?: string | null;
  compareSelector?: {
    selectedBaseNodeId: string | null;
    selectedCompareNodeId: string | null;
    baseOptions: { nodeId: string; label: string; frames: number }[];
    compareOptions: { nodeId: string; label: string; frames: number }[];
    onChangeBaseNode: (nodeId: string) => void;
    onChangeCompareNode: (nodeId: string) => void;
  };

  compareParameterHistory?: {
    baseHistory: ParameterHistoryMap;
    compareHistory: ParameterHistoryMap;
  };

  videoPlayback?: VideoSegmentPlayback;

  showOnlyGeneratedPart?: boolean;
}

export interface NodeCardProps {
  nodeId: string;
  icon: React.ReactNode;
  title: string;
  type: NodeType;
  isRoot: boolean;
  selected?: boolean;
  onAdd?: (nodeId: string) => void;
  infoText?: string;
  children?: React.ReactNode;
  videoUrl?: string | null;
  videoFile?: StoredMediaFile | null;
  videoStatus?: string;
  prompt?: string;
  metaSummary?: React.ReactNode;
  highlightUnseenEnabled?: boolean;
  notesEnabled: boolean;
  showOnlyChangedParameters?: boolean;

  highNoiseCfg?: number;
  lowNoiseCfg?: number;
  highNoiseModelStrength?: number;
  lowNoiseModelStrength?: number;
  highNoiseShift?: number;
  lowNoiseShift?: number;
  highNoiseSteps?: number;
  lowNoiseSteps?: number;
  highNoiseStartStep?: number;
  lowNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseEndStep?: number;

  videoOpened?: boolean;
  onVideoOpened?: (nodeId: string) => void;

  prevParamsId?: string | null;
  paramDeltas?: ParamDelats;

  promptChanged?: boolean;
  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;
  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;
  onHide?: (nodeId: string) => void;
  canHide?: boolean;
  branchSuggestion?: BrachSuggestion;
  categoryScores?: Record<string, number | null>;
  categoryScoreDeltas?: Partial<Record<string, number | null>> | null;
  categoryLabels?: Record<string, string>;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
  showWeightSuggestionsEnabled?: boolean;
  graphCardContentMode?: GraphCardContentMode;
  graphCardDisplayMode?: GraphCardDisplayMode;
  displayTotalSteps?: number;
  displayLowStepPct?: number;
  parameterHistory?: ParameterHistoryMap;

  onOpenDetails?: (nodeId: string) => void;
  onStartCompare?: (nodeId: string) => void;
  isComparePicking?: boolean;
  compareSourceNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  activeClipPick?: { slotIndex: number } | null;
  onPickClipNode?: (clip: { id: string; label?: string | null; videoUrl?: string | null }) => void;
}

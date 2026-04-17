import type React from "react";
import type {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  Delta,
  EditMetaSummary,
  ParamDelats,
  ParameterHistoryMap,
  VideoSegmentPlayback,
} from "../types/ui";

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

import type React from "react";
import type {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  Delta,
  ParamDelats,
  ParameterHistoryMap,
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

  metaSummary?: React.ReactNode;

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
  onSaveNote?: (nodeId: string, note: string) => void;

  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
  parameterHistory?: ParameterHistoryMap;

  compareBaseNodeLabel?: string | null;
}

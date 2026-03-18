// /types/ui.ts
import { StoredMediaFile } from "@ma/shared";

/** Generic error dialog payload */
export type ErrorDialogState = { title: string; message: string } | null;

/** Root dialog tab */
export type RootMode = "generate" | "upload";

/** V2V dialog tab */
export type V2VTab = "simple" | "advanced";

/** Category view mode (read-only UI) */
export type CatView = "sliders" | "pentagon";

/** Manual edit flow draft (before the edit node exists) */
export type ManualEditDraft = {
  fromClipId: string;
  expectedBasename: string;
};

/** Category scores for read-only panel + pentagon map */
export type CategoryScores = {
  creativity: number;
  promptFaithfulness: number;
  motion: number;
  transitionSmoothness: number;
  videoFaithfulness: number;
};

/** Minimal job shape for JobsPanel UI */
export type JobsPanelJob = {
  id: string;
  label: string;
  status: string;
  progressText?: string;
  previewUrl?: string | null;
};

/** Payload snapshots for upload/import flow (optional) */
export type UploadedTimelineContext = {
  storedTimelineFilename: string;
  snapshot?: any;
  changelog?: string[];
};

/** Helper for Comfy job success handlers */
export type JobSuccess = {
  file: StoredMediaFile;
  previewUrl?: string | null;
};

export type ComfyStartVideoInput = {
  text: string;
  seed?: number;
};

export type ComfyStartVideoResult = {
  prompt_id: string;
  client_id: string;
};

// stark vereinfacht – reicht fürs Frontend
export type ComfyHistory = Record<
  string,
  {
    outputs?: Record<
      string,
      {
        videos?: Array<{
          filename: string;
          subfolder?: string;
          type?: string;
        }>;
      }
    >;
  }
>;

export type ParamDelats = Partial<
  Record<
    | "highNoiseCfg"
    | "lowNoiseCfg"
    | "highNoiseShift"
    | "lowNoiseShift"
    | "highNoiseModelStrength"
    | "lowNoiseModelStrength"
    | "highNoiseSteps"
    | "lowNoiseSteps"
    | "highNoiseStartStep"
    | "lowNoiseStartStep"
    | "highNoiseEndStep"
    | "lowNoiseEndStep",
    number | null
  >
> | null;

export type BrachSuggestion = {
  targetCategory:
    | "creativity"
    | "promptFaithfulness"
    | "motion"
    | "transitionSmoothness"
    | "videoFaithfulness";
  categoryDirection: "down" | "up";
  parameter:
    | "highNoiseCfg"
    | "lowNoiseCfg"
    | "highNoiseShift"
    | "lowNoiseShift"
    | "highNoiseModelStrength"
    | "lowNoiseModelStrength"
    | "highNoiseSteps"
    | "lowNoiseSteps"
    | "highNoiseStartStep"
    | "lowNoiseStartStep"
    | "highNoiseEndStep"
    | "lowNoiseEndStep";
  parameterDirection: "up" | "down";
  hitCount: number;
  streakLength: number;
  avgCategoryDelta: number;
  avgParamDelta: number;
  confidence: number;
  suggestedWeightDeltaPct: number;
  suggestedAction: "increase_param_weight" | "decrease_param_weight";
  message: string;
} | null;

export type RadarAxis = {
  id: string; // z.B. "creativity" oder "custom:123"
  label: string; // Text am Rand
  value: number; // 0..100
};

export type GenState = "idle" | "running" | "error";

export type SelectedCategory = {
  key: string;
  label: string;
  value: number | null;
  delta: number | null;
};

export type Mark = { value: number; label?: React.ReactNode };

export type AdvancedParamsState = {
  lowNoiseCfg: number;
  highNoiseCfg: number;
  lowNoiseModelStrength: number;
  highNoiseModelStrength: number;
  lowNoiseShift: number;
  highNoiseShift: number;
  lowNoiseSteps: number;
  highNoiseSteps: number;
  lowNoiseStartStep: number;
  highNoiseStartStep: number;
  lowNoiseEndStep: number;
  highNoiseEndStep: number;
};

export type SimpleReal = {
  totalSteps: number; // int: quick 4..5, quality 20..24
  stepRatioPct: number; // int: 50..80
  highShift: number; // float: 2.30..3.00 (0.01)
  highCfg: number; // float: 2.20..3.00 (0.01)
  highStrength: number; // float: 0.20..0.45 (0.01)
};

export type SimpleSliderKey = keyof SimpleReal; // statt eigener keys, wenn du willst

export type SpeedMode = "quick" | "quality";

export type CatKey = keyof CategoryScores;

export type StandardCategoryKey =
  | "creativity"
  | "promptFaithfulness"
  | "motion"
  | "transitionSmoothness"
  | "videoFaithfulness";

export type AxisId = keyof CategoryScores | string; // "creativity" | ... | "custom:..."

export type AnyCategoryKey = StandardCategoryKey | string;

export type CategoryScoreMap = Partial<Record<AnyCategoryKey, number | null>>;
export type CategoryDeltaMap = Partial<Record<AnyCategoryKey, number | null>>;
export type CategoryLabelMap = Partial<Record<AnyCategoryKey, string>>;

export type Delta =
  | Partial<
      Record<
        | "highNoiseCfg"
        | "lowNoiseCfg"
        | "highNoiseShift"
        | "lowNoiseShift"
        | "highNoiseModelStrength"
        | "lowNoiseModelStrength"
        | "highNoiseSteps"
        | "lowNoiseSteps"
        | "highNoiseStartStep"
        | "lowNoiseStartStep"
        | "highNoiseEndStep"
        | "lowNoiseEndStep",
        number | null
      >
    >
  | null
  | undefined;

export type EdgeKind = "input" | "output" | "edit_in" | "edit_out";

export type ParamKey =
  | "highNoiseCfg"
  | "lowNoiseCfg"
  | "highNoiseShift"
  | "lowNoiseShift"
  | "highNoiseModelStrength"
  | "lowNoiseModelStrength"
  | "highNoiseSteps"
  | "lowNoiseSteps"
  | "highNoiseStartStep"
  | "lowNoiseStartStep"
  | "highNoiseEndStep"
  | "lowNoiseEndStep";

export type ParamDeltaMap = Partial<Record<ParamKey, number | null>>;

export type ParamWeightSuggestion = {
  targetCategory: StandardCategoryKey;
  categoryDirection: "down" | "up";
  parameter: ParamKey;
  parameterDirection: "up" | "down";
  hitCount: number;
  streakLength: number;
  avgCategoryDelta: number;
  avgParamDelta: number;
  confidence: number;
  suggestedWeightDeltaPct: number;
  suggestedAction: "increase_param_weight" | "decrease_param_weight";
  message: string;
};

export type ParamNodeData = {
  paramDeltas?: ParamDeltaMap | null;
  categoryScoreDeltas?: CategoryScoreMap | null;
};

export type ParamStep = {
  nodeId: string;
  paramDeltas: ParamDeltaMap;
  categoryDeltas: CategoryScoreMap;
};

export type XY = { x: number; y: number };

export type BoxNode = {
  position: XY;
  width?: number | null;
  height?: number | null;
  type?: string;
};

export type JobStatus = "queued" | "connecting" | "running" | "finalizing" | "done" | "error";

export type Job = {
  id: string;
  label: string;
  status: JobStatus;

  // payload starter
  startPayload: () => Promise<{ prompt_id: string; client_id: string }>;

  // optional UI
  progressText?: string;
  promptId?: string;
  clientId?: string;
  file?: StoredMediaFile;
  previewUrl?: string;

  onSuccess?: (file: StoredMediaFile) => void;
  onError?: (e: any) => void;
};

export type FormulaWeights = {
  promptFaithfulness: { cfg: number; ratio: number };

  videoFaithfulness: { ratio: number; invShift: number; invStrength: number };

  transitionSmoothness: { steps: number; ratio: number };

  motion: { shift: number; strength: number; ratio: number; bias: number };

  creativity: { shift: number; strength: number; invCfg: number; ratio: number; bias: number };
};

export type CustomScoreSlider = {
  id: string;
  name: string;
  hidden?: boolean;

  // lineare Formel auf Basis deiner normalisierten features:
  // steps01, ratio01, shift01, cfg01, strength01 und inverses sowie bias
  w: {
    steps: number;
    ratio: number;
    shift: number;
    cfg: number;
    strength: number;

    invSteps: number;
    invRatio: number;
    invShift: number;
    invCfg: number;
    invStrength: number;

    bias: number;
  };
};

export type ScoreRanges = {
  steps: { min: number; max: number };
  ratio: { min: number; max: number };
  shift: { min: number; max: number };
  cfg: { min: number; max: number };
  strength: { min: number; max: number };
};

export type SliderConfig = {
  min: number;
  max: number;
  step: number;
  decimals?: number;
};

export type SafePreset = {
  name: string;
  stepsTotal: number;
  lowRatio: number; // lowSteps/stepsTotal
  cfgHigh: number;
  shiftHigh: number;
  strengthHigh: number;
};

export type SafeKey = keyof SimpleReal;

export type MixCandidate = { i: number; j: number; t: number; v: Record<SafeKey, number> };

export type SafeBounds = Record<SafeKey, { min: number; max: number }>;

export type AppSettings = {
  showEdgeLabels: boolean;
  highlightUnseenEnabled: boolean;
  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  graphCardContentMode: GraphCardContentMode;
};

export type SummaryChip = {
  key: string;
  label: string;
  sx?: any;
};

export type GraphCardContentMode = "categories" | "parameters";

export type OrderedSliderId = StandardCategoryKey | string;

export type SliderListItem =
  | { id: StandardCategoryKey; kind: "base" }
  | { id: string; kind: "custom" };

export type OrderedSliderItem =
  | { id: StandardCategoryKey; kind: "base" }
  | { id: string; kind: "custom"; slider: CustomScoreSlider };

export type ScoreMap = Record<string, number>;

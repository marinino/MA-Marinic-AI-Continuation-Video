// /types/ui.ts

import { StoredMediaFile } from "@ma/shared";

/** Generic error dialog payload */
export type ErrorDialogState = { title: string; message: string } | null;

/** Root dialog tab */
export type RootMode = "generate" | "upload";

/** V2V dialog tab */
export type V2VTab = "simple" | "advanced";

/** Category view mode (read-only UI) */
export type CatView = "sliders" | "pentagon" | "triangle";

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
  length?: number;
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
  targetCategory: string;
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
  message?: string;
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
  targetCategory: string;
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

export type FormulaWeights = Record<AnyCategoryKey, CleanWeights>;

export type CleanWeights = {
  steps: number;
  ratio: number;
  shift: number;
  cfg: number;
  strength: number;
  bias: number;
};

export type NormalizedFeatureValues = {
  steps: number;
  ratio: number;
  shift: number;
  cfg: number;
  strength: number;
};

export type CustomScoreSlider = {
  id: string;
  name: string;
  hidden?: boolean;
  w: CleanWeights;
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
  graphCardDisplayMode: GraphCardDisplayMode;
  restrictCategories: boolean;
  showOnlyChangedParameters: boolean;
  loopComparisonVideos: boolean;
  showOnlyGeneratedPart: boolean;
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

export type ParamRange = { min: number; max: number };

export type DerivedRanges = {
  highCfg: ParamRange;
  highShift: ParamRange;
  highStrength: ParamRange;
  highSteps: ParamRange;
  lowSteps: ParamRange;
};

export type BranchNodeLike = {
  highNoiseCfg?: number;
  highNoiseShift?: number;
  highNoiseModelStrength?: number;
  highNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseStartStep?: number;
  lowNoiseEndStep?: number;
};

export type ParameterBarColorKey =
  | "highCfg"
  | "highShift"
  | "highStrength"
  | "highSteps"
  | "lowSteps";

export type Item = {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  delta?: number | null;
  decimals?: number;
  colorKey: ParameterBarColorKey;
};

export type HistoryPoint = {
  index: number;
  value: number;
};

export type ParameterHistoryMap = Record<string, HistoryPoint[]>;

export type GraphCardDisplayMode = "chips" | "bars";

export type BuiltInCategoryId =
  | "creativity"
  | "promptFaithfulness"
  | "motion"
  | "transitionSmoothness"
  | "videoFaithfulness";

export type GraphUIContextValue = {
  onAdd: (nodeId: string) => void;
  onVideoOpened: (nodeId: string) => void;
  onSaveNote: (nodeId: string, note: string) => void;
  onDelete: (nodeId: string) => void;
  onHide: (nodeId: string) => void;
  onOpenDetails: (nodeId: string) => void;
  onStartCompare: (nodeId: string) => void;
  onSelectNode: (nodeId: string, nodeType?: string) => void;

  notesEnabled: boolean;
  highlightUnseenEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  graphCardContentMode: any;
  graphCardDisplayMode: any;
  showOnlyChangedParameters: boolean;

  categoryVisibility: Record<string, boolean>;
  onSetCategoryVisible: (id: string, visible: boolean) => void;
  onShowAllCategories: () => void;

  isComparePicking: boolean;
  compareSourceNodeId: string | null;
  activeClipPick:
    | {
        slotIndex: number;
      }
    | null
    | undefined;
  onPickClipNode?: (clip: { id: string; label?: string | null; videoUrl?: string | null }) => void;
};

export type EditMetaSummary = {
  tool?: string;
  status?: string;
  importedAt?: string;
  changelogLength?: number;
  counts?: Record<string, number>;
  summaryLines?: string[];
  detailLines?: string[];
};

export type BranchTimelineStep = {
  kind: "params" | "non-param" | "root";
  nodeId: string;
  paramNodeId: string | null;
  clipNodeId: string | null;
  label: string;
  frames: number;
  prompt?: string;
};

export type BranchTimelineSegment = {
  index: number;
  kind: "params" | "non-param" | "root";
  paramNodeId: string | null;
  label: string;
  frames: number;
  widthPct: number;
};

export type CompareTimelineOption = {
  index: number;
  paramNodeId: string;
  label: string;
  frames: number;
  widthPct: number;
};

export type TransitionPair = {
  parentClipId: string;
  paramsNodeId: string;
  childClipId: string;
};

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

export type VideoSegmentPlayback = {
  generatedFrames: number;
};

export type ClipSlot = {
  id: string | null;
  label?: string | null;
  videoUrl?: string | null;
  playback?: VideoSegmentPlayback;
};

export type ParamDeltaCacheEntry = {
  key: string;
  deltas: any;
  categoryScoreDeltas: any;
  promptChanged: boolean;
};

export type InfoSlide = {
  title: string;
  image?: string;
  content: React.ReactNode;
};

export type TransitionFrame = {
  index: number;

  side: "before" | "after";

  framePath: string;
  frameUrl: string;

  label: string;

  relativeIndex: number;

  score?: number;
};

export type TransitionEvaluationData = {
  status: "not_run" | "running" | "done" | "failed";
  averageScore?: number;
  frames: TransitionFrame[];
};
export type ViewMode = "single" | "side-by-side" | "grid-4";

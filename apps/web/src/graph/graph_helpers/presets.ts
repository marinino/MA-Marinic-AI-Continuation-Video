import { CustomScoreSlider, FormulaWeights, SafePreset, StandardCategoryKey } from "../types/ui";

export const SAFE_PRESETS_QUICK: SafePreset[] = [
  {
    name: "Prompt",
    stepsTotal: 4,
    lowRatio: 2 / 4, // 50%
    cfgHigh: 0.8,
    shiftHigh: 5.0,
    strengthHigh: 1.0,
  },
  {
    name: "Transition",
    stepsTotal: 5,
    lowRatio: 4 / 5, // 80%
    cfgHigh: 1.0,
    shiftHigh: 5.0,
    strengthHigh: 1.0,
  },
  {
    name: "Creativity",
    stepsTotal: 4,
    lowRatio: 2 / 4, // 50%
    cfgHigh: 1.15,
    shiftHigh: 4.5,
    strengthHigh: 1.0,
  },
  {
    name: "Motion",
    stepsTotal: 4,
    lowRatio: 2 / 4, // 50%
    cfgHigh: 1.0,
    shiftHigh: 5.0,
    strengthHigh: 0.6,
  },
  {
    name: "Video",
    stepsTotal: 4,
    lowRatio: 3 / 4, // 50%
    cfgHigh: 0.95,
    shiftHigh: 4.8,
    strengthHigh: 1.0,
  },
];

export const SAFE_PRESETS_QUALITY: SafePreset[] = [
  {
    name: "Motion",
    stepsTotal: 20,
    lowRatio: 10 / 20,
    cfgHigh: 2.5,
    shiftHigh: 2.95,
    strengthHigh: 0.44,
  },
  {
    name: "Creativity",
    stepsTotal: 20,
    lowRatio: 12 / 20,
    cfgHigh: 2.2,
    shiftHigh: 2.9,
    strengthHigh: 0.4,
  },
  {
    name: "Prompt",
    stepsTotal: 20,
    lowRatio: 14 / 20,
    cfgHigh: 3.0,
    shiftHigh: 2.5,
    strengthHigh: 0.3,
  },
  {
    name: "Video",
    stepsTotal: 20,
    lowRatio: 16 / 20,
    cfgHigh: 3.0,
    shiftHigh: 2.3,
    strengthHigh: 0.2,
  },
  {
    name: "Transition",
    stepsTotal: 24,
    lowRatio: 16 / 24,
    cfgHigh: 3.0,
    shiftHigh: 2.5,
    strengthHigh: 0.3,
  },
];

export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  creativity: "Creativity",
  promptFaithfulness: "Prompt",
  motion: "Motion",
  transitionSmoothness: "Transition",
  videoFaithfulness: "Video",
};

export const DEFAULT_BASE_ORDER: StandardCategoryKey[] = [
  "creativity",
  "promptFaithfulness",
  "motion",
  "transitionSmoothness",
  "videoFaithfulness",
];

export const DEFAULT_FORMULA_WEIGHTS: FormulaWeights = {
  promptFaithfulness: {
    steps: 0.1,
    ratio: 0.2,
    shift: 0,
    cfg: 0.7,
    strength: -0.05,
    bias: 0,
  },

  videoFaithfulness: {
    steps: 0.05,
    ratio: 0.7,
    shift: -0.25,
    cfg: 0,
    strength: -0.25,
    bias: 0,
  },

  transitionSmoothness: {
    steps: 0.45,
    ratio: 0.4,
    shift: -0.1,
    cfg: 0,
    strength: -0.15,
    bias: 0.05,
  },

  motion: {
    steps: 0.1,
    ratio: -0.15,
    shift: 0.55,
    cfg: 0,
    strength: 0.35,
    bias: 0.25,
  },

  creativity: {
    steps: 0,
    ratio: -0.35,
    shift: 0.3,
    cfg: -0.3,
    strength: 0.5,
    bias: 0.2,
  },
};

export const DEFAULT_CUSTOM_W: CustomScoreSlider["w"] = {
  steps: 0,
  ratio: 0,
  shift: 0,
  cfg: 0,
  strength: 0,
  bias: 0,
};

import { useMemo } from "react";
import {
  CategoryScores,
  CustomScoreSlider,
  FormulaWeights,
  Item,
  ParamDelats,
  ScoreRanges,
  SimpleReal,
  SpeedMode,
} from "../types/ui";
import { SAFE_PRESETS } from "./useV2VSliders";
import { applyWeights } from "../graph_helpers/sliderLogic";
import { DEFAULT_FORMULA_WEIGHTS } from "../graph_helpers/presets";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function getStepRanges(mode: SpeedMode) {
  const presets = SAFE_PRESETS[mode];

  const highSteps = presets.map((p) => p.stepsTotal * (1 - p.lowRatio));
  const lowSteps = presets.map((p) => p.stepsTotal * p.lowRatio);

  return {
    highSteps: {
      min: Math.min(...highSteps),
      max: Math.max(...highSteps),
    },
    lowSteps: {
      min: Math.min(...lowSteps),
      max: Math.max(...lowSteps),
    },
  };
}

export function deriveRangesFromPresets(
  presets: Array<{
    stepsTotal: number;
    lowRatio: number;
    cfgHigh: number;
    shiftHigh: number;
    strengthHigh: number;
  }>
) {
  const highCfgValues = presets.map((p) => p.cfgHigh);
  const highShiftValues = presets.map((p) => p.shiftHigh);
  const highStrengthValues = presets.map((p) => p.strengthHigh);

  const highStepsValues = presets.map((p) => p.stepsTotal * (1 - p.lowRatio));
  const lowStepsValues = presets.map((p) => p.stepsTotal * p.lowRatio);

  return {
    highCfg: {
      min: Math.min(...highCfgValues),
      max: Math.max(...highCfgValues),
    },
    highShift: {
      min: Math.min(...highShiftValues),
      max: Math.max(...highShiftValues),
    },
    highStrength: {
      min: Math.min(...highStrengthValues),
      max: Math.max(...highStrengthValues),
    },
    highSteps: {
      min: Math.min(...highStepsValues),
      max: Math.max(...highStepsValues),
    },
    lowSteps: {
      min: Math.min(...lowStepsValues),
      max: Math.max(...lowStepsValues),
    },
  };
}

export function smoothstep01(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

export function sliderToRange(
  slider: number,
  min: number,
  max: number,
  easing?: (t: number) => number
) {
  const t0 = clamp(slider, 0, 100) / 100;
  const t = easing ? easing(t0) : t0;
  return min + t * (max - min);
}

export function sliderToIntRange(slider: number, min: number, max: number) {
  return Math.round(sliderToRange(slider, min, max));
}

export function deriveV2VParamsFromSimple(opts: {
  totalSteps: number;
  stepRatio01: number; // low share 0..1
  highShift: number;
  highCfg: number;
  highStrength: number;
}) {
  const totalSteps = Math.round(clamp(opts.totalSteps, 1, 100));

  const lowSteps = totalSteps;
  const highSteps = totalSteps;

  const highStart = 0;
  const highEnd = Math.round(highSteps * (1 - opts.stepRatio01));

  const lowStart = highEnd;
  const lowEnd = totalSteps;

  return {
    highNoiseSteps: highSteps,
    lowNoiseSteps: lowSteps,
    highNoiseStartStep: highStart,
    highNoiseEndStep: highEnd,
    lowNoiseStartStep: lowStart,
    lowNoiseEndStep: lowEnd,

    highNoiseShift: opts.highShift,
    highNoiseCfg: opts.highCfg,
    highNoiseModelStrength: opts.highStrength,
  };
}

export function getScoreRanges(mode: "quick" | "quality"): ScoreRanges {
  return mode === "quick"
    ? {
        steps: { min: 4, max: 5 },
        ratio: { min: 50, max: 80 },
        shift: { min: 4.5, max: 5.0 },
        cfg: { min: 0.7, max: 1.15 },
        strength: { min: 0.6, max: 1.0 },
      }
    : {
        steps: { min: 20, max: 24 },
        ratio: { min: 50, max: 80 },
        shift: { min: 2.3, max: 3.0 },
        cfg: { min: 2.2, max: 3.0 },
        strength: { min: 0.2, max: 0.45 },
      };
}

export function computeCategoryScoresFromSimple(
  s: {
    totalSteps: number;
    stepRatio: number;
    highShift: number;
    highCfg: number;
    highStrength: number;
  },
  ranges: {
    steps: { min: number; max: number };
    ratio: { min: number; max: number };
    shift: { min: number; max: number };
    cfg: { min: number; max: number };
    strength: { min: number; max: number };
  },
  fw: FormulaWeights = DEFAULT_FORMULA_WEIGHTS
): CategoryScores {
  const steps01 = clamp(
    (s.totalSteps - ranges.steps.min) / Math.max(1e-6, ranges.steps.max - ranges.steps.min),
    0,
    1
  );

  const ratio01 = clamp(
    (s.stepRatio - ranges.ratio.min) / Math.max(1e-6, ranges.ratio.max - ranges.ratio.min),
    0,
    1
  );

  const shift01 = clamp(
    (s.highShift - ranges.shift.min) / Math.max(1e-6, ranges.shift.max - ranges.shift.min),
    0,
    1
  );

  const cfg01 = clamp(
    (s.highCfg - ranges.cfg.min) / Math.max(1e-6, ranges.cfg.max - ranges.cfg.min),
    0,
    1
  );

  const strength01 = clamp(
    (s.highStrength - ranges.strength.min) /
      Math.max(1e-6, ranges.strength.max - ranges.strength.min),
    0,
    1
  );

  const values = {
    steps: steps01,
    ratio: ratio01,
    shift: shift01,
    cfg: cfg01,
    strength: strength01,
  };

  return {
    creativity: Math.round(applyWeights(fw.creativity, values) * 100),
    promptFaithfulness: Math.round(applyWeights(fw.promptFaithfulness, values) * 100),
    motion: Math.round(applyWeights(fw.motion, values) * 100),
    transitionSmoothness: Math.round(applyWeights(fw.transitionSmoothness, values) * 100),
    videoFaithfulness: Math.round(applyWeights(fw.videoFaithfulness, values) * 100),
  };
}

export function useCategoryScores(
  simpleReal: {
    totalSteps: number;
    stepRatio: number;
    highShift: number;
    highCfg: number;
    highStrength: number;
  },
  ranges: ScoreRanges = getScoreRanges("quality")
) {
  return useMemo(
    () => computeCategoryScoresFromSimple(simpleReal, ranges),
    [
      simpleReal.totalSteps,
      simpleReal.stepRatio,
      simpleReal.highShift,
      simpleReal.highCfg,
      simpleReal.highStrength,
      ranges.steps.min,
      ranges.steps.max,
      ranges.ratio.min,
      ranges.ratio.max,
      ranges.shift.min,
      ranges.shift.max,
      ranges.cfg.min,
      ranges.cfg.max,
      ranges.strength.min,
      ranges.strength.max,
    ]
  );
}

export function computeAllScores(
  s: SimpleReal,
  ranges: ScoreRanges,
  formulaWeights: FormulaWeights,
  custom: CustomScoreSlider[]
): Record<string, number> {
  const steps01 = clamp(
    (s.totalSteps - ranges.steps.min) / Math.max(1e-6, ranges.steps.max - ranges.steps.min),
    0,
    1
  );

  const ratio01 = clamp(
    (s.stepRatioPct - ranges.ratio.min) / Math.max(1e-6, ranges.ratio.max - ranges.ratio.min),
    0,
    1
  );

  const shift01 = clamp(
    (s.highShift - ranges.shift.min) / Math.max(1e-6, ranges.shift.max - ranges.shift.min),
    0,
    1
  );

  const cfg01 = clamp(
    (s.highCfg - ranges.cfg.min) / Math.max(1e-6, ranges.cfg.max - ranges.cfg.min),
    0,
    1
  );

  const strength01 = clamp(
    (s.highStrength - ranges.strength.min) /
      Math.max(1e-6, ranges.strength.max - ranges.strength.min),
    0,
    1
  );

  const values = {
    steps: steps01,
    ratio: ratio01,
    shift: shift01,
    cfg: cfg01,
    strength: strength01,
  };

  const builtIn = computeCategoryScoresFromSimple(
    {
      totalSteps: s.totalSteps,
      stepRatio: s.stepRatioPct,
      highShift: s.highShift,
      highCfg: s.highCfg,
      highStrength: s.highStrength,
    },
    ranges,
    formulaWeights
  );

  const out: Record<string, number> = { ...builtIn };

  for (const cs of custom) {
    out[cs.id] = Math.round(applyWeights(cs.w, values) * 100);
  }

  return out;
}

export function buildScoreDeltaMap(
  curScores: Record<string, number | null | undefined>,
  prevScores: Record<string, number | null | undefined>
) {
  const keys = Array.from(new Set([...Object.keys(curScores), ...Object.keys(prevScores)]));

  return Object.fromEntries(keys.map((key) => [key, scoreDelta(curScores, prevScores, key)]));
}

export function numDelta(cur: any, prev: any, key: string) {
  const a = cur?.[key];
  const b = prev?.[key];
  if (typeof a !== "number" || typeof b !== "number") return null;
  const d = a - b;
  return Number.isFinite(d) ? d : null;
}

export function scoreDelta(curScores: any, prevScores: any, key: string) {
  const a = curScores?.[key];
  const b = prevScores?.[key];
  if (typeof a !== "number" || typeof b !== "number") return null;
  const d = a - b;
  return Number.isFinite(d) ? d : null;
}

export const DEFAULT_CATEGORY_IDS = [
  "creativity",
  "promptFaithfulness",
  "motion",
  "transitionSmoothness",
  "videoFaithfulness",
] as const;

export function useCategoryIds(customSliders: CustomScoreSlider[]) {
  const allCategoryIds = useMemo(
    () => [...DEFAULT_CATEGORY_IDS, ...customSliders.map((cs) => cs.id)],
    [customSliders]
  );

  return {
    defaultCategoryIds: DEFAULT_CATEGORY_IDS,
    allCategoryIds,
  };
}

export function fmtPlain(v: number, decimals: number) {
  return fmt(v, decimals).replace(/[()+]/g, "");
}

export function deltaChipSx(delta: number | null | undefined) {
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return undefined;

  return {
    border: "1px solid",
    borderColor: delta > 0 ? "#4dabf5" : "#f73378",
    boxShadow: delta > 0 ? "0 0 0 1px rgba(2,136,209,0.15)" : "0 0 0 1px rgba(211,47,47,0.15)",
  } as const;
}

export function fmt(d: number | null | undefined, decimals = 2) {
  if (typeof d !== "number" || !Number.isFinite(d) || d === 0) return "";
  const sign = d > 0 ? "+" : "−";
  return `(${sign}${Math.abs(d).toFixed(decimals)})`;
}

export function buildParameterItems(args: {
  highNoiseCfg?: number;
  highNoiseShift?: number;
  highNoiseModelStrength?: number;
  totalStepsValue?: number | null;
  totalStepsDelta?: number | null;
  lowStepPctValue?: number | null;
  lowStepPctDelta?: number | null;
  d?: ParamDelats | null;
  PARAM_RANGES: {
    highCfg: {
      min: number;
      max: number;
    };
    highShift: {
      min: number;
      max: number;
    };
    highStrength: {
      min: number;
      max: number;
    };
    highSteps: {
      min: number;
      max: number;
    };
    lowSteps: {
      min: number;
      max: number;
    };
  };
}): Item[] {
  const items: Item[] = [];

  if (args.highNoiseCfg != null) {
    items.push({
      key: "highNoiseCfg",
      label: "High CFG",
      value: args.highNoiseCfg,
      min: args.PARAM_RANGES.highCfg.min,
      max: args.PARAM_RANGES.highCfg.max,
      delta: args.d?.highNoiseCfg,
      colorKey: "highCfg",
    });
  }

  if (args.highNoiseShift != null) {
    items.push({
      key: "highNoiseShift",
      label: "High Shift",
      value: args.highNoiseShift,
      min: args.PARAM_RANGES.highShift.min,
      max: args.PARAM_RANGES.highShift.max,
      delta: args.d?.highNoiseShift,
      colorKey: "highShift",
    });
  }

  if (args.highNoiseModelStrength != null) {
    items.push({
      key: "highNoiseModelStrength",
      label: "High Strength",
      value: args.highNoiseModelStrength,
      min: args.PARAM_RANGES.highStrength.min,
      max: args.PARAM_RANGES.highStrength.max,
      delta: args.d?.highNoiseModelStrength,
      colorKey: "highStrength",
    });
  }

  if (args.totalStepsValue != null) {
    items.push({
      key: "totalSteps",
      label: "Total Steps",
      value: args.totalStepsValue,
      min: 4,
      max: 24,
      delta: args.totalStepsDelta,
      decimals: 0,
      colorKey: "highSteps",
    });
  }

  if (args.lowStepPctValue != null) {
    items.push({
      key: "lowStepPct",
      label: "Low Step %",
      value: args.lowStepPctValue,
      min: 50,
      max: 80,
      delta: args.lowStepPctDelta,
      decimals: 0,
      colorKey: "lowSteps",
    });
  }

  return items;
}

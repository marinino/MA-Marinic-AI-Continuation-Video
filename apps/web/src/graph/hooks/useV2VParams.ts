import { useMemo } from "react";

type CatKey = keyof CategoryScores;

export type FormulaWeights = {
  promptFaithfulness: { cfg: number; ratio: number };

  videoFaithfulness: { ratio: number; invShift: number; invStrength: number };

  transitionSmoothness: { steps: number; ratio: number };

  motion: { shift: number; strength: number; ratio: number; bias: number };

  creativity: { shift: number; strength: number; invCfg: number; ratio: number; bias: number };
};

export const DEFAULT_FORMULA_WEIGHTS: FormulaWeights = {
  promptFaithfulness: { cfg: 0.85, ratio: 0.15 },

  videoFaithfulness: { ratio: 0.55, invShift: 0.3, invStrength: 0.15 },

  transitionSmoothness: { steps: 0.55, ratio: 0.45 },

  motion: { shift: 0.45, strength: 0.45, ratio: -0.2, bias: 0.3 },

  creativity: { shift: 0.45, strength: 0.35, invCfg: 0.2, ratio: -0.25, bias: 0.25 },
};

export type CustomScoreSlider = {
  id: string;
  name: string;

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

export const DEFAULT_CUSTOM_W: CustomScoreSlider["w"] = {
  steps: 0,
  ratio: 0,
  shift: 0,
  cfg: 0,
  strength: 0,

  invSteps: 0,
  invRatio: 0,
  invShift: 0,
  invCfg: 0,
  invStrength: 0,

  bias: 0,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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

/**
 * EXACT mega-file behavior:
 * - totalSteps rounded
 * - lowSteps = round(totalSteps * stepRatio01), min 1
 * - highSteps = totalSteps - lowSteps, min 1
 * - high phase first, low phase second
 */
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

/**
 * EXACT mega-file formula and ranges.
 * NOTE: these "scores" are UI-only, but you said nothing should differ.
 */
export type CategoryScores = {
  creativity: number;
  promptFaithfulness: number;
  motion: number;
  transitionSmoothness: number;
  videoFaithfulness: number;
};

export function computeCategoryScoresFromSimple(
  s: {
    totalSteps: number;
    stepRatio: number; // 0..100 (low%)
    highShift: number;
    highCfg: number;
    highStrength: number;
  },
  stepsRange: { min: number; max: number } = { min: 20, max: 24 },
  fw: FormulaWeights = DEFAULT_FORMULA_WEIGHTS // default = Simple behavior
): CategoryScores {
  const denom = Math.max(1e-6, stepsRange.max - stepsRange.min);
  const steps01 = clamp((s.totalSteps - stepsRange.min) / denom, 0, 1);

  const ratio01 = clamp((s.stepRatio - 50) / (80 - 50), 0, 1); // keep exact formula
  const shift01 = clamp((s.highShift - 2.3) / (3 - 2.3), 0, 1);
  const cfg01 = clamp((s.highCfg - 2.2) / (3.0 - 2.2), 0, 1);
  const strength01 = clamp((s.highStrength - 0.2) / (0.45 - 0.2), 0, 1);

  const promptFaithfulness = clamp(
    fw.promptFaithfulness.cfg * cfg01 + fw.promptFaithfulness.ratio * ratio01,
    0,
    1
  );

  const videoFaithfulness = clamp(
    fw.videoFaithfulness.ratio * ratio01 +
      fw.videoFaithfulness.invShift * (1 - shift01) +
      fw.videoFaithfulness.invStrength * (1 - strength01),
    0,
    1
  );

  const transitionSmoothness = clamp(
    fw.transitionSmoothness.steps * steps01 + fw.transitionSmoothness.ratio * ratio01,
    0,
    1
  );

  const motion = clamp(
    fw.motion.shift * shift01 +
      fw.motion.strength * strength01 +
      fw.motion.ratio * ratio01 +
      fw.motion.bias,
    0,
    1
  );

  const creativity = clamp(
    fw.creativity.shift * shift01 +
      fw.creativity.strength * strength01 +
      fw.creativity.invCfg * (1 - cfg01) +
      fw.creativity.ratio * ratio01 +
      fw.creativity.bias,
    0,
    1
  );

  return {
    creativity: Math.round(creativity * 100),
    promptFaithfulness: Math.round(promptFaithfulness * 100),
    motion: Math.round(motion * 100),
    transitionSmoothness: Math.round(transitionSmoothness * 100),
    videoFaithfulness: Math.round(videoFaithfulness * 100),
  };
}

/**
 * Hook wrapper for computed scores
 */
export function useCategoryScores(
  simpleReal: {
    totalSteps: number;
    stepRatio: number;
    highShift: number;
    highCfg: number;
    highStrength: number;
  },
  stepsRange: { min: number; max: number } = { min: 20, max: 24 }
) {
  return useMemo(
    () => computeCategoryScoresFromSimple(simpleReal, stepsRange),
    [
      simpleReal.totalSteps,
      simpleReal.stepRatio,
      simpleReal.highShift,
      simpleReal.highCfg,
      simpleReal.highStrength,
      stepsRange.min,
      stepsRange.max,
    ]
  );
}

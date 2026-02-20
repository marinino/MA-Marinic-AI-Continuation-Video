import { useMemo } from "react";

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

export function computeCategoryScoresFromSimple(s: {
  totalSteps: number;
  stepRatio: number; // 0..100 (low%)
  highShift: number;
  highCfg: number;
  highStrength: number;
}): CategoryScores {
  const steps01 = clamp((s.totalSteps - 20) / (24 - 20), 0, 1);
  const ratio01 = clamp((s.stepRatio - 50) / (80 - 50), 0, 1); // low%: 45..80 (mega used 50..80 mapping in UI; keep formula same)
  const shift01 = clamp((s.highShift - 2.3) / (3 - 2.3), 0, 1);
  const cfg01 = clamp((s.highCfg - 2.5) / (3.0 - 2.5), 0, 1);
  const strength01 = clamp((s.highStrength - 0.2) / (0.45 - 0.2), 0, 1);

  const promptFaithfulness = clamp(0.85 * cfg01 + 0.15 * ratio01, 0, 1);

  const videoFaithfulness = clamp(
    0.55 * ratio01 + 0.3 * (1 - shift01) + 0.15 * (1 - strength01),
    0,
    1
  );

  const transitionSmoothness = clamp(0.55 * steps01 + 0.45 * ratio01, 0, 1);

  const motion = clamp(0.45 * shift01 + 0.45 * strength01 - 0.2 * ratio01 + 0.3, 0, 1);

  const creativity = clamp(
    0.45 * shift01 + 0.35 * strength01 + 0.2 * (1 - cfg01) - 0.25 * ratio01 + 0.25,
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
export function useCategoryScores(simpleReal: {
  totalSteps: number;
  stepRatio: number;
  highShift: number;
  highCfg: number;
  highStrength: number;
}) {
  return useMemo(
    () => computeCategoryScoresFromSimple(simpleReal),
    [
      simpleReal.totalSteps,
      simpleReal.stepRatio,
      simpleReal.highShift,
      simpleReal.highCfg,
      simpleReal.highStrength,
    ]
  );
}

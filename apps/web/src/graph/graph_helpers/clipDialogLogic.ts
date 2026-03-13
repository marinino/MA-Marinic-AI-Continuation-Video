import React from "react";
import { AxisId } from "../dialogs/PentagonAxesDialog";
import {
  CategoryScores,
  computeCategoryScoresFromSimple,
  CustomScoreSlider,
  FormulaWeights,
  getScoreRanges,
} from "../hooks/useV2VParams";
import { CatKey, ClipDialogProps, SimpleSliderKey } from "../dialogs/ClipDialog";
import { SimpleReal } from "../hooks/useV2VSliders";
import { useWeightsLogic } from "./weightsLogic";

export function useClipDialogLogic() {
  const { formulaWeights } = useWeightsLogic();

  const [activeEffects, setActiveEffects] = React.useState<Partial<Record<CatKey, number>> | null>(
    null
  );

  const [activeSimple, setActiveSimple] = React.useState<SimpleSliderKey | null>(null);

  function axisLabel(id: AxisId, customSliders: CustomScoreSlider[]) {
    if (id === "creativity") return "Creativity";
    if (id === "promptFaithfulness") return "Prompt\nFaithfulness";
    if (id === "motion") return "Motion";
    if (id === "transitionSmoothness") return "Transition\nSmoothness";
    if (id === "videoFaithfulness") return "Video\nFaithfulness";

    const cs = customSliders.find((x) => x.id === id);
    return cs?.name ?? String(id);
  }

  function axisValue(id: AxisId, allScores: Record<string, number>) {
    return allScores[String(id)] ?? 0;
  }

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  function computeAllScores(
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
    formulaWeights: FormulaWeights,
    custom: CustomScoreSlider[]
  ): Record<string, number> {
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

    const builtIn = computeCategoryScoresFromSimple(
      {
        totalSteps: s.totalSteps,
        stepRatio: s.stepRatio,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      ranges,
      formulaWeights
    );

    const out: Record<string, number> = { ...builtIn };

    for (const cs of custom) {
      const w = cs.w;
      const raw =
        w.steps * steps01 +
        w.ratio * ratio01 +
        w.shift * shift01 +
        w.cfg * cfg01 +
        w.strength * strength01 +
        w.invSteps * (1 - steps01) +
        w.invRatio * (1 - ratio01) +
        w.invShift * (1 - shift01) +
        w.invCfg * (1 - cfg01) +
        w.invStrength * (1 - strength01) +
        w.bias;

      const score01 = clamp(raw, 0, 1);
      out[cs.id] = Math.round(score01 * 100);
    }

    return out;
  }

  function catInfluenceSx(
    cat: CatKey,
    activeEffects: Partial<Record<keyof CategoryScores, number>> | null
  ) {
    if (!activeSimple || !activeEffects) return {};

    const d = activeEffects[cat] ?? 0;
    const dead = 0.02;
    const maxD = 0.5;
    const gamma = 0.7;

    if (Math.abs(d) < dead) {
      return {
        opacity: 0.25,
        "& .MuiSlider-rail": { opacity: 0.12 },
        "& .MuiSlider-track": { opacity: 0.12 },
        "& .MuiSlider-thumb": { opacity: 0.12 },
      };
    }

    const color = d > 0 ? "#4dabf5" : "#f73378";
    const t = Math.min(1, Math.abs(d) / maxD);
    const mag = Math.pow(t, gamma);
    const trackOpacity = 0.15 + 0.85 * mag;

    return {
      opacity: 1,
      "& .MuiSlider-track": { bgcolor: color, opacity: trackOpacity },
      "& .MuiSlider-thumb": { bgcolor: color, opacity: 0.15 + 0.85 * mag },
      "& .MuiSlider-rail": { opacity: 0.06 + 0.2 * mag },
    };
  }

  function computeScoresFromReal(s: SimpleReal, p: ClipDialogProps): CategoryScores {
    const scoreRanges = getScoreRanges(p.simpleSpeedMode);

    return computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      scoreRanges,
      formulaWeights
    );
  }

  function clampToCfg<K extends keyof SimpleReal>(key: K, v: number, p: ClipDialogProps) {
    const c = p.sliderCfg[key];
    return clamp(v, c.min, c.max);
  }

  return {
    activeSimple,
    setActiveSimple,
    axisLabel,
    axisValue,
    catInfluenceSx,
    clampToCfg,
    computeAllScores,
    computeScoresFromReal,
    formulaWeights,
    activeEffects,
    setActiveEffects,
  };
}

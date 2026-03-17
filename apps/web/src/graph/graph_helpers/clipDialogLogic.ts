import React from "react";

import { computeAllScores, getScoreRanges } from "../hooks/useV2VParams";
import { ClipDialogProps } from "../dialogs/ClipDialog";

import { useWeightsLogic } from "./weightsLogic";
import {
  AxisId,
  CategoryScores,
  CatKey,
  CustomScoreSlider,
  FormulaWeights,
  ScoreMap,
  SimpleReal,
  SimpleSliderKey,
} from "../types/ui";

export function axisValue(id: AxisId, allScores: Record<string, number>) {
  return allScores[String(id)] ?? 0;
}

export function axisLabel(id: AxisId, customSliders: CustomScoreSlider[]) {
  if (id === "creativity") return "Creativity";
  if (id === "promptFaithfulness") return "Prompt\nFaithfulness";
  if (id === "motion") return "Motion";
  if (id === "transitionSmoothness") return "Transition\nSmoothness";
  if (id === "videoFaithfulness") return "Video\nFaithfulness";

  const cs = customSliders.find((x) => x.id === id);
  return cs?.name ?? String(id);
}

export function useClipDialogLogic(
  formulaWeights: FormulaWeights,
  customSliders: CustomScoreSlider[]
){
const [activeEffects, setActiveEffects] = React.useState<ScoreMap | null>(null);

  const [activeSimple, setActiveSimple] = React.useState<SimpleSliderKey | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  function catInfluenceSx(cat: string, activeEffects: Record<string, number> | null) {
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

function computeScoresFromReal(s: SimpleReal, p: ClipDialogProps): Record<string, number> {
  const scoreRanges = getScoreRanges(p.simpleSpeedMode);

  return computeAllScores(
    {
      totalSteps: Math.round(s.totalSteps),
      stepRatioPct: s.stepRatioPct,
      highShift: s.highShift,
      highCfg: s.highCfg,
      highStrength: s.highStrength,
    },
    scoreRanges,
    formulaWeights,
    customSliders
  );
}

  function clampToCfg<K extends keyof SimpleReal>(key: K, v: number, p: ClipDialogProps) {
    const c = p.sliderCfg[key];
    return clamp(v, c.min, c.max);
  }

  return {
    activeSimple,
    setActiveSimple,
    catInfluenceSx,
    clampToCfg,
    computeScoresFromReal,
    formulaWeights,
    activeEffects,
    setActiveEffects,
  };
}

import React from "react";

import { computeAllScores, getScoreRanges, simpleToNormalizedValues } from "../hooks/useV2VParams";
import { ClipDialogProps } from "../dialogs/ClipDialog";

import { useWeightsLogic } from "./weightsLogic";
import {
  AxisId,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  CategoryScores,
  CatKey,
  CustomScoreSlider,
  FormulaWeights,
  ScoreMap,
  ScoreRanges,
  SimpleReal,
  SimpleSliderKey,
} from "../types/ui";
import { DEFAULT_CATEGORY_LABELS } from "./presets";
import { applyWeights } from "./sliderLogic";

export function axisValue(id: AxisId, allScores: Record<string, number>) {
  return allScores[String(id)] ?? 0;
}

export function getVisibleCategoryEntries(
  categoryScores?: CategoryScoreMap,
  categoryScoreDeltas?: CategoryDeltaMap | null,
  categoryLabels?: CategoryLabelMap
) {
  const mergedCategoryLabels = {
    ...DEFAULT_CATEGORY_LABELS,
    ...(categoryLabels ?? {}),
  };

  return Object.entries(categoryScores ?? {}).flatMap(([key, value]) => {
    if (value == null) return [];

    const isDefaultCategory = Object.prototype.hasOwnProperty.call(DEFAULT_CATEGORY_LABELS, key);
    const isExistingCustomCategory = Object.prototype.hasOwnProperty.call(
      categoryLabels ?? {},
      key
    );

    if (!isDefaultCategory && !isExistingCustomCategory) return [];

    const label = mergedCategoryLabels[key];
    if (!label) return [];

    return [
      {
        key,
        label,
        value: value as number,
        delta: categoryScoreDeltas?.[key] ?? null,
      },
    ];
  });
}

export function buildAxisLabelGetter(customSliders: CustomScoreSlider[]) {
  const map = Object.fromEntries(customSliders.map((x) => [x.id, x.name]));

  return (id: AxisId) => {
    if (id === "creativity") return "Creativity";
    if (id === "promptFaithfulness") return "Prompt\nFaithfulness";
    if (id === "motion") return "Motion";
    if (id === "transitionSmoothness") return "Transition\nSmoothness";
    if (id === "videoFaithfulness") return "Video\nFaithfulness";

    return map[id] ?? String(id);
  };
}

export function computeCustomScores(
  s: SimpleReal,
  ranges: ScoreRanges,
  custom: CustomScoreSlider[]
): Record<string, number> {
  const values = simpleToNormalizedValues(s, ranges);
  const out: Record<string, number> = {};

  for (const cs of custom) {
    out[cs.id] = Math.round(applyWeights(cs.w, values) * 100);
  }

  return out;
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function normalize(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

export function useClipDialogLogic(
  formulaWeights: FormulaWeights,
  customSliders: CustomScoreSlider[]
) {
  const [activeEffects, setActiveEffects] = React.useState<ScoreMap | null>(null);
  const [activeSimple, setActiveSimple] = React.useState<SimpleSliderKey | null>(null);

  const clamp = React.useCallback((v: number, lo: number, hi: number) => {
    return Math.max(lo, Math.min(hi, v));
  }, []);

  const catInfluenceSx = React.useCallback(
    (cat: string, activeEffects: Record<string, number> | null) => {
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
    },
    [activeSimple]
  );

  const computeScoresFromReal = React.useCallback(
    (s: SimpleReal, p: ClipDialogProps): Record<string, number> => {
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
    },
    [formulaWeights, customSliders]
  );

  const clampToCfg = React.useCallback(
    <K extends keyof SimpleReal>(key: K, v: number, p: ClipDialogProps) => {
      const c = p.sliderCfg[key];
      return clamp(v, c.min, c.max);
    },
    [clamp]
  );

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

import { clamp } from "reactflow";
import { ClipDialogProps } from "../dialogs/ClipDialog";
import {
  SimpleReal,
  CategoryScores,
  CatKey,
  SimpleSliderKey,
  Mark,
  SafeKey,
  StandardCategoryKey,
  ScoreMap,
  CleanWeights,
  CustomScoreSlider,
  FormulaWeights,
  NormalizedFeatureValues,
} from "../types/ui";
import { useClipDialogLogic } from "./clipDialogLogic";
import { useCallback } from "react";

export function normalizeWeights(w: Partial<CleanWeights>): CleanWeights {
  return {
    steps: w.steps ?? 0,
    ratio: w.ratio ?? 0,
    shift: w.shift ?? 0,
    cfg: w.cfg ?? 0,
    strength: w.strength ?? 0,
    bias: w.bias ?? 0,
  };
}

export function applyWeights(w: CleanWeights, values: NormalizedFeatureValues) {
  const raw =
    w.steps * values.steps +
    w.ratio * values.ratio +
    w.shift * values.shift +
    w.cfg * values.cfg +
    w.strength * values.strength +
    w.bias;

  return clamp(raw, 0, 1);
}

export function useSliderLogic({
  computeScoresFromReal,
  clampToCfg,
  setActiveSimple,
  setActiveEffects,
}: {
  computeScoresFromReal: (s: SimpleReal, p: ClipDialogProps) => ScoreMap;
  clampToCfg: <K extends keyof SimpleReal>(key: K, v: number, p: ClipDialogProps) => number;
  setActiveSimple: React.Dispatch<React.SetStateAction<keyof SimpleReal | null>>;
  setActiveEffects: React.Dispatch<React.SetStateAction<ScoreMap | null>>;
}) {
  const toSafeKey = useCallback((k: SimpleSliderKey): SafeKey | null => {
    if (k === "totalSteps") return "totalSteps";
    if (k === "stepRatioPct") return "stepRatioPct";
    if (k === "highShift") return "highShift";
    if (k === "highCfg") return "highCfg";
    if (k === "highStrength") return "highStrength";
    return null;
  }, []);

  const computeEffectsFor = useCallback(
    (key: keyof SimpleReal, p: ClipDialogProps): ScoreMap => {
      const base = p.simple;

      const step = p.sliderCfg[key].step;
      const epsSteps = key === "totalSteps" ? 1 : 3;
      const eps = step * epsSteps;

      const s0 = computeScoresFromReal(base, p);

      const sk = toSafeKey(key as SimpleSliderKey);
      if (!sk) return {};

      const plusRaw = clampToCfg(key, (base[key] as number) + eps, p);
      const minusRaw = clampToCfg(key, (base[key] as number) - eps, p);

      const plus = p.simulateSliderChange(base, sk, plusRaw);
      const minus = p.simulateSliderChange(base, sk, minusRaw);

      const sPlus = computeScoresFromReal(plus, p);
      const sMinus = computeScoresFromReal(minus, p);

      const out: ScoreMap = {};
      const allKeys = new Set([...Object.keys(s0), ...Object.keys(sPlus), ...Object.keys(sMinus)]);

      for (const cat of allKeys) {
        out[cat] = ((sPlus[cat] ?? 0) - (sMinus[cat] ?? 0)) / (2 * epsSteps);
      }

      return out;
    },
    [clampToCfg, computeScoresFromReal, toSafeKey]
  );

  const beginDrag = useCallback(
    (key: SimpleSliderKey, p: ClipDialogProps) => {
      setActiveSimple(key);
      setActiveEffects(computeEffectsFor(key, p));
    },
    [computeEffectsFor, setActiveSimple, setActiveEffects]
  );

  const endDrag = useCallback(() => {
    setActiveSimple(null);
    setActiveEffects(null);
  }, [setActiveSimple, setActiveEffects]);

  const marksFor = useCallback(
    (b?: { min: number; max: number }, decimals = 2): Mark[] | undefined => {
      if (!b) return undefined;

      const fmt = (x: number) => Number(x.toFixed(decimals));

      return [
        { value: b.min, label: String(fmt(b.min)) },
        { value: b.max, label: String(fmt(b.max)) },
      ];
    },
    []
  );

  return { beginDrag, computeEffectsFor, endDrag, marksFor, toSafeKey };
}

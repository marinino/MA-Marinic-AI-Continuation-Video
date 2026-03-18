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
} from "../types/ui";
import { useClipDialogLogic } from "./clipDialogLogic";

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
  function computeEffectsFor(key: keyof SimpleReal, p: ClipDialogProps): ScoreMap {
    const base = p.simple;

    const step = p.sliderCfg[key].step;
    const epsSteps = key === "totalSteps" ? 1 : 3;
    const eps = step * epsSteps;

    const s0 = computeScoresFromReal(base, p);

    // ✅ wandle keyof SimpleReal -> SafeKey (du hast toSafeKey schon)
    const sk = toSafeKey(key as any);
    if (!sk) return {};

    // ✅ “raw desired value” (noch ohne constraints)
    const plusRaw = clampToCfg(key, (base[key] as number) + eps, p);
    const minusRaw = clampToCfg(key, (base[key] as number) - eps, p);

    // ✅ hier passieren die passiven Effekte:
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
  }

  function beginDrag(key: SimpleSliderKey, p: ClipDialogProps) {
    setActiveSimple(key);
    setActiveEffects(computeEffectsFor(key, p));
  }

  function endDrag() {
    setActiveSimple(null);
    setActiveEffects(null);
  }

  function toSafeKey(k: SimpleSliderKey): SafeKey | null {
    if (k === "totalSteps") return "totalSteps";
    if (k === "stepRatioPct") return "stepRatioPct";
    if (k === "highShift") return "highShift";
    if (k === "highCfg") return "highCfg";
    if (k === "highStrength") return "highStrength";
    return null;
  }

  function marksFor(b?: { min: number; max: number }, decimals = 2): Mark[] | undefined {
    if (!b) return undefined;

    const fmt = (x: number) => Number(x.toFixed(decimals));

    return [
      { value: b.min, label: String(fmt(b.min)) },
      { value: b.max, label: String(fmt(b.max)) },
    ];
  }
  return { beginDrag, computeEffectsFor, endDrag, marksFor, toSafeKey, DEFAULT_CATEGORY_LABELS };
}

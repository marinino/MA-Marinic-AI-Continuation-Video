import {

  ClipDialogProps,

} from "../dialogs/ClipDialog";
import { SafeKey } from "../hooks/useV2VSliders";
import { SimpleReal, CategoryScores, CatKey, SimpleSliderKey, Mark } from "../types/ui";
import { useClipDialogLogic } from "./clipDialogLogic";


export const DEFAULT_CATEGORY_LABELS: Record<string, string> = {
  creativity: "Creativity",
  promptFaithfulness: "Prompt",
  motion: "Motion",
  transitionSmoothness: "Transition",
  videoFaithfulness: "Video",
};

export function useSliderLogic({
  computeScoresFromReal,
  clampToCfg,
  setActiveSimple,
  setActiveEffects,
}: {
  computeScoresFromReal: (s: SimpleReal, p: ClipDialogProps) => CategoryScores;
  clampToCfg: <K extends keyof SimpleReal>(key: K, v: number, p: ClipDialogProps) => number;
  setActiveSimple: React.Dispatch<React.SetStateAction<keyof SimpleReal | null>>;
  setActiveEffects: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof CategoryScores, number>> | null>
  >;
}) {
  function computeEffectsFor(
    key: keyof SimpleReal,
    p: ClipDialogProps
  ): Partial<Record<CatKey, number>> {
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

    const out: Partial<Record<CatKey, number>> = {};
    (Object.keys(s0) as CatKey[]).forEach((cat) => {
      out[cat] = (sPlus[cat] - sMinus[cat]) / (2 * epsSteps);
    });
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

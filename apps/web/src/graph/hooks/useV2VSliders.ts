import { useEffect, useMemo, useState } from "react";
import {
  SafePreset,
  SimpleReal,
  SliderConfig,
  SafeKey,
  V2VTab,
  CatView,
  MixCandidate,
  SafeBounds,
  SpeedMode,
  CleanWeights,
  BuiltInCategoryId,
  FormulaWeights,
  ScoreRanges,
} from "../types/ui";
import {
  DEFAULT_FORMULA_WEIGHTS,
  SAFE_PRESETS_QUALITY,
  SAFE_PRESETS_QUICK,
} from "../graph_helpers/presets";
import {
  adjustSimpleForCategoryTarget,
  adjustSimpleForScoreTarget,
  denormalizeSimpleValue,
  getScoreRanges,
  simpleToNormalizedValues,
} from "./useV2VParams";
import { applyWeights } from "../graph_helpers/sliderLogic";

export const SAFE_PRESETS: Record<SpeedMode, SafePreset[]> = {
  quality: SAFE_PRESETS_QUALITY,
  quick: SAFE_PRESETS_QUICK,
};

function getPresetSliderUnits(mode: SpeedMode) {
  return SAFE_PRESETS[mode].map(presetToSliderUnits);
}

const cfgShift: Record<SpeedMode, Record<keyof SimpleReal, SliderConfig>> = {
  quick: {
    totalSteps: { min: 4, max: 5, step: 1, decimals: 0 },
    stepRatioPct: { min: 50, max: 80, step: 1, decimals: 0 },
    highShift: { min: 4.5, max: 5.0, step: 0.01, decimals: 2 },
    highCfg: { min: 0.7, max: 1.15, step: 0.01, decimals: 2 },
    highStrength: { min: 0.6, max: 1.0, step: 0.01, decimals: 2 },
  },
  quality: {
    totalSteps: { min: 20, max: 24, step: 1, decimals: 0 },
    stepRatioPct: { min: 50, max: 80, step: 1, decimals: 0 },
    highShift: { min: 2.3, max: 3.0, step: 0.01, decimals: 2 },
    highCfg: { min: 2.2, max: 3.0, step: 0.01, decimals: 2 },
    highStrength: { min: 0.2, max: 0.45, step: 0.01, decimals: 2 },
  },
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function presetToSliderUnits(p: SafePreset): Record<SafeKey, number> {
  return {
    totalSteps: p.stepsTotal,
    stepRatioPct: p.lowRatio * 100,
    highCfg: p.cfgHigh,
    highShift: p.shiftHigh,
    highStrength: p.strengthHigh,
  };
}

function clampToCfg(mode: SpeedMode, key: keyof SimpleReal, v: number) {
  const c = cfgShift[mode][key];
  const stepped = Math.round((v - c.min) / c.step) * c.step + c.min;
  const clamped = clamp(stepped, c.min, c.max);
  const d = c.decimals ?? 6;
  return Number(clamped.toFixed(d));
}

function clampSimple(mode: SpeedMode, s: SimpleReal): SimpleReal {
  return {
    totalSteps: clampToCfg(mode, "totalSteps", s.totalSteps),
    stepRatioPct: clampToCfg(mode, "stepRatioPct", Math.round(s.stepRatioPct)),
    highShift: clampToCfg(mode, "highShift", s.highShift),
    highCfg: clampToCfg(mode, "highCfg", s.highCfg),
    highStrength: clampToCfg(mode, "highStrength", s.highStrength),
  };
}

export function useV2VSliders(formulaWeights: FormulaWeights) {
  const [v2vTab, setV2vTab] = useState<V2VTab>("simple");
  const [catView, setCatView] = useState<CatView>("sliders");
  const [simpleSpeedMode, setSimpleSpeedMode] = useState<SpeedMode>("quality");

  function roundTo(x: number, decimals: number) {
    const f = 10 ** decimals;
    return Math.round(x * f) / f;
  }

  function distanceSimple(a: SimpleReal, b: SimpleReal, ranges: ScoreRanges) {
    const na = simpleToNormalizedValues(a, ranges);
    const nb = simpleToNormalizedValues(b, ranges);

    const keys: Array<keyof typeof na> = ["steps", "ratio", "shift", "cfg", "strength"];

    let sum = 0;
    for (const key of keys) {
      const d = na[key] - nb[key];
      sum += d * d;
    }

    return Math.sqrt(sum);
  }

  function mixTwoPresets(
    a: Record<SafeKey, number>,
    b: Record<SafeKey, number>,
    t: number
  ): SimpleReal {
    const tt = Math.max(0, Math.min(1, t));

    return {
      totalSteps: tt * a.totalSteps + (1 - tt) * b.totalSteps,
      stepRatioPct: tt * a.stepRatioPct + (1 - tt) * b.stepRatioPct,
      highShift: tt * a.highShift + (1 - tt) * b.highShift,
      highCfg: tt * a.highCfg + (1 - tt) * b.highCfg,
      highStrength: tt * a.highStrength + (1 - tt) * b.highStrength,
    };
  }

  function simulateSliderChange(prev: SimpleReal, key: SafeKey, raw: number): SimpleReal {
    const patched = { ...prev, [key]: raw };
    const clamped = clampSimple(simpleSpeedMode, patched);

    const constrained = applySafeConstraintsForDraggedParameter(clamped, key);
    return clampSimple(simpleSpeedMode, constrained);
  }

  function edgeCandidates(activeKey: SafeKey, activeValue: number): MixCandidate[] {
    const out: MixCandidate[] = [];
    const presetsU = getPresetSliderUnits(simpleSpeedMode);

    for (let i = 0; i < presetsU.length; i++) {
      for (let j = i + 1; j < presetsU.length; j++) {
        const ai = presetsU[i][activeKey];
        const aj = presetsU[j][activeKey];
        const denom = ai - aj;

        if (Math.abs(denom) < 1e-9) continue;

        const t = (activeValue - aj) / denom;
        if (t < 0 || t > 1) continue;

        const v = {} as Record<SafeKey, number>;
        (Object.keys(presetsU[i]) as SafeKey[]).forEach((k) => {
          v[k] = t * presetsU[i][k] + (1 - t) * presetsU[j][k];
        });

        out.push({ i, j, t, v });
      }
    }

    return out;
  }

  function boundsFromCandidates(cands: MixCandidate[]) {
    const bounds: Record<SafeKey, { min: number; max: number }> = {
      totalSteps: { min: Infinity, max: -Infinity },
      stepRatioPct: { min: Infinity, max: -Infinity },
      highCfg: { min: Infinity, max: -Infinity },
      highShift: { min: Infinity, max: -Infinity },
      highStrength: { min: Infinity, max: -Infinity },
    };

    for (const c of cands) {
      (Object.keys(bounds) as SafeKey[]).forEach((k) => {
        bounds[k].min = Math.min(bounds[k].min, c.v[k]);
        bounds[k].max = Math.max(bounds[k].max, c.v[k]);
      });
    }

    return bounds;
  }

  function projectToSafeRegion(simple: SimpleReal): SimpleReal {
    const presets = getPresetSliderUnits(simpleSpeedMode);
    const clampedTarget = clampSimple(simpleSpeedMode, simple);
    const ranges = getScoreRanges(simpleSpeedMode);

    let best = clampSimple(simpleSpeedMode, presets[0] as SimpleReal);
    let bestDist = distanceSimple(best, clampedTarget, ranges);

    // 1) reine Presets testen
    for (const preset of presets) {
      const candidate = clampSimple(simpleSpeedMode, preset as SimpleReal);
      const dist = distanceSimple(candidate, clampedTarget, ranges);

      if (dist < bestDist) {
        best = candidate;
        bestDist = dist;
      }
    }

    // 2) Mischungen von je 2 Presets testen
    for (let i = 0; i < presets.length; i++) {
      for (let j = i + 1; j < presets.length; j++) {
        for (let s = 0; s <= 20; s++) {
          const t = s / 20;
          const mixed = mixTwoPresets(presets[i], presets[j], t);
          const candidate = clampSimple(simpleSpeedMode, mixed);
          const dist = distanceSimple(candidate, clampedTarget, ranges);

          if (dist < bestDist) {
            best = candidate;
            bestDist = dist;
          }
        }
      }
    }

    return best;
  }

  function applySafeConstraintsForDraggedParameter(
    simple: SimpleReal,
    activeKey: SafeKey
  ): SimpleReal {
    const activeValue = simple[activeKey] as number;

    const cands = edgeCandidates(activeKey, activeValue);
    if (cands.length === 0) return simple; // falls aktiv außerhalb safe -> später clamp aktiv oder fallback

    const b = boundsFromCandidates(cands);

    const next = { ...simple } as any;

    (Object.keys(b) as SafeKey[]).forEach((k) => {
      if (k === activeKey) return;
      next[k] = clamp(next[k], b[k].min, b[k].max);
    });

    // steps integer etc. (deine Rundungsregeln)
    next.totalSteps = roundTo(next.totalSteps, 0);
    next.stepRatioPct = roundTo(next.stepRatioPct, 0); // wenn du % nur integer willst
    next.highCfg = roundTo(next.highCfg, 2);
    next.highShift = roundTo(next.highShift, 2);
    next.highStrength = roundTo(next.highStrength, 2);

    return next as SimpleReal;
  }

  // ✅ EIN State-Objekt
  const [simple, setSimple] = useState<SimpleReal>({
    totalSteps: 20,
    stepRatioPct: 65,
    highShift: 2.6,
    highCfg: 2.6,
    highStrength: 0.3,
  });

  const replaceSimple = (next: SimpleReal) => {
    const clamped = clampSimple(simpleSpeedMode, next);
    const projected = projectToSafeRegion(clamped);
    setSimple(clampSimple(simpleSpeedMode, projected));
  };

  // ✅ wenn mode wechselt → Werte in neuen Bereich clampen
  useEffect(() => {
    setSimple((prev) => {
      const clamped = clampSimple(simpleSpeedMode, prev);
      const projected = projectToSafeRegion(clamped);
      return clampSimple(simpleSpeedMode, projected);
    });
  }, [simpleSpeedMode]);

  // ✅ “patch” API
  const onChangeSimple = (patch: Partial<SimpleReal>) => {
    setSimple((prev) => clampSimple(simpleSpeedMode, { ...prev, ...patch }));
  };

  // ✅ optional: MUI Slider handler factory
  const onSlider = (key: SafeKey) => (_: Event, v: number | number[]) => {
    const raw = Array.isArray(v) ? v[0] : v;

    setSimple((prev) => {
      const patched = { ...prev, [key]: raw };
      const clamped = clampSimple(simpleSpeedMode, patched);
      const constrained = applySafeConstraintsForDraggedParameter(clamped, key);
      return clampSimple(simpleSpeedMode, constrained);
    });
  };

  const sliderCfg = useMemo(() => cfgShift[simpleSpeedMode], [simpleSpeedMode]);

  const scoreRanges = useMemo(() => getScoreRanges(simpleSpeedMode), [simpleSpeedMode]);

  const setCategoryScore = (categoryId: BuiltInCategoryId, targetScore: number) => {
    setSimple((prev) => {
      const weights = formulaWeights[categoryId];
      if (!weights) return prev;

      return adjustSimpleForScoreTargetGlobal({
        simple: prev,
        targetScore,
        weights,
        ranges: scoreRanges,
        clampSimpleWithMode: (s) => clampSimple(simpleSpeedMode, s),
        projectToSafeRegion: (s) => projectToSafeRegion(s),
      });
    });
  };

  const setCustomCategoryScore = (weights: CleanWeights, targetScore: number) => {
    setSimple((prev) =>
      adjustSimpleForScoreTargetGlobal({
        simple: prev,
        targetScore,
        weights,
        ranges: scoreRanges,
        clampSimpleWithMode: (s) => clampSimple(simpleSpeedMode, s),
        projectToSafeRegion: (s) => projectToSafeRegion(s),
      })
    );
  };

  function quantizeBounds(mode: SpeedMode, b: SafeBounds): SafeBounds {
    // helper: auf das Slider-Grid runden + clampen
    const q = (k: SafeKey, x: number) => clampToCfg(mode, k as any, x);

    const out: SafeBounds = { ...b } as any;

    // Steps: immer ganzzahlig + 1-step grid
    out.totalSteps = {
      min: Math.round(b.totalSteps.min),
      max: Math.round(b.totalSteps.max),
    };

    // Optional: alles andere aufs Grid (damit Marks/Bar exakt sitzen)
    out.stepRatioPct = { min: Math.round(b.stepRatioPct.min), max: Math.round(b.stepRatioPct.max) };
    out.highCfg = { min: q("highCfg", b.highCfg.min), max: q("highCfg", b.highCfg.max) };
    out.highShift = { min: q("highShift", b.highShift.min), max: q("highShift", b.highShift.max) };
    out.highStrength = {
      min: q("highStrength", b.highStrength.min),
      max: q("highStrength", b.highStrength.max),
    };

    // nochmal clampen falls min/max minimal “driften”
    out.totalSteps.min = clamp(
      out.totalSteps.min,
      cfgShift[mode].totalSteps.min,
      cfgShift[mode].totalSteps.max
    );
    out.totalSteps.max = clamp(
      out.totalSteps.max,
      cfgShift[mode].totalSteps.min,
      cfgShift[mode].totalSteps.max
    );

    // falls rounding min > max erzeugt (kann passieren bei sehr schmalen ranges)
    if (out.totalSteps.min > out.totalSteps.max) {
      const m = out.totalSteps.min;
      out.totalSteps.min = out.totalSteps.max = m;
    }

    return out;
  }

  function getBounds(activeKey: SafeKey, activeValue: number): SafeBounds | null {
    const cands = edgeCandidates(activeKey, activeValue);
    if (!cands.length) return null;
    const raw = boundsFromCandidates(cands);
    return quantizeBounds(simpleSpeedMode, raw);
  }

  function adjustSimpleForScoreTargetGlobal(args: {
    simple: SimpleReal;
    targetScore: number;
    weights: CleanWeights;
    ranges: ScoreRanges;
    clampSimpleWithMode: (s: SimpleReal) => SimpleReal;
    projectToSafeRegion: (s: SimpleReal) => SimpleReal;
  }): SimpleReal {
    const { simple, targetScore, weights, ranges, clampSimpleWithMode, projectToSafeRegion } = args;

    let current = projectToSafeRegion(clampSimpleWithMode(simple));
    const target = clamp(targetScore, 0, 100);

    const featureMap = [
      { weightKey: "steps" as const, simpleKey: "totalSteps" as const },
      { weightKey: "ratio" as const, simpleKey: "stepRatioPct" as const },
      { weightKey: "shift" as const, simpleKey: "highShift" as const },
      { weightKey: "cfg" as const, simpleKey: "highCfg" as const },
      { weightKey: "strength" as const, simpleKey: "highStrength" as const },
    ];

    let best = current;
    let bestError = Infinity;

    for (let iter = 0; iter < 25; iter++) {
      const values01 = simpleToNormalizedValues(current, ranges);
      const currentScore = Math.round(applyWeights(weights, values01) * 100);
      const error = target - currentScore;

      if (Math.abs(error) < Math.abs(bestError)) {
        best = current;
        bestError = error;
      }

      if (Math.abs(error) < 1) break;

      let draft = { ...current };

      for (const entry of featureMap) {
        const w = weights[entry.weightKey] ?? 0;
        if (!w) continue;

        const current01 = values01[entry.weightKey];
        const direction = Math.sign(error) * Math.sign(w);
        const step01 = Math.min(0.08, (Math.abs(error) / 100) * Math.abs(w) * 0.35);

        const next01 = clamp(current01 + direction * step01, 0, 1);
        const denorm = denormalizeSimpleValue(entry.weightKey, next01, ranges);

        (draft as any)[entry.simpleKey] = denorm;
      }

      draft = clampSimpleWithMode(draft);
      draft = projectToSafeRegion(draft);
      current = clampSimpleWithMode(draft);
    }

    return best;
  }

  return {
    v2vTab,
    setV2vTab,
    catView,
    setCatView,

    simpleSpeedMode,
    setSimpleSpeedMode,

    // ✅ real values object
    simple,
    onChangeSimple,

    // ✅ ready-to-use handlers
    onTotalSteps: onSlider("totalSteps"),
    onRatio: onSlider("stepRatioPct"),
    onShift: onSlider("highShift"),
    onCfg: onSlider("highCfg"),
    onStrength: onSlider("highStrength"),

    // ✅ config for UI
    sliderCfg,

    getBounds,
    roundTo,
    simulateSliderChange,
    setCategoryScore,
    setCustomCategoryScore,
    replaceSimple,
  };
}

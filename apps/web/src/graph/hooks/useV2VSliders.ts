import { useEffect, useMemo, useState } from "react";

export type V2VTab = "simple" | "advanced";
export type CatView = "sliders" | "pentagon";
export type SimpleSpeedMode = "quality" | "quick";

export type SliderConfig = {
  min: number;
  max: number;
  step: number;
  decimals?: number;
};

export type SafePreset = {
  name: string;
  stepsTotal: number;
  lowRatio: number; // lowSteps/stepsTotal
  cfgHigh: number;
  shiftHigh: number;
  strengthHigh: number;
};

export type SafeKey = "totalSteps" | "stepRatioPct" | "highCfg" | "highShift" | "highStrength";

type MixCandidate = { i: number; j: number; t: number; v: Record<SafeKey, number> };

export type SimpleReal = {
  totalSteps: number; // int: quick 4..5, quality 20..24
  stepRatioPct: number; // int: 50..80
  highShift: number; // float: 2.30..3.00 (0.01)
  highCfg: number; // float: 2.20..3.00 (0.01)
  highStrength: number; // float: 0.20..0.45 (0.01)
};

export type SafeBounds = Record<SafeKey, { min: number; max: number }>;

export const SAFE_PRESETS: SafePreset[] = [
  {
    name: "Motion",
    stepsTotal: 20,
    lowRatio: 10 / 20,
    cfgHigh: 2.5,
    shiftHigh: 2.95,
    strengthHigh: 0.44,
  },
  {
    name: "Creativity",
    stepsTotal: 20,
    lowRatio: 12 / 20,
    cfgHigh: 2.2,
    shiftHigh: 2.9,
    strengthHigh: 0.4,
  },
  {
    name: "Prompt",
    stepsTotal: 20,
    lowRatio: 14 / 20,
    cfgHigh: 3.0,
    shiftHigh: 2.5,
    strengthHigh: 0.3,
  },
  {
    name: "Video",
    stepsTotal: 20,
    lowRatio: 16 / 20,
    cfgHigh: 3.0,
    shiftHigh: 2.3,
    strengthHigh: 0.2,
  },
  {
    name: "Transition",
    stepsTotal: 24,
    lowRatio: 16 / 24,
    cfgHigh: 3.0,
    shiftHigh: 2.5,
    strengthHigh: 0.3,
  },
];

const SAFE_PRESETS_U = SAFE_PRESETS.map(presetToSliderUnits);

const cfgShift: Record<SimpleSpeedMode, Record<keyof SimpleReal, SliderConfig>> = {
  quick: {
    totalSteps: { min: 4, max: 5, step: 1, decimals: 0 },
    stepRatioPct: { min: 50, max: 80, step: 1, decimals: 0 },
    highShift: { min: 2.3, max: 3.0, step: 0.01, decimals: 2 },
    highCfg: { min: 2.2, max: 3.0, step: 0.01, decimals: 2 },
    highStrength: { min: 0.2, max: 0.45, step: 0.01, decimals: 2 },
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

function clampToCfg(mode: SimpleSpeedMode, key: keyof SimpleReal, v: number) {
  const c = cfgShift[mode][key];
  const stepped = Math.round((v - c.min) / c.step) * c.step + c.min;
  const clamped = clamp(stepped, c.min, c.max);
  const d = c.decimals ?? 6;
  return Number(clamped.toFixed(d));
}

function clampSimple(mode: SimpleSpeedMode, s: SimpleReal): SimpleReal {
  return {
    totalSteps: clampToCfg(mode, "totalSteps", s.totalSteps),
    stepRatioPct: clampToCfg(mode, "stepRatioPct", s.stepRatioPct),
    highShift: clampToCfg(mode, "highShift", s.highShift),
    highCfg: clampToCfg(mode, "highCfg", s.highCfg),
    highStrength: clampToCfg(mode, "highStrength", s.highStrength),
  };
}

export function useV2VSliders() {
  const [v2vTab, setV2vTab] = useState<V2VTab>("simple");
  const [catView, setCatView] = useState<CatView>("sliders");
  const [simpleSpeedMode, setSimpleSpeedMode] = useState<SimpleSpeedMode>("quality");

  function roundTo(x: number, decimals: number) {
    const f = 10 ** decimals;
    return Math.round(x * f) / f;
  }

  function simulateSliderChange(prev: SimpleReal, key: SafeKey, raw: number): SimpleReal {
    const patched = { ...prev, [key]: raw };
    const clamped = clampSimple(simpleSpeedMode, patched);

    if (simpleSpeedMode === "quick") return clamped;

    const constrained = applySafeConstraints(clamped, key);
    return clampSimple(simpleSpeedMode, constrained);
  }

  function edgeCandidates(activeKey: SafeKey, activeValue: number): MixCandidate[] {
    const out: MixCandidate[] = [];

    for (let i = 0; i < SAFE_PRESETS_U.length; i++) {
      for (let j = i + 1; j < SAFE_PRESETS_U.length; j++) {
        const ai = SAFE_PRESETS_U[i][activeKey];
        const aj = SAFE_PRESETS_U[j][activeKey];
        const denom = ai - aj;

        if (Math.abs(denom) < 1e-9) continue;

        const t = (activeValue - aj) / denom;
        if (t < 0 || t > 1) continue;

        const v: any = {};
        (Object.keys(SAFE_PRESETS_U[i]) as SafeKey[]).forEach((k) => {
          v[k] = t * SAFE_PRESETS_U[i][k] + (1 - t) * SAFE_PRESETS_U[j][k];
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

  function applySafeConstraints(simple: SimpleReal, activeKey: SafeKey): SimpleReal {
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

  // ✅ wenn mode wechselt → Werte in neuen Bereich clampen
  useEffect(() => {
    setSimple((prev) => {
      const c = clampSimple(simpleSpeedMode, prev);
      if (simpleSpeedMode === "quick") return c;
      const constrained = applySafeConstraints(c, "totalSteps");
      return clampSimple(simpleSpeedMode, constrained);
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

      if (simpleSpeedMode === "quick") {
        // In quick: NUR cfg clampen, keine SAFE hull constraints
        return clamped;
      }

      const constrained = applySafeConstraints(clamped, key);
      return clampSimple(simpleSpeedMode, constrained);
    });
  };

  const sliderCfg = useMemo(() => cfgShift[simpleSpeedMode], [simpleSpeedMode]);

  function quantizeBounds(mode: SimpleSpeedMode, b: SafeBounds): SafeBounds {
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
    if (simpleSpeedMode === "quick") return null;
    const cands = edgeCandidates(activeKey, activeValue);
    if (!cands.length) return null;
    const raw = boundsFromCandidates(cands);
    return quantizeBounds(simpleSpeedMode, raw);
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
  };
}

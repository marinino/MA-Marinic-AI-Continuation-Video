import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Stack,
  TextField,
  Button,
  LinearProgress,
  Typography,
  Box,
  Divider,
  Paper,
  Slider,
  ButtonGroup,
  Grid,
} from "@mui/material";

// ⬇️ falls dein PentagonMap woanders liegt: Pfad anpassen
import { PentagonMap } from "../components/PentagonMap";
import { useV2VSliders } from "../hooks/useV2VSliders";
import { computeCategoryScoresFromSimple } from "../hooks/useV2VParams";

export type V2VTab = "simple" | "advanced";
type CatView = "sliders" | "pentagon";

export type AdvancedParamsState = {
  lowNoiseCfg: number;
  highNoiseCfg: number;
  lowNoiseModelStrength: number;
  highNoiseModelStrength: number;
  lowNoiseShift: number;
  highNoiseShift: number;
  lowNoiseSteps: number;
  highNoiseSteps: number;
  lowNoiseStartStep: number;
  highNoiseStartStep: number;
  lowNoiseEndStep: number;
  highNoiseEndStep: number;
};

export type CategoryScores = {
  creativity: number;
  promptFaithfulness: number;
  motion: number;
  transitionSmoothness: number;
  videoFaithfulness: number;
};

export type ClipDialogProps = {
  open: boolean;
  tab: V2VTab;
  onTabChange: (tab: V2VTab) => void;

  prompt: string;
  onPromptChange: (v: string) => void;

  // Simple sliders (0..100)
  simpleTotalSteps: number;
  simpleStepRatio: number;
  simpleHighShift: number;
  simpleHighCfg: number;
  simpleHighStrength: number;

  onChangeTotalSteps: (e: Event, v: number | number[]) => void;
  onChangeStepRatio: (e: Event, v: number | number[]) => void;
  onChangeHighShift: (e: Event, v: number | number[]) => void;
  onChangeHighCfg: (e: Event, v: number | number[]) => void;
  onChangeHighStrength: (e: Event, v: number | number[]) => void;

  // Advanced
  advanced: AdvancedParamsState;
  onAdvancedChange: (patch: Partial<AdvancedParamsState>) => void;

  // Optional overrides (falls du später wieder “dumb dialog” willst)
  categoriesPanel?: React.ReactNode;
  computedParamsPanel?: React.ReactNode;

  generating?: boolean;
  statusText?: string;
  previewUrl?: string | null;

  onClose: () => void;
  onStart: () => void;
  startDisabled?: boolean;

  simpleSpeedMode: "quality" | "quick";
  onSimpleSpeedModeChange: (m: "quality" | "quick") => void;
};

type SafePreset = {
  name: string;
  stepsTotal: number;
  lowRatio: number; // lowSteps/stepsTotal
  cfgHigh: number;
  shiftHigh: number;
  strengthHigh: number;
};

type SimpleSliderKey = "totalSteps" | "stepRatio" | "highShift" | "highCfg" | "highStrength";

type CatKey = keyof CategoryScores;

const INFLUENCE: Record<SimpleSliderKey, Partial<Record<CatKey, number>>> = {
  totalSteps: {
    transitionSmoothness: +0.55,
  },
  stepRatio: {
    promptFaithfulness: +0.15,
    videoFaithfulness: +0.55,
    transitionSmoothness: +0.45,
    motion: -0.2,
    creativity: -0.25,
  },
  highShift: {
    videoFaithfulness: -0.3,
    motion: +0.45,
    creativity: +0.45,
  },
  highCfg: {
    promptFaithfulness: +0.85,
    creativity: -0.2,
  },
  highStrength: {
    videoFaithfulness: -0.15,
    motion: +0.45,
    creativity: +0.35,
  },
};

/* ========= helpers (wie im mega-file) ========= */

const SAFE_PRESETS: SafePreset[] = [
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

const SAFE_R = {
  stepsTotal: { min: 20, max: 24 },
  lowRatio: { min: 0.5, max: 0.8 },
  cfgHigh: { min: 2.2, max: 3.0 },
  shiftHigh: { min: 2.3, max: 2.95 },
  strengthHigh: { min: 0.2, max: 0.44 },
};

function norm01(x: number, min: number, max: number) {
  if (max === min) return 0;
  return clamp((x - min) / (max - min), 0, 1);
}

function dist2Safe(a: SafePreset, b: SafePreset) {
  return (
    (norm01(a.stepsTotal, SAFE_R.stepsTotal.min, SAFE_R.stepsTotal.max) -
      norm01(b.stepsTotal, SAFE_R.stepsTotal.min, SAFE_R.stepsTotal.max)) **
      2 +
    (norm01(a.lowRatio, SAFE_R.lowRatio.min, SAFE_R.lowRatio.max) -
      norm01(b.lowRatio, SAFE_R.lowRatio.min, SAFE_R.lowRatio.max)) **
      2 +
    (norm01(a.cfgHigh, SAFE_R.cfgHigh.min, SAFE_R.cfgHigh.max) -
      norm01(b.cfgHigh, SAFE_R.cfgHigh.min, SAFE_R.cfgHigh.max)) **
      2 +
    (norm01(a.shiftHigh, SAFE_R.shiftHigh.min, SAFE_R.shiftHigh.max) -
      norm01(b.shiftHigh, SAFE_R.shiftHigh.min, SAFE_R.shiftHigh.max)) **
      2 +
    (norm01(a.strengthHigh, SAFE_R.strengthHigh.min, SAFE_R.strengthHigh.max) -
      norm01(b.strengthHigh, SAFE_R.strengthHigh.min, SAFE_R.strengthHigh.max)) **
      2
  );
}

function softmaxWeights(d2s: number[], temperature = 0.12) {
  const invT = 1 / Math.max(temperature, 1e-6);
  const xs = d2s.map((d2) => Math.exp(-d2 * invT));
  const sum = xs.reduce((a, b) => a + b, 0) || 1;
  return xs.map((x) => x / sum);
}

function projectToSafe(current: SafePreset, temperature = 0.12): SafePreset {
  const d2s = SAFE_PRESETS.map((p) => dist2Safe(current, p));
  const w = softmaxWeights(d2s, temperature);

  const mixed = SAFE_PRESETS.reduce(
    (acc, p, i) => {
      const wi = w[i];
      acc.stepsTotal += wi * p.stepsTotal;
      acc.lowRatio += wi * p.lowRatio;
      acc.cfgHigh += wi * p.cfgHigh;
      acc.shiftHigh += wi * p.shiftHigh;
      acc.strengthHigh += wi * p.strengthHigh;
      return acc;
    },
    { name: "Projected", stepsTotal: 0, lowRatio: 0, cfgHigh: 0, shiftHigh: 0, strengthHigh: 0 }
  );

  // clamp to safe bounds (extra safety)
  mixed.stepsTotal = clamp(mixed.stepsTotal, SAFE_R.stepsTotal.min, SAFE_R.stepsTotal.max);
  mixed.lowRatio = clamp(mixed.lowRatio, SAFE_R.lowRatio.min, SAFE_R.lowRatio.max);
  mixed.cfgHigh = clamp(mixed.cfgHigh, SAFE_R.cfgHigh.min, SAFE_R.cfgHigh.max);
  mixed.shiftHigh = clamp(mixed.shiftHigh, SAFE_R.shiftHigh.min, SAFE_R.shiftHigh.max);
  mixed.strengthHigh = clamp(mixed.strengthHigh, SAFE_R.strengthHigh.min, SAFE_R.strengthHigh.max);

  return mixed;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function smoothstep01(x: number) {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
}

function sliderToRange(slider: number, min: number, max: number, easing?: (t: number) => number) {
  const t0 = clamp(slider, 0, 100) / 100;
  const t = easing ? easing(t0) : t0;
  return min + t * (max - min);
}

function sliderToIntRange(slider: number, min: number, max: number) {
  return Math.round(sliderToRange(slider, min, max));
}

type CategoryScores01 = {
  creativity: number;
  promptFaithfulness: number;
  motion: number;
  transitionSmoothness: number;
  videoFaithfulness: number;
};

function computeCategoryScoresFromSimple01(
  s: {
    totalSteps: number;
    stepRatio: number;
    highShift: number;
    highCfg: number;
    highStrength: number;
  },
  stepsMinMax: { min: number; max: number }
): CategoryScores01 {
  const denom = Math.max(1e-6, stepsMinMax.max - stepsMinMax.min);
  const steps01 = clamp((s.totalSteps - stepsMinMax.min) / denom, 0, 1);

  const ratio01 = clamp((s.stepRatio - 50) / (80 - 50), 0, 1);
  const shift01 = clamp((s.highShift - 2.3) / (3.0 - 2.3), 0, 1);
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

  return { creativity, promptFaithfulness, motion, transitionSmoothness, videoFaithfulness };
}


function deriveV2VParamsFromSimple(opts: {
  totalSteps: number;
  stepRatio01: number; // low Anteil 0..1
  highShift: number;
  highCfg: number;
  highStrength: number;
}) {
  const totalSteps = Math.round(clamp(opts.totalSteps, 1, 100));

  const lowSteps = Math.max(1, Math.round(totalSteps * clamp(opts.stepRatio01, 0, 1)));
  const highSteps = Math.max(1, totalSteps - lowSteps);

  const highStart = 0;
  const highEnd = highSteps;

  const lowStart = highEnd;
  const lowEnd = highEnd + lowSteps;

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



/* ========= UI helpers ========= */

function ReadonlySlider(props: { label: string; value: number; sx?: any }) {
  return (
    <Box sx={props.sx}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2">{props.label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>
      <Slider value={props.value} min={0} max={100} step={1} sx={{ pointerEvents: "none" }} />
    </Box>
  );
}

function PressableSlider(props: {
  sliderKey: SimpleSliderKey;
  activeKey: SimpleSliderKey | null;
  onBegin: (k: SimpleSliderKey) => void;
  onEnd: () => void;
  value: number;
  onChange: (e: Event, v: number | number[]) => void;
}) {
  const { sliderKey, onBegin, onEnd, value, onChange } = props;

  return (
    <Box
      // CAPTURE => feuert bevor MUI intern Dinge “schluckt”
      onPointerDownCapture={() => onBegin(sliderKey)}
      onMouseDownCapture={() => onBegin(sliderKey)}
      onTouchStartCapture={() => onBegin(sliderKey)}
      // wenn Pointer irgendwo anders endet
      onPointerUpCapture={onEnd}
      onPointerCancelCapture={onEnd}
      sx={{
        // wichtig: damit Touch zuverlässig als Drag durchgeht
        touchAction: "none",
      }}
    >
      <Slider
        value={value}
        step={1}
        onChange={onChange}
        // wenn Drag fertig => end
        onChangeCommitted={onEnd as any}
      />
    </Box>
  );
}

export function ClipDialog(p: ClipDialogProps) {
  const [catView, setCatView] = React.useState<CatView>("sliders");
  const [activeSimple, setActiveSimple] = React.useState<SimpleSliderKey | null>(null);

  const [activeEffects, setActiveEffects] = React.useState<Partial<Record<CatKey, number>> | null>(
    null
  );

function beginDrag(key: SimpleSliderKey) {
  setActiveSimple(key);
  setActiveEffects(computeEffectsFor(key));
}

function endDrag() {
  setActiveSimple(null);
  setActiveEffects(null);
}


React.useEffect(() => {
  if (!activeSimple) return;

  const onUp = () => {
    setActiveSimple(null);
    setActiveEffects(null);
  };

  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);
  return () => {
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
  };
}, [activeSimple]);


  // --- compute real values + derived params exactly like mega-file ---
  const computed = React.useMemo(() => {
    const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };
    const totalStepsReal = sliderToIntRange(p.simpleTotalSteps, stepsRange.min, stepsRange.max);

    const stepRatioPct = sliderToRange(p.simpleStepRatio, 50, 80);
    const stepRatio01 = stepRatioPct / 100;

    const highShiftReal = sliderToRange(p.simpleHighShift, 2.3, 3.0, smoothstep01);
    const highCfgReal = sliderToRange(p.simpleHighCfg, 2.5, 3.0);
    const highStrengthReal = sliderToRange(p.simpleHighStrength, 0.2, 0.45, smoothstep01);

    // ✅ project into safe space (only in quality mode)
    let safe = {
      name: "Current",
      stepsTotal: totalStepsReal,
      lowRatio: stepRatio01,
      cfgHigh: highCfgReal,
      shiftHigh: highShiftReal,
      strengthHigh: highStrengthReal,
    };

    if (p.simpleSpeedMode === "quality") {
      safe = projectToSafe(safe, 0.12);
    }

    // use the projected values

    // derive from SAFE params
    const d = deriveV2VParamsFromSimple({
      totalSteps: Math.round(safe.stepsTotal),
      stepRatio01: safe.lowRatio,
      highShift: safe.shiftHigh,
      highCfg: safe.cfgHigh,
      highStrength: safe.strengthHigh,
    });

    const scores = computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(safe.stepsTotal),
        stepRatio: safe.lowRatio * 100,
        highShift: safe.shiftHigh,
        highCfg: safe.cfgHigh,
        highStrength: safe.strengthHigh,
      },
      stepsRange
    );

    return {
      // raw values (optional, for debugging)
      totalStepsReal,
      stepRatioPct,
      highShiftReal,
      highCfgReal,
      highStrengthReal,

      // projected values (these are what you actually use)
      safe,

      derived: d,
      scores,
    };
  }, [
    p.simpleSpeedMode,
    p.simpleTotalSteps,
    p.simpleStepRatio,
    p.simpleHighShift,
    p.simpleHighCfg,
    p.simpleHighStrength,
  ]);

  function computeScores01FromUISliders(ui: {
  totalSteps: number;
  stepRatio: number;
  highShift: number;
  highCfg: number;
  highStrength: number;
}): CategoryScores01 {
  const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

  const totalStepsReal = sliderToIntRange(ui.totalSteps, stepsRange.min, stepsRange.max);
  const stepRatioPct = sliderToRange(ui.stepRatio, 50, 80);
  const stepRatio01 = stepRatioPct / 100;

  const highShiftReal = sliderToRange(ui.highShift, 2.3, 3.0, smoothstep01);
  const highCfgReal = sliderToRange(ui.highCfg, 2.5, 3.0);
  const highStrengthReal = sliderToRange(ui.highStrength, 0.2, 0.45, smoothstep01);

  let safe = {
    name: "Current",
    stepsTotal: totalStepsReal,
    lowRatio: stepRatio01,
    cfgHigh: highCfgReal,
    shiftHigh: highShiftReal,
    strengthHigh: highStrengthReal,
  };

  if (p.simpleSpeedMode === "quality") {
    safe = projectToSafe(safe, 0.12);
  }

  return computeCategoryScoresFromSimple01(
    {
      totalSteps: Math.round(safe.stepsTotal),
      stepRatio: safe.lowRatio * 100,
      highShift: safe.shiftHigh,
      highCfg: safe.cfgHigh,
      highStrength: safe.strengthHigh,
    },
    stepsRange
  );
}

function computeScores01FromRealParams(x: {
  totalStepsReal: number;       // <-- int, z.B. 20..24
  stepRatioSlider: number;      // 0..100
  highShiftSlider: number;      // 0..100
  highCfgSlider: number;        // 0..100
  highStrengthSlider: number;   // 0..100
}): CategoryScores01 {
  const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

  const stepRatioPct = sliderToRange(x.stepRatioSlider, 50, 80);
  const stepRatio01 = stepRatioPct / 100;

  const highShiftReal = sliderToRange(x.highShiftSlider, 2.3, 3.0, smoothstep01);
  const highCfgReal = sliderToRange(x.highCfgSlider, 2.5, 3.0);
  const highStrengthReal = sliderToRange(x.highStrengthSlider, 0.2, 0.45, smoothstep01);

  let safe = {
    name: "Current",
    stepsTotal: x.totalStepsReal,
    lowRatio: stepRatio01,
    cfgHigh: highCfgReal,
    shiftHigh: highShiftReal,
    strengthHigh: highStrengthReal,
  };

  if (p.simpleSpeedMode === "quality") {
    safe = projectToSafe(safe, 0.12);
  }

  return computeCategoryScoresFromSimple01(
    {
      totalSteps: Math.round(safe.stepsTotal),
      stepRatio: safe.lowRatio * 100,
      highShift: safe.shiftHigh,
      highCfg: safe.cfgHigh,
      highStrength: safe.strengthHigh,
    },
    stepsRange
  );
}


  function computeScoresFromUISliders(ui: {
    totalSteps: number; // 0..100
    stepRatio: number; // 0..100
    highShift: number; // 0..100
    highCfg: number; // 0..100
    highStrength: number; // 0..100
  }): CategoryScores {
    const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

    const totalStepsReal = sliderToIntRange(ui.totalSteps, stepsRange.min, stepsRange.max);

    const stepRatioPct = sliderToRange(ui.stepRatio, 50, 80);
    const stepRatio01 = stepRatioPct / 100;

    const highShiftReal = sliderToRange(ui.highShift, 2.3, 3.0, smoothstep01);
    const highCfgReal = sliderToRange(ui.highCfg, 2.5, 3.0);
    const highStrengthReal = sliderToRange(ui.highStrength, 0.2, 0.45, smoothstep01);

    let safe = {
      name: "Current",
      stepsTotal: totalStepsReal,
      lowRatio: stepRatio01,
      cfgHigh: highCfgReal,
      shiftHigh: highShiftReal,
      strengthHigh: highStrengthReal,
    };

    if (p.simpleSpeedMode === "quality") {
      safe = projectToSafe(safe, 0.12);
    }

    return computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(safe.stepsTotal),
        stepRatio: safe.lowRatio * 100,
        highShift: safe.shiftHigh,
        highCfg: safe.cfgHigh,
        highStrength: safe.strengthHigh,
      },
      stepsRange
    );
  }

  function clamp01_100(v: number) {
    return Math.max(0, Math.min(100, v));
  }

  function computeScoresFromRealParams(args: {
  totalStepsReal: number; // ✅ real steps (z.B. 20..24 oder 4..5)
  stepRatioSlider: number; // 0..100
  highShiftSlider: number; // 0..100
  highCfgSlider: number; // 0..100
  highStrengthSlider: number; // 0..100
}): CategoryScores {
  const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

  // die restlichen slider normal in reale Werte umrechnen
  const stepRatioPct = sliderToRange(args.stepRatioSlider, 50, 80);
  const stepRatio01 = stepRatioPct / 100;

  const highShiftReal = sliderToRange(args.highShiftSlider, 2.3, 3.0, smoothstep01);
  const highCfgReal = sliderToRange(args.highCfgSlider, 2.5, 3.0);
  const highStrengthReal = sliderToRange(args.highStrengthSlider, 0.2, 0.45, smoothstep01);

  let safe = {
    name: "Current",
    stepsTotal: args.totalStepsReal,
    lowRatio: stepRatio01,
    cfgHigh: highCfgReal,
    shiftHigh: highShiftReal,
    strengthHigh: highStrengthReal,
  };

  if (p.simpleSpeedMode === "quality") {
    safe = projectToSafe(safe, 0.12);
  }

  return computeCategoryScoresFromSimple(
    {
      totalSteps: Math.round(safe.stepsTotal),
      stepRatio: safe.lowRatio * 100,
      highShift: safe.shiftHigh,
      highCfg: safe.cfgHigh,
      highStrength: safe.strengthHigh,
    },
    stepsRange
  );
}


function computeEffectsFor(key: SimpleSliderKey): Partial<Record<CatKey, number>> {
  const baseUI = {
    totalSteps: p.simpleTotalSteps,
    stepRatio: p.simpleStepRatio,
    highShift: p.simpleHighShift,
    highCfg: p.simpleHighCfg,
    highStrength: p.simpleHighStrength,
  };

  // --- SPECIAL CASE: totalSteps ist DISKRET ---
if (key === "totalSteps") {
  const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };
  const curReal = sliderToIntRange(baseUI.totalSteps, stepsRange.min, stepsRange.max);

  const nextReal = Math.min(stepsRange.max, curReal + 1);
  const prevReal = Math.max(stepsRange.min, curReal - 1);

  const sCur = computeScoresFromRealParams({
    totalStepsReal: curReal,
    stepRatioSlider: baseUI.stepRatio,
    highShiftSlider: baseUI.highShift,
    highCfgSlider: baseUI.highCfg,
    highStrengthSlider: baseUI.highStrength,
  });

  // wenn wir hoch können => forward diff (zeigt wirklich "was passiert wenn ich Steps erhöhe")
  if (nextReal !== curReal) {
    const sNext = computeScoresFromRealParams({
      totalStepsReal: nextReal,
      stepRatioSlider: baseUI.stepRatio,
      highShiftSlider: baseUI.highShift,
      highCfgSlider: baseUI.highCfg,
      highStrengthSlider: baseUI.highStrength,
    });

    const out: Partial<Record<CatKey, number>> = {};
    (Object.keys(sCur) as CatKey[]).forEach((cat) => {
      out[cat] = (sNext[cat] - sCur[cat]); // ✅ score-points pro +1 step
    });
    return out;
  }

  // sonst (am oberen Rand) => backward diff
  const sPrev = computeScoresFromRealParams({
    totalStepsReal: prevReal,
    stepRatioSlider: baseUI.stepRatio,
    highShiftSlider: baseUI.highShift,
    highCfgSlider: baseUI.highCfg,
    highStrengthSlider: baseUI.highStrength,
  });

  const out: Partial<Record<CatKey, number>> = {};
  (Object.keys(sCur) as CatKey[]).forEach((cat) => {
    out[cat] = (sCur[cat] - sPrev[cat]); // ✅ score-points pro +1 step (gedanklich)
  });
  return out;
}


  // --- alle anderen bleiben wie du es schon hast (slider +/- eps) ---
  const eps = 1;
  const x = (baseUI as any)[key] as number;

  const canMinus = x - eps >= 0;
  const canPlus = x + eps <= 100;

  const s0 = computeScores01FromUISliders(baseUI);

  let deriv01: Partial<Record<CatKey, number>> = {};

  if (canMinus && canPlus) {
    const plus = { ...baseUI, [key]: x + eps } as any;
    const minus = { ...baseUI, [key]: x - eps } as any;

    const sP = computeScores01FromUISliders(plus);
    const sM = computeScores01FromUISliders(minus);

    (Object.keys(s0) as CatKey[]).forEach((cat) => {
      deriv01[cat] = (sP[cat] - sM[cat]) / (2 * eps);
    });
  } else if (canPlus) {
    const plus = { ...baseUI, [key]: x + eps } as any;
    const sP = computeScores01FromUISliders(plus);

    (Object.keys(s0) as CatKey[]).forEach((cat) => {
      deriv01[cat] = (sP[cat] - s0[cat]) / eps;
    });
  } else {
    const minus = { ...baseUI, [key]: x - eps } as any;
    const sM = computeScores01FromUISliders(minus);

    (Object.keys(s0) as CatKey[]).forEach((cat) => {
      deriv01[cat] = (s0[cat] - sM[cat]) / eps;
    });
  }

  const out: Partial<Record<CatKey, number>> = {};
  (Object.keys(s0) as CatKey[]).forEach((cat) => {
    out[cat] = (deriv01[cat] ?? 0) * 100;
  });
  return out;
}



  const sliderDragHandlers = (key: SimpleSliderKey) => ({
    onPointerDown: () => beginDrag(key),
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    onBlur: endDrag,
    onMouseLeave: endDrag,
  });

  function catInfluenceSx(cat: CatKey) {
    if (!activeSimple || !activeEffects) return {};

    const d = activeEffects[cat] ?? 0;

    // threshold: tiny numerical noise ignorieren
    const dead = 1e-6;
    const maxD = 0.5;     // sehr sensibel: "0.5 score-points pro slider unit" ist schon stark
    const gamma = 0.7; 
    if (Math.abs(d) < dead) {
      return {
        opacity: 0.25,
        "& .MuiSlider-rail": { opacity: 0.12 },
        "& .MuiSlider-track": { opacity: 0.12 },
        "& .MuiSlider-thumb": { opacity: 0.12 },
      };
    }

    const color = d > 0 ? "#0000ff" : "#ff0000";

    // Intensität: clamp + gamma für deutliche Abstufungen
    
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

  return (
    <Dialog open={p.open} onClose={p.onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Generate Clip – Prompt</DialogTitle>

      <DialogContent sx={{ overscrollBehavior: "contain", touchAction: "none" }}>
        <Tabs value={p.tab} onChange={(_, v) => p.onTabChange(v)} sx={{ mb: 2 }}>
          <Tab value="simple" label="Simple (Sliders)" />
          <Tab value="advanced" label="Advanced (Raw)" />
        </Tabs>

        {p.tab === "simple" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ButtonGroup
              fullWidth
              variant="contained"
              aria-label="Basic button group"
              sx={{
                "& .MuiButton-root:first-of-type": {
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                },
                "& .MuiButton-root:last-of-type": {
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                },
              }}
            >
              <Button
                variant={p.simpleSpeedMode === "quick" ? "contained" : "outlined"}
                onClick={() => p.onSimpleSpeedModeChange("quick")}
              >
                Quick mode (4–5 steps)
              </Button>

              <Button
                variant={p.simpleSpeedMode === "quality" ? "contained" : "outlined"}
                onClick={() => p.onSimpleSpeedModeChange("quality")}
              >
                Quality mode (20–24 steps)
              </Button>
            </ButtonGroup>

            <TextField
              label="Prompt"
              value={p.prompt}
              onChange={(e) => p.onPromptChange(e.target.value)}
              multiline
              minRows={4}
              fullWidth
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: 2,
                alignItems: "stretch",
              }}
            >
              {/* LEFT */}
              <Stack spacing={2}>
                <Stack spacing={2.5}>
                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Total Steps: {p.simpleTotalSteps}%</Typography>
                    <PressableSlider
                      sliderKey="totalSteps"
                      activeKey={activeSimple}
                      onBegin={beginDrag}
                      onEnd={endDrag}
                      value={p.simpleTotalSteps}
                      onChange={p.onChangeTotalSteps}
                    />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Step Ratio: {p.simpleStepRatio}%</Typography>
                    <PressableSlider
                      sliderKey="stepRatio"
                      activeKey={activeSimple}
                      onBegin={beginDrag}
                      onEnd={endDrag}
                      value={p.simpleStepRatio}
                      onChange={p.onChangeStepRatio}
                    />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Shift: {p.simpleHighShift} %</Typography>

                    <PressableSlider
                      sliderKey="highShift"
                      activeKey={activeSimple}
                      onBegin={beginDrag}
                      onEnd={endDrag}
                      value={p.simpleHighShift}
                      onChange={p.onChangeHighShift}
                    />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>CFG: {p.simpleHighCfg}%</Typography>
                    <PressableSlider
                      sliderKey="highCfg"
                      activeKey={activeSimple}
                      onBegin={beginDrag}
                      onEnd={endDrag}
                      value={p.simpleHighCfg}
                      onChange={p.onChangeHighCfg}
                    />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Model strength: {p.simpleHighStrength}%</Typography>
                    <PressableSlider
                      sliderKey="highStrength"
                      activeKey={activeSimple}
                      onBegin={beginDrag}
                      onEnd={endDrag}
                      value={p.simpleHighStrength}
                      onChange={p.onChangeHighStrength}
                    />
                  </Stack>
                </Stack>

                {/* Computed params — mega-file style */}
                {p.computedParamsPanel ? (
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    {p.computedParamsPanel}
                  </Paper>
                ) : (
                  <Paper variant="outlined" sx={{ p: 1.5 }}>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary">
                        Mode: <b>{p.simpleSpeedMode}</b>
                      </Typography>

                      <Typography variant="subtitle2">Computed params</Typography>

                      <Typography variant="body2" color="text.secondary">
                        Steps total: <b>{computed.totalStepsReal}</b> • low%:{" "}
                        <b>{Math.round(computed.stepRatioPct)}%</b>
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        High steps: <b>{computed.derived.highNoiseSteps}</b> (0 →{" "}
                        {computed.derived.highNoiseEndStep})
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Low steps: <b>{computed.derived.lowNoiseSteps}</b> (
                        {computed.derived.lowNoiseStartStep} → {computed.derived.lowNoiseEndStep})
                      </Typography>

                      <Divider sx={{ my: 0.5 }} />

                      <Typography variant="body2" color="text.secondary">
                        High shift:{" "}
                        <b>
                          {computed.highShiftReal.toFixed(2)} → used:{" "}
                          {computed.safe.shiftHigh.toFixed(2)}
                        </b>{" "}
                        • High CFG:{" "}
                        <b>
                          {computed.highCfgReal.toFixed(2)} → used:{" "}
                          {computed.safe.cfgHigh.toFixed(2)}
                        </b>
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        High strength:{" "}
                        <b>
                          {computed.highStrengthReal.toFixed(2)} → used:{" "}
                          {computed.safe.strengthHigh.toFixed(2)}
                        </b>
                      </Typography>

                      <Typography variant="caption" color="text.secondary">
                        (Low params are set to constants on submit.)
                      </Typography>
                    </Stack>
                  </Paper>
                )}
              </Stack>

              <Divider orientation="vertical" flexItem />

              {/* RIGHT */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                {p.categoriesPanel ? (
                  p.categoriesPanel
                ) : (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Categories (read-only)</Typography>

                    <Tabs value={catView} onChange={(_, v) => setCatView(v)} variant="fullWidth">
                      <Tab value="sliders" label="Sliders" />
                      <Tab value="pentagon" label="Pentagon" />
                    </Tabs>

                    {catView === "sliders" ? (
                      <Stack spacing={2}>
                        <ReadonlySlider
                          label="Creativity"
                          value={computed.scores.creativity}
                          sx={catInfluenceSx("creativity")}
                        />

                        <ReadonlySlider
                          label="Prompt faithfulness"
                          value={computed.scores.promptFaithfulness}
                          sx={catInfluenceSx("promptFaithfulness")}
                        />

                        <ReadonlySlider
                          label="Motion"
                          value={computed.scores.motion}
                          sx={catInfluenceSx("motion")}
                        />

                        <ReadonlySlider
                          label="Transition Smoothness"
                          value={computed.scores.transitionSmoothness}
                          sx={catInfluenceSx("transitionSmoothness")}
                        />

                        <ReadonlySlider
                          label="Video Faithfulness"
                          value={computed.scores.videoFaithfulness}
                          sx={catInfluenceSx("videoFaithfulness")}
                        />
                      </Stack>
                    ) : (
                      <PentagonMap scores={computed.scores} size={260} showRadarPolygon />
                    )}
                  </Stack>
                )}
              </Paper>
            </Box>

            {p.generating && <LinearProgress />}

            {p.statusText && (
              <Typography variant="body2" color="text.secondary">
                {p.statusText}
              </Typography>
            )}

            {p.previewUrl && (
              <video src={p.previewUrl} controls style={{ width: "100%", borderRadius: 8 }} />
            )}
          </Stack>
        )}

        {p.tab === "advanced" && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                label="Prompt"
                value={p.prompt}
                onChange={(e) => p.onPromptChange(e.target.value)}
                multiline
                minRows={4}
                fullWidth
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise CFG"
                value={p.advanced.lowNoiseCfg}
                onChange={(e) => p.onAdvancedChange({ lowNoiseCfg: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise CFG"
                value={p.advanced.highNoiseCfg}
                onChange={(e) => p.onAdvancedChange({ highNoiseCfg: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise Model Strength"
                value={p.advanced.lowNoiseModelStrength}
                onChange={(e) =>
                  p.onAdvancedChange({ lowNoiseModelStrength: Number(e.target.value) })
                }
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise Model Strength"
                value={p.advanced.highNoiseModelStrength}
                onChange={(e) =>
                  p.onAdvancedChange({ highNoiseModelStrength: Number(e.target.value) })
                }
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise Shift"
                value={p.advanced.lowNoiseShift}
                onChange={(e) => p.onAdvancedChange({ lowNoiseShift: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise Shift"
                value={p.advanced.highNoiseShift}
                onChange={(e) => p.onAdvancedChange({ highNoiseShift: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise Steps"
                value={p.advanced.lowNoiseSteps}
                onChange={(e) => p.onAdvancedChange({ lowNoiseSteps: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise Steps"
                value={p.advanced.highNoiseSteps}
                onChange={(e) => p.onAdvancedChange({ highNoiseSteps: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise Start Step"
                value={p.advanced.lowNoiseStartStep}
                onChange={(e) => p.onAdvancedChange({ lowNoiseStartStep: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise Start Step"
                value={p.advanced.highNoiseStartStep}
                onChange={(e) => p.onAdvancedChange({ highNoiseStartStep: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="Low Noise End Step"
                value={p.advanced.lowNoiseEndStep}
                onChange={(e) => p.onAdvancedChange({ lowNoiseEndStep: Number(e.target.value) })}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                type="number"
                label="High Noise End Step"
                value={p.advanced.highNoiseEndStep}
                onChange={(e) => p.onAdvancedChange({ highNoiseEndStep: Number(e.target.value) })}
                fullWidth
              />
            </Grid>

            {p.generating && <LinearProgress />}

            {p.statusText && (
              <Typography variant="body2" color="text.secondary">
                {p.statusText}
              </Typography>
            )}

            {p.previewUrl && (
              <video src={p.previewUrl} controls style={{ width: "100%", borderRadius: 8 }} />
            )}
          </Grid>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onClose}>Close</Button>
        <Button
          variant="contained"
          onClick={p.onStart}
          disabled={p.startDisabled ?? !p.prompt.trim()}
        >
          Start COMFYUI Generation
        </Button>
      </DialogActions>
    </Dialog>
  );
}

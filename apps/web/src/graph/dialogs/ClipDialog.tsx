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
  Tooltip,
  ButtonBase,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";

// ⬇️ falls dein PentagonMap woanders liegt: Pfad anpassen
import { PentagonMap } from "../components/PentagonMap";
import {
  SAFE_PRESETS,
  SafeKey,
  SafePreset,
  SimpleReal,
  SliderConfig,
  useV2VSliders,
} from "../hooks/useV2VSliders";
import {
  computeCategoryScoresFromSimple,
  CustomScoreSlider,
  DEFAULT_CUSTOM_W,
  DEFAULT_FORMULA_WEIGHTS,
  deriveV2VParamsFromSimple,
  FormulaWeights,
} from "../hooks/useV2VParams";
import { WeightsDialog } from "./WeightsDialog";
import {
  loadCustomSliders,
  loadFormulaWeights,
  saveCustomSliders,
  saveFormulaWeights,
} from "../../utils/weightsStorage";
import { NewCustomSliderDialog } from "./NewSliderDialog";
import { PentagonAxesDialog } from "./PentagonAxesDialog";

export type V2VTab = "simple" | "advanced";
type CatView = "sliders" | "pentagon";

type Mark = { value: number; label?: React.ReactNode };

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

type SimpleSliderKey = keyof SimpleReal; // statt eigener keys, wenn du willst

export type ClipDialogProps = {
  open: boolean;
  tab: V2VTab;
  onTabChange: (tab: V2VTab) => void;

  prompt: string;
  onPromptChange: (v: string) => void;

  length: number;
  onLengthChange: (l: number) => void;

  // Simple sliders (0..100)
  simple: SimpleReal; // <-- EIN Objekt, echte Werte

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
  sliderCfg: Record<keyof SimpleReal, SliderConfig>;

  getBounds: (k: SafeKey, v: number) => Record<SafeKey, { min: number; max: number }> | null;
  roundTo: (x: number, decimals: number) => number;
  simulateSliderChange: (prev: SimpleReal, key: SafeKey, raw: number) => SimpleReal;
};

type CatKey = keyof CategoryScores;

type SpeedMode = "quick" | "quality";

type AxisId = keyof CategoryScores | string; // "creativity" | ... | "custom:..."

const DEFAULT_AXIS_IDS: AxisId[] = [
  "creativity",
  "promptFaithfulness",
  "motion",
  "transitionSmoothness",
  "videoFaithfulness",
];

const AXIS_STORAGE_KEY = "v2v.pentagonAxes.v1";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ========= helpers (wie im mega-file) ========= */

const SAFE_R = {
  stepsTotal: { min: 20, max: 24 },
  lowRatio: { min: 0.5, max: 0.8 },
  cfgHigh: { min: 2.2, max: 3.0 },
  shiftHigh: { min: 2.3, max: 2.95 },
  strengthHigh: { min: 0.2, max: 0.44 },
};

function toSafeKey(k: SimpleSliderKey): SafeKey | null {
  if (k === "totalSteps") return "totalSteps";
  if (k === "stepRatioPct") return "stepRatioPct";
  if (k === "highShift") return "highShift";
  if (k === "highCfg") return "highCfg";
  if (k === "highStrength") return "highStrength";
  return null;
}

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

function rangePct(value: number, min: number, max: number) {
  if (max <= min) return 0;
  return ((value - min) / (max - min)) * 100;
}

function SafeRangeBar(props: { min: number; max: number; sliderMin: number; sliderMax: number }) {
  const left = rangePct(props.min, props.sliderMin, props.sliderMax);
  const right = rangePct(props.max, props.sliderMin, props.sliderMax);
  const width = Math.max(0, right - left);

  return (
    <Box sx={{ position: "relative", height: 6, borderRadius: 999, bgcolor: "action.hover" }}>
      <Box
        sx={{
          position: "absolute",
          left: `${left}%`,
          width: `${width}%`,
          top: 0,
          bottom: 0,
          borderRadius: 999,
          bgcolor: "success.main",
          opacity: 0.25,
        }}
      />
    </Box>
  );
}

/* ========= UI helpers ========= */

function ReadonlySlider(props: {
  label: string;
  value: number;
  sx?: any;
  onLabelClick?: () => void;
}) {
  const clickable = !!props.onLabelClick;

  return (
    <Box sx={props.sx}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          {clickable ? (
            <Tooltip title="Click to configure" arrow>
              <ButtonBase
                onClick={props.onLabelClick}
                sx={{
                  borderRadius: 1,
                  px: 0.25,
                  // macht es wie ein Link/Text
                  "& .label": {
                    fontSize: (theme) => theme.typography.body2.fontSize,
                    fontWeight: (theme) => theme.typography.body2.fontWeight,
                    lineHeight: (theme) => theme.typography.body2.lineHeight,
                    color: "primary.main",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  },
                  // schöner Fokus-Ring
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              >
                <span className="label">{props.label}</span>
              </ButtonBase>
            </Tooltip>
          ) : (
            <Typography variant="body2">{props.label}</Typography>
          )}

          {clickable && (
            <Typography variant="caption" color="text.secondary" sx={{ userSelect: "none" }}>
              (configure)
            </Typography>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>

      <Slider value={props.value} min={0} max={100} step={1} sx={{ pointerEvents: "none" }} />
    </Box>
  );
}

function marksFor(b?: { min: number; max: number }, decimals = 2): Mark[] | undefined {
  if (!b) return undefined;

  const fmt = (x: number) => Number(x.toFixed(decimals));

  return [
    { value: b.min, label: <Typography variant="caption">{fmt(b.min)}</Typography> },
    { value: b.max, label: <Typography variant="caption">{fmt(b.max)}</Typography> },
  ];
}

function PressableSlider(props: {
  sliderKey: SimpleSliderKey;
  onBegin: (k: SimpleSliderKey) => void;
  onEnd: () => void;
  value: number;
  min: number;
  max: number;
  step: number;
  marks?: Mark[];
  onChange: (e: Event, v: number | number[]) => void;
}) {
  const { sliderKey, onBegin, onEnd, value, onChange, min, max, step, marks } = props;
  return (
    <Box
      onPointerDownCapture={() => onBegin(sliderKey)}
      onMouseDownCapture={() => onBegin(sliderKey)}
      onTouchStartCapture={() => onBegin(sliderKey)}
      onPointerUpCapture={onEnd}
      onPointerCancelCapture={onEnd}
      sx={{ touchAction: "none" }}
    >
      <Slider
        sx={{
          "& .MuiSlider-mark": {
            width: 4,
            height: 16,
            borderRadius: 2,
            opacity: 1,
            backgroundColor: "text.primary",
          },
          "& .MuiSlider-markLabel": {
            mt: 1,
            opacity: 0.95,
            fontWeight: 700,
          },
        }}
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks}
        onChange={onChange}
        onChangeCommitted={onEnd as any}
      />
    </Box>
  );
}

export function ClipDialog(p: ClipDialogProps) {
  const [catView, setCatView] = React.useState<CatView>("sliders");
  const [activeSimple, setActiveSimple] = React.useState<SimpleSliderKey | null>(null);
  const activeValue = activeSimple ? (p.simple[activeSimple] as number) : null;
  const [formulaWeights, setFormulaWeights] = React.useState<FormulaWeights>(() =>
    loadFormulaWeights()
  );
  const [customSliders, setCustomSliders] = React.useState<CustomScoreSlider[]>(() =>
    loadCustomSliders()
  );

  const [activeEffects, setActiveEffects] = React.useState<Partial<Record<CatKey, number>> | null>(
    null
  );

  const [weightsOpen, setWeightsOpen] = React.useState(false);
  const [weightsCat, setWeightsCat] = React.useState<CatKey | null>(null);

  const [newOpen, setNewOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftW, setDraftW] = React.useState(DEFAULT_CUSTOM_W);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editW, setEditW] = React.useState(DEFAULT_CUSTOM_W);

  const [pentagonAxes, setPentagonAxes] = React.useState<AxisId[]>(() => loadAxes());

  const [axesOpen, setAxesOpen] = React.useState(false);

  React.useEffect(() => {
    localStorage.setItem(AXIS_STORAGE_KEY, JSON.stringify(pentagonAxes));
  }, [pentagonAxes]);

  function openWeights(cat: CatKey) {
    setWeightsCat(cat);
    setWeightsOpen(true);
  }
  function closeWeights() {
    setWeightsOpen(false);
    setWeightsCat(null);
  }
  function resetWeights() {
    setFormulaWeights(DEFAULT_FORMULA_WEIGHTS);
  }

  React.useEffect(() => {
    saveFormulaWeights(formulaWeights);
  }, [formulaWeights]);

  React.useEffect(() => {
    saveCustomSliders(customSliders);
  }, [customSliders]);

  React.useEffect(() => {
    if (!activeSimple) return;
    setActiveEffects(computeEffectsFor(activeSimple));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSimple, activeValue, p.simpleSpeedMode]);

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

    const onEnd = () => {
      setActiveSimple(null);
      setActiveEffects(null);
    };

    // Pointer (modern)
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);

    // Fallbacks (wichtig für “manchmal”-Bugs)
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);

      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [activeSimple]);

  // --- compute real values + derived params exactly like mega-file ---
  const computed = React.useMemo(() => {
    const s = p.simple;
    const derived = deriveV2VParamsFromSimple({
      totalSteps: Math.round(s.totalSteps),
      stepRatio01: s.stepRatioPct / 100,
      highShift: s.highShift,
      highCfg: s.highCfg,
      highStrength: s.highStrength,
    });

    const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

    const scores = computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      stepsRange,
      formulaWeights
    );

    const allScores = computeAllScores(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      stepsRange,
      formulaWeights,
      customSliders
    );

    return { derived, scores, allScores };
  }, [p.simple, p.simpleSpeedMode, formulaWeights, customSliders]);

  function patchFormulaWeights<K extends keyof FormulaWeights>(
    cat: K,
    patch: Partial<FormulaWeights[K]>
  ) {
    setFormulaWeights((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], ...patch },
    }));
  }

  const availableAxisIds: AxisId[] = React.useMemo(() => {
    // built-ins + custom ids
    const builtins: AxisId[] = DEFAULT_AXIS_IDS;
    const customs: AxisId[] = customSliders.map((c) => c.id);
    return [...builtins, ...customs];
  }, [customSliders]);

  function setAxisAt(i: number, id: AxisId) {
    setPentagonAxes((prev) => {
      const next = [...prev];
      next[i] = id;
      return next;
    });
  }

  function openCustomEdit(id: string) {
    const cs = customSliders.find((x) => x.id === id);
    if (!cs) return;

    setEditId(id);
    setEditName(cs.name);
    setEditW(cs.w ?? DEFAULT_CUSTOM_W);
    setEditOpen(true);
  }

  function closeCustomEdit() {
    setEditOpen(false);
    setEditId(null);
  }

  function saveCustomEdit() {
    if (!editId) return;
    setCustomSliders((prev) =>
      prev.map((x) => (x.id === editId ? { ...x, name: editName.trim(), w: editW } : x))
    );
    setEditOpen(false);
    setEditId(null);
  }

  function deleteCustom(id: string) {
    setCustomSliders((prev) => prev.filter((x) => x.id !== id));
    setEditOpen(false);
    setEditId(null);
  }

  function computeScoresFromReal(s: SimpleReal): CategoryScores {
    const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

    return computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      stepsRange,
      formulaWeights // ✅ wichtig: gleiche weights wie UI
    );
  }

  function clampToCfg<K extends keyof SimpleReal>(key: K, v: number) {
    const c = p.sliderCfg[key];
    return clamp(v, c.min, c.max);
  }

  const activeSafeKey = React.useMemo(
    () => (activeSimple ? toSafeKey(activeSimple) : null),
    [activeSimple]
  );

  const safeBounds = React.useMemo(() => {
    if (!activeSafeKey) return null;
    const v = p.simple[activeSafeKey] as number;
    // <-- kommt vom Hook als prop (siehe unten)
    return p.getBounds(activeSafeKey, v);
  }, [activeSafeKey, p.simple]);

  const pentagonAxisObjects = React.useMemo(() => {
    const ids = (pentagonAxes?.length === 5 ? pentagonAxes : DEFAULT_AXIS_IDS).slice(0, 5);
    return ids.map((id) => ({
      id: String(id),
      label: axisLabel(id),
      value: axisValue(id),
    }));
  }, [pentagonAxes, computed.allScores, customSliders]);

  function computeEffectsFor(key: keyof SimpleReal): Partial<Record<CatKey, number>> {
    const base = p.simple;

    const step = p.sliderCfg[key].step;
    const epsSteps = key === "totalSteps" ? 1 : 3;
    const eps = step * epsSteps;

    const s0 = computeScoresFromReal(base);

    // ✅ wandle keyof SimpleReal -> SafeKey (du hast toSafeKey schon)
    const sk = toSafeKey(key as any);
    if (!sk) return {};

    // ✅ “raw desired value” (noch ohne constraints)
    const plusRaw = clampToCfg(key, (base[key] as number) + eps);
    const minusRaw = clampToCfg(key, (base[key] as number) - eps);

    // ✅ hier passieren die passiven Effekte:
    const plus = p.simulateSliderChange(base, sk, plusRaw);
    const minus = p.simulateSliderChange(base, sk, minusRaw);

    const sPlus = computeScoresFromReal(plus);
    const sMinus = computeScoresFromReal(minus);

    const out: Partial<Record<CatKey, number>> = {};
    (Object.keys(s0) as CatKey[]).forEach((cat) => {
      out[cat] = (sPlus[cat] - sMinus[cat]) / (2 * epsSteps);
    });
    return out;
  }

  function createCustomSlider() {
    const id = `custom:${Date.now()}`; // reicht völlig
    setCustomSliders((prev) => [...prev, { id, name: draftName.trim(), w: draftW }]);
    setNewOpen(false);
  }

  function computeAllScores(
    s: {
      totalSteps: number;
      stepRatio: number;
      highShift: number;
      highCfg: number;
      highStrength: number;
    },
    stepsRange: { min: number; max: number },
    formulaWeights: FormulaWeights,
    custom: CustomScoreSlider[]
  ): Record<string, number> {
    const denom = Math.max(1e-6, stepsRange.max - stepsRange.min);
    const steps01 = clamp((s.totalSteps - stepsRange.min) / denom, 0, 1);

    const ratio01 = clamp((s.stepRatio - 50) / (80 - 50), 0, 1);
    const shift01 = clamp((s.highShift - 2.3) / (3 - 2.3), 0, 1);
    const cfg01 = clamp((s.highCfg - 2.2) / (3.0 - 2.2), 0, 1);
    const strength01 = clamp((s.highStrength - 0.2) / (0.45 - 0.2), 0, 1);

    // ✅ built-ins (deine vorhandene Funktion)
    const builtIn = computeCategoryScoresFromSimple(
      {
        totalSteps: s.totalSteps,
        stepRatio: s.stepRatio,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      stepsRange,
      formulaWeights
    );

    const out: Record<string, number> = { ...builtIn };

    // ✅ custom sliders
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

  function catInfluenceSx(cat: CatKey) {
    if (!activeSimple || !activeEffects) return {};

    const d = activeEffects[cat] ?? 0;

    // threshold: tiny numerical noise ignorieren
    const dead = 0.02;
    const maxD = 0.5; // sehr sensibel: "0.5 score-points pro slider unit" ist schon stark
    const gamma = 0.7;
    if (Math.abs(d) < dead) {
      return {
        opacity: 0.25,
        "& .MuiSlider-rail": { opacity: 0.12 },
        "& .MuiSlider-track": { opacity: 0.12 },
        "& .MuiSlider-thumb": { opacity: 0.12 },
      };
    }

    const color = d > 0 ? "#3333cc" : "#990000";

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

  const cfg = p.sliderCfg;

  function axisLabel(id: AxisId) {
    if (id === "creativity") return "Creativity";
    if (id === "promptFaithfulness") return "Prompt\nFaithfulness";
    if (id === "motion") return "Motion";
    if (id === "transitionSmoothness") return "Transition\nSmoothness";
    if (id === "videoFaithfulness") return "Video\nFaithfulness";

    // custom:
    const cs = customSliders.find((x) => x.id === id);
    return cs?.name ?? String(id);
  }

  function axisValue(id: AxisId) {
    // computed.allScores enthält built-ins + custom (so wie du es baust)
    return computed.allScores[String(id)] ?? 0;
  }

  function loadAxes(): AxisId[] {
    try {
      const raw = localStorage.getItem(AXIS_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AxisId[]) : null;
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_AXIS_IDS;
    } catch {
      return DEFAULT_AXIS_IDS;
    }
  }

  return (
    <>
      <Dialog open={p.open} onClose={p.onClose} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box sx={{ flex: 1 }}>Set your parameters</Box>

          <ButtonGroup
            variant="contained"
            aria-label="Basic button group"
            sx={{
              boxShadow: "none",
              "& .MuiButton-root:first-of-type": {
                borderTopLeftRadius: 100,
                borderBottomLeftRadius: 100,
              },
              "& .MuiButton-root:last-of-type": {
                borderTopRightRadius: 100,
                borderBottomRightRadius: 100,
              },
            }}
          >
            <Button
              disableElevation
              variant={p.tab === "simple" ? "contained" : "outlined"}
              onClick={() => p.onTabChange("simple")}
            >
              Assisted
            </Button>

            <Button
              disableElevation
              variant={p.tab === "advanced" ? "contained" : "outlined"}
              onClick={() => p.onTabChange("advanced")}
            >
              Raw
            </Button>
          </ButtonGroup>
        </DialogTitle>

        <DialogContent sx={{ overscrollBehavior: "contain", touchAction: "none" }}>
          {p.tab === "simple" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Prompt"
                value={p.prompt}
                onChange={(e) => p.onPromptChange(e.target.value)}
                multiline
                minRows={4}
                fullWidth
              />

              <TextField
                type="number"
                label="Length in frames (FPS = 16)"
                value={p.length}
                onChange={(e) => p.onLengthChange(Number(e.target.value))}
                fullWidth
              />

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
                      <Typography gutterBottom>
                        <Typography gutterBottom>
                          Steps total: <b>{p.simple.totalSteps}</b>
                        </Typography>
                      </Typography>
                      <PressableSlider
                        sliderKey="totalSteps"
                        onBegin={beginDrag}
                        onEnd={endDrag}
                        value={p.simple.totalSteps}
                        min={cfg.totalSteps.min}
                        max={cfg.totalSteps.max}
                        step={cfg.totalSteps.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "totalSteps"
                            ? marksFor(safeBounds?.totalSteps, 2)
                            : undefined
                        }
                        onChange={p.onChangeTotalSteps}
                      />
                      {safeBounds?.totalSteps && activeSafeKey !== "totalSteps" && (
                        <SafeRangeBar
                          min={safeBounds.totalSteps.min}
                          max={safeBounds.totalSteps.max}
                          sliderMin={cfg.totalSteps.min}
                          sliderMax={cfg.totalSteps.max}
                        />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography gutterBottom>
                        Ratio: <b>{p.simple.stepRatioPct}%</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="stepRatioPct"
                        onBegin={beginDrag}
                        onEnd={endDrag}
                        value={p.simple.stepRatioPct}
                        min={cfg.stepRatioPct.min}
                        max={cfg.stepRatioPct.max}
                        step={cfg.stepRatioPct.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "stepRatioPct"
                            ? marksFor(safeBounds?.stepRatioPct, 2)
                            : undefined
                        }
                        onChange={p.onChangeStepRatio}
                      />
                      {safeBounds?.stepRatioPct && activeSafeKey !== "stepRatioPct" && (
                        <SafeRangeBar
                          min={safeBounds.stepRatioPct.min}
                          max={safeBounds.stepRatioPct.max}
                          sliderMin={cfg.stepRatioPct.min}
                          sliderMax={cfg.stepRatioPct.max}
                        />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography gutterBottom>
                        High shift: <b>{p.simple.highShift.toFixed(2)}</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="highShift"
                        onBegin={beginDrag}
                        onEnd={endDrag}
                        value={p.simple.highShift}
                        min={cfg.highShift.min}
                        max={cfg.highShift.max}
                        step={cfg.highShift.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highShift"
                            ? marksFor(safeBounds?.highShift, 2)
                            : undefined
                        }
                        onChange={p.onChangeHighShift}
                      />
                      {safeBounds?.highShift && activeSafeKey !== "highShift" && (
                        <SafeRangeBar
                          min={safeBounds.highShift.min}
                          max={safeBounds.highShift.max}
                          sliderMin={cfg.highShift.min}
                          sliderMax={cfg.highShift.max}
                        />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography gutterBottom>
                        High CFG: <b>{p.simple.highCfg.toFixed(2)}</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="highCfg"
                        onBegin={beginDrag}
                        onEnd={endDrag}
                        value={p.simple.highCfg}
                        min={cfg.highCfg.min}
                        max={cfg.highCfg.max}
                        step={cfg.highCfg.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highCfg"
                            ? marksFor(safeBounds?.highCfg, 2)
                            : undefined
                        }
                        onChange={p.onChangeHighCfg}
                      />
                      {safeBounds?.highCfg && activeSafeKey !== "highCfg" && (
                        <SafeRangeBar
                          min={safeBounds.highCfg.min}
                          max={safeBounds.highCfg.max}
                          sliderMin={cfg.highCfg.min}
                          sliderMax={cfg.highCfg.max}
                        />
                      )}
                    </Stack>

                    <Stack spacing={0.5}>
                      <Typography gutterBottom>
                        High strength: <b>{p.simple.highStrength.toFixed(2)}</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="highStrength"
                        onBegin={beginDrag}
                        onEnd={endDrag}
                        value={p.simple.highStrength}
                        min={cfg.highStrength.min}
                        max={cfg.highStrength.max}
                        step={cfg.highStrength.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highStrength"
                            ? marksFor(safeBounds?.highStrength, 2)
                            : undefined
                        }
                        onChange={p.onChangeHighStrength}
                      />
                      {safeBounds?.highStrength && activeSafeKey !== "highStrength" && (
                        <SafeRangeBar
                          min={safeBounds.highStrength.min}
                          max={safeBounds.highStrength.max}
                          sliderMin={cfg.highStrength.min}
                          sliderMax={cfg.highStrength.max}
                        />
                      )}
                    </Stack>
                  </Stack>

                  <Paper
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 3, borderColor: "warning.main" }}
                  >
                    Parameter combinations are limited to ensure video quality. Swich tabs to the
                    advanced mode in order to generate videos without any restrictions
                  </Paper>

                  {/* Computed params — mega-file style */}
                </Stack>

                <Divider orientation="vertical" flexItem />

                {/* RIGHT */}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 3, borderColor: "secondary.main" }}
                >
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
                        <>
                          <Stack spacing={2}>
                            <ReadonlySlider
                              label="Creativity"
                              value={computed.scores.creativity}
                              sx={catInfluenceSx("creativity")}
                              onLabelClick={() => openWeights("creativity")}
                            />

                            <ReadonlySlider
                              label="Prompt faithfulness"
                              value={computed.scores.promptFaithfulness}
                              sx={catInfluenceSx("promptFaithfulness")}
                              onLabelClick={() => openWeights("promptFaithfulness")}
                            />

                            <ReadonlySlider
                              label="Motion"
                              value={computed.scores.motion}
                              sx={catInfluenceSx("motion")}
                              onLabelClick={() => openWeights("motion")}
                            />

                            <ReadonlySlider
                              label="Transition Smoothness"
                              value={computed.scores.transitionSmoothness}
                              sx={catInfluenceSx("transitionSmoothness")}
                              onLabelClick={() => openWeights("transitionSmoothness")}
                            />

                            <ReadonlySlider
                              label="Video Faithfulness"
                              value={computed.scores.videoFaithfulness}
                              sx={catInfluenceSx("videoFaithfulness")}
                              onLabelClick={() => openWeights("videoFaithfulness")}
                            />

                            {customSliders.length > 0 && (
                              <>
                                <Divider />
                                <Typography variant="subtitle2">Custom sliders</Typography>

                                {customSliders.map((cs) => (
                                  <ReadonlySlider
                                    key={cs.id}
                                    label={cs.name}
                                    value={computed.allScores[cs.id] ?? 0}
                                    // ⚠️ custom hat kein catInfluenceSx (das ist nur für die 5)
                                    // optional: später eigener edit dialog
                                    onLabelClick={() => {
                                      openCustomEdit(cs.id);
                                    }}
                                  />
                                ))}
                              </>
                            )}
                          </Stack>

                          <Button
                            variant="outlined"
                            onClick={() => {
                              setDraftName("");
                              setDraftW(DEFAULT_CUSTOM_W);
                              setNewOpen(true);
                            }}
                          >
                            New slider
                          </Button>
                        </>
                      ) : (
                        <Stack spacing={3} alignItems="center">
                          <Button variant="outlined" onClick={() => setAxesOpen(true)}>
                            Configure pentagon axes
                          </Button>

                          <PentagonMap axes={pentagonAxisObjects} size={260} showRadarPolygon />
                        </Stack>
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
                  sx={{ mt: 1 }}
                />
              </Grid>

              <TextField
                type="number"
                label="Length in frames (FPS = 16)"
                value={p.length}
                onChange={(e) => p.onLengthChange(Number(e.target.value))}
                fullWidth
              />

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
                  onChange={(e) =>
                    p.onAdvancedChange({ lowNoiseStartStep: Number(e.target.value) })
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <TextField
                  type="number"
                  label="High Noise Start Step"
                  value={p.advanced.highNoiseStartStep}
                  onChange={(e) =>
                    p.onAdvancedChange({ highNoiseStartStep: Number(e.target.value) })
                  }
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

      <WeightsDialog
        open={weightsOpen}
        cat={weightsCat}
        weights={formulaWeights}
        onClose={closeWeights}
        onPatch={patchFormulaWeights}
        onReset={resetWeights}
      />

      {/* CREATE */}
      <NewCustomSliderDialog
        open={newOpen}
        title="New slider"
        primaryLabel="Create"
        name={draftName}
        w={draftW}
        onName={setDraftName}
        onW={(patch) => setDraftW((prev) => ({ ...prev, ...patch }))}
        onClose={() => setNewOpen(false)}
        onPrimary={createCustomSlider}
        primaryDisabled={!draftName.trim()}
      />

      {/* EDIT */}
      <NewCustomSliderDialog
        open={editOpen}
        title="Edit slider"
        primaryLabel="Save"
        secondaryLabel="Delete"
        onSecondary={() => editId && deleteCustom(editId)}
        name={editName}
        w={editW}
        onName={setEditName}
        onW={(patch) => setEditW((prev) => ({ ...prev, ...patch }))}
        onClose={closeCustomEdit}
        onPrimary={saveCustomEdit}
        primaryDisabled={!editName.trim()}
      />

      <PentagonAxesDialog
        open={axesOpen}
        onClose={() => setAxesOpen(false)}
        axes={pentagonAxes}
        onAxesChange={setPentagonAxes}
        availableAxisIds={availableAxisIds.map(String)}
        axisLabel={(id) => axisLabel(id)}
        defaultAxes={DEFAULT_AXIS_IDS.map(String)}
      />
    </>
  );
}

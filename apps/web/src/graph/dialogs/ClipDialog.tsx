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
import { SAFE_PRESETS, useV2VSliders } from "../hooks/useV2VSliders";
import {
  computeAllScores,
  computeCategoryScoresFromSimple,
  DEFAULT_CUSTOM_W,
  DEFAULT_FORMULA_WEIGHTS,
  deriveV2VParamsFromSimple,
  getScoreRanges,
} from "../hooks/useV2VParams";
import { WeightsDialog } from "./WeightsDialog";

import { NewCustomSliderDialog } from "./NewSliderDialog";
import { PentagonAxesDialog } from "./PentagonAxesDialog";
import { TriangleMap } from "../components/TriangleMap";
import { TriangleAxesDialog } from "./TriangleAxesDialog";
import { PressableSlider } from "../components/PressableSlider";
import { ReadonlySlider } from "../components/ReadOnlySlider";
import { SafeRangeBar } from "../components/SafeRangeBar";
import { axisLabel, axisValue, useClipDialogLogic } from "../graph_helpers/clipDialogLogic";

import { pentagonLogic } from "../graph_helpers/pentagonLogic";
import { useSliderLogic } from "../graph_helpers/sliderLogic";
import { triangleLogic } from "../graph_helpers/triangleLogic";

import {
  AdvancedParamsState,
  AxisId,
  CatView,
  CustomScoreSlider,
  FormulaWeights,
  OrderedSliderItem,
  SafeKey,
  SimpleReal,
  SimpleSliderKey,
  SliderConfig,
  SpeedMode,
  V2VTab,
} from "../types/ui";
import { renderOrderedSliderItem } from "../components/RenderedOrderedSliders";

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

  simpleSpeedMode: SpeedMode;
  onSimpleSpeedModeChange: (m: SpeedMode) => void;
  sliderCfg: Record<keyof SimpleReal, SliderConfig>;

  getBounds: (k: SafeKey, v: number) => Record<SafeKey, { min: number; max: number }> | null;
  roundTo: (x: number, decimals: number) => number;
  simulateSliderChange: (prev: SimpleReal, key: SafeKey, raw: number) => SimpleReal;

  customSliders: CustomScoreSlider[];
  formulaWeights: FormulaWeights;

  onCreateCustomSlider: (name: string, w: any) => void;
  onUpdateCustomSlider: (id: string, name: string, w: any) => void;
  onDeleteCustomSlider: (id: string) => void;

  onPatchFormulaWeights: <K extends keyof FormulaWeights>(
    cat: K,
    patch: Partial<FormulaWeights[K]>
  ) => void;

  orderedSliderItems: OrderedSliderItem[];
  moveSlider: (id: string, direction: "up" | "down") => void;
  onResetFormulaWeights: () => void;

  restrictCategories: boolean;
};

/* ========= helpers (wie im mega-file) ========= */

/* ========= UI helpers ========= */

export function ClipDialog(p: ClipDialogProps) {
  const [catView, setCatView] = React.useState<CatView>("sliders");

  const [newOpen, setNewOpen] = React.useState(false);
  const [draftName, setDraftName] = React.useState("");
  const [draftW, setDraftW] = React.useState(DEFAULT_CUSTOM_W);

  const [editOpen, setEditOpen] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editW, setEditW] = React.useState(DEFAULT_CUSTOM_W);

  const [weightsOpen, setWeightsOpen] = React.useState(false);
  const [weightsCat, setWeightsCat] = React.useState<any>(null);

  const openWeights = React.useCallback((cat: any) => {
    setWeightsCat(cat);
    setWeightsOpen(true);
  }, []);

  const closeWeights = React.useCallback(() => {
    setWeightsOpen(false);
  }, []);

  const clipLogic = useClipDialogLogic(p.formulaWeights, p.customSliders);

  const sliderLogic = useSliderLogic({
    computeScoresFromReal: clipLogic.computeScoresFromReal,
    clampToCfg: clipLogic.clampToCfg,
    setActiveSimple: clipLogic.setActiveSimple,
    setActiveEffects: clipLogic.setActiveEffects,
  });

  const activeValue = clipLogic.activeSimple ? (p.simple[clipLogic.activeSimple] as number) : null;

  React.useEffect(() => {
    if (!clipLogic.activeSimple) return;
    clipLogic.setActiveEffects(sliderLogic.computeEffectsFor(clipLogic.activeSimple, p));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clipLogic.activeSimple, activeValue, p.simpleSpeedMode]);

  React.useEffect(() => {
    if (!clipLogic.activeSimple) return;

    const onEnd = () => {
      sliderLogic.endDrag();
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
  }, [clipLogic.activeSimple]);

  // --- compute real values + derived params exactly like mega-file ---
  const computed = React.useMemo(() => {
    const s = p.simple;

    const totalStepsInt = Math.round(s.totalSteps);
    const stepRatioPctInt = Math.round(s.stepRatioPct);

    const lowStepsInt = Math.round((totalStepsInt * stepRatioPctInt) / 100);
    const highStepsInt = totalStepsInt - lowStepsInt;
    const effectiveLowStepPct = Math.round((lowStepsInt / totalStepsInt) * 100);

    const derived = deriveV2VParamsFromSimple({
      totalSteps: highStepsInt,
      stepRatio01: lowStepsInt / totalStepsInt,
      highShift: s.highShift,
      highCfg: s.highCfg,
      highStrength: s.highStrength,
    });

    const scoreRanges = getScoreRanges(p.simpleSpeedMode);

    const scores = computeCategoryScoresFromSimple(
      {
        totalSteps: totalStepsInt,
        stepRatio: effectiveLowStepPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      scoreRanges,
      p.formulaWeights
    );

    const allScores = computeAllScores(
      {
        totalSteps: totalStepsInt,
        stepRatioPct: effectiveLowStepPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      scoreRanges,
      p.formulaWeights,
      p.customSliders
    );

    console.log(derived);

    return {
      derived,
      scores,
      allScores,
      totalStepsInt,
      lowStepsInt,
      highStepsInt,
      effectiveLowStepPct,
    };
  }, [p.simple, p.simpleSpeedMode, p.formulaWeights, p.customSliders]);

  const activeSafeKey = React.useMemo(
    () => (clipLogic.activeSimple ? sliderLogic.toSafeKey(clipLogic.activeSimple) : null),
    [clipLogic.activeSimple]
  );

  const safeBounds = React.useMemo(() => {
    if (!activeSafeKey) return null;
    const v = p.simple[activeSafeKey] as number;
    // <-- kommt vom Hook als prop (siehe unten)
    return p.getBounds(activeSafeKey, v);
  }, [activeSafeKey, p.simple]);

  const cfg = p.sliderCfg;

  const handleBeginDrag = React.useCallback(
    (key: SimpleSliderKey) => {
      sliderLogic.beginDrag(key, p);
    },
    [sliderLogic, p]
  );

  const handleEndDrag = React.useCallback(() => {
    sliderLogic.endDrag();
  }, [sliderLogic]);

  const openCustomEdit = React.useCallback(
    (id: string) => {
      const cs = p.customSliders.find((x) => x.id === id);
      if (!cs) return;

      setEditId(id);
      setEditName(cs.name);
      setEditW(cs.w ?? DEFAULT_CUSTOM_W);
      setEditOpen(true);
    },
    [p.customSliders]
  );

  const closeCustomEdit = React.useCallback(() => {
    setEditOpen(false);
    setEditId(null);
  }, []);

  const createCustomSlider = React.useCallback(() => {
    if (!draftName.trim()) return;
    p.onCreateCustomSlider(draftName.trim(), draftW);
    setDraftName("");
    setDraftW(DEFAULT_CUSTOM_W);
    setNewOpen(false);
  }, [p, draftName, draftW]);

  const saveCustomEdit = React.useCallback(() => {
    if (!editId || !editName.trim()) return;
    p.onUpdateCustomSlider(editId, editName.trim(), editW);
    setEditOpen(false);
    setEditId(null);
  }, [p, editId, editName, editW]);

  const deleteCustom = React.useCallback(
    (id: string) => {
      p.onDeleteCustomSlider(id);
      setEditOpen(false);
      setEditId(null);
    },
    [p]
  );

  const {
    DEFAULT_TRIANGLE_AXIS_IDS,

    triangleAxes,
    triangleAxesOpen,
    setTriangleAxes,
    setTriangleAxesOpen,

    triangleAxisObjects,
    availableAxisIds: triangleAvailableAxisIds,
    getDisabledAxisReasons: getTriangleDisabledAxisReasons,
  } = triangleLogic(computed.allScores, p.customSliders, p.formulaWeights);



  const {
    DEFAULT_PENTAGON_AXIS_IDS,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    pentagonAxesOpen,
    setPentagonAxes,
    setPentagonAxesOpen,
    getDisabledAxisReasons,
  } = pentagonLogic(computed.allScores, p.customSliders);

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
                        Steps total: <b>{computed.totalStepsInt}</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="totalSteps"
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={computed.totalStepsInt}
                        min={cfg.totalSteps.min}
                        max={cfg.totalSteps.max}
                        step={cfg.totalSteps.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "totalSteps"
                            ? sliderLogic.marksFor(safeBounds?.totalSteps, 2)
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
                        Ratio: <b>{computed.effectiveLowStepPct}%</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="stepRatioPct"
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={computed.effectiveLowStepPct}
                        min={cfg.stepRatioPct.min}
                        max={cfg.stepRatioPct.max}
                        step={cfg.stepRatioPct.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "stepRatioPct"
                            ? sliderLogic.marksFor(safeBounds?.stepRatioPct, 2)
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
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={p.simple.highShift}
                        min={cfg.highShift.min}
                        max={cfg.highShift.max}
                        step={cfg.highShift.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highShift"
                            ? sliderLogic.marksFor(safeBounds?.highShift, 2)
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
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={p.simple.highCfg}
                        min={cfg.highCfg.min}
                        max={cfg.highCfg.max}
                        step={cfg.highCfg.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highCfg"
                            ? sliderLogic.marksFor(safeBounds?.highCfg, 2)
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
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={p.simple.highStrength}
                        min={cfg.highStrength.min}
                        max={cfg.highStrength.max}
                        step={cfg.highStrength.step}
                        marks={
                          activeSafeKey && activeSafeKey !== "highStrength"
                            ? sliderLogic.marksFor(safeBounds?.highStrength, 2)
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
                        <Tab value="triangle" label="Triangle" />
                      </Tabs>

                      {catView === "sliders" ? (
                        <Stack spacing={2}>
                          {p.orderedSliderItems.map((item, index) => (
                            <Box
                              key={item.id}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: "1fr auto",
                                gap: 1,
                                alignItems: "center",
                              }}
                            >
                              <Box>
                                {renderOrderedSliderItem(
                                  item,
                                  computed,
                                  clipLogic,
                                  openWeights,
                                  openCustomEdit
                                )}
                              </Box>

                              <Stack spacing={0.5}>
                                <Button
                                  size="small"
                                  variant="text"
                                  disabled={index === 0}
                                  onClick={() => p.moveSlider(item.id, "up")}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="small"
                                  variant="text"
                                  disabled={index === p.orderedSliderItems.length - 1}
                                  onClick={() => p.moveSlider(item.id, "down")}
                                >
                                  ↓
                                </Button>
                              </Stack>
                            </Box>
                          ))}

                          <Divider />
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
                        </Stack>
                      ) : catView === "pentagon" ? (
                        <Stack spacing={3} alignItems="center">
                          <PentagonMap axes={pentagonAxisObjects} size={260} showRadarPolygon />

                          <Button variant="outlined" onClick={() => setPentagonAxesOpen(true)}>
                            Configure pentagon axes
                          </Button>
                        </Stack>
                      ) : (
                        <Stack spacing={3} alignItems="center">
                          <TriangleMap axes={triangleAxisObjects} size={260} showRadarPolygon />

                          <Button variant="outlined" onClick={() => setTriangleAxesOpen(true)}>
                            Configure triangle axes
                          </Button>
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
        weights={p.formulaWeights}
        onClose={closeWeights}
        onPatch={p.onPatchFormulaWeights}
        onReset={p.onResetFormulaWeights}
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
        open={pentagonAxesOpen}
        onClose={() => setPentagonAxesOpen(false)}
        axes={pentagonAxes}
        onAxesChange={setPentagonAxes}
        availableAxisIds={availableAxisIds.map(String)}
        axisLabel={(id) => axisLabel(id, p.customSliders)}
        defaultAxes={DEFAULT_PENTAGON_AXIS_IDS.map(String)}
        getDisabledAxisReasons={getDisabledAxisReasons}
        restrictCategories={p.restrictCategories}
      />

      <TriangleAxesDialog
        open={triangleAxesOpen}
        onClose={() => setTriangleAxesOpen(false)}
        axes={triangleAxes}
        onAxesChange={setTriangleAxes}
        availableAxisIds={triangleAvailableAxisIds}
        axisLabel={(id) => axisLabel(id, p.customSliders)}
        defaultAxes={DEFAULT_TRIANGLE_AXIS_IDS}
        getDisabledAxisReasons={getTriangleDisabledAxisReasons}
        restrictCategories={p.restrictCategories}
      />
    </>
  );
}

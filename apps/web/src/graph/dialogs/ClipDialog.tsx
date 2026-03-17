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
  CatView,
  SAFE_PRESETS,
  SafeKey,
  SafePreset,
  SliderConfig,
  useV2VSliders,
  V2VTab,
} from "../hooks/useV2VSliders";
import {
  CategoryScores,
  computeAllScores,
  computeCategoryScoresFromSimple,
  CustomScoreSlider,
  DEFAULT_CUSTOM_W,
  DEFAULT_FORMULA_WEIGHTS,
  deriveV2VParamsFromSimple,
  FormulaWeights,
  getScoreRanges,
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
import { TriangleMap } from "../components/TriangleMap";
import { TriangleAxesDialog } from "./TriangleAxesDialog";
import { PressableSlider } from "../components/PressableSlider";
import { ReadonlySlider } from "../components/ReadOnlySlider";
import { SafeRangeBar } from "../components/SafeRangeBar";
import { axisLabel, axisValue, useClipDialogLogic } from "../graph_helpers/clipDialogLogic";
import { customSliderLogic } from "../graph_helpers/customSliderLogic";
import { pentagonLogic } from "../graph_helpers/pentagonLogic";
import { useSliderLogic } from "../graph_helpers/sliderLogict";
import { trinagleLogic } from "../graph_helpers/triangleLogic";
import { useWeightsLogic } from "../graph_helpers/weightsLogic";
import { AdvancedParamsState, AxisId, SimpleReal, SimpleSliderKey, SpeedMode } from "../types/ui";



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

  simpleSpeedMode: SpeedMode
  onSimpleSpeedModeChange: (m: SpeedMode) => void;
  sliderCfg: Record<keyof SimpleReal, SliderConfig>;

  getBounds: (k: SafeKey, v: number) => Record<SafeKey, { min: number; max: number }> | null;
  roundTo: (x: number, decimals: number) => number;
  simulateSliderChange: (prev: SimpleReal, key: SafeKey, raw: number) => SimpleReal;
};



/* ========= helpers (wie im mega-file) ========= */

/* ========= UI helpers ========= */

export function ClipDialog(p: ClipDialogProps) {
  const [catView, setCatView] = React.useState<CatView>("sliders");

  const {
    customSliders,
    editOpen,
    editId,
    editName,
    editW,
    setEditName,
    setEditW,
    newOpen,
    draftName,
    draftW,
    setNewOpen,
    setDraftName,
    setDraftW,
    deleteCustom,
    openCustomEdit,
    closeCustomEdit,
    saveCustomEdit,
    createCustomSlider,
  } = customSliderLogic();

  const weightsLogic = useWeightsLogic();

  const clipLogic = useClipDialogLogic(weightsLogic.formulaWeights);

  const sliderLogic = useSliderLogic({
    computeScoresFromReal: clipLogic.computeScoresFromReal,
    clampToCfg: clipLogic.clampToCfg,
    setActiveSimple: clipLogic.setActiveSimple,
    setActiveEffects: clipLogic.setActiveEffects,
  });

  const {
    DEFAULT_TRIANGLE_AXIS_IDS,
    TRIANGLE_AXIS_STORAGE_KEY,
    triangleAxes,
    triangleAxesOpen,
    setTriangleAxes,
    setTriangleAxesOpen,
    loadTriangleAxes,
  } = trinagleLogic();

  const activeValue = clipLogic.activeSimple ? (p.simple[clipLogic.activeSimple] as number) : null;

  React.useEffect(() => {
    localStorage.setItem(TRIANGLE_AXIS_STORAGE_KEY, JSON.stringify(triangleAxes));
  }, [triangleAxes]);

  React.useEffect(() => {
    saveFormulaWeights(weightsLogic.formulaWeights);
  }, [weightsLogic.formulaWeights]);

  React.useEffect(() => {
    saveCustomSliders(customSliders);
  }, [customSliders]);

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
    const derived = deriveV2VParamsFromSimple({
      totalSteps: Math.round(s.totalSteps),
      stepRatio01: s.stepRatioPct / 100,
      highShift: s.highShift,
      highCfg: s.highCfg,
      highStrength: s.highStrength,
    });

    const scoreRanges = getScoreRanges(p.simpleSpeedMode);

    const scores = computeCategoryScoresFromSimple(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      scoreRanges,
      weightsLogic.formulaWeights
    );

    const allScores = computeAllScores(
      {
        totalSteps: Math.round(s.totalSteps),
        stepRatio: s.stepRatioPct,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      },
      scoreRanges,
      weightsLogic.formulaWeights,
      customSliders
    );

    return { derived, scores, allScores };
  }, [p.simple, p.simpleSpeedMode, weightsLogic.formulaWeights, customSliders]);

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

  const triangleAxisObjects = React.useMemo(() => {
    const ids = (triangleAxes?.length === 3 ? triangleAxes : DEFAULT_TRIANGLE_AXIS_IDS).slice(0, 3);

    return ids.map((id) => ({
      id: String(id),
      label: axisLabel(id, customSliders),
      value: axisValue(id, computed.allScores),
    }));
  }, [triangleAxes, computed.allScores, customSliders]);

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

  const {
    DEFAULT_PENTAGON_AXIS_IDS,
    PENTAGON_AXIS_STORAGE_KEY,
    loadPentagonAxes,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    pentagonAxesOpen,
    setPentagonAxes,
    setPentagonAxesOpen,
  } = pentagonLogic(computed.allScores, customSliders);

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
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={p.simple.totalSteps}
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
                        Ratio: <b>{p.simple.stepRatioPct}%</b>
                      </Typography>
                      <PressableSlider
                        sliderKey="stepRatioPct"
                        onBegin={handleBeginDrag}
                        onEnd={handleEndDrag}
                        value={p.simple.stepRatioPct}
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
                        <>
                          <Stack spacing={2}>
                            <ReadonlySlider
                              label="Creativity"
                              value={computed.scores.creativity}
                              sx={clipLogic.catInfluenceSx("creativity", clipLogic.activeEffects)}
                              onLabelClick={() => weightsLogic.openWeights("creativity")}
                            />

                            <ReadonlySlider
                              label="Prompt faithfulness"
                              value={computed.scores.promptFaithfulness}
                              sx={clipLogic.catInfluenceSx(
                                "promptFaithfulness",
                                clipLogic.activeEffects
                              )}
                              onLabelClick={() => weightsLogic.openWeights("promptFaithfulness")}
                            />

                            <ReadonlySlider
                              label="Motion"
                              value={computed.scores.motion}
                              sx={clipLogic.catInfluenceSx("motion", clipLogic.activeEffects)}
                              onLabelClick={() => weightsLogic.openWeights("motion")}
                            />

                            <ReadonlySlider
                              label="Transition Smoothness"
                              value={computed.scores.transitionSmoothness}
                              sx={clipLogic.catInfluenceSx(
                                "transitionSmoothness",
                                clipLogic.activeEffects
                              )}
                              onLabelClick={() => weightsLogic.openWeights("transitionSmoothness")}
                            />

                            <ReadonlySlider
                              label="Video Faithfulness"
                              value={computed.scores.videoFaithfulness}
                              sx={clipLogic.catInfluenceSx(
                                "videoFaithfulness",
                                clipLogic.activeEffects
                              )}
                              onLabelClick={() => weightsLogic.openWeights("videoFaithfulness")}
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
        open={weightsLogic.weightsOpen}
        cat={weightsLogic.weightsCat}
        weights={weightsLogic.formulaWeights}
        onClose={weightsLogic.closeWeights}
        onPatch={weightsLogic.patchFormulaWeights}
        onReset={weightsLogic.resetWeights}
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
        axisLabel={(id) => axisLabel(id, customSliders)}
        defaultAxes={DEFAULT_PENTAGON_AXIS_IDS.map(String)}
      />

      <TriangleAxesDialog
        open={triangleAxesOpen}
        onClose={() => setTriangleAxesOpen(false)}
        axes={triangleAxes.map(String)}
        onAxesChange={(next) => setTriangleAxes(next as AxisId[])}
        availableAxisIds={availableAxisIds.map(String)}
        axisLabel={(id) => axisLabel(id, customSliders)}
        defaultAxes={DEFAULT_TRIANGLE_AXIS_IDS.map(String)}
      />
    </>
  );
}

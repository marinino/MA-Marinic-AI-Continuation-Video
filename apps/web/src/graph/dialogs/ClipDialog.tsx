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
  ButtonGroup,
  Grid,
} from "@mui/material";

// ⬇️ falls dein PentagonMap woanders liegt: Pfad anpassen
import { PentagonMap } from "../components/PentagonMap";

import { computeCategoryScoresFromSimple, getScoreRanges } from "../hooks/useV2VParams";
import { WeightsDialog } from "./WeightsDialog";

import { NewCustomSliderDialog } from "./NewSliderDialog";
import { PentagonAxesDialog } from "./PentagonAxesDialog";
import { TriangleMap } from "../components/TriangleMap";
import { TriangleAxesDialog } from "./TriangleAxesDialog";

import {
  buildAxisLabelGetter,
  computeCustomScores,
  useClipDialogLogic,
} from "../graph_helpers/clipDialogLogic";

import { usePentagonLogic } from "../hooks/usePentagonLogic";
import { useSliderLogic } from "../graph_helpers/sliderLogic";
import { useTriangleLogic } from "../hooks/useTriangleLogic";

import {
  AdvancedParamsState,
  BuiltInCategoryId,
  CatView,
  CleanWeights,
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

import { DEFAULT_CUSTOM_W } from "../graph_helpers/presets";
import { OrderedSliderRow } from "../components/OrderedSliderRow";
import { SimpleSliderField } from "../components/SimpleSliderField";

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
  setCategoryScore: (categoryId: BuiltInCategoryId, value: number) => void;
  setCustomCategoryScore: (weights: CleanWeights, value: number) => void;
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

  const [pentagonAxesOpen, setPentagonAxesOpen] = React.useState(false);
  const [triangleAxesOpen, setTriangleAxesOpen] = React.useState(false);

  const pentagonEnabled = catView === "pentagon" || pentagonAxesOpen;
  const triangleEnabled = catView === "triangle" || triangleAxesOpen;

  const getAxisLabel = React.useMemo(
    () => buildAxisLabelGetter(p.customSliders),
    [p.customSliders]
  );

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

  const handleGlobalDragEnd = React.useCallback(() => {
    sliderLogic.endDrag();
  }, [sliderLogic]);

  React.useEffect(() => {
    if (!clipLogic.activeSimple) return;

    window.addEventListener("pointerup", handleGlobalDragEnd);
    window.addEventListener("pointercancel", handleGlobalDragEnd);
    window.addEventListener("mouseup", handleGlobalDragEnd);
    window.addEventListener("touchend", handleGlobalDragEnd, { passive: true });
    window.addEventListener("touchcancel", handleGlobalDragEnd, { passive: true });

    return () => {
      window.removeEventListener("pointerup", handleGlobalDragEnd);
      window.removeEventListener("pointercancel", handleGlobalDragEnd);
      window.removeEventListener("mouseup", handleGlobalDragEnd);
      window.removeEventListener("touchend", handleGlobalDragEnd);
      window.removeEventListener("touchcancel", handleGlobalDragEnd);
    };
  }, [clipLogic.activeSimple, handleGlobalDragEnd]);

  // --- compute real values + derived params exactly like mega-file ---
  const simpleStats = React.useMemo(() => {
    const totalStepsInt = Math.round(p.simple.totalSteps);
    const stepRatioPctInt = Math.round(p.simple.stepRatioPct);

    const lowStepsInt = Math.round((totalStepsInt * stepRatioPctInt) / 100);
    const highStepsInt = totalStepsInt - lowStepsInt;
    const effectiveLowStepPct = Math.round((lowStepsInt / totalStepsInt) * 100);

    return {
      totalStepsInt,
      stepRatioPctInt,
      lowStepsInt,
      highStepsInt,
      effectiveLowStepPct,
    };
  }, [p.simple.totalSteps, p.simple.stepRatioPct]);

  const scoreRanges = React.useMemo(() => {
    return getScoreRanges(p.simpleSpeedMode);
  }, [p.simpleSpeedMode]);

  const scores = React.useMemo(() => {
    return computeCategoryScoresFromSimple(
      {
        totalSteps: simpleStats.totalStepsInt,
        stepRatio: simpleStats.effectiveLowStepPct,
        highShift: p.simple.highShift,
        highCfg: p.simple.highCfg,
        highStrength: p.simple.highStrength,
      },
      scoreRanges,
      p.formulaWeights
    );
  }, [
    simpleStats.totalStepsInt,
    simpleStats.effectiveLowStepPct,
    p.simple.highShift,
    p.simple.highCfg,
    p.simple.highStrength,
    scoreRanges,
    p.formulaWeights,
  ]);

  const customScores = React.useMemo(() => {
    return computeCustomScores(
      {
        totalSteps: simpleStats.totalStepsInt,
        stepRatioPct: simpleStats.effectiveLowStepPct,
        highShift: p.simple.highShift,
        highCfg: p.simple.highCfg,
        highStrength: p.simple.highStrength,
      },
      scoreRanges,
      p.customSliders
    );
  }, [
    simpleStats.totalStepsInt,
    simpleStats.effectiveLowStepPct,
    p.simple.highShift,
    p.simple.highCfg,
    p.simple.highStrength,
    scoreRanges,
    p.customSliders,
  ]);

  const allScores = React.useMemo(() => {
    return {
      ...scores,
      ...customScores,
    };
  }, [scores, customScores]);

  const activeSafeKey = React.useMemo(
    () => (clipLogic.activeSimple ? sliderLogic.toSafeKey(clipLogic.activeSimple) : null),
    [clipLogic.activeSimple]
  );

  const activeSafeValue = activeSafeKey ? (p.simple[activeSafeKey] as number) : null;

  const safeBounds = React.useMemo(() => {
    if (!activeSafeKey || activeSafeValue == null) return null;
    return p.getBounds(activeSafeKey, activeSafeValue);
  }, [activeSafeKey, activeSafeValue, p.getBounds]);

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
    const name = draftName.trim();
    if (!name) return;
    p.onCreateCustomSlider(name, draftW);
    setDraftName("");
    setDraftW(DEFAULT_CUSTOM_W);
    setNewOpen(false);
  }, [draftName, draftW, p.onCreateCustomSlider]);

  const saveCustomEdit = React.useCallback(() => {
    const name = editName.trim();
    if (!editId || !name) return;
    p.onUpdateCustomSlider(editId, name, editW);
    setEditOpen(false);
    setEditId(null);
  }, [editId, editName, editW, p.onUpdateCustomSlider]);

  const deleteCustom = React.useCallback(
    (id: string) => {
      p.onDeleteCustomSlider(id);
      setEditOpen(false);
      setEditId(null);
    },
    [p.onDeleteCustomSlider]
  );

  const {
    DEFAULT_TRIANGLE_AXIS_IDS,
    triangleAxes,
    setTriangleAxes,
    triangleAxisObjects,
    availableAxisIds: triangleAvailableAxisIds,
    getDisabledAxisReasons: getTriangleDisabledAxisReasons,
  } = useTriangleLogic(allScores, p.customSliders, p.formulaWeights, triangleEnabled);

  const {
    DEFAULT_PENTAGON_AXIS_IDS,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    setPentagonAxes,
    getDisabledAxisReasons,
  } = usePentagonLogic(allScores, p.customSliders, pentagonEnabled);

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

        <DialogContent sx={{ overscrollBehavior: "contain" }}>
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
                    <SimpleSliderField
                      label="Steps total"
                      displayValue={simpleStats.totalStepsInt}
                      sliderKey="totalSteps"
                      value={simpleStats.totalStepsInt}
                      min={cfg.totalSteps.min}
                      max={cfg.totalSteps.max}
                      step={cfg.totalSteps.step}
                      marks={
                        activeSafeKey && activeSafeKey !== "totalSteps"
                          ? sliderLogic.marksFor(safeBounds?.totalSteps, 2)
                          : undefined
                      }
                      activeSafeKey={activeSafeKey}
                      safeRange={safeBounds?.totalSteps}
                      sliderMin={cfg.totalSteps.min}
                      sliderMax={cfg.totalSteps.max}
                      onBegin={handleBeginDrag}
                      onEnd={handleEndDrag}
                      onChange={p.onChangeTotalSteps}
                    />

                    <SimpleSliderField
                      label="Ratio"
                      displayValue={`${simpleStats.effectiveLowStepPct}%`}
                      sliderKey="stepRatioPct"
                      value={simpleStats.effectiveLowStepPct}
                      min={cfg.stepRatioPct.min}
                      max={cfg.stepRatioPct.max}
                      step={cfg.stepRatioPct.step}
                      marks={
                        activeSafeKey && activeSafeKey !== "stepRatioPct"
                          ? sliderLogic.marksFor(safeBounds?.stepRatioPct, 2)
                          : undefined
                      }
                      activeSafeKey={activeSafeKey}
                      safeRange={safeBounds?.stepRatioPct}
                      sliderMin={cfg.stepRatioPct.min}
                      sliderMax={cfg.stepRatioPct.max}
                      onBegin={handleBeginDrag}
                      onEnd={handleEndDrag}
                      onChange={p.onChangeStepRatio}
                    />

                    <SimpleSliderField
                      label="High shift"
                      displayValue={p.simple.highShift.toFixed(2)}
                      sliderKey="highShift"
                      value={p.simple.highShift}
                      min={cfg.highShift.min}
                      max={cfg.highShift.max}
                      step={cfg.highShift.step}
                      marks={
                        activeSafeKey && activeSafeKey !== "highShift"
                          ? sliderLogic.marksFor(safeBounds?.highShift, 2)
                          : undefined
                      }
                      activeSafeKey={activeSafeKey}
                      safeRange={safeBounds?.highShift}
                      sliderMin={cfg.highShift.min}
                      sliderMax={cfg.highShift.max}
                      onBegin={handleBeginDrag}
                      onEnd={handleEndDrag}
                      onChange={p.onChangeHighShift}
                    />

                    <SimpleSliderField
                      label="High CFG"
                      displayValue={p.simple.highCfg.toFixed(2)}
                      sliderKey="highCfg"
                      value={p.simple.highCfg}
                      min={cfg.highCfg.min}
                      max={cfg.highCfg.max}
                      step={cfg.highCfg.step}
                      marks={
                        activeSafeKey && activeSafeKey !== "highCfg"
                          ? sliderLogic.marksFor(safeBounds?.highCfg, 2)
                          : undefined
                      }
                      activeSafeKey={activeSafeKey}
                      safeRange={safeBounds?.highCfg}
                      sliderMin={cfg.highCfg.min}
                      sliderMax={cfg.highCfg.max}
                      onBegin={handleBeginDrag}
                      onEnd={handleEndDrag}
                      onChange={p.onChangeHighCfg}
                    />

                    <SimpleSliderField
                      label="High strength"
                      displayValue={p.simple.highStrength.toFixed(2)}
                      sliderKey="highStrength"
                      value={p.simple.highStrength}
                      min={cfg.highStrength.min}
                      max={cfg.highStrength.max}
                      step={cfg.highStrength.step}
                      marks={
                        activeSafeKey && activeSafeKey !== "highStrength"
                          ? sliderLogic.marksFor(safeBounds?.highStrength, 2)
                          : undefined
                      }
                      activeSafeKey={activeSafeKey}
                      safeRange={safeBounds?.highStrength}
                      sliderMin={cfg.highStrength.min}
                      sliderMax={cfg.highStrength.max}
                      onBegin={handleBeginDrag}
                      onEnd={handleEndDrag}
                      onChange={p.onChangeHighStrength}
                    />
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
                            <OrderedSliderRow
                              key={item.id}
                              item={item}
                              index={index}
                              isFirst={index === 0}
                              isLast={index === p.orderedSliderItems.length - 1}
                              scores={scores}
                              allScores={allScores}
                              activeEffects={clipLogic.activeEffects}
                              catInfluenceSx={clipLogic.catInfluenceSx}
                              openWeights={openWeights}
                              openCustomEdit={openCustomEdit}
                              clickable
                              moveSlider={p.moveSlider}
                              setCategoryScore={p.setCategoryScore}
                              setCustomCategoryScore={p.setCustomCategoryScore}
                            />
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

      {weightsOpen && (
        <WeightsDialog
          open={weightsOpen}
          cat={weightsCat}
          weights={p.formulaWeights}
          onClose={closeWeights}
          onPatch={p.onPatchFormulaWeights}
          onReset={p.onResetFormulaWeights}
        />
      )}

      {/* CREATE */}
      {newOpen && (
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
      )}

      {/* EDIT */}
      {editOpen && (
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
      )}

      {pentagonAxesOpen && (
        <PentagonAxesDialog
          open={pentagonAxesOpen}
          onClose={() => setPentagonAxesOpen(false)}
          axes={pentagonAxes}
          onAxesChange={setPentagonAxes}
          availableAxisIds={availableAxisIds.map(String)}
          axisLabel={getAxisLabel}
          defaultAxes={DEFAULT_PENTAGON_AXIS_IDS.map(String)}
          getDisabledAxisReasons={getDisabledAxisReasons}
          restrictCategories={p.restrictCategories}
        />
      )}

      {triangleAxesOpen && (
        <TriangleAxesDialog
          open={triangleAxesOpen}
          onClose={() => setTriangleAxesOpen(false)}
          axes={triangleAxes}
          onAxesChange={setTriangleAxes}
          availableAxisIds={triangleAvailableAxisIds}
          axisLabel={getAxisLabel}
          defaultAxes={DEFAULT_TRIANGLE_AXIS_IDS}
          getDisabledAxisReasons={getTriangleDisabledAxisReasons}
          restrictCategories={p.restrictCategories}
        />
      )}
    </>
  );
}

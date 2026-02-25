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
} from "@mui/material";

// ⬇️ falls dein PentagonMap woanders liegt: Pfad anpassen
import { PentagonMap } from "../components/PentagonMap";
import { useV2VSliders } from "../hooks/useV2VSliders";

export type V2VTab = "simple" | "advanced";
type CatView = "sliders" | "pentagon";
type SimpleSpeedMode = "simple" | "quick";

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

  simpleSpeedMode: "simple" | "quick";
onSimpleSpeedModeChange: (m: "simple" | "quick") => void;

};

/* ========= helpers (wie im mega-file) ========= */

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

function computeCategoryScoresFromSimple(
  s: {
    totalSteps: number; // real
    stepRatio: number; // real (% low)
    highShift: number; // real
    highCfg: number; // real
    highStrength: number; // real
  },
  stepsMinMax: { min: number; max: number }
): CategoryScores {
  // EXACT mega-file mapping (aus deinem großen snippet)
  const denom = Math.max(1e-6, stepsMinMax.max - stepsMinMax.min);
  const steps01 = clamp((s.totalSteps - stepsMinMax.min) / denom, 0, 1);

  const ratio01 = clamp((s.stepRatio - 50) / (80 - 50), 0, 1); // low%: 50..80
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

  return {
    creativity: Math.round(creativity * 100),
    promptFaithfulness: Math.round(promptFaithfulness * 100),
    motion: Math.round(motion * 100),
    transitionSmoothness: Math.round(transitionSmoothness * 100),
    videoFaithfulness: Math.round(videoFaithfulness * 100),
  };
}

/* ========= UI helpers ========= */

function ReadonlySlider(props: { label: string; value: number }) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2">{props.label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>
      <Slider value={props.value} min={0} max={100} step={1} disabled />
    </Box>
  );
}

export function ClipDialog(p: ClipDialogProps) {
  const [catView, setCatView] = React.useState<CatView>("sliders");

  // --- compute real values + derived params exactly like mega-file ---
  const computed = React.useMemo(() => {
    const stepsRange = p.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };
    const totalStepsReal = sliderToIntRange(p.simpleTotalSteps, stepsRange.min, stepsRange.max);

    const stepRatioPct = sliderToRange(p.simpleStepRatio, 50, 80); // low% 50..80
    const stepRatio01 = stepRatioPct / 100;

    const highShiftReal = sliderToRange(p.simpleHighShift, 2.3, 3.0, smoothstep01);
    const highCfgReal = sliderToRange(p.simpleHighCfg, 2.5, 3.0);
    const highStrengthReal = sliderToRange(p.simpleHighStrength, 0.2, 0.45, smoothstep01);

    const d = deriveV2VParamsFromSimple({
      totalSteps: totalStepsReal,
      stepRatio01,
      highShift: highShiftReal,
      highCfg: highCfgReal,
      highStrength: highStrengthReal,
    });

    const scores = computeCategoryScoresFromSimple(
      {
        totalSteps: totalStepsReal,
        stepRatio: stepRatioPct,
        highShift: highShiftReal,
        highCfg: highCfgReal,
        highStrength: highStrengthReal,
      },
      stepsRange
    );

    return {
      totalStepsReal,
      stepRatioPct,
      highShiftReal,
      highCfgReal,
      highStrengthReal,
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
                        '& .MuiButton-root:first-of-type': {
                        borderTopLeftRadius: 8,
                        borderBottomLeftRadius: 8,
                        },
                        '& .MuiButton-root:last-of-type': {
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
    variant={p.simpleSpeedMode === "simple" ? "contained" : "outlined"}
    onClick={() => p.onSimpleSpeedModeChange("simple")}
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
                    <Slider value={p.simpleTotalSteps} step={1} onChange={p.onChangeTotalSteps} />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Step Ratio: {p.simpleStepRatio}%</Typography>
                    <Slider value={p.simpleStepRatio} step={1} onChange={p.onChangeStepRatio} />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Shift: {p.simpleHighShift}%</Typography>
                    <Slider value={p.simpleHighShift} step={1} onChange={p.onChangeHighShift} />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>CFG: {p.simpleHighCfg}%</Typography>
                    <Slider value={p.simpleHighCfg} step={1} onChange={p.onChangeHighCfg} />
                  </Stack>

                  <Stack spacing={0.5}>
                    <Typography gutterBottom>Model strength: {p.simpleHighStrength}%</Typography>
                    <Slider
                      value={p.simpleHighStrength}
                      step={1}
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
                        High shift: <b>{computed.highShiftReal.toFixed(2)}</b> • High CFG:{" "}
                        <b>{computed.highCfgReal.toFixed(2)}</b>
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        High strength: <b>{computed.highStrengthReal.toFixed(2)}</b>
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
                        <ReadonlySlider label="Creativity" value={computed.scores.creativity} />
                        <ReadonlySlider
                          label="Prompt faithfulness"
                          value={computed.scores.promptFaithfulness}
                        />
                        <ReadonlySlider label="Motion" value={computed.scores.motion} />
                        <ReadonlySlider
                          label="Transition Smoothness"
                          value={computed.scores.transitionSmoothness}
                        />
                        <ReadonlySlider
                          label="Video Faithfulness"
                          value={computed.scores.videoFaithfulness}
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
              label="Low Noise CFG"
              value={p.advanced.lowNoiseCfg}
              onChange={(e) => p.onAdvancedChange({ lowNoiseCfg: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise CFG"
              value={p.advanced.highNoiseCfg}
              onChange={(e) => p.onAdvancedChange({ highNoiseCfg: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Model Strength"
              value={p.advanced.lowNoiseModelStrength}
              onChange={(e) =>
                p.onAdvancedChange({ lowNoiseModelStrength: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Model Strength"
              value={p.advanced.highNoiseModelStrength}
              onChange={(e) =>
                p.onAdvancedChange({ highNoiseModelStrength: Number(e.target.value) })
              }
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Shift"
              value={p.advanced.lowNoiseShift}
              onChange={(e) => p.onAdvancedChange({ lowNoiseShift: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Shift"
              value={p.advanced.highNoiseShift}
              onChange={(e) => p.onAdvancedChange({ highNoiseShift: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Steps"
              value={p.advanced.lowNoiseSteps}
              onChange={(e) => p.onAdvancedChange({ lowNoiseSteps: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Steps"
              value={p.advanced.highNoiseSteps}
              onChange={(e) => p.onAdvancedChange({ highNoiseSteps: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Start Step"
              value={p.advanced.lowNoiseStartStep}
              onChange={(e) => p.onAdvancedChange({ lowNoiseStartStep: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Start Step"
              value={p.advanced.highNoiseStartStep}
              onChange={(e) => p.onAdvancedChange({ highNoiseStartStep: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise End Step"
              value={p.advanced.lowNoiseEndStep}
              onChange={(e) => p.onAdvancedChange({ lowNoiseEndStep: Number(e.target.value) })}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise End Step"
              value={p.advanced.highNoiseEndStep}
              onChange={(e) => p.onAdvancedChange({ highNoiseEndStep: Number(e.target.value) })}
              fullWidth
            />

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

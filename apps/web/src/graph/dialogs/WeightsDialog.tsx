import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  DialogActions,
  Button,
} from "@mui/material";
import { CategoryScores, FormulaWeights } from "../hooks/useV2VParams";
import { CatKey } from "../types/ui";


export function WeightsDialog(props: {
  open: boolean;
  cat: CatKey | null; // "creativity" | ...
  weights: FormulaWeights;
  onClose: () => void;
  onPatch: <K extends keyof FormulaWeights>(cat: K, patch: Partial<FormulaWeights[K]>) => void;
  onReset: () => void;
}) {
  const { open, cat, weights, onClose, onPatch, onReset } = props;
  if (!cat) return null;

  const titleMap: Record<CatKey, string> = {
    creativity: "Creativity",
    promptFaithfulness: "Prompt faithfulness",
    motion: "Motion",
    transitionSmoothness: "Transition smoothness",
    videoFaithfulness: "Video faithfulness",
  };

  // kleine Helper für Number-Inputs
  const Num = (p: {
    label: string;
    value: number;
    step?: number;
    onChange: (v: number) => void;
    helper?: string;
  }) => (
    <TextField
      type="number"
      label={p.label}
      value={Number.isFinite(p.value) ? p.value : 0}
      onChange={(e) => p.onChange(Number(e.target.value))}
      inputProps={{ step: p.step ?? 0.05 }}
      helperText={p.helper}
      fullWidth
    />
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit weights: {titleMap[cat]}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            These are the coefficients used in the category formulas. (Some may be negative.)
          </Typography>

          {cat === "promptFaithfulness" && (
            <>
              <Num
                label="cfg coefficient"
                value={weights.promptFaithfulness.cfg}
                onChange={(v) => onPatch("promptFaithfulness", { cfg: v })}
              />
              <Num
                label="ratio coefficient"
                value={weights.promptFaithfulness.ratio}
                onChange={(v) => onPatch("promptFaithfulness", { ratio: v })}
              />
            </>
          )}

          {cat === "videoFaithfulness" && (
            <>
              <Num
                label="ratio coefficient"
                value={weights.videoFaithfulness.ratio}
                onChange={(v) => onPatch("videoFaithfulness", { ratio: v })}
              />
              <Num
                label="(1 - shift) coefficient"
                value={weights.videoFaithfulness.invShift}
                onChange={(v) => onPatch("videoFaithfulness", { invShift: v })}
              />
              <Num
                label="(1 - strength) coefficient"
                value={weights.videoFaithfulness.invStrength}
                onChange={(v) => onPatch("videoFaithfulness", { invStrength: v })}
              />
            </>
          )}

          {cat === "transitionSmoothness" && (
            <>
              <Num
                label="steps coefficient"
                value={weights.transitionSmoothness.steps}
                onChange={(v) => onPatch("transitionSmoothness", { steps: v })}
              />
              <Num
                label="ratio coefficient"
                value={weights.transitionSmoothness.ratio}
                onChange={(v) => onPatch("transitionSmoothness", { ratio: v })}
              />
            </>
          )}

          {cat === "motion" && (
            <>
              <Num
                label="shift coefficient"
                value={weights.motion.shift}
                onChange={(v) => onPatch("motion", { shift: v })}
              />
              <Num
                label="strength coefficient"
                value={weights.motion.strength}
                onChange={(v) => onPatch("motion", { strength: v })}
              />
              <Num
                label="ratio coefficient (can be negative)"
                value={weights.motion.ratio}
                onChange={(v) => onPatch("motion", { ratio: v })}
              />
              <Num
                label="bias"
                value={weights.motion.bias}
                onChange={(v) => onPatch("motion", { bias: v })}
                helper="Added after the weighted sum."
              />
            </>
          )}

          {cat === "creativity" && (
            <>
              <Num
                label="shift coefficient"
                value={weights.creativity.shift}
                onChange={(v) => onPatch("creativity", { shift: v })}
              />
              <Num
                label="strength coefficient"
                value={weights.creativity.strength}
                onChange={(v) => onPatch("creativity", { strength: v })}
              />
              <Num
                label="(1 - cfg) coefficient"
                value={weights.creativity.invCfg}
                onChange={(v) => onPatch("creativity", { invCfg: v })}
              />
              <Num
                label="ratio coefficient (can be negative)"
                value={weights.creativity.ratio}
                onChange={(v) => onPatch("creativity", { ratio: v })}
              />
              <Num
                label="bias"
                value={weights.creativity.bias}
                onChange={(v) => onPatch("creativity", { bias: v })}
              />
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onReset}>Reset defaults</Button>
        <Button variant="contained" onClick={onClose}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

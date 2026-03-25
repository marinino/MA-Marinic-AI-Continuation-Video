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

import { CatKey, FormulaWeights, CleanWeights } from "../types/ui";

const FIELD_DEFS: Array<{
  key: keyof CleanWeights;
  label: string;
  helper?: string;
}> = [
  { key: "steps", label: "steps coefficient" },
  { key: "ratio", label: "ratio coefficient" },
  { key: "shift", label: "shift coefficient" },
  { key: "cfg", label: "cfg coefficient" },
  { key: "strength", label: "strength coefficient" },
  { key: "bias", label: "bias", helper: "Added after the weighted sum." },
];

export function WeightsDialog(props: {
  open: boolean;
  cat: CatKey | null;
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

  const current = weights[cat];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit weights: {titleMap[cat]}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            These coefficients are applied to normalized features. Negative values are allowed.
          </Typography>

          {FIELD_DEFS.map((field) => (
            <TextField
              key={field.key}
              type="number"
              label={field.label}
              value={Number.isFinite(current[field.key]) ? current[field.key] : 0}
              onChange={(e) =>
                onPatch(cat, {
                  [field.key]: Number(e.target.value),
                } as Partial<CleanWeights>)
              }
              slotProps={{ htmlInput: { step: 0.05 } }}
              helperText={field.helper}
              fullWidth
            />
          ))}
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

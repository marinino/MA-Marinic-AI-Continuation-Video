import {
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  Stack,
  Typography,
  Divider,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import { CustomScoreSlider } from "../hooks/useV2VParams";

export function NewCustomSliderDialog(props: {
  open: boolean;
  title?: string;
  primaryLabel?: string;

  name: string;
  w: CustomScoreSlider["w"];

  onName: (v: string) => void;
  onW: (patch: Partial<CustomScoreSlider["w"]>) => void;

  onClose: () => void;
  onPrimary: () => void;

  secondaryLabel?: string;
  onSecondary?: () => void;
  primaryDisabled?: boolean;
}) {
  const Num = (p: { label: string; k: keyof CustomScoreSlider["w"] }) => (
    <TextField
      type="number"
      label={p.label}
      value={props.w[p.k]}
      onChange={(e) => props.onW({ [p.k]: Number(e.target.value) } as any)}
      inputProps={{ step: 0.05 }}
      fullWidth
    />
  );

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New slider</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={props.name}
            onChange={(e) => props.onName(e.target.value)}
            fullWidth
          />

          <Typography variant="body2" color="text.secondary">
            Formula = Σ(w * feature) + bias, then clamped to 0..1.
          </Typography>

          <Num label="steps" k="steps" />
          <Num label="ratio" k="ratio" />
          <Num label="shift" k="shift" />
          <Num label="cfg" k="cfg" />
          <Num label="strength" k="strength" />

          <Divider />

          <Num label="(1-steps)" k="invSteps" />
          <Num label="(1-ratio)" k="invRatio" />
          <Num label="(1-shift)" k="invShift" />
          <Num label="(1-cfg)" k="invCfg" />
          <Num label="(1-strength)" k="invStrength" />

          <Divider />

          <Num label="bias" k="bias" />
        </Stack>
      </DialogContent>
      <DialogActions>
  {props.onSecondary && (
    <Button color="error" onClick={props.onSecondary}>
      {props.secondaryLabel ?? "Delete"}
    </Button>
  )}

  <Box sx={{ flex: 1 }} />

  <Button onClick={props.onClose}>Cancel</Button>
  <Button
    variant="contained"
    onClick={props.onPrimary}
    disabled={props.primaryDisabled}
  >
    {props.primaryLabel ?? "Save"}
  </Button>
</DialogActions>
    </Dialog>
  );
}

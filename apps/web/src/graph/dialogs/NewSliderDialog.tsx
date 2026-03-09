import * as React from "react";
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
import type { CustomScoreSlider } from "../hooks/useV2VParams";

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
  // kleine Helper-Funktion (keine Komponente), damit onChange überall gleich ist
  const onNum = (k: keyof CustomScoreSlider["w"]) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    // erlaubt leeres Feld ohne NaN zu committen
    if (v === "") return;
    props.onW({ [k]: Number(v) } as any);
  };

  const numProps = {
    type: "number" as const,
    fullWidth: true,
    // optional: damit label nicht über value liegt
    InputLabelProps: { shrink: true },
  };

  function weightL2Norm(w: CustomScoreSlider["w"]) {
    const values = Object.values(w);
    const sumSq = values.reduce((acc, v) => acc + v * v, 0);
    return Math.sqrt(sumSq);
  }

  function classifyNorm(norm: number) {
    if (norm < 1.5) return "balanced";
    if (norm < 3) return "strong";
    return "very-strong";
  }

  const norm = weightL2Norm(props.w);
  const level = classifyNorm(norm);

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{props.title ?? "New slider"}</DialogTitle>
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

          <TextField
            {...numProps}
            label="steps"
            value={props.w.steps}
            onChange={onNum("steps")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />
          <TextField
            {...numProps}
            label="ratio"
            value={props.w.ratio}
            onChange={onNum("ratio")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />
          <TextField
            {...numProps}
            label="shift"
            value={props.w.shift}
            onChange={onNum("shift")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />
          <TextField
            {...numProps}
            label="cfg"
            value={props.w.cfg}
            onChange={onNum("cfg")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />
          <TextField
            {...numProps}
            label="strength"
            value={props.w.strength}
            onChange={onNum("strength")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />

          <Divider />

          <TextField
            {...numProps}
            label="bias"
            value={props.w.bias}
            onChange={onNum("bias")}
            slotProps={{ htmlInput: { step: 0.05 } }}
          />

          <Divider />

          <Typography
            variant="caption"
            color={
              level === "balanced"
                ? "text.secondary"
                : level === "strong"
                  ? "warning.main"
                  : "error.main"
            }
          >
            Weight magnitude: {norm.toFixed(2)} ({level})
          </Typography>
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
        <Button variant="contained" onClick={props.onPrimary} disabled={props.primaryDisabled}>
          {props.primaryLabel ?? "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

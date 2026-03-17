// PentagonAxesDialog.tsx
import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
} from "@mui/material";
import { AxisId } from "../types/ui";

export type PentagonAxesDialogProps = {
  open: boolean;
  onClose: () => void;

  /** Always 5 entries (or at least indexable 0..4) */
  axes: AxisId[];
  onAxesChange: (next: AxisId[]) => void;

  /** Available ids to choose from (built-ins + custom ids) */
  availableAxisIds: AxisId[];

  /** id -> user facing label (can contain '\n') */
  axisLabel: (id: AxisId) => string;

  /** default (built-in) 5 ids */
  defaultAxes: AxisId[];
};

export function PentagonAxesDialog(p: PentagonAxesDialogProps) {
  const current = React.useMemo(() => {
    const base = (p.axes?.length === 5 ? p.axes : p.defaultAxes).slice(0, 5);
    while (base.length < 5) base.push(p.defaultAxes[base.length] ?? p.availableAxisIds[0] ?? "");
    return base;
  }, [p.axes, p.defaultAxes, p.availableAxisIds]);

  function setAxisAt(i: number, id: AxisId) {
    const next = [...current];
    next[i] = id;
    p.onAxesChange(next);
  }

  function reset() {
    p.onAxesChange(p.defaultAxes.slice(0, 5));
  }

  return (
    <Dialog open={p.open} onClose={p.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Pentagon axes</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <TextField
              key={i}
              select
              label={`Axis ${i + 1}`}
              value={String(current[i] ?? p.defaultAxes[i])}
              onChange={(e) => setAxisAt(i, e.target.value as AxisId)}
              fullWidth
              slotProps={{
                select: {
                  native: true,
                },
              }}
            >
              {p.availableAxisIds.map((id) => (
                <option key={String(id)} value={String(id)}>
                  {p.axisLabel(id).replace("\n", " ")}
                </option>
              ))}
            </TextField>
          ))}

          <Button variant="outlined" onClick={reset}>
            Reset to default
          </Button>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

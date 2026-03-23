import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  TextField,
  Button,
  MenuItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { AxisId } from "../types/ui";

export type PentagonAxesDialogProps = {
  open: boolean;
  onClose: () => void;

  axes: AxisId[];
  onAxesChange: (next: AxisId[]) => void;

  availableAxisIds: AxisId[];
  axisLabel: (id: AxisId) => string;
  defaultAxes: AxisId[];

  getDisabledAxisReasons?: (index: number) => Record<string, string>;
  restrictCategories: boolean;
};

export function PentagonAxesDialog(p: PentagonAxesDialogProps) {
  const current = React.useMemo(() => {
    const base = (p.axes?.length === 5 ? p.axes : p.defaultAxes).slice(0, 5);
    while (base.length < 5) {
      base.push(p.defaultAxes[base.length] ?? p.availableAxisIds[0] ?? "");
    }
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
          <Typography variant="body2" color="text.secondary">
            Similar or already selected categories are disabled.
          </Typography>

          {[0, 1, 2, 3, 4].map((i) => {
            const disabledReasons = p.getDisabledAxisReasons?.(i) ?? {};

            return (
              <TextField
                key={i}
                select
                label={`Axis ${i + 1}`}
                value={String(current[i] ?? p.defaultAxes[i] ?? "")}
                onChange={(e) => setAxisAt(i, e.target.value as AxisId)}
                fullWidth
              >
                {p.availableAxisIds.map((id) => {
                  const reason = disabledReasons[String(id)];
                  const disabled = p.restrictCategories && Boolean(reason);

                  return (
                    <MenuItem key={String(id)} value={String(id)} disabled={disabled}>
                      <ListItemText
                        primary={p.axisLabel(id).replace("\n", " ")}
                        secondary={p.restrictCategories ? reason || undefined : undefined}
                      />
                    </MenuItem>
                  );
                })}
              </TextField>
            );
          })}

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

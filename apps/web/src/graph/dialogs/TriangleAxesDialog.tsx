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

type Props = {
  open: boolean;
  onClose: () => void;
  axes: string[];
  onAxesChange: (axes: string[]) => void;
  availableAxisIds: string[];
  axisLabel: (id: string) => string;
  defaultAxes: string[];
};

export function TriangleAxesDialog(props: Props) {
  const { open, onClose, axes, onAxesChange, availableAxisIds, axisLabel, defaultAxes } = props;

  function setAxisAt(i: number, id: string) {
    const next = [...axes];
    next[i] = id;
    onAxesChange(next);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Triangle axes</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {[0, 1, 2].map((i) => (
            <TextField
              key={i}
              select
              label={`Axis ${i + 1}`}
              value={String(axes[i] ?? defaultAxes[i])}
              onChange={(e) => setAxisAt(i, e.target.value)}
              fullWidth
              SelectProps={{ native: true }}
            >
              {availableAxisIds.map((id) => (
                <option key={id} value={id}>
                  {axisLabel(id).replace("\n", " ")}
                </option>
              ))}
            </TextField>
          ))}

          <Button variant="outlined" onClick={() => onAxesChange(defaultAxes)}>
            Reset to default
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

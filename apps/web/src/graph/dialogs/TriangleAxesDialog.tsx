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

type Props = {
  open: boolean;
  onClose: () => void;
  axes: AxisId[];
  onAxesChange: (axes: AxisId[]) => void;
  availableAxisIds: AxisId[];
  axisLabel: (id: AxisId) => string;
  defaultAxes: AxisId[];
  getDisabledAxisReasons?: (index: number) => Record<string, string>;
  restrictCategories: boolean;
};

export function TriangleAxesDialog(props: Props) {
  const {
    open,
    onClose,
    axes,
    onAxesChange,
    availableAxisIds,
    axisLabel,
    defaultAxes,
    getDisabledAxisReasons,
  } = props;

  const current = React.useMemo(() => {
    const base = (axes?.length === 3 ? axes : defaultAxes).slice(0, 3);
    while (base.length < 3) {
      base.push(defaultAxes[base.length] ?? availableAxisIds[0] ?? "");
    }
    return base;
  }, [axes, defaultAxes, availableAxisIds]);

  function setAxisAt(i: number, id: AxisId) {
    const next = [...current];
    next[i] = id;
    onAxesChange(next);
  }

  function reset() {
    onAxesChange(defaultAxes.slice(0, 3));
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Triangle axes</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Similar or already selected categories are disabled.
          </Typography>

          {[0, 1, 2].map((i) => {
            const disabledReasons = getDisabledAxisReasons?.(i) ?? {};

            return (
              <TextField
                key={i}
                select
                label={`Axis ${i + 1}`}
                value={String(current[i] ?? defaultAxes[i] ?? "")}
                onChange={(e) => setAxisAt(i, e.target.value as AxisId)}
                fullWidth
              >
                {availableAxisIds.map((id) => {
                  const reason = disabledReasons[String(id)];
                  const disabled = props.restrictCategories && Boolean(reason);

                  return (
                    <MenuItem key={String(id)} value={String(id)} disabled={disabled}>
                      <ListItemText
                        primary={axisLabel(id).replace("\n", " ")}
                        secondary={props.restrictCategories ? reason || undefined : undefined}
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
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

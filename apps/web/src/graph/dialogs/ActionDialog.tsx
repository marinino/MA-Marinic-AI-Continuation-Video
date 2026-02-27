import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from "@mui/material";

export type ActionDialogProps = {
  open: boolean;
  selectedLabel?: string | null;
  canGenerate?: boolean;
  onClose: () => void;
  onManualEdit: () => void;
  onGenerate: () => void;
};

export function ActionDialog(props: ActionDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Next step</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          Selected clip:
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {props.selectedLabel ?? "(none)"}
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Choose what you want to do.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
          <Button variant="outlined" onClick={props.onManualEdit}>
            Edit current clip
          </Button>
          <Button variant="contained" onClick={props.onGenerate} disabled={!props.canGenerate}>
            Generate Continuation
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

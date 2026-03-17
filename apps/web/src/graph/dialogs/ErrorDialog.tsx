import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from "@mui/material";
import { ErrorDialogState } from "../types/ui";

export type ErrorDialogProps = {
  error: ErrorDialogState;
  onClose: () => void;
};

export function ErrorDialog(p: ErrorDialogProps) {
  return (
    <Dialog open={!!p.error} onClose={p.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{p.error?.title ?? "Error"}</DialogTitle>

      <DialogContent>
        <Typography
          component="pre"
          sx={{
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            fontSize: 14,
          }}
        >
          {p.error?.message ?? ""}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button variant="contained" onClick={p.onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

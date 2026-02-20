import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export type NamingConventionDialogProps = {
  open: boolean;
  onClose: () => void;
  onStudio: () => void;
  onFree: () => void;
};

export function NamingConventionDialog(p: NamingConventionDialogProps) {
  return (
    <Dialog open={p.open} onClose={p.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>DaVinci Resolve Edit</DialogTitle>

      <DialogContent>
        Choose which version of DaVinci you have. With the Studio version, changes can be imported
        automatically. The free version necessitates more work.
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onClose}>Close</Button>
        <Button variant="contained" onClick={p.onStudio}>
          DaVinci Resolve Studio
        </Button>
        <Button variant="contained" onClick={p.onFree}>
          DaVinci Resolve free version
        </Button>
      </DialogActions>
    </Dialog>
  );
}

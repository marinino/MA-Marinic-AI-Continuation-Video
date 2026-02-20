import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

export type DavinciActionDialogProps = {
  open: boolean;
  onClose: () => void;

  onCopyUrl: () => void;
  onDownload: () => void;
  onOpenInResolve: () => void;
};

export function DavinciActionDialog(p: DavinciActionDialogProps) {
  return (
    <Dialog open={p.open} onClose={p.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Choose how you want to open the timeline file</DialogTitle>

      <DialogContent>
        The previous edit node contains a timeline file from DaVinci Resolve you can use. You can
        copy the link to the file, download it, or open it directly in DaVinci Resolve.
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onCopyUrl}>Copy URL</Button>
        <Button onClick={p.onDownload}>Download timeline file</Button>
        <Button variant="contained" onClick={p.onOpenInResolve}>
          Open timeline file in DaVinci
        </Button>
      </DialogActions>
    </Dialog>
  );
}

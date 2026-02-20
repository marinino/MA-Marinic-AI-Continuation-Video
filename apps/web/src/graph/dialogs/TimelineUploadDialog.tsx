import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Button,
} from "@mui/material";

export type TimelineUploadDialogProps = {
  open: boolean;
  disableBackdropClose?: boolean;

  timelineFile: File | null;
  editedVideoFile: File | null;
  onTimelineFileChange: (f: File | null) => void;
  onEditedVideoFileChange: (f: File | null) => void;

  onCancel: () => void;
  onFinish: () => void;

  finishDisabled?: boolean;
};

export function TimelineUploadDialog(p: TimelineUploadDialogProps) {
  return (
    <Dialog
      open={p.open}
      onClose={(event, reason) => {
        if (!p.disableBackdropClose) {
          p.onCancel();
          return;
        }
        if (reason === "backdropClick") return;
        if (reason === "escapeKeyDown") return;
        p.onCancel();
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Upload new timeline file from DaVinci Resolve</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography>
            Please do not close this window until you are finished editing. When you are finished,
            export the timeline from DaVinci Resolve and export the edited video and upload both.
          </Typography>

          <Button variant="outlined" component="label">
            Upload exported timeline...
            <input
              hidden
              type="file"
              accept=".drt,application/xml,text/xml"
              onChange={(e) => p.onTimelineFileChange(e.target.files?.[0] ?? null)}
            />
          </Button>

          {p.timelineFile && (
            <Typography variant="body2" color="text.secondary">
              Selected: {p.timelineFile.name}
            </Typography>
          )}

          <Button variant="outlined" component="label">
            Upload edited video...
            <input
              hidden
              type="file"
              accept="video/*"
              onChange={(e) => p.onEditedVideoFileChange(e.target.files?.[0] ?? null)}
            />
          </Button>

          {p.editedVideoFile && (
            <Typography variant="body2" color="text.secondary">
              Selected: {p.editedVideoFile.name}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={p.onFinish}
          disabled={p.finishDisabled ?? (!p.timelineFile || !p.editedVideoFile)}
        >
          Finish
        </Button>
      </DialogActions>
    </Dialog>
  );
}

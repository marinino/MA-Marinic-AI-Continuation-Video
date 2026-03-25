import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export type ImportVideoDialogProps = {
  open: boolean;
  file: File | null;
  uploading?: boolean;
  statusText?: string;
  onClose: () => void;
  onFileChange: (file: File | null) => void;
  onCreate: () => void;
};

export function ImportVideoDialog(props: ImportVideoDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Import video
        <IconButton
          aria-label="close"
          onClick={props.onClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Upload a video file. This will create an import node followed by a clip node.
          </Typography>

          <Button variant="outlined" component="label">
            Choose video
            <input
              hidden
              type="file"
              accept="video/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                props.onFileChange(file);
                e.currentTarget.value = "";
              }}
            />
          </Button>

          <Typography variant="body2">
            {props.file ? props.file.name : "No file selected"}
          </Typography>

          {props.statusText ? (
            <Typography variant="body2" color="text.secondary">
              {props.statusText}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={props.onCreate}
          disabled={!props.file || props.uploading}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}

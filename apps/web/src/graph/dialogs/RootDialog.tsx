import * as React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Stack,
  TextField,
  Button,
  Typography,
  LinearProgress,
} from "@mui/material";
import { RootMode } from "../types/ui";

export type RootDialogProps = {
  open: boolean;
  mode: RootMode;
  onModeChange: (mode: RootMode) => void;

  // generate mode

prompt: string;
onPromptChange: (v: string) => void;
length: number;
onLengthChange: (v: number) => void;
  generating?: boolean;
  statusText?: string;
  previewUrl?: string | null;
  onGenerate: () => void;

  // upload mode
  uploadFile: File | null;
  onUploadFileChange: (f: File | null) => void;
  uploading?: boolean;
  uploadStatusText?: string;
  onUpload: () => void;

  onClose: () => void;
};

export function RootDialog(p: RootDialogProps) {
  return (
    <Dialog
      open={p.open}
      onClose={() => (!p.generating && !p.uploading ? p.onClose() : null)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Create Root</DialogTitle>

      <DialogContent>
        <Tabs value={p.mode} onChange={(_, v) => p.onModeChange(v)} sx={{ mb: 2 }}>
          <Tab value="generate" label="Generate" />
          <Tab value="upload" label="Upload video" />
        </Tabs>

        {p.mode === "generate" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Positive prompt"
              value={p.prompt}
              onChange={(e) => p.onPromptChange(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              placeholder="Describe the video you want…"
              disabled={!!p.generating}
            />

            <TextField
  label="Frames"
  type="number"
  value={p.length}
  onChange={(e) => p.onLengthChange(Number(e.target.value))}
  slotProps={{
    htmlInput: {
    min: 1,
    step: 1,
  }}}
  fullWidth
  disabled={!!p.generating}
/>

            {p.generating && <LinearProgress />}
            {p.statusText && (
              <Typography variant="body2" color="text.secondary">
                {p.statusText}
              </Typography>
            )}

            {p.previewUrl && (
              <video src={p.previewUrl} controls style={{ width: "100%", borderRadius: 8 }} />
            )}
          </Stack>
        )}

        {p.mode === "upload" && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button variant="outlined" component="label" disabled={!!p.uploading}>
              Choose video…
              <input
                hidden
                type="file"
                accept="video/*"
                onChange={(e) => p.onUploadFileChange(e.target.files?.[0] ?? null)}
              />
            </Button>

            {p.uploadFile && (
              <Typography variant="body2" color="text.secondary">
                Selected: {p.uploadFile.name}
              </Typography>
            )}

            {p.uploading && <LinearProgress />}
            {p.uploadStatusText && (
              <Typography variant="body2" color="text.secondary">
                {p.uploadStatusText}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={p.onClose} disabled={!!p.generating || !!p.uploading}>
          Close
        </Button>

        {p.mode === "generate" ? (
          <Button
            variant="contained"
            onClick={p.onGenerate}
            disabled={!p.prompt.trim() || p.length <= 0 || !!p.generating}
          >
            {p.generating ? "Working…" : "Create Video"}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={p.onUpload}
            disabled={!!p.uploading || !p.uploadFile}
          >
            {p.uploading ? "Uploading…" : "Use Uploaded Video"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

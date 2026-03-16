import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";

type SettingsProps = {
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  showEdgeLabels: boolean;
  setShowEdgeLabels: (value: boolean) => void;
  highlightUnseenEnabled: boolean;
  setHighlightUnseenEnabled: (value: boolean) => void;
  notesEnabled: boolean;
  setNotesEnabled: (value: boolean) => void;
};

export function Settings({
  settingsOpen,
  setSettingsOpen,
  showEdgeLabels,
  setShowEdgeLabels,
  highlightUnseenEnabled,
  setHighlightUnseenEnabled,
  notesEnabled,
  setNotesEnabled,
}: SettingsProps) {
  return (
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      maxWidth="xs"
      fullWidth
      sx={{ borderRadius: 2 }}
    >
      <DialogTitle>Settings</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Display
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={showEdgeLabels}
              onChange={(e) => setShowEdgeLabels(e.target.checked)}
            />
          }
          label="Show Edge Labels"
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={highlightUnseenEnabled}
              onChange={(e) => setHighlightUnseenEnabled(e.target.checked)}
            />
          }
          label="Highlight unseen nodes"
        />

        <FormControlLabel
          control={
            <Checkbox checked={notesEnabled} onChange={(e) => setNotesEnabled(e.target.checked)} />
          }
          label="Show notes for nodes"
        />
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setSettingsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

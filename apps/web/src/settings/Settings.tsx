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
};

export function Settings({
  settingsOpen,
  setSettingsOpen,
  showEdgeLabels,
  setShowEdgeLabels,
}: SettingsProps) {
  return (
    <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="xs" fullWidth sx={{borderRadius: 2}}>
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
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setSettingsOpen(false)}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

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

export type ActionDialogProps = {
  open: boolean;
  selectedLabel?: string | null;
  canGenerate?: boolean;
  onClose: () => void;
  onManualEdit: () => void;
  onGenerate: () => void;
  showHiddenChildrenButton: boolean;
  onShowHiddenChildren: () => void;
  hiddenChildrenCount: number;
  onOpenImportVideo: () => void;
};

export function ActionDialog(props: ActionDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        Next step
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
        <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
          <Button variant="outlined" onClick={props.onShowHiddenChildren}>
            Show hidden children ({props.hiddenChildrenCount})
          </Button>
          <Button variant="outlined" onClick={props.onManualEdit}>
            Edit current clip
          </Button>
          <Button variant="outlined" onClick={props.onOpenImportVideo}>
            Import video
          </Button>
          <Button variant="contained" onClick={props.onGenerate} disabled={!props.canGenerate}>
            Generate Continuation
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

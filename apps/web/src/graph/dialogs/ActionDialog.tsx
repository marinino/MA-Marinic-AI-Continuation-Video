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
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { alpha } from "@mui/material/styles";

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
  const hasHiddenChildren = props.showHiddenChildrenButton && props.hiddenChildrenCount > 0;

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
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Choose what you want to do.
          </Typography>

          {hasHiddenChildren && (
            <Paper
              variant="outlined"
              sx={(theme) => ({
                p: 2,
                borderRadius: 2,
                bgcolor: alpha(theme.palette.info.main, 0.1),
                borderColor: alpha(theme.palette.info.main, 0.3),
              })}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "flex-start", sm: "center" }}
                justifyContent="space-between"
              >
                <Stack spacing={0.5}>
                  <Typography variant="subtitle2">Hidden children available</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {props.hiddenChildrenCount} hidden{" "}
                    {props.hiddenChildrenCount === 1 ? "child is" : "children are"} currently not
                    visible.
                  </Typography>
                </Stack>

                <Button variant="outlined" color="info" onClick={props.onShowHiddenChildren}>
                  Show hidden children
                </Button>
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
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

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { NodeDetailsContent } from "../components/NodeDetailsContent";
import { NodeDetailsDialogProps } from "../types/props";
import { useNodeDetailsDialog } from "../hooks/useNodeDetailsDialogLogic";
type Logic = ReturnType<typeof useNodeDetailsDialog>;

export function NodeDetailsDialogView({
  props,
  logic,
}: {
  props: NodeDetailsDialogProps;
  logic: Logic;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        {props.compareBaseNodeLabel ? "Comparing nodes" : "Details"}

        <IconButton onClick={props.onClose} sx={{ position: "absolute", right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <NodeDetailsContent props={props} logic={logic} />
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={props.onClose}>Close</Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

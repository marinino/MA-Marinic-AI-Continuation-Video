import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export function HideNodeDialog(props: {
  open: boolean;
  nodeLabel?: string;
  affectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSubtreeHide = props.affectedCount > 1;

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isSubtreeHide ? "Hide branch?" : "Hide node?"}</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {isSubtreeHide
            ? props.nodeLabel
              ? `Hiding "${props.nodeLabel}" will also hide all descendant nodes in this branch (${props.affectedCount} nodes total).`
              : `This will hide the selected node and all descendant nodes in this branch (${props.affectedCount} nodes total).`
            : props.nodeLabel
              ? `Are you sure you want to hide "${props.nodeLabel}"?`
              : "Are you sure you want to hide this node?"}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button color="warning" variant="contained" onClick={props.onConfirm}>
          Hide
        </Button>
      </DialogActions>
    </Dialog>
  );
}

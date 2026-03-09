import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

export function DeleteNodeDialog(props: {
  open: boolean;
  nodeLabel?: string;
  affectedCount: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const isSubtreeDelete = props.affectedCount > 1;

  return (
    <Dialog open={props.open} onClose={props.onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isSubtreeDelete ? "Delete branch?" : "Delete node?"}</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {isSubtreeDelete
            ? props.nodeLabel
              ? `Deleting "${props.nodeLabel}" will also remove all descendant nodes in this branch (${props.affectedCount} nodes total).`
              : `This will remove the selected node and all descendant nodes in this branch (${props.affectedCount} nodes total).`
            : props.nodeLabel
              ? `Are you sure you want to delete "${props.nodeLabel}"?`
              : "Are you sure you want to delete this node?"}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={props.onClose}>Cancel</Button>
        <Button color="error" variant="contained" onClick={props.onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { fmt } from "../nodes/Node";

export type SelectedCategory = {
  key: string;
  label: string;
  value: number | null;
  delta: number | null;
};

export type CategoryVisibilityDialogProps = {
  open: boolean;
  category: SelectedCategory | null;
  onClose: () => void;
  onHide?: (categoryId: string) => void;
};

export function CategoryVisibilityDialog(props: CategoryVisibilityDialogProps) {
  const { open, category, onClose, onHide } = props;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{category?.label ?? "Category"}</DialogTitle>

      <DialogContent>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <Typography variant="body2">Current value: {category?.value ?? "—"}</Typography>

          {category?.delta != null && (
            <Typography variant="body2">Delta: {fmt(category.delta, 2)}</Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        <Button
          color="warning"
          onClick={() => {
            if (category) {
              onHide?.(category.key);
            }
            onClose();
          }}
        >
          Hide
        </Button>
      </DialogActions>
    </Dialog>
  );
}

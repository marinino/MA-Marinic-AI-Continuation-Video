import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import { useEffect, useState } from "react";
import { listProjects, loadProject } from "./api";
import type { Project } from "@ma/shared";

type Props = {
  open: boolean;
  onClose: () => void;
  onLoaded: (p: Project) => void;
};

export function LoadProjectDialog({ open, onClose, onLoaded }: Props) {
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    listProjects().then(setProjects).catch(console.error);
  }, [open]);

  async function handleLoad(id: string) {
    setLoading(true);
    try {
      const p = await loadProject(id);
      onLoaded(p);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Load Project</DialogTitle>

      <DialogContent dividers>
        <List>
          {projects.map((p) => (
            <ListItemButton key={p.id} onClick={() => handleLoad(p.id)}>
              <ListItemText primary={p.name} secondary={p.id} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}

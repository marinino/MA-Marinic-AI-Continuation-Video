import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";

type InformationDialogProps = {
  open: boolean;
  onClose: () => void;
};

type LegendItem = {
  title: string;
  description: string;
  color: string;
  shape?: "line" | "node";
};

export function InformationDialog({ open, onClose }: InformationDialogProps) {
  const theme = useTheme();

  /* ---------- Edge legend ---------- */
  const edgeItems: LegendItem[] = [
    {
      title: "Input edge",
      description: "Connects a clip to a parameter node (input to a generation step).",
      color: theme.palette.primary.main,
      shape: "line",
    },
    {
      title: "Output edge",
      description: "Connects a parameter node to the resulting clip (output of a generation step).",
      color: theme.palette.primary.dark,
      shape: "line",
    },
    {
      title: "Edit-in edge",
      description: "Connects a clip to an edit node (clip enters an editing step).",
      color: theme.palette.secondary.main,
      shape: "line",
    },
    {
      title: "Edit-out edge",
      description: "Connects an edit node to the edited clip (result of an editing step).",
      color: theme.palette.secondary.dark,
      shape: "line",
    },
  ];

  /* ---------- Node legend ---------- */
  const nodeItems: LegendItem[] = [
    {
      title: "Clip node",
      description: "Represents a video clip or an intermediate result in the workflow.",
      color: "#66BB6A",
      shape: "node",
    },
    {
      title: "Parameter node",
      description: "Represents the parameters used for an AI generation step.",
      color: "#42A5F5",
      shape: "node",
    },
    {
      title: "Edit node",
      description: "Represents a manual editing step performed in an external tool.",
      color: "#AB47BC",
      shape: "node",
    },
    {
      title: "Root node",
      description: "Represents the node fot initial video of the tree.",
      color: "#FFB300",
      shape: "node",
    },
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Legend</DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          This legend explains the visual encoding used in the workflow graph.
        </Typography>

        {/* ===== Edges ===== */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Edge color coding
        </Typography>

        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {edgeItems.map((it) => (
            <Box key={it.title}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 44,
                    height: 8,
                    borderRadius: 999,
                    bgcolor: it.color,
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography variant="subtitle2">{it.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {it.description}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mt: 1.5 }} />
            </Box>
          ))}
        </Stack>

        {/* ===== Nodes ===== */}
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Node color coding
        </Typography>

        <Stack spacing={1.5}>
          {nodeItems.map((it) => (
            <Box key={it.title}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: 1.5,
                    bgcolor: it.color,
                    border: 1,
                    borderColor: "divider",
                    flexShrink: 0,
                  }}
                />
                <Box>
                  <Typography variant="subtitle2">{it.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {it.description}
                  </Typography>
                </Box>
              </Stack>
              <Divider sx={{ mt: 1.5 }} />
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

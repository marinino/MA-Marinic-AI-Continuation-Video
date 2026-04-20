import { Box, Collapse, IconButton, Typography, Alert } from "@mui/material";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import type { BranchTimelineResponse } from "@ma/shared";
import { TimelineTrack } from "./TimelineTrack";

export function BranchTimelineBar({
  open,
  onToggle,
  timeline,
  loading,
  error,
  onJumpToNode,
}: {
  open: boolean;
  onToggle: () => void;
  timeline: BranchTimelineResponse | null;
  loading: boolean;
  error: string | null;
  onJumpToNode: (nodeId: string) => void;
}) {
  return (
    <Box
      sx={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        bgcolor: "background.paper",
        borderTop: "1px solid",
        borderColor: "divider",
        zIndex: 20,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
        }}
      >
        <Typography variant="subtitle2">Timeline</Typography>
        <IconButton onClick={onToggle} size="small">
          {open ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2 }}>
          {loading && <Typography variant="body2">Loading timeline...</Typography>}
          {error && <Alert severity="error">{error}</Alert>}

          {timeline?.status === "deprecated" && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {timeline.reason ?? "Timeline is deprecated."}
            </Alert>
          )}

          {timeline &&
            timeline.tracks.map((track) => (
              <TimelineTrack key={track.key} track={track} onJumpToNode={onJumpToNode} />
            ))}
        </Box>
      </Collapse>
    </Box>
  );
}

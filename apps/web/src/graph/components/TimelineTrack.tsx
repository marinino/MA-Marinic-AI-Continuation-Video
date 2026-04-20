import { Box, Typography } from "@mui/material";
import type { BranchTimelineTrack } from "@ma/shared";
import { TimelineSegmentView } from "./TimelineSegmentView";

export function TimelineTrack({
  track,
  onJumpToNode,
}: {
  track: BranchTimelineTrack;
  onJumpToNode: (nodeId: string) => void;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ display: "block", mb: 0.75 }}>
        {track.label}
      </Typography>

      <Box sx={{ display: "flex", width: "100%", gap: 0.5 }}>
        {track.segments.map((segment) => (
          <TimelineSegmentView
            key={segment.id}
            segment={segment}
            onClick={() => onJumpToNode(segment.nodeId)}
          />
        ))}
      </Box>
    </Box>
  );
}

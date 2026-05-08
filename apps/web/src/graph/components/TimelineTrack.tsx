import { Box, Typography } from "@mui/material";
import type { BranchTimelineTrack } from "@ma/shared";
import { TimelineSegmentView } from "./TimelineSegmentView";

export function TimelineTrack({
  track,
  onJumpToNode,
  onTransitionHover,
  onTransitionClick,
  canHoverNextTransition,
  canHoverPrevTransition,
}: {
  track: BranchTimelineTrack;
  onJumpToNode: (nodeId: string, trackKey: "clips" | "sources") => void;
  onTransitionHover?: (clipId: string | null) => void;
  onTransitionClick?: (clipId: string | null) => void;
  canHoverPrevTransition?: boolean;
  canHoverNextTransition?: boolean;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" sx={{ display: "block", mb: 0.75 }}>
        {track.label}
      </Typography>

      <Box sx={{ display: "flex", width: "100%", gap: 0.5 }}>
        {track.segments.map((segment, index) => {
          const currentIsGenerated = segment.label.includes("Generated");
          const nextSegment = track.segments[index + 1];
          const nextIsGenerated = nextSegment?.label.includes("Generated") ?? false;

          return (
            <TimelineSegmentView
              key={segment.id}
              segment={segment}
              onClick={() => onJumpToNode(segment.nodeId, track.key)}
              canHoverPrevTransition={currentIsGenerated}
              canHoverNextTransition={nextIsGenerated}
              onTransitionHover={(side) => {
                if (side === null) {
                  onTransitionHover?.(null);
                  return;
                }

                if (side === "prev" && currentIsGenerated) {
                  onTransitionHover?.(segment.nodeId);
                  return;
                }

                if (side === "next" && nextIsGenerated) {
                  onTransitionHover?.(nextSegment?.nodeId ?? null);
                  return;
                }

                onTransitionHover?.(null);
              }}
              onTransitionClick={(side) => {
                if (side === "prev" && currentIsGenerated) {
                  onTransitionClick?.(segment.nodeId);
                  return;
                }

                if (side === "next" && nextIsGenerated) {
                  onTransitionClick?.(nextSegment?.nodeId ?? null);
                  return;
                }
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
}

import { Box, Tooltip } from "@mui/material";
import { BranchTimelineSegment } from "../types/ui";

export function ClipBranchTimeline({
  segments,
  onSelectParamNode,
}: {
  segments: BranchTimelineSegment[];
  onSelectParamNode?: (nodeId: string) => void;
}) {
  return (
    <Box
      sx={{
        width: "100%",
        height: 28,
        display: "flex",
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      {segments.map((seg, index) => {
        const clickable = !!seg.paramNodeId;

        return (
          <Tooltip
            key={`${seg.paramNodeId ?? "non-param"}-${index}`}
            title={`${seg.label} • ${clickable ? seg.frames : "default"} frames`}
            arrow
          >
            <Box
              onClick={() => {
                if (!clickable) return;
                onSelectParamNode?.(seg.paramNodeId!);
              }}
              sx={{
                width: `${seg.widthPct}%`,
                minWidth: 12,
                cursor: clickable ? "pointer" : "default",
                borderRight: index < segments.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                overflow: "hidden",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                px: 0.5,
                opacity: clickable ? 1 : 0.75,
                "&:hover": clickable
                  ? {
                      bgcolor: "action.hover",
                    }
                  : undefined,
              }}
            >
              {seg.label}
            </Box>
          </Tooltip>
        );
      })}
    </Box>
  );
}

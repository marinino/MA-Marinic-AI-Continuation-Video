import { Box, Tooltip } from "@mui/material";

type BranchTimelineSegment = {
  paramNodeId: string;
  label: string;
  frames: number;
  widthPct: number;
};

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
      {segments.map((seg, index) => (
        <Tooltip
          key={seg.paramNodeId}
          title={`${seg.label} • ${seg.frames} frames`}
          arrow
        >
          <Box
            onClick={() => onSelectParamNode?.(seg.paramNodeId)}
            sx={{
              width: `${seg.widthPct}%`,
              minWidth: 12,
              cursor: "pointer",
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
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            {seg.label}
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
import { ButtonBase, Tooltip } from "@mui/material";
import type { TimelineSegment } from "@ma/shared";

export function TimelineSegmentView({
  segment,
  onClick,
}: {
  segment: TimelineSegment;
  onClick: () => void;
}) {
  const borderStyle = segment.isEdited
    ? "2px dashed"
    : segment.isImported
      ? "2px solid"
      : "1px solid";

  return (
    <Tooltip title={`${segment.label} • ${segment.durationSec.toFixed(2)}s`} arrow>
      <ButtonBase
        onClick={onClick}
        sx={{
          width: `${segment.widthPct}%`,
          minWidth: 24,
          height: 40,
          border: borderStyle,
          borderColor: segment.isResetAnchor ? "warning.main" : "divider",
          borderRadius: 1,
          px: 0.5,
          fontSize: 12,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          justifyContent: "center",
        }}
      >
        {segment.label}
      </ButtonBase>
    </Tooltip>
  );
}

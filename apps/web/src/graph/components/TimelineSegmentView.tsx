import { Box, ButtonBase, Tooltip, Typography, useTheme } from "@mui/material";
import type { TimelineSegment } from "@ma/shared";

function getTimelineSegmentColors(segment: TimelineSegment, mode: "light" | "dark") {
  if (segment.isRoot) {
    return mode === "dark"
      ? { border: "#ff9800", bg: "rgba(255, 152, 0, 0.18)" }
      : { border: "#ff9800", bg: "#FFF8E1" };
  }

  switch (segment.kind) {
    case "params":
      return mode === "dark"
        ? { border: "#3f51b5", bg: "rgba(63, 81, 181, 0.18)" }
        : { border: "#3f51b5", bg: "#E3F2FD" };

    case "clip":
      return mode === "dark"
        ? { border: "#8bc34a", bg: "rgba(139, 195, 74, 0.18)" }
        : { border: "#8bc34a", bg: "#E8F5E9" };

    case "edit":
      return mode === "dark"
        ? { border: "#9c27b0", bg: "rgba(156, 39, 176, 0.18)" }
        : { border: "#9c27b0", bg: "#F3E5F5" };

    case "import":
      return mode === "dark"
        ? { border: "#00897b", bg: "rgba(0, 137, 123, 0.18)" }
        : { border: "#00897b", bg: "#E0F2F1" };

    default:
      return mode === "dark"
        ? { border: "#666", bg: "rgba(255,255,255,0.06)" }
        : { border: "#ccc", bg: "#f5f5f5" };
  }
}

export function TimelineSegmentView({
  segment,
  onClick,
}: {
  segment: TimelineSegment;
  onClick: () => void;
}) {
  const theme = useTheme();

  const borderStyle = segment.isEdited
    ? "2px dashed"
    : segment.isImported
      ? "2px solid"
      : "1px solid";

  const colors = getTimelineSegmentColors(segment, theme.palette.mode);

return (
  <Tooltip title={`${segment.label} • ${segment.durationSec.toFixed(2)}s`} arrow>
    <ButtonBase
      onClick={onClick}
      sx={{
        position: "relative",
        width: `${segment.widthPct}%`,
        minWidth: 72,
        height: 48,
        border: borderStyle,
        borderColor: colors.border,
        bgcolor: colors.bg,
        color: "text.primary",
        borderRadius: 1,
        overflow: "hidden",
        justifyContent: "center",
        fontWeight: 700,
      }}
    >
      {segment.firstFrameUrl && (
        <Box
          component="img"
          src={segment.firstFrameUrl}
          alt=""
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 38,
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      {segment.lastFrameUrl && (
        <Box
          component="img"
          src={segment.lastFrameUrl}
          alt=""
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            width: 38,
            height: "100%",
            objectFit: "cover",
          }}
        />
      )}

      <Typography
        variant="caption"
        sx={{
          position: "relative",
          zIndex: 1,
          px: 5,
          fontWeight: 700,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {segment.label}
      </Typography>
    </ButtonBase>
  </Tooltip>
);
}

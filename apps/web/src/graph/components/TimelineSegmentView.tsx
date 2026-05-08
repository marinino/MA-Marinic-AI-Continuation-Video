import { Box, ButtonBase, Tooltip, Typography, useTheme } from "@mui/material";
import type { TimelineSegment } from "@ma/shared";
import { useEffect, useRef, useState } from "react";

function getTimelineSegmentColors(segment: TimelineSegment, mode: "light" | "dark") {
  if (segment.isRoot) {
    return mode === "dark"
      ? { border: "#ff9800", bg: "rgba(255, 152, 0, 0.18)" }
      : { border: "#ff9800", bg: "#FFF8E1" };
  }

  if (segment.label.includes("Generated")) {
    return mode === "dark"
      ? { border: "#3f51b5", bg: "rgba(63, 81, 181, 0.18)" }
      : { border: "#3f51b5", bg: "#E3F2FD" };
  } else if (segment.label.includes("Imported")) {
    return mode === "dark"
      ? { border: "#00897b", bg: "rgba(0, 137, 123, 0.18)" }
      : { border: "#00897b", bg: "#E0F2F1" };
  } else if (segment.label.includes("Edited")) {
    return mode === "dark"
      ? { border: "#9c27b0", bg: "rgba(156, 39, 176, 0.18)" }
      : { border: "#9c27b0", bg: "#F3E5F5" };
  } else {
    return mode === "dark"
      ? { border: "#8bc34a", bg: "rgba(139, 195, 74, 0.18)" }
      : { border: "#8bc34a", bg: "#E8F5E9" };
  }
}

export function TimelineSegmentView({
  segment,
  onClick,
  onTransitionHover,
  onTransitionClick,
  canHoverPrevTransition = false,
  canHoverNextTransition = false,
}: {
  segment: TimelineSegment;
  onClick: () => void;
  onTransitionHover?: (side: "prev" | "next" | null) => void;
  onTransitionClick?: (side: "prev" | "next") => void;
  canHoverPrevTransition?: boolean;
  canHoverNextTransition?: boolean;
}) {
  const theme = useTheme();
  const colors = getTimelineSegmentColors(segment, theme.palette.mode);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [segmentWidthPx, setSegmentWidthPx] = useState(0);
  const [hoverSide, setHoverSide] = useState<"prev" | "next" | null>(null);

  useEffect(() => {
    if (!buttonRef.current) return;

    const observer = new ResizeObserver(([entry]) => {
      setSegmentWidthPx(entry.contentRect.width);
    });

    observer.observe(buttonRef.current);
    return () => observer.disconnect();
  }, []);

  const imageWidth = 100;
  const minTextSpace = 80;
  const showImages = segmentWidthPx >= imageWidth * 2 + minTextSpace;

  const edgeHitZonePx = 36;

  function getHoverSide(evt: React.MouseEvent<HTMLButtonElement>) {
    const rect = evt.currentTarget.getBoundingClientRect();
    const x = evt.clientX - rect.left;

    if (canHoverPrevTransition && x <= edgeHitZonePx) return "prev";
    if (canHoverNextTransition && x >= rect.width - edgeHitZonePx) return "next";

    return null;
  }

  function handleMouseMove(evt: React.MouseEvent<HTMLButtonElement>) {
    const side = getHoverSide(evt);

    if (side !== hoverSide) {
      setHoverSide(side);
      onTransitionHover?.(side);
    }
  }

  function handleMouseLeave() {
    setHoverSide(null);
    onTransitionHover?.(null);
  }

  function handleClick(evt: React.MouseEvent<HTMLButtonElement>) {
    const side = getHoverSide(evt);

    if (side) {
      onTransitionClick?.(side);
      return;
    }

    onClick();
  }

  const tooltipTitle = hoverSide
    ? "View transition frames"
    : `${segment.label} • ${segment.durationSec.toFixed(2)}s`;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <ButtonBase
        ref={buttonRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        sx={{
          position: "relative",
          width: `${segment.widthPct}%`,
          minWidth: 72,
          height: 100,
          border: "5px solid",
          borderColor: colors.border,
          bgcolor: colors.bg,
          color: "text.primary",
          borderRadius: 1,
          overflow: "hidden",
          justifyContent: "center",
          fontWeight: 700,
          cursor: hoverSide ? "zoom-in" : "pointer",
        }}
      >
        {hoverSide && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: edgeHitZonePx,
              left: hoverSide === "prev" ? 0 : "auto",
              right: hoverSide === "next" ? 0 : "auto",
              bgcolor: colors.border,
              opacity: 0.28,
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        )}

        {showImages && segment.firstFrameUrl && (
          <Box
            component="img"
            src={segment.firstFrameUrl}
            alt=""
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 100,
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {showImages && segment.lastFrameUrl && (
          <Box
            component="img"
            src={segment.lastFrameUrl}
            alt=""
            sx={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 100,
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        <Typography
          variant="caption"
          sx={{
            position: "relative",
            zIndex: 3,
            px: showImages ? "105px" : 1,
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

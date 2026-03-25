import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";

import { Item, ParameterHistoryMap, ParameterBarColorKey } from "../types/ui";
import { fmtPlain } from "../hooks/useV2VParams";

export function ZoomedParameterView({
  items,
  history,
  onClose,
  colors,
}: {
  items: Item[];
  history: ParameterHistoryMap;
  onClose: () => void;
  colors: Record<ParameterBarColorKey, string>;
}) {
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null);

  const viewBoxWidth = 1000;
  const viewBoxHeight = 320;

  const padding = {
    top: 20,
    right: 20,
    bottom: 36,
    left: 20,
  };

  const innerWidth = viewBoxWidth - padding.left - padding.right;
  const innerHeight = viewBoxHeight - padding.top - padding.bottom;

  const series = items.map((item) => {
    const { key, min, max, colorKey } = item;
    const color = colors[colorKey];
    const safeHistory = history[key] ?? [];
    const valueRange = max - min || 1;

    const points = safeHistory.map((point, i) => {
      const x =
        safeHistory.length <= 1
          ? padding.left + innerWidth / 2
          : padding.left + (i / (safeHistory.length - 1)) * innerWidth;

      const normalized = (point.value - min) / valueRange;
      const clamped = Math.max(0, Math.min(1, normalized));
      const y = padding.top + (1 - clamped) * innerHeight;

      return {
        ...point,
        x,
        y,
      };
    });

    const isHighlighted = highlightedKey === null || highlightedKey === item.key;
    const isDimmed = highlightedKey !== null && highlightedKey !== item.key;

    return {
      item,
      color,
      points,
      polylinePoints: points.map((p) => `${p.x},${p.y}`).join(" "),
      isHighlighted,
      isDimmed,
    };
  });

  const maxSteps = Math.max(...series.map((s) => s.points.length), 0);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding.top + (1 - t) * innerHeight;
    return { y };
  });

  const hasAnyHistory = series.some((s) => s.points.length > 0);

  return (
    <Box sx={{ width: "100%" }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle2">Parameter history</Typography>
          <Typography variant="caption" color="text.secondary">
            Full history across the whole branch for all parameters.
          </Typography>
        </Box>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          width: "100%",
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 1.5,
        }}
      >
        {!hasAnyHistory ? (
          <Box
            sx={{
              height: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No history available.
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                width: "100%",
                height: 240,
                position: "relative",
              }}
            >
              <svg
                width="100%"
                height="100%"
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="none"
              >
                {yTicks.map((tick, i) => (
                  <line
                    key={i}
                    x1={padding.left}
                    y1={tick.y}
                    x2={viewBoxWidth - padding.right}
                    y2={tick.y}
                    stroke="currentColor"
                    opacity={0.12}
                  />
                ))}

                {series.map(({ item, color, points, polylinePoints, isHighlighted, isDimmed }) => (
                  <g key={item.key}>
                    {points.length >= 2 && (
                      <polyline
                        fill="none"
                        stroke={color}
                        strokeWidth={isHighlighted ? 4 : 2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        opacity={isDimmed ? 0.18 : 1}
                        points={polylinePoints}
                      />
                    )}

                    {points.length === 1 && (
                      <circle
                        cx={points[0].x}
                        cy={points[0].y}
                        r={isHighlighted ? 5.5 : 4}
                        fill={color}
                        opacity={isDimmed ? 0.18 : 1}
                      />
                    )}

                    {points.map((point, i) => {
                      const isLast = i === points.length - 1;

                      return (
                        <circle
                          key={`${item.key}-${point.index}`}
                          cx={point.x}
                          cy={point.y}
                          r={isHighlighted ? (isLast ? 5 : 4) : isLast ? 4 : 3}
                          fill={color}
                          opacity={isDimmed ? 0.18 : isLast ? 1 : 0.9}
                        />
                      );
                    })}
                  </g>
                ))}
              </svg>

              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.max(maxSteps, 1)}, minmax(0, 1fr))`,
                }}
              >
                {Array.from({ length: maxSteps }).map((_, stepIndex) => {
                  const tooltipLines = series
                    .map(({ item, points, isDimmed }) => {
                      if (highlightedKey !== null && isDimmed) return null;

                      const point = points[stepIndex];
                      if (!point) return null;

                      return `${item.label}: ${fmtPlain(point.value, item.decimals ?? 2)}`;
                    })
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <Tooltip
                      key={`step-${stepIndex}`}
                      title={
                        <Box sx={{ whiteSpace: "pre-line" }}>
                          {`Step ${stepIndex + 1}/${maxSteps}\n${tooltipLines}`}
                        </Box>
                      }
                      arrow
                    >
                      <Box sx={{ height: "100%" }} />
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 1.5,
                display: "flex",
                flexWrap: "wrap",
                gap: 1.5,
              }}
            >
              {series.map(({ item, color, isHighlighted }) => {
                const isActive = highlightedKey === item.key;
                const isNeutral = highlightedKey === null;

                return (
                  <Box
                    key={item.key}
                    onClick={() =>
                      setHighlightedKey((curr) => (curr === item.key ? null : item.key))
                    }
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      minWidth: 0,
                      px: 0.5,
                      py: 0.5,
                      borderRadius: 1,
                      cursor: "pointer",
                      transition: "all 160ms ease",
                      border: "1px solid",
                      borderColor: isActive ? color : "divider",
                      bgcolor: isActive ? `${color}18` : "transparent",
                      opacity: isNeutral || isHighlighted ? 1 : 0.45,
                      "&:hover": {
                        bgcolor: isActive ? `${color}22` : "action.hover",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: 999,
                        bgcolor: color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {item.label}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
}

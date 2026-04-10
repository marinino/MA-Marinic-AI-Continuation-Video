import { Box, Typography, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useState } from "react";

import { Item, ParameterHistoryMap, ParameterBarColorKey } from "../types/ui";
import { fmtPlain } from "../hooks/useV2VParams";

export function CompareZoomedParameterView({
  items,
  baseHistory,
  compareHistory,
  onClose,
  colors,
}: {
  items: Item[];
  baseHistory: ParameterHistoryMap;
  compareHistory: ParameterHistoryMap;
  onClose?: () => void;
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

  const maxSteps = useMemo(() => {
    return Math.max(
      ...items.map((item) => {
        const baseLen = baseHistory[item.key]?.length ?? 0;
        const compareLen = compareHistory[item.key]?.length ?? 0;
        return Math.max(baseLen, compareLen);
      }),
      0
    );
  }, [items, baseHistory, compareHistory]);

  const series = items.map((item) => {
    const { key, min, max, colorKey } = item;
    const color = colors[colorKey];
    const valueRange = max - min || 1;

    const baseRaw = baseHistory[key] ?? [];
    const compareRaw = compareHistory[key] ?? [];

    const mapPoints = (points: { index: number; value: number }[]) =>
      points.map((point, i) => {
        const x =
          maxSteps <= 1
            ? padding.left + innerWidth / 2
            : padding.left + (i / Math.max(maxSteps - 1, 1)) * innerWidth;

        const normalized = (point.value - min) / valueRange;
        const clamped = Math.max(0, Math.min(1, normalized));
        const y = padding.top + (1 - clamped) * innerHeight;

        return {
          ...point,
          x,
          y,
        };
      });

    const basePoints = mapPoints(baseRaw);
    const comparePoints = mapPoints(compareRaw);

    const isHighlighted = highlightedKey === null || highlightedKey === key;
    const isDimmed = highlightedKey !== null && highlightedKey !== key;

    return {
      item,
      color,
      basePoints,
      comparePoints,
      basePolyline: basePoints.map((p) => `${p.x},${p.y}`).join(" "),
      comparePolyline: comparePoints.map((p) => `${p.x},${p.y}`).join(" "),
      isHighlighted,
      isDimmed,
    };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const y = padding.top + (1 - t) * innerHeight;
    return { y };
  });

  const hasAnyHistory = series.some((s) => s.basePoints.length > 0 || s.comparePoints.length > 0);

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
          <Typography variant="subtitle2">Parameter history comparison</Typography>
          <Typography variant="caption" color="text.secondary">
            Solid line = Base, dashed line = Compare
          </Typography>
        </Box>

        {onClose && (
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
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

                {series.map(
                  ({
                    item,
                    color,
                    basePoints,
                    comparePoints,
                    basePolyline,
                    comparePolyline,
                    isHighlighted,
                    isDimmed,
                  }) => (
                    <g key={item.key}>
                      {basePoints.length >= 2 && (
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth={isHighlighted ? 4 : 2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          opacity={isDimmed ? 0.18 : 0.85}
                          points={basePolyline}
                        />
                      )}

                      {comparePoints.length >= 2 && (
                        <polyline
                          fill="none"
                          stroke={color}
                          strokeWidth={isHighlighted ? 4 : 2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          strokeDasharray="8 6"
                          opacity={isDimmed ? 0.18 : 1}
                          points={comparePolyline}
                        />
                      )}

                      {basePoints.map((point, i) => {
                        const isLast = i === basePoints.length - 1;
                        return (
                          <circle
                            key={`base-${item.key}-${point.index}`}
                            cx={point.x}
                            cy={point.y}
                            r={isHighlighted ? (isLast ? 5 : 4) : isLast ? 4 : 3}
                            fill={color}
                            opacity={isDimmed ? 0.18 : 0.75}
                          />
                        );
                      })}

                      {comparePoints.map((point, i) => {
                        const isLast = i === comparePoints.length - 1;
                        return (
                          <circle
                            key={`compare-${item.key}-${point.index}`}
                            cx={point.x}
                            cy={point.y}
                            r={isHighlighted ? (isLast ? 5 : 4) : isLast ? 4 : 3}
                            fill={color}
                            opacity={isDimmed ? 0.18 : 1}
                          />
                        );
                      })}
                    </g>
                  )
                )}
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
                    .map(({ item, basePoints, comparePoints, isDimmed }) => {
                      if (highlightedKey !== null && isDimmed) return null;

                      const basePoint = basePoints[stepIndex];
                      const comparePoint = comparePoints[stepIndex];

                      const lines: string[] = [];

                      if (basePoint) {
                        lines.push(
                          `${item.label} base: ${fmtPlain(basePoint.value, item.decimals ?? 2)}`
                        );
                      }

                      if (comparePoint) {
                        lines.push(
                          `${item.label} compare: ${fmtPlain(
                            comparePoint.value,
                            item.decimals ?? 2
                          )}`
                        );
                      }

                      return lines.length > 0 ? lines.join("\n") : null;
                    })
                    .filter(Boolean)
                    .join("\n");

                  return (
                    <Box
                      key={`step-${stepIndex}`}
                      title={`Step ${stepIndex + 1}/${maxSteps}\n${tooltipLines}`}
                      sx={{ height: "100%" }}
                    />
                  );
                })}
              </Box>
            </Box>

            <Box
              sx={{
                mt: 1,
                mb: 1.5,
                display: "flex",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 0,
                    borderTop: "3px solid",
                    borderColor: "text.primary",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Base
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 24,
                    height: 0,
                    borderTop: "3px dashed",
                    borderColor: "text.primary",
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Compare
                </Typography>
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

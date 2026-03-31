import { Box, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";

import { useState } from "react";
import { normalize } from "../graph_helpers/clipDialogLogic";
import { ParameterBarColorKey, Item, ParameterHistoryMap } from "../types/ui";
import { ZoomedParameterView } from "./ZoomedParameterView";
import { fmtPlain, fmt } from "../hooks/useV2VParams";

const COLORS: Record<ParameterBarColorKey, string> = {
  highCfg: "#0072B2",
  highShift: "#009E73",
  highStrength: "#E69F00",
  highSteps: "#CC79A7",
  lowSteps: "#D55E00",
};

export function ParameterBarGroup({
  items,
  history = {},
  isFromChip = false,
  showOnlyChangedParameters = false,
}: {
  items: Item[];
  history?: ParameterHistoryMap;
  isFromChip?: boolean;
  showOnlyChangedParameters?: boolean;
}) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const visibleItems = showOnlyChangedParameters ? items.filter((item) => item.delta) : items;

  return (
    <Box
      sx={(theme) => ({
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        bgcolor: "action.hover",
        borderRadius: 2,
        px: 2,
        py: 1.5,
        border: "1px solid",
        borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
      })}
    >
      {!isZoomed ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            width: "100%",
            minWidth: 0,
          }}
        >
          {visibleItems.map((item) => {
            const { key, label, value, min, max, delta, decimals = 2, colorKey } = item;

            const color = COLORS[colorKey];
            const currentPct = normalize(value, min, max) * 100;

            const prevValue = delta != null ? value - delta : null;
            const prevPct = prevValue != null ? normalize(prevValue, min, max) * 100 : null;

            const showPrevBar = hoveredKey === key && prevPct != null;

            const direction =
              delta == null ? null : delta > 0 ? (
                <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
              ) : delta < 0 ? (
                <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
              ) : (
                <HorizontalRuleIcon sx={{ fontSize: 16 }} />
              );

            const tooltip =
              prevValue != null
                ? `${label} · old ${fmtPlain(prevValue, decimals)} · now ${fmtPlain(
                    value,
                    decimals
                  )} · Δ ${fmt(delta ?? 0, decimals)}`
                : `${label} · ${fmtPlain(value, decimals)}`;

            return (
              <Tooltip key={key} title={tooltip} arrow>
                <Box
                  onClick={() => {
                    if (!isFromChip) setIsZoomed(true);
                  }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey((curr) => (curr === key ? null : curr))}
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    display: "grid",
                    gridTemplateColumns: "120px minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 1.25,
                    cursor: "pointer",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      opacity: 0.8,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 0.5,
                      minWidth: 0,
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        height: 12,
                        width: "100%",
                        borderRadius: 999,
                        overflow: "hidden",
                        bgcolor: alpha(color, 0.15),
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${currentPct}%`,
                          minWidth: currentPct > 0 ? 6 : 0,
                          borderRadius: 999,
                          bgcolor: color,
                          transition: "width 180ms ease",
                        }}
                      />
                    </Box>

                    <Box
                      sx={{
                        position: "relative",
                        height: 12,
                        width: "100%",
                        borderRadius: 999,
                        overflow: "hidden",
                        bgcolor: alpha(color, 0.075),
                        opacity: showPrevBar ? 1 : 0,
                        transition: "opacity 150ms ease",
                        pointerEvents: "none",
                      }}
                    >
                      {prevPct != null && (
                        <Box
                          sx={{
                            height: "100%",
                            width: `${prevPct}%`,
                            minWidth: prevPct > 0 ? 6 : 0,
                            borderRadius: 999,
                            bgcolor: color,
                            opacity: 0.5,
                            transition: "width 180ms ease",
                          }}
                        />
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      minWidth: 58,
                      maxWidth: 72,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      gap: 0.25,
                      color: "text.secondary",
                      flexShrink: 0,
                    }}
                  >
                    <Typography variant="caption">{fmtPlain(value, decimals)}</Typography>
                    {direction}
                  </Box>
                </Box>
              </Tooltip>
            );
          })}
          {!isFromChip && (
            <Typography
              variant="caption"
              sx={{
                mt: 1,
                opacity: 0.6,
                display: "block",
              }}
            >
              Hover to see the parent value (faded). Click a parameter to view the history across
              the branch.
            </Typography>
          )}
        </Box>
      ) : (
        <ZoomedParameterView
          items={items}
          history={history}
          onClose={() => setIsZoomed(false)}
          colors={COLORS}
        />
      )}
    </Box>
  );
}

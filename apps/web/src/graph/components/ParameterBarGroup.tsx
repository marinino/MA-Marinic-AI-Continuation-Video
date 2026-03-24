import { Box, Tooltip, Typography, IconButton } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";

import { useMemo, useState } from "react";
import { fmt } from "../nodes/Node";
import { normalize } from "../graph_helpers/clipDialogLogic";
import { ParameterBarColorKey, Item, ParameterHistoryMap, HistoryPoint } from "../types/ui";
import { ZoomedParameterView } from "./ZoomedParameterView";

const COLORS: Record<ParameterBarColorKey, string> = {
  highCfg: "#0072B2",
  highShift: "#009E73",
  highStrength: "#E69F00",
  highSteps: "#CC79A7",
  lowSteps: "#D55E00",
};

export function fmtPlain(v: number, decimals: number) {
  return fmt(v, decimals).replace(/[()+]/g, "");
}

export function ParameterBarGroup({
  items,
  history = {},
  isInCompareMode
}: {
  items: Item[];
  history?: ParameterHistoryMap;
  isInCompareMode: boolean | null
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const selectedItem = useMemo(
    () => items.find((item) => item.key === selectedKey) ?? null,
    [items, selectedKey]
  );

  console.log(isInCompareMode)

  return (
    <Box
      sx={(theme) => ({
        bgcolor: "action.hover",
        borderRadius: 2,
        px: 2,
        py: 1.5,
        border: "1px solid",
        borderColor: theme.palette.mode === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)",
      })}
    >
      {!selectedItem || isInCompareMode ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              mb: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  bgcolor: "rgba(0,0,0,0.25)",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Parent node value
              </Typography>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  bgcolor: "text.primary",
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Current node value
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
              alignItems: "end",
              columnGap: 2,
            }}
          >
            {items.map((item) => {
              const { key, label, value, min, max, delta, decimals = 2, colorKey } = item;

              const color = COLORS[colorKey];
              const currentPct = normalize(value, min, max) * 100;

              const prevValue = delta != null ? value - delta : null;
              const prevPct = prevValue != null ? normalize(prevValue, min, max) * 100 : null;

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
                <Box
                  key={key}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <Tooltip title={tooltip} arrow>
                    <Box
                      onClick={() => setSelectedKey(key)}
                      sx={{
                        height: 170,
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        gap: 0.5,
                        cursor: "pointer",
                      }}
                    >
                      {prevPct != null && (
                        <Box
                          sx={{
                            width: 20,
                            height: `${prevPct}%`,
                            minHeight: prevPct > 0 ? 4 : 0,
                            borderRadius: 1,
                            bgcolor: alpha(color, 0.35),
                          }}
                        />
                      )}

                      <Box
                        sx={{
                          width: 20,
                          height: `${currentPct}%`,
                          minHeight: currentPct > 0 ? 4 : 0,
                          borderRadius: 1,
                          bgcolor: color,
                        }}
                      />
                    </Box>
                  </Tooltip>

                  <Box
                    sx={{
                      mt: 0.75,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 0.25,
                      minHeight: 32,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.25,
                        color: "text.secondary",
                      }}
                    >
                      <Typography variant="caption">{fmtPlain(value, decimals)}</Typography>
                      {direction}
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.7,
                        fontSize: "0.65rem",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {label}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </>
      ) : (
        <ZoomedParameterView
          item={selectedItem}
          history={history[selectedItem.key] ?? []}
          onClose={() => setSelectedKey(null)}
          colors={COLORS}
        />
      )}
    </Box>
  );
}

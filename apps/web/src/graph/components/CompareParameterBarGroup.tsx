import { Box, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";

import { normalize } from "../graph_helpers/clipDialogLogic";
import { Item, ParameterBarColorKey } from "../types/ui";
import { fmt, fmtPlain } from "../hooks/useV2VParams";

const COLORS: Record<ParameterBarColorKey, string> = {
  highCfg: "#0072B2",
  highShift: "#009E73",
  highStrength: "#E69F00",
  highSteps: "#CC79A7",
  lowSteps: "#D55E00",
};

export function CompareParameterBarGroup({ items }: { items: Item[] }) {
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
{items.map((item) => {
  const { key, label, value, min, max, delta, decimals = 2, colorKey } = item;

  const compareValue = value;
  const baseValue = delta != null ? value - delta : value;

  console.log("COMPARE ITEM", {
    key,
    label,
    rawValue: value,
    delta,
    computedBaseValue: baseValue,
    compareValue,
  });

          const color = COLORS[colorKey];


          const basePct = normalize(baseValue, min, max) * 100;
          const comparePct = normalize(compareValue, min, max) * 100;

          const direction =
            delta == null ? null : delta > 0 ? (
              <KeyboardArrowUpIcon sx={{ fontSize: 16 }} />
            ) : delta < 0 ? (
              <KeyboardArrowDownIcon sx={{ fontSize: 16 }} />
            ) : (
              <HorizontalRuleIcon sx={{ fontSize: 16 }} />
            );

          const tooltip =
            delta != null
              ? `${label} · base ${fmtPlain(baseValue, decimals)} · compare ${fmtPlain(
                  compareValue,
                  decimals
                )} · Δ ${fmt(delta, decimals)}`
              : `${label} · ${fmtPlain(compareValue, decimals)}`;

          return (
            <Tooltip key={key} title={tooltip} arrow>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "120px minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 1.25,
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
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ display: "block", mb: 0.25, opacity: 0.55 }}
                    >
                      Base
                    </Typography>
                    <Box
                      sx={{
                        position: "relative",
                        height: 12,
                        width: "100%",
                        borderRadius: 999,
                        overflow: "hidden",
                        bgcolor: alpha(color, 0.08),
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${basePct}%`,
                          minWidth: basePct > 0 ? 6 : 0,
                          borderRadius: 999,
                          bgcolor: color,
                          opacity: 0.45,
                        }}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="caption" sx={{ display: "block", mb: 0.25, opacity: 0.8 }}>
                      Compare
                    </Typography>
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
                          width: `${comparePct}%`,
                          minWidth: comparePct > 0 ? 6 : 0,
                          borderRadius: 999,
                          bgcolor: color,
                        }}
                      />
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    minWidth: 88,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 0.4,
                    color: "text.secondary",
                  }}
                >
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ display: "block", opacity: 0.6 }}>
                      {fmtPlain(baseValue, decimals)}
                    </Typography>
                    <Typography variant="caption" sx={{ display: "block" }}>
                      {fmtPlain(compareValue, decimals)}
                    </Typography>
                  </Box>
                  {direction}
                </Box>
              </Box>
            </Tooltip>
          );
        })}

        <Typography
          variant="caption"
          sx={{
            mt: 1,
            opacity: 0.6,
            display: "block",
          }}
        >
          Each parameter shows the base node value and the selected comparison node value.
        </Typography>
      </Box>
    </Box>
  );
}

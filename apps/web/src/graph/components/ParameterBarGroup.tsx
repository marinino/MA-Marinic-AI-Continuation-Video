import { Box, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import { fmt } from "../nodes/Node";
import { normalize } from "../graph_helpers/clipDialogLogic";

type ParameterBarColorKey = "highCfg" | "highShift" | "highStrength" | "highSteps" | "lowSteps";

type Item = {
  label: string;
  value: number;
  min: number;
  max: number;
  delta?: number | null;
  decimals?: number;
  colorKey: ParameterBarColorKey;
};

const COLORS: Record<ParameterBarColorKey, string> = {
  highCfg: "#0072B2",
  highShift: "#009E73",
  highStrength: "#E69F00",
  highSteps: "#CC79A7",
  lowSteps: "#D55E00",
};

function fmtPlain(v: number, decimals: number) {
  return fmt(v, decimals).replace(/[()+]/g, "");
}

export function ParameterBarGroup({ items }: { items: Item[] }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 1.5,
        alignItems: "end",
      }}
    >
      {items.map((item) => {
        const { label, value, min, max, delta, decimals = 2, colorKey } = item;

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
            key={label}
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <Tooltip title={tooltip} arrow>
              <Box
                sx={{
                  height: 70,
                  display: "flex",
                  alignItems: "flex-end",
                  gap: "4px",
                  px: "2px",
                  py: "2px",
                  borderRadius: 1,
                  bgcolor: "action.hover",
                  cursor: "default",
                }}
              >
                {prevPct != null && (
                  <Box
                    sx={{
                      width: 10,
                      height: `${prevPct}%`,
                      minHeight: prevPct > 0 ? 4 : 0,
                      borderRadius: 999,
                      bgcolor: alpha(color, 0.35),
                    }}
                  />
                )}

                <Box
                  sx={{
                    width: 10,
                    height: `${currentPct}%`,
                    minHeight: currentPct > 0 ? 4 : 0,
                    borderRadius: 999,
                    bgcolor: color,
                  }}
                />
              </Box>
            </Tooltip>

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
          </Box>
        );
      })}
    </Box>
  );
}

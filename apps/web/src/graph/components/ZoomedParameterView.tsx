import { Box, Typography, IconButton, Tooltip } from "@mui/material";

import { Item, HistoryPoint, ParameterBarColorKey } from "../types/ui";
import { normalize } from "../graph_helpers/clipDialogLogic";
import { fmtPlain } from "./ParameterBarGroup";
import CloseIcon from "@mui/icons-material/Close";

export function ZoomedParameterView({
  item,
  history,
  onClose,
  colors,
}: {
  item: Item;
  history: HistoryPoint[];
  onClose: () => void;
  colors: Record<ParameterBarColorKey, string>;
}) {
  const { label, min, max, decimals = 2, colorKey } = item;
  const color = colors[colorKey];
  const last10 = history.slice(-10);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography variant="caption" color="text.secondary">
            Last {last10.length} values in this branch. Maximum displayable is 10.
          </Typography>
        </Box>

        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          height: 220,
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(last10.length, 1)}, minmax(0, 1fr))`,
          alignItems: "end",
          columnGap: 1,
        }}
      >
        {last10.map((point, i) => {
          const pct = normalize(point.value, min, max) * 100;

          // 👇 neu: opacity abhängig vom Alter
          const t = last10.length > 1 ? i / (last10.length - 1) : 1;
          const opacity = 0.3 + t * 0.7; // von 0.3 → 1

          const isOldest = i === 0;
          const isNewest = i === last10.length - 1;

          return (
            <Box
              key={`${item.key}-${point.index}`}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 0,
              }}
            >
              <Tooltip
                title={`${label} · ${last10.length - point.index} from current node · ${fmtPlain(point.value, decimals)}`}
                arrow
              >
                <Box
                  sx={{
                    height: 180,
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-end",
                    justifyContent: "center",
                  }}
                >
                  <Box
                    sx={{
                      width: "70%",
                      maxWidth: 44,
                      height: `${pct}%`,
                      minHeight: pct > 0 ? 4 : 0,
                      borderRadius: 1,
                      bgcolor: color,
                      opacity, // 👈 DAS ist der wichtige Part
                    }}
                  />
                </Box>
              </Tooltip>

              <Typography
                variant="caption"
                sx={{
                  opacity: 0.9,
                  fontSize: "0.7rem",
                  textAlign: "center",
                }}
              >
                {fmtPlain(point.value, decimals)}
              </Typography>

              {/* 👇 NEU */}
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.6rem",
                  opacity: isOldest || isNewest ? 0.6 : 0, // 👈 reserviert Platz!
                  mt: 0.25,
                }}
              >
                {isOldest ? "oldest" : isNewest ? "newest" : "placeholder"}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

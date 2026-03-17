import * as React from "react";
import { Box, Tooltip } from "@mui/material";
import { GenState } from "../types/ui";



export function StatusDot({ state }: { state: GenState }) {
  const color =
    state === "idle" ? "success.main" : state === "running" ? "warning.main" : "error.main";

  const label = state === "idle" ? "Ready" : state === "running" ? "Generating…" : "Error";

  return (
    <Tooltip title={label} arrow>
      <Box
        sx={{
          width: 10,
          height: 10,
          borderRadius: "999px",
          bgcolor: color,
          boxShadow: 1,
          ...(state === "running"
            ? {
                animation: "pulse 1.2s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%": { transform: "scale(1)", opacity: 0.9 },
                  "50%": { transform: "scale(1.35)", opacity: 0.6 },
                  "100%": { transform: "scale(1)", opacity: 0.9 },
                },
              }
            : {}),
        }}
      />
    </Tooltip>
  );
}

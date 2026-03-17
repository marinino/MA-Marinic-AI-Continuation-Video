import * as React from "react";
import { Box, Slider, Stack, Tab, Tabs, Typography } from "@mui/material";
import { PentagonMap } from "./PentagonMap";
import { CategoryScores, RadarAxis } from "../types/ui";

export type ReadonlyCategoryPanelProps = {
  axes: RadarAxis[];
  defaultView?: "sliders" | "pentagon";
  pentagonSize?: number;
};

export function ReadonlyCategoryPanel(p: ReadonlyCategoryPanelProps) {
  const [view, setView] = React.useState<"sliders" | "pentagon">(p.defaultView ?? "sliders");

  const ReadonlySlider = (props: { label: string; value: number }) => (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography variant="body2">{props.label}</Typography>
        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>
      <Slider value={props.value} min={0} max={100} step={1} disabled />
    </Box>
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">Categories (read-only)</Typography>
      </Stack>

      <Tabs value={view} onChange={(_, v) => setView(v)} variant="fullWidth">
        <Tab value="sliders" label="Sliders" />
        <Tab value="pentagon" label="Pentagon" />
      </Tabs>

      {view === "sliders" ? (
        <Stack spacing={2}>
          {p.axes.slice(0, 5).map((axis) => (
            <ReadonlySlider key={axis.id} label={axis.label} value={axis.value} />
          ))}
        </Stack>
      ) : (
        <PentagonMap axes={p.axes} size={p.pentagonSize ?? 260} showRadarPolygon />
      )}
    </Stack>
  );
}

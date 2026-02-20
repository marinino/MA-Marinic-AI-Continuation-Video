import * as React from "react";
import { Box, Slider, Stack, Tab, Tabs, Typography } from "@mui/material";
import { PentagonMap, type CategoryScores } from "./PentagonMap";

export type ReadonlyCategoryPanelProps = {
  scores: CategoryScores;
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
          <ReadonlySlider label="Creativity" value={p.scores.creativity} />
          <ReadonlySlider label="Prompt faithfulness" value={p.scores.promptFaithfulness} />
          <ReadonlySlider label="Motion" value={p.scores.motion} />
          <ReadonlySlider label="Transition Smoothness" value={p.scores.transitionSmoothness} />
          <ReadonlySlider label="Video Faithfulness" value={p.scores.videoFaithfulness} />
        </Stack>
      ) : (
        <PentagonMap scores={p.scores} size={p.pentagonSize ?? 260} showRadarPolygon />
      )}
    </Stack>
  );
}

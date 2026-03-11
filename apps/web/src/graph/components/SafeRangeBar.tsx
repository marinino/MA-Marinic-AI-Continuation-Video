import { Box } from "@mui/material";

export function SafeRangeBar(props: {
  min: number;
  max: number;
  sliderMin: number;
  sliderMax: number;
}) {
  function rangePct(value: number, min: number, max: number) {
    if (max <= min) return 0;
    return ((value - min) / (max - min)) * 100;
  }

  const left = rangePct(props.min, props.sliderMin, props.sliderMax);
  const right = rangePct(props.max, props.sliderMin, props.sliderMax);
  const width = Math.max(0, right - left);

  return (
    <Box sx={{ position: "relative", height: 6, borderRadius: 999, bgcolor: "action.hover" }}>
      <Box
        sx={{
          position: "absolute",
          left: `${left}%`,
          width: `${width}%`,
          top: 0,
          bottom: 0,
          borderRadius: 999,
          bgcolor: "success.main",
          opacity: 0.25,
        }}
      />
    </Box>
  );
}

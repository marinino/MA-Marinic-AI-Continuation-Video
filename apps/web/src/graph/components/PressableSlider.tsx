import { Box, Slider } from "@mui/material";
import { Mark, SimpleSliderKey } from "../types/ui";
import React from "react";

export const PressableSlider = React.memo(function PressableSlider(props: {
  sliderKey: SimpleSliderKey;
  onBegin: (k: SimpleSliderKey) => void;
  onEnd: () => void;
  value: number;
  min: number;
  max: number;
  step: number;
  marks?: Mark[];
  onChange: (e: Event, v: number | number[]) => void;
}) {
  const { sliderKey, onBegin, onEnd, value, onChange, min, max, step, marks } = props;
  return (
    <Box
      onPointerDownCapture={() => onBegin(sliderKey)}
      onMouseDownCapture={() => onBegin(sliderKey)}
      onTouchStartCapture={() => onBegin(sliderKey)}
      onPointerUpCapture={onEnd}
      onPointerCancelCapture={onEnd}
      sx={{ touchAction: "none" }}
    >
      <Slider
        sx={{
          "& .MuiSlider-mark": {
            width: 4,
            height: 16,
            borderRadius: 2,
            opacity: 1,
            backgroundColor: "text.primary",
          },
          "& .MuiSlider-markLabel": {
            mt: 1,
            opacity: 0.95,
            fontWeight: 700,
          },
        }}
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks}
        onChange={onChange}
        onChangeCommitted={onEnd as any}
      />
    </Box>
  );
});

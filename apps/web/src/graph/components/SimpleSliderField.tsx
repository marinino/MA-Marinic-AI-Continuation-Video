import * as React from "react";
import { Stack, Typography } from "@mui/material";

import { PressableSlider } from "./PressableSlider";
import { SafeRangeBar } from "./SafeRangeBar";
import { Mark, SafeKey, SimpleSliderKey } from "../types/ui";

type SimpleSliderFieldProps = {
  label: string;
  displayValue: React.ReactNode;
  sliderKey: SimpleSliderKey;
  value: number;
  min: number;
  max: number;
  step: number;
  marks?: Mark[];
  activeSafeKey: SafeKey | null;
  safeRange?: { min: number; max: number };
  sliderMin: number;
  sliderMax: number;
  onBegin: (key: SimpleSliderKey) => void;
  onEnd: () => void;
  onChange: (e: Event, v: number | number[]) => void;
};

export const SimpleSliderField = React.memo(function SimpleSliderField(
  props: SimpleSliderFieldProps
) {
  const {
    label,
    displayValue,
    sliderKey,
    value,
    min,
    max,
    step,
    marks,
    activeSafeKey,
    safeRange,
    sliderMin,
    sliderMax,
    onBegin,
    onEnd,
    onChange,
  } = props;

  return (
    <Stack spacing={0.5}>
      <Typography gutterBottom>
        {label}: <b>{displayValue}</b>
      </Typography>

      <PressableSlider
        sliderKey={sliderKey}
        onBegin={onBegin}
        onEnd={onEnd}
        value={value}
        min={min}
        max={max}
        step={step}
        marks={marks}
        onChange={onChange}
      />

      {safeRange && activeSafeKey !== sliderKey && (
        <SafeRangeBar
          min={safeRange.min}
          max={safeRange.max}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
        />
      )}
    </Stack>
  );
});

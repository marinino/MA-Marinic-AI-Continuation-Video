import { Box, Stack, Tooltip, ButtonBase, Typography, Slider } from "@mui/material";
import React from "react";

export const CategorySlider = React.memo(function CategorySlider(props: {
  label: string;
  value: number;
  sx?: any;
  onLabelClick?: () => void;
  onChange?: (value: number) => void;
  readonly?: boolean;
  clickable?: boolean;
}) {
  const clickable = props.clickable ?? false;
  const readonly = props.readonly ?? false;

  const handleSliderChange = (_: Event, v: number | number[]) => {
    if (readonly) return;
    props.onChange?.(Array.isArray(v) ? v[0] : v);
  };

  console.log(readonly);

  return (
    <Box sx={props.sx}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="baseline">
          {clickable ? (
            <Tooltip title="Click to configure" arrow>
              <ButtonBase
                onClick={props.onLabelClick}
                sx={{
                  borderRadius: 1,
                  px: 0.25,
                  "& .label": {
                    fontSize: (theme) => theme.typography.body2.fontSize,
                    fontWeight: (theme) => theme.typography.body2.fontWeight,
                    lineHeight: (theme) => theme.typography.body2.lineHeight,
                    color: "primary.main",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  },
                  "&:focus-visible": {
                    outline: "2px solid",
                    outlineColor: "primary.main",
                    outlineOffset: 2,
                  },
                }}
              >
                <span className="label">{props.label}</span>
              </ButtonBase>
            </Tooltip>
          ) : (
            <Typography variant="body2">{props.label}</Typography>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>

      <Box className="nodrag nopan">
        <Slider
          value={props.value}
          min={0}
          max={100}
          step={1}
          onChange={handleSliderChange}
          onChangeCommitted={(_, v) => {
            if (readonly) return;
            props.onChange?.(Array.isArray(v) ? v[0] : v);
          }}
          sx={readonly ? { pointerEvents: "none" } : null}
        />
      </Box>
    </Box>
  );
});

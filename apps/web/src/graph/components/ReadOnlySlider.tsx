import { Box, Stack, Tooltip, ButtonBase, Typography, Slider } from "@mui/material";

export function ReadonlySlider(props: {
  label: string;
  value: number;
  sx?: any;
  onLabelClick?: () => void;
}) {
  const clickable = !!props.onLabelClick;

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
                  // macht es wie ein Link/Text
                  "& .label": {
                    fontSize: (theme) => theme.typography.body2.fontSize,
                    fontWeight: (theme) => theme.typography.body2.fontWeight,
                    lineHeight: (theme) => theme.typography.body2.lineHeight,
                    color: "primary.main",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  },
                  // schöner Fokus-Ring
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

          {clickable && (
            <Typography variant="caption" color="text.secondary" sx={{ userSelect: "none" }}>
              (configure)
            </Typography>
          )}
        </Stack>

        <Typography variant="body2" color="text.secondary">
          {props.value}
        </Typography>
      </Stack>

      <Slider value={props.value} min={0} max={100} step={1} sx={{ pointerEvents: "none" }} />
    </Box>
  );
}

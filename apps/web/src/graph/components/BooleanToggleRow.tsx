import { Box, Typography, ButtonGroup, Button } from "@mui/material";

type BooleanToggleRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function BooleanToggleRow({ label, description, value, onChange }: BooleanToggleRowProps) {
  return (
    <Box
      sx={{
        mt: 1.25,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 2,
      }}
    >
      {/* LEFT */}
      <Box sx={{ display: "flex", flexDirection: "column", maxWidth: "70%" }}>
        <Typography>{label}</Typography>

        {description && (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      {/* RIGHT */}
      <ButtonGroup
        variant="contained"
        sx={{
          boxShadow: "none",
          "& .MuiButton-root:first-of-type": {
            borderTopLeftRadius: 100,
            borderBottomLeftRadius: 100,
          },
          "& .MuiButton-root:last-of-type": {
            borderTopRightRadius: 100,
            borderBottomRightRadius: 100,
          },
        }}
      >
        <Button
          disableElevation
          variant={value ? "contained" : "outlined"}
          onClick={() => onChange(true)}
        >
          On
        </Button>

        <Button
          disableElevation
          variant={!value ? "contained" : "outlined"}
          onClick={() => onChange(false)}
        >
          Off
        </Button>
      </ButtonGroup>
    </Box>
  );
}

import * as React from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";

export type JobsPanelJob = {
  id: string;
  label: string;
  status: string;
  progressText?: string;
  previewUrl?: string | null;
};

export type JobsPanelProps = {
  jobs: JobsPanelJob[];
  open: boolean;
  onToggle: () => void;
  title?: string;
};

export function JobsPanel(p: JobsPanelProps) {
  return (
    <Stack spacing={1}>
      <Button size="small" onClick={p.onToggle}>
        {p.title ?? "Jobs"} ({p.jobs.length})
      </Button>

      {p.open && (
        <Box sx={{ minWidth: 320, maxHeight: 280, overflow: "auto" }}>
          <Stack spacing={1}>
            {p.jobs.map((j) => (
              <Paper key={j.id} variant="outlined" sx={{ p: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {j.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {j.status}
                  </Typography>
                </Stack>

                {j.progressText && (
                  <Typography variant="caption" color="text.secondary">
                    {j.progressText}
                  </Typography>
                )}

                {j.previewUrl && (
                  <video
                    src={j.previewUrl}
                    controls
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  />
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { TransitionFrame, ViewMode } from "../types/ui";



export function FrameViewerModal({
  open,
  transition,
  onClose,
}: {
  open: boolean;
  transition: any;
  onClose: () => void;
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");

  const frames: TransitionFrame[] = transition?.frames ?? [];
  const current = frames[frameIndex];

  const gridFrames = useMemo(() => {
    return frames.slice(frameIndex, frameIndex + 4);
  }, [frames, frameIndex]);

  useEffect(() => {
  if (open) setFrameIndex(0);
}, [open, transition]);

  const maxIndex =
  viewMode === "grid-4"
    ? Math.max(0, frames.length - 4)
    : Math.max(0, frames.length - 1);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            Transition Frame Viewer
            <Typography variant="body2" color="text.secondary">
              Score: {transition?.overallScore ?? "n/a"} · Frames: {frames.length}
            </Typography>
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={viewMode}
            onChange={(_, value) => value && setViewMode(value)}
          >
            <ToggleButton value="single">Single</ToggleButton>
            <ToggleButton value="side-by-side">Side by Side</ToggleButton>
            <ToggleButton value="grid-4">4 Frames</ToggleButton>
          </ToggleButtonGroup>

          {frames.length === 0 && (
            <Typography color="text.secondary">
              No frame data found for this transition yet.
            </Typography>
          )}

          {frames.length > 0 && viewMode === "single" && (
<FrameImage
  title={current?.label ?? `Frame ${current?.index ?? frameIndex}`}
  src={current?.frameUrl}
  score={current?.score}
/>
          )}

{frames.length > 0 && viewMode === "side-by-side" && (
  <Box
    sx={{
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 2,
    }}
  >
    <FrameImage
      title={frames[Math.max(0, frameIndex - 1)]?.label ?? "Before cut"}
      src={frames[Math.max(0, frameIndex - 1)]?.frameUrl}
      score={frames[Math.max(0, frameIndex - 1)]?.score}
    />

    <FrameImage
      title={current?.label ?? `Frame ${current?.index ?? frameIndex}`}
      src={current?.frameUrl}
      score={current?.score}
    />
  </Box>
)}

          {frames.length > 0 && viewMode === "grid-4" && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 2,
              }}
            >
              {gridFrames.map((f, i) => (
<FrameImage
  key={`${f.index}-${i}`}
  title={f.label ?? `Frame ${f.index}`}
  src={f.frameUrl}
  score={f.score}
/>
              ))}
            </Box>
          )}

          {frames.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                disabled={frameIndex <= 0}
                onClick={() => setFrameIndex((v) => Math.max(0, v - 1))}
              >
                Prev
              </Button>

              <Button
                variant="outlined"
                disabled={frameIndex >= maxIndex}
                onClick={() => setFrameIndex((v) => Math.min(maxIndex, v + 1))}
              >
                Next
              </Button>

              <Box sx={{ flex: 1 }}>
                <input
                  style={{ width: "100%" }}
                  type="range"
                  min={0}
                  max={maxIndex}
                  value={frameIndex}
                  onChange={(e) => setFrameIndex(Number(e.target.value))}
                />
              </Box>

              <Typography variant="body2" color="text.secondary">
                {frameIndex + 1} / {frames.length}
              </Typography>
            </Stack>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function FrameImage({
  title,
  src,
  score,
}: {
  title: string;
  src?: string;
  score?: number;
}) {
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
        {typeof score === "number" && (
          <Typography variant="body2" color="text.secondary">
            score: {score}
          </Typography>
        )}
      </Stack>

      <Box
        sx={{
          bgcolor: "background.default",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          minHeight: 220,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {src ? (
          <Box
            component="img"
            src={src}
            alt={title}
            sx={{
              maxWidth: "100%",
              maxHeight: 420,
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <Typography color="text.secondary">No image</Typography>
        )}
      </Box>
    </Box>
  );
}
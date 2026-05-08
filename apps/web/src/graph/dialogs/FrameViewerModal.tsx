import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  ButtonGroup,
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
  const FRAME_HEIGHT = 260;

  const frames: TransitionFrame[] = transition?.frames ?? [];
  const current = frames[frameIndex];

  const gridFrames = useMemo(() => {
    return frames.slice(frameIndex, frameIndex + 4);
  }, [frames, frameIndex]);

  useEffect(() => {
    if (open) setFrameIndex(0);
  }, [open, transition]);

  const maxIndex =
    viewMode === "grid-4" ? Math.max(0, frames.length - 4) : Math.max(0, frames.length - 1);

  const minIndex = viewMode === "side-by-side" ? 1 : 0;

  function clampFrameIndex(index: number) {
    return Math.min(maxIndex, Math.max(minIndex, index));
  }

  useEffect(() => {
    setFrameIndex((current) => clampFrameIndex(current));
  }, [viewMode, frames.length, maxIndex, minIndex]);

  const cutIndex = Math.floor(frames.length / 2);

  function getCutLabel(index: number) {
    const distance = index - cutIndex;

    if (distance === 0) return "CUT";
    if (distance < 0) return `Cut ${distance}`;
    return `Cut +${distance}`;
  }

  function getCutIntensity(index: number) {
    const distance = Math.abs(index - cutIndex);
    return Math.max(0.25, 1 - distance * 0.2);
  }

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
<ButtonGroup
  fullWidth
  variant="contained"
  aria-label="Frame viewer mode"
  sx={{
    boxShadow: "none",
    "& .MuiButton-root": {
      textTransform: "none",
      borderColor: "divider",
    },
    "& .MuiButton-root:first-of-type": {
      borderTopLeftRadius: 8,
      borderBottomLeftRadius: 8,
    },
    "& .MuiButton-root:last-of-type": {
      borderTopRightRadius: 8,
      borderBottomRightRadius: 8,
    },
  }}
>
  <Button
    disableElevation
    variant={viewMode === "single" ? "contained" : "outlined"}
    onClick={() => setViewMode("single")}
  >
    Single
  </Button>

  <Button
    disableElevation
    variant={viewMode === "side-by-side" ? "contained" : "outlined"}
    onClick={() => setViewMode("side-by-side")}
  >
    Side by Side
  </Button>

  <Button
    disableElevation
    variant={viewMode === "grid-4" ? "contained" : "outlined"}
    onClick={() => setViewMode("grid-4")}
  >
    4 Frames
  </Button>
</ButtonGroup>

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
              imageHeight={FRAME_HEIGHT * 2 + 32}
              zoomable
              cutLabel={getCutLabel(frameIndex)}
              cutIntensity={getCutIntensity(frameIndex)}
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
                title={frames[frameIndex - 1]?.label ?? "Before cut"}
                src={frames[frameIndex - 1]?.frameUrl}
                score={frames[frameIndex - 1]?.score}
                imageHeight={FRAME_HEIGHT * 2 + 32}
                cutLabel={getCutLabel(frameIndex - 1)}
                cutIntensity={getCutIntensity(frameIndex - 1)}
              />

              <FrameImage
                title={current?.label ?? `Frame ${current?.index ?? frameIndex}`}
                src={current?.frameUrl}
                score={current?.score}
                imageHeight={FRAME_HEIGHT * 2 + 32}
                cutLabel={getCutLabel(frameIndex)}
                cutIntensity={getCutIntensity(frameIndex)}
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
                  imageHeight={FRAME_HEIGHT}
                  cutLabel={getCutLabel(frameIndex + i)}
                  cutIntensity={getCutIntensity(frameIndex + i)}
                />
              ))}
            </Box>
          )}

          {frames.length > 0 && (
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                disabled={frameIndex <= minIndex}
                onClick={() => setFrameIndex((v) => clampFrameIndex(v - 1))}
              >
                Prev
              </Button>

              <Button
                variant="outlined"
                disabled={frameIndex >= maxIndex}
                onClick={() => setFrameIndex((v) => clampFrameIndex(v + 1))}
              >
                Next
              </Button>

              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    position: "relative",
                    height: 8,
                    borderRadius: 999,
                    bgcolor: "divider",
                    mb: 1,
                    overflow: "hidden",
                  }}
                >
                  {frames.map((_, i) => {
                    const distance = Math.abs(i - cutIndex);
                    const opacity = Math.max(0.2, 1 - distance * 0.18);

                    return (
                      <Box
                        key={i}
                        sx={{
                          position: "absolute",
                          left: `${(i / Math.max(1, frames.length - 1)) * 100}%`,
                          top: 0,
                          width: 6,
                          height: "100%",
                          transform: "translateX(-50%)",
                          bgcolor: "text.secondary",
                          opacity,
                          borderRadius: 999,
                        }}
                      />
                    );
                  })}

                  {(() => {
                    const cutBeforeIndex = Math.max(0, cutIndex - 1);
                    const cutAfterIndex = Math.min(frames.length - 1, cutIndex);

                    const startLeft = (cutBeforeIndex / Math.max(1, frames.length - 1)) * 100;

                    const endLeft = (cutAfterIndex / Math.max(1, frames.length - 1)) * 100;

                    return (
                      <Box
                        sx={{
                          position: "absolute",
                          left: `${startLeft}%`,
                          width: `${endLeft - startLeft}%`,
                          top: 0,
                          height: "100%",
                          bgcolor: "warning.main",
                          borderRadius: 999,
                          zIndex: 1,
                        }}
                      />
                    );
                  })()}

                  {(() => {
                    const visibleCount =
                      viewMode === "grid-4" ? 4 : viewMode === "side-by-side" ? 2 : 1;

                    const startIndex = viewMode === "side-by-side" ? frameIndex - 1 : frameIndex;

                    const endIndex = Math.min(frames.length - 1, startIndex + visibleCount - 1);

                    const startLeft = (startIndex / Math.max(1, frames.length - 1)) * 100;

                    const endLeft = (endIndex / Math.max(1, frames.length - 1)) * 100;

                    return (
                      <Box
                        sx={{
                          position: "absolute",
                          left: `${startLeft}%`,
                          width: `${Math.max(0.8, endLeft - startLeft)}%`,
                          top: 0,
                          height: "100%",
                          bgcolor: "primary.main",
                          borderRadius: 999,
                          transform: visibleCount === 1 ? "translateX(-50%)" : "none",
                        }}
                      />
                    );
                  })()}
                </Box>

                <input
                  style={{ width: "100%" }}
                  type="range"
                  min={minIndex}
                  max={maxIndex}
                  step={1}
                  value={frameIndex}
                  onChange={(e) => setFrameIndex(clampFrameIndex(Number(e.target.value)))}
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
  imageHeight = 260,
  zoomable = false,
  cutLabel,
  cutIntensity,
}: {
  title: string;
  src?: string;
  score?: number;
  imageHeight?: number;
  zoomable?: boolean;
  cutLabel?: string;
  cutIntensity?: number;
}) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src]);

  const handleWheel = (e: React.WheelEvent) => {
    if (!zoomable) return;

    e.preventDefault();

    setScale((prev) => {
      const next = e.deltaY < 0 ? prev + 0.15 : prev - 0.15;
      return Math.min(4, Math.max(1, next));
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!zoomable || scale === 1) return;

    setDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;

    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => {
    setDragging(false);
  };

  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          {zoomable && scale > 1 && (
            <Button size="small" onClick={resetZoom}>
              Reset
            </Button>
          )}

          {typeof score === "number" && (
            <Typography variant="body2" color="text.secondary">
              score: {score}
            </Typography>
          )}
        </Stack>
      </Stack>

      <Box
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        sx={{
          position: "relative",
          bgcolor: "background.default",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          height: imageHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: zoomable && scale > 1 ? (dragging ? "grabbing" : "grab") : "default",
        }}
      >
        {cutLabel && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 2,
              px: 1.2,
              py: 0.4,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              bgcolor: `rgba(255, 152, 0, ${cutIntensity ?? 0.7})`,
              color: "black",
              boxShadow: 2,
            }}
          >
            {cutLabel}
          </Box>
        )}
        {src ? (
          <Box
            component="img"
            src={src}
            alt={title}
            draggable={false}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              userSelect: "none",
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: dragging ? "none" : "transform 120ms ease",
            }}
          />
        ) : (
          <Typography color="text.secondary">No image</Typography>
        )}
      </Box>
    </Box>
  );
}

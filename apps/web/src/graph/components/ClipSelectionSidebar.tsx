import {
  Box,
  IconButton,
  Typography,
  Divider,
  Button,
  FormControlLabel,
  Switch,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { BranchTimelineSegment, ClipSlot, SyncAction } from "../types/ui";
import { ClipBranchTimeline } from "./ClipBranchTimeline";
import { VideoSegmentPlayer } from "./VideoSegmentPlayer";
import { useState } from "react";

export function ClipSelectionSidebar({
  open,
  onToggle,
  slots,
  timelines,
  activePickSlot,
  onPickSlot,
  onClearSlot,
  onSelectParamNode,
  onCompare,
  canCompare,
  loopVideos,
  onToggleLoopVideos,
  showOnlyGeneratedPart,
}: {
  open: boolean;
  onToggle: () => void;
  slots: ClipSlot[];
  timelines: BranchTimelineSegment[][];
  activePickSlot: number | null;
  onPickSlot: (index: number) => void;
  onClearSlot: (index: number) => void;
  onSelectParamNode?: (nodeId: string) => void;
  onCompare?: () => void;
  canCompare?: boolean;
  loopVideos: boolean;
  onToggleLoopVideos?: () => void;
  showOnlyGeneratedPart: boolean;
}) {
  const [showTimelineForSlot, setShowTimelineForSlot] = useState<Record<number, boolean>>({});


const [syncCommand, setSyncCommand] = useState<{
  action: SyncAction;
  id: number;
} | null>(null);

const [isSyncPlaying, setIsSyncPlaying] = useState(false);

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        minWidth: 0,
        overflow: "hidden",
        display: "flex",
        bgcolor: "background.paper",
      }}
    >
      {open && (
        <Box
          sx={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              px: 2,
              pt: 2,
              pb: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Button
                variant="contained"
                onClick={onCompare}
                disabled={!canCompare}
                sx={{ flexShrink: 0, alignSelf: "flex-start" }}
              >
                Compare
              </Button>
<Button
  variant="outlined"
  disabled={slots.filter((slot) => slot.videoUrl).length < 2}
  onClick={() => {
    setSyncCommand({
      action: isSyncPlaying ? "pause" : "play",
      id: Date.now(),
    });

    setIsSyncPlaying((prev) => !prev);
  }}
>
  {isSyncPlaying ? "Sync Stop" : "Sync Start"}
</Button>
<Button
  variant="outlined"
  disabled={slots.filter((slot) => slot.videoUrl).length < 2}
  onClick={() =>
    setSyncCommand({
      action: "backward5",
      id: Date.now(),
    })
  }
>
  Sync -5s
</Button>

<Button
  variant="outlined"
  disabled={slots.filter((slot) => slot.videoUrl).length < 2}
  onClick={() =>
    setSyncCommand({
      action: "forward5",
      id: Date.now(),
    })
  }
>
  Sync +5s
</Button>
              <FormControlLabel
                control={
                  <Switch checked={loopVideos} onChange={onToggleLoopVideos} color="success" />
                }
                label={loopVideos ? "Loop ON" : "Loop OFF"}
                sx={{ ml: 0 }}
              />
            </Box>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: 2,
              py: 1,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {slots.map((slot, index) => {
              const isPicking = activePickSlot === index;
              const timeline = timelines[index] ?? [];

              return (
                <Box
                  key={index}
                  sx={{
                    border: "1px solid",
                    borderColor: isPicking ? "primary.main" : "divider",
                    borderRadius: 2,
                    p: 1.5,
                    minHeight: 180,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    bgcolor: isPicking ? "action.hover" : "background.default",
                  }}
                >
                  {!slot.id ? (
                    <>
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 100,
                          border: "1px dashed",
                          borderColor: "divider",
                          borderRadius: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          px: 2,
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {isPicking ? "Click a clip node in the graph..." : "No clip selected"}
                        </Typography>
                      </Box>

                      <Button variant="outlined" onClick={() => onPickSlot(index)}>
                        {isPicking ? "Picking..." : "Add Clip"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Box
                        sx={{
                          flex: 1,
                          minHeight: 100,
                          borderRadius: 2,
                          overflow: "hidden",
                          bgcolor: "black",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {slot.videoUrl ? (
                         <VideoSegmentPlayer
  src={slot.videoUrl}
  playback={slot.playback}
  showOnlyGeneratedPart={showOnlyGeneratedPart}
  autoPlay
  loop={loopVideos}
  syncCommand={syncCommand}
  muted
  controls={!loopVideos}
  style={{
    width: "100%",
    maxHeight: 220,
    display: "block",
    objectFit: "contain",
  }}
/>
                        ) : (
                          <Typography variant="body2" color="grey.400">
                            No preview available
                          </Typography>
                        )}
                      </Box>

                      {showTimelineForSlot[index] && timeline.length > 0 ? (
                        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <ClipBranchTimeline
                              segments={timeline}
                              onSelectParamNode={onSelectParamNode}
                            />
                          </Box>

                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() =>
                              setShowTimelineForSlot((prev) => ({
                                ...prev,
                                [index]: false,
                              }))
                            }
                            sx={{ minWidth: 40 }}
                          >
                            Back
                          </Button>
                        </Box>
                      ) : (
                        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                          <Button variant="outlined" onClick={() => onPickSlot(index)}>
                            Replace
                          </Button>

                          <Button variant="text" color="error" onClick={() => onClearSlot(index)}>
                            Remove
                          </Button>

                          {timeline.length > 0 && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                setShowTimelineForSlot((prev) => ({
                                  ...prev,
                                  [index]: true,
                                }))
                              }
                              sx={{ ml: "auto", minWidth: 40 }}
                            >
                              TL
                            </Button>
                          )}
                        </Box>
                      )}
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      <Box
        sx={{
          width: 52,
          flexShrink: 0,
          height: "100%",
          position: "relative",
          borderRight: open ? "1px solid" : "none",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 8,
            left: 0,
            width: "100%",
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2,
          }}
        >
          <IconButton size="small" onClick={onToggle}>
            {open ? <ChevronRightIcon /> : <ChevronLeftIcon />}
          </IconButton>
        </Box>

        <Box
          onClick={onToggle}
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            cursor: "pointer",
            userSelect: "none",
            zIndex: 1,
          }}
        >
          <Typography
            sx={{
              transform: "rotate(-90deg)",
              transformOrigin: "center",
              whiteSpace: "nowrap",
              fontSize: 20,
              lineHeight: 1,
            }}
          >
            {open ? "COLLAPSE" : "COMPARE CLIPS"}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

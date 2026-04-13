import { Box, IconButton, Typography, Divider, Button } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { BranchTimelineSegment } from "../types/ui";
import { ClipBranchTimeline } from "./ClipBranchTimeline";

type ClipSlot = {
  id: string | null;
  label?: string | null;
  videoUrl?: string | null;
};

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
}) {
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
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2">Clip comparison</Typography>
              <Typography variant="caption" color="text.secondary">
                Select up to 2 clips from the graph.
              </Typography>
            </Box>

            <Button
              variant="contained"
              onClick={onCompare}
              disabled={!canCompare}
              sx={{ flexShrink: 0, alignSelf: "flex-start" }}
            >
              Compare
            </Button>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              px: 2,
              py: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
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
                  <Typography variant="subtitle2">Window {index + 1}</Typography>

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
                          <video
                            src={slot.videoUrl}
                            autoPlay
                            loop={loopVideos}
                            muted
                            playsInline
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

                      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                        {slot.label ?? "Unnamed Clip"}
                      </Typography>

                      {timeline.length > 0 && (
                        <ClipBranchTimeline
                          segments={timeline}
                          onSelectParamNode={onSelectParamNode}
                        />
                      )}

                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button variant="outlined" onClick={() => onPickSlot(index)}>
                          Replace
                        </Button>
                        <Button variant="text" color="error" onClick={() => onClearSlot(index)}>
                          Remove
                        </Button>
                      </Box>
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

// graph/components/NodeDetailsContent.tsx

import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Popover,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { CompareParameterBarGroup } from "./CompareParameterBarGroup";
import { CompareZoomedParameterView } from "./CompareZoomedParameter";
import { VideoSegmentPlayer } from "./VideoSegmentPlayer";
import { NodeDetailsDialogProps } from "../types/props";
import { useNodeDetailsDialog } from "../hooks/useNodeDetailsDialogLogic";

type Logic = ReturnType<typeof useNodeDetailsDialog>;

export function NodeDetailsContent({
  props,
  logic,
  dense = false,
}: {
  props: NodeDetailsDialogProps;
  logic: Logic;
  dense?: boolean;
}) {
  return (
    <>
      <Stack spacing={1.25}>
        {props.videoStatus === "generating" && (
          <>
            <Typography variant="body2" color="text.secondary">
              Video is generating…
            </Typography>
            <LinearProgress />
          </>
        )}

        {props.type === "edit" ? (
          props.metaSummary ? (
            <Box sx={{ mt: 1 }}>{/* dein edit content exakt von vorher */}</Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No changes imported yet.
            </Typography>
          )
        ) : props.type === "params" ? (
          <>
            {Boolean(props.compareBaseNodeLabel) && props.compareSelector && (
              <Stack spacing={1.5}>
                <Divider />

                <Typography variant="caption">
                  <strong>Compare selection</strong>
                </Typography>

                <FormControl fullWidth size="small">
                  <InputLabel id="base-node-select-label">Base node</InputLabel>
                  <Select
                    labelId="base-node-select-label"
                    value={props.compareSelector.selectedBaseNodeId ?? ""}
                    label="Base node"
                    onChange={(e) =>
                      props.compareSelector?.onChangeBaseNode(String(e.target.value))
                    }
                  >
                    {props.compareSelector.baseOptions.map((option, index) => (
                      <MenuItem key={option.nodeId} value={option.nodeId}>
                        {`Step ${index + 1} — ${option.label} — ${option.frames} frames`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small">
                  <InputLabel id="compare-node-select-label">Compare node</InputLabel>
                  <Select
                    labelId="compare-node-select-label"
                    value={props.compareSelector.selectedCompareNodeId ?? ""}
                    label="Compare node"
                    onChange={(e) =>
                      props.compareSelector?.onChangeCompareNode(String(e.target.value))
                    }
                  >
                    {props.compareSelector.compareOptions.map((option, index) => (
                      <MenuItem key={option.nodeId} value={option.nodeId}>
                        {`Step ${index + 1} — ${option.label} — ${option.frames} frames`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            )}

            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption">
                <strong>Parameters</strong>
              </Typography>

              <Tooltip title="Show parameter info">
                <IconButton size="small" onClick={logic.openParamsInfo} sx={{ p: 0.25 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Stack>

            {logic.parameterItems.length > 0 && (
              <CompareParameterBarGroup items={logic.parameterItems} />
            )}

            {logic.parameterItems.length > 0 && props.compareParameterHistory && (
              <CompareZoomedParameterView
                items={logic.parameterItems}
                baseHistory={props.compareParameterHistory.baseHistory}
                compareHistory={props.compareParameterHistory.compareHistory}
                colors={logic.colors}
              />
            )}

            {/* branch suggestion block von vorher hier reinkopieren */}
          </>
        ) : props.type === "import" ? (
          <Stack spacing={1}>
            <Typography variant="body2" color="text.secondary">
              This is an import node. The user manually uploaded a video here.
            </Typography>

            {props.importedFileName && (
              <Typography variant="body2">
                <strong>Imported file:</strong> {props.importedFileName}
              </Typography>
            )}
          </Stack>
        ) : props.videoUrl ? (
          <>
            <VideoSegmentPlayer
              src={props.videoUrl}
              playback={props.videoPlayback}
              showOnlyGeneratedPart={props.showOnlyGeneratedPart}
              autoPlay={!dense}
              muted
              controls
              style={{ width: "100%", borderRadius: 8 }}
            />

            {props.videoFile?.filename && (
              <Typography variant="caption" color="text.secondary">
                {props.videoFile.filename}
              </Typography>
            )}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Unknown node type
          </Typography>
        )}

        {props.type !== "params" && props.notesEnabled && (
          <>
            <Divider sx={{ my: 1 }} />
            <Typography variant="caption">
              <strong>Notes</strong>
            </Typography>

            <TextField
              multiline
              minRows={4}
              fullWidth
              value={props.note ?? ""}
              onChange={(e) => props.onChangeNote?.(e.target.value)}
              placeholder="Add notes for this node..."
            />

            <Button variant="outlined" size="small" onClick={props.onSaveNote}>
              Save notes
            </Button>
          </>
        )}
      </Stack>

      <Popover
        open={logic.isParamsInfoOpen}
        anchorEl={logic.paramsInfoAnchorEl}
        onClose={logic.closeParamsInfo}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Fixed low-noise parameters
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Low CFG, Low Shift, and Low Strength are fixed per mode and are therefore not included
            in this visualization.
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

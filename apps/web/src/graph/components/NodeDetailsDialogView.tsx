import {
  Box,
  Button,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { ParameterBarGroup } from "../components/ParameterBarGroup";
import { NodeDetailsDialogProps } from "../types/props";
import { useNodeDetailsDialog } from "../hooks/useNodeDetailsDialogLogic";
import { CompareParameterBarGroup } from "./CompareParameterBarGroup";
type Logic = ReturnType<typeof useNodeDetailsDialog>;

export function NodeDetailsDialogView({
  props,
  logic,
}: {
  props: NodeDetailsDialogProps;
  logic: Logic;
}) {
  return (
    <>
      <Dialog
        open={props.open}
        onClose={(e) => {
          (e as any)?.stopPropagation?.();
          props.onClose();
        }}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <DialogTitle sx={{ m: 0, p: 2 }}>
          {props.compareBaseNodeLabel
            ? "Comparing nodes"
            : props.metaSummary
              ? "Chnages in editing"
              : props.videoUrl
                ? "Clip"
                : "Details"}
          <IconButton
            aria-label="close"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              props.onClose();
            }}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={1}>
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
                <Box sx={{ mt: 1 }}>
                  <Stack spacing={0.75}>
                    <Typography variant="body2" color="text.secondary">
                      Tool: {props.metaSummary.tool ?? "resolve"}
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" label={props.metaSummary.status ?? "waiting"} />
                      {props.metaSummary.importedAt && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(props.metaSummary.importedAt).toLocaleString()}
                        </Typography>
                      )}
                    </Stack>

                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        size="small"
                        color={props.metaSummary.changelogLength ? "success" : "default"}
                        label={
                          props.metaSummary.changelogLength
                            ? `changes: ${props.metaSummary.changelogLength}`
                            : "no timeline diff"
                        }
                      />
                      {props.metaSummary.counts &&
                        Object.keys(props.metaSummary.counts).length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            {Object.entries(props.metaSummary.counts)
                              .map(([k, v]) => `${k}:${v}`)
                              .join(" · ")}
                          </Typography>
                        )}
                    </Stack>

                    {(props.metaSummary.summaryLines?.length ?? 0) > 0 && (
                      <Box sx={{ mt: 0.5 }}>
                        <Stack spacing={1}>
                          {props.metaSummary.summaryLines?.map((line: string, i: number) => (
                            <Typography key={i} variant="body2">
                              {line}
                            </Typography>
                          ))}

                          {(props.metaSummary.detailLines?.length ?? 0) > 0 && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                                Chnages compared to parent node
                              </Typography>

                              <Stack spacing={0.5}>
                                {props.metaSummary.detailLines?.map((line: string, i: number) => (
                                  <Typography
                                    key={i}
                                    variant="caption"
                                    sx={{ opacity: 0.85, overflowWrap: "anywhere" }}
                                  >
                                    {line}
                                  </Typography>
                                ))}
                              </Stack>
                            </>
                          )}
                        </Stack>
                      </Box>
                    )}
                  </Stack>
                </Box>
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

                    <Typography variant="caption" display="block">
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
                  <Typography variant="caption" display="block">
                    <strong>Parameters</strong>
                  </Typography>

                  <Tooltip title="Show parameter info">
                    <IconButton size="small" onClick={logic.openParamsInfo} sx={{ p: 0.25 }}>
                      <InfoOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {logic.parameterItems.length > 0 && Boolean(props.compareBaseNodeLabel) && (
                  <CompareParameterBarGroup items={logic.parameterItems} />
                )}

                {props.showWeightSuggestionsEnabled &&
                  props.branchSuggestion &&
                  !Boolean(props.compareBaseNodeLabel) && (
                    <>
                      <Divider />

                      <Typography variant="caption" sx={{ mt: 1 }}>
                        <strong>Branch pattern detected</strong>
                      </Typography>

                      <Stack spacing={0.75}>
                        <Chip
                          size="small"
                          label={`Affected category: ${logic.categoryLabel(
                            props.branchSuggestion.targetCategory,
                            logic.mergedCategoryLabels
                          )}`}
                          sx={{
                            alignSelf: "flex-start",
                            border: "1px solid",
                            borderColor: "#ff9800",
                            boxShadow: "0 0 0 1px rgba(255,152,0,0.18)",
                          }}
                        />

                        <Chip
                          size="small"
                          label={`Parameter to adjust: ${logic.paramLabel(props.branchSuggestion.parameter)}`}
                          sx={{
                            alignSelf: "flex-start",
                            border: "1px solid",
                            borderColor: "#ff9800",
                            boxShadow: "0 0 0 1px rgba(255,152,0,0.18)",
                          }}
                        />

                        <Typography
                          variant="caption"
                          sx={{ cursor: "pointer", width: "fit-content" }}
                          onClick={() => logic.setShowSuggestionDetails((prev) => !prev)}
                        >
                          {logic.showSuggestionDetails ? "Hide details" : "Click for details"}
                        </Typography>

                        <Collapse in={logic.showSuggestionDetails} timeout="auto" unmountOnExit>
                          <Stack spacing={0.75}>
                            <Typography variant="body2" color="text.secondary">
                              {logic.buildSuggestionMessage({
                                category: props.branchSuggestion.targetCategory,
                                categoryLabels: logic.mergedCategoryLabels,
                                parameter: props.branchSuggestion.parameter,
                                parameterDirection: props.branchSuggestion.parameterDirection,
                                hitCount: props.branchSuggestion.hitCount,
                                streakLength: props.branchSuggestion.streakLength,
                                avgCategoryDelta: props.branchSuggestion.avgCategoryDelta,
                                avgParamDelta: props.branchSuggestion.avgParamDelta,
                                suggestedWeightDeltaPct:
                                  props.branchSuggestion.suggestedWeightDeltaPct,
                              })}
                            </Typography>
                          </Stack>
                        </Collapse>
                      </Stack>
                    </>
                  )}
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
                <video src={props.videoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
                {props.videoFile?.filename && (
                  <Typography variant="caption" color="text.secondary">
                    {props.videoFile.filename}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Unkown node type
              </Typography>
            )}
          </Stack>

          {props.type !== "params" && props.notesEnabled && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="caption" display="block" sx={{ mb: 1 }}>
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

              <Button variant="outlined" size="small" onClick={props.onSaveNote} sx={{ mt: 1 }}>
                Save notes
              </Button>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={props.onClose}>Close</Button>
          </Box>
        </DialogActions>
      </Dialog>

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

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Low CFG, Low Shift, and Low Strength are fixed per mode and are therefore not included
            in this visualization.
          </Typography>
        </Box>
      </Popover>
    </>
  );
}

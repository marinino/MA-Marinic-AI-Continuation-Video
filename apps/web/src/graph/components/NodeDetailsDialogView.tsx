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
  IconButton,
  LinearProgress,
  Popover,
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
;

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
          Details
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
                <Box sx={{ mt: 1 }}>{props.metaSummary}</Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No changes imported yet.
                </Typography>
              )
            ) : props.type === "params" ? (
              <>
                {props.compareBaseNodeLabel && (
                  <Typography variant="caption" color="text.secondary">
                    Comparing against: {props.compareBaseNodeLabel} (First node takes role as base
                    node)
                  </Typography>
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

                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Prompt: </strong>
                  {props.prompt?.trim()
                    ? `${props.prompt.slice(0, 3000)}${props.prompt.length > 3000 ? "…" : ""}`
                    : "No prompt set yet."}
                </Typography>

                {logic.parameterItems.length > 0 && !Boolean(props.compareBaseNodeLabel) && (
                  <ParameterBarGroup
                    items={logic.parameterItems}
                    history={props.parameterHistory}
                  />
                )}

                {logic.parameterItems.length > 0 && Boolean(props.compareBaseNodeLabel) && (
                  <CompareParameterBarGroup
                    items={logic.parameterItems}
                  />
                )}

                {props.showWeightSuggestionsEnabled && props.branchSuggestion && !Boolean(props.compareBaseNodeLabel) && (
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

                <Divider />

                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  <strong>Category scores</strong>
                </Typography>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {logic.visibleCategoryEntries.map((entry) => (
                    <Chip
                      key={entry.key}
                      size="small"
                      label={`${entry.label}: ${entry.value} ${logic.fmt(entry.delta, 2)}`}
                      sx={logic.deltaChipSx(entry.delta)}
                      onClick={() => logic.openCategoryDialog(entry)}
                    />
                  ))}

                  <Chip
                    sx={{ borderStyle: "dashed", opacity: 0.8 }}
                    size="small"
                    variant="outlined"
                    label="Show all categories"
                    onClick={() => props.onShowAllCategories?.()}
                  />
                </Stack>
              </>
            ) : props.type === "import" ? (
              <Typography variant="body2" color="text.secondary">
                This is an import node, the user manually uploaded a video here.
              </Typography>
            )  : (<Typography variant="body2" color="text.secondary">
                Unkown node type
              </Typography>)}

            {props.notesEnabled && (
              <>
                <Divider />
                <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                  <strong>Notes</strong>
                </Typography>

                <TextField
                  multiline
                  minRows={3}
                  fullWidth
                  value={logic.localNote}
                  onChange={(e) => logic.setLocalNote(e.target.value)}
                  placeholder="Add notes for this node..."
                />
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button onClick={logic.handleSaveAndClose}>
              {props.notesEnabled ? "Save Notes and close" : "Close"}
            </Button>
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
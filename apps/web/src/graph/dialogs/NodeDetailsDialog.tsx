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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import { useEffect, useState } from "react";
import {
  buildSuggestionMessage,
  categoryLabel,
  paramLabel,
} from "../graph_helpers/branchSuggestions";
import CloseIcon from "@mui/icons-material/Close";
import { deltaChipSx, fmt } from "../nodes/Node";
import { DEFAULT_CATEGORY_LABELS } from "../graph_helpers/sliderLogic";
import { CategoryVisibilityDialog } from "./CategoryVisibilityDialog";
import {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  Delta,
  ParamDelats,
  ParameterHistoryMap,
  SelectedCategory,
} from "../types/ui";
import { deriveRangesFromPresets } from "../hooks/useV2VParams";
import { SAFE_PRESETS } from "../hooks/useV2VSliders";
import { ParameterBarGroup } from "../components/ParameterBarGroup";
import { getVisibleCategoryEntries } from "../graph_helpers/clipDialogLogic";

export interface NodeDetailsDialogProps {
  open: boolean;
  onClose: () => void;

  nodeId: string;
  type: "clip" | "params" | "edit";

  d: Delta;

  videoUrl?: string | null;
  videoFile?: {
    filename?: string;
  } | null;
  videoStatus?: string;

  metaSummary?: React.ReactNode;

  prompt?: string;
  prevParamsId?: string | null;

  highNoiseCfg?: number;
  lowNoiseCfg?: number;
  highNoiseModelStrength?: number;
  lowNoiseModelStrength?: number;
  highNoiseShift?: number;
  lowNoiseShift?: number;
  highNoiseSteps?: number;
  lowNoiseSteps?: number;
  highNoiseStartStep?: number;
  lowNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseEndStep?: number;

  displayTotalSteps?: number;
  displayLowStepPct?: number;

  categoryScores?: CategoryScoreMap;
  categoryScoreDeltas?: CategoryDeltaMap | null;
  categoryLabels?: CategoryLabelMap;

  paramDeltas?: ParamDelats;
  promptChanged?: boolean;
  branchSuggestion?: BrachSuggestion;

  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;

  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
  parameterHistory?: ParameterHistoryMap;

  onStartCompare?: (nodeId: string) => void;
  compareBaseNodeLabel?: string | null;
  onCompareStarted?: () => void;
}

export function NodeDetailsDialog(props: NodeDetailsDialogProps) {
  const [localNote, setLocalNote] = useState(props.note ?? "");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);

  const [paramsInfoAnchorEl, setParamsInfoAnchorEl] = useState<HTMLElement | null>(null);

  const openParamsInfo = (event: React.MouseEvent<HTMLElement>) => {
    setParamsInfoAnchorEl(event.currentTarget);
  };

  const closeParamsInfo = () => {
    setParamsInfoAnchorEl(null);
  };

  const isParamsInfoOpen = Boolean(paramsInfoAnchorEl);

  function openCategoryDialog(entry: SelectedCategory) {
    setSelectedCategory(entry);
  }

  const mergedCategoryLabels = {
    ...DEFAULT_CATEGORY_LABELS,
    ...(props.categoryLabels ?? {}),
  };

  const categoryEntries = getVisibleCategoryEntries(
    props.categoryScores,
    props.categoryScoreDeltas,
    props.categoryLabels
  );

  const visibleCategoryEntries = categoryEntries.filter(
    (entry) => props.categoryVisibility?.[entry.key] !== false
  );

  useEffect(() => {
    setLocalNote(props.note ?? "");
  }, [props.note, props.open]);

  const PARAM_RANGES = deriveRangesFromPresets([...SAFE_PRESETS.quality, ...SAFE_PRESETS.quick]);

  // current step values
  const highStepsValue =
    props.highNoiseStartStep != null && props.highNoiseEndStep != null
      ? props.highNoiseEndStep - props.highNoiseStartStep
      : null;

  const lowStepsValue =
    props.lowNoiseStartStep != null && props.lowNoiseEndStep != null
      ? props.lowNoiseEndStep - props.lowNoiseStartStep
      : null;

  // step deltas
  const highStepsDelta =
    props.d?.highNoiseStartStep != null && props.d?.highNoiseEndStep != null
      ? props.d.highNoiseEndStep - props.d.highNoiseStartStep
      : null;

  const lowStepsDelta =
    props.d?.lowNoiseStartStep != null && props.d?.lowNoiseEndStep != null
      ? props.d.lowNoiseEndStep - props.d.lowNoiseStartStep
      : null;

  // derived current values
  const totalStepsValue =
    props.displayTotalSteps ??
    (highStepsValue != null && lowStepsValue != null ? highStepsValue + lowStepsValue : null);

  const lowStepPctValue =
    props.displayLowStepPct ??
    (totalStepsValue != null && totalStepsValue > 0 && lowStepsValue != null
      ? (lowStepsValue / totalStepsValue) * 100
      : null);

  // derived deltas
  const totalStepsDelta =
    highStepsDelta != null && lowStepsDelta != null ? highStepsDelta + lowStepsDelta : null;

  const prevTotalStepsValue =
    totalStepsValue != null && totalStepsDelta != null ? totalStepsValue - totalStepsDelta : null;

  const prevLowStepsValue =
    lowStepsValue != null && lowStepsDelta != null ? lowStepsValue - lowStepsDelta : null;

  const prevLowStepPctValue =
    prevTotalStepsValue != null && prevTotalStepsValue > 0 && prevLowStepsValue != null
      ? (prevLowStepsValue / prevTotalStepsValue) * 100
      : null;

  const lowStepPctDelta =
    lowStepPctValue != null && prevLowStepPctValue != null
      ? lowStepPctValue - prevLowStepPctValue
      : null;

  const parameterItems = [
    props.highNoiseCfg != null
      ? {
          key: "highNoiseCfg",
          label: "High CFG",
          value: props.highNoiseCfg,
          min: PARAM_RANGES.highCfg.min,
          max: PARAM_RANGES.highCfg.max,
          delta: props.d?.highNoiseCfg,
          colorKey: "highCfg" as const,
        }
      : null,
    props.highNoiseShift != null
      ? {
          key: "highNoiseShift",
          label: "High Shift",
          value: props.highNoiseShift,
          min: PARAM_RANGES.highShift.min,
          max: PARAM_RANGES.highShift.max,
          delta: props.d?.highNoiseShift,
          colorKey: "highShift" as const,
        }
      : null,
    props.highNoiseModelStrength != null
      ? {
          key: "highNoiseModelStrength",
          label: "High Strength",
          value: props.highNoiseModelStrength,
          min: PARAM_RANGES.highStrength.min,
          max: PARAM_RANGES.highStrength.max,
          delta: props.d?.highNoiseModelStrength,
          colorKey: "highStrength" as const,
        }
      : null,
    totalStepsValue != null
      ? {
          key: "totalSteps",
          label: "Total Steps",
          value: totalStepsValue,
          min: 4,
          max: 24,
          delta: totalStepsDelta,
          decimals: 0,
          colorKey: "highSteps" as const,
        }
      : null,
    lowStepPctValue != null
      ? {
          key: "lowStepPct",
          label: "Low Step %",
          value: lowStepPctValue,
          min: 50,
          max: 80,
          delta: lowStepPctDelta,
          decimals: 0,
          colorKey: "lowSteps" as const,
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: number;
    min: number;
    max: number;
    delta?: number | null;
    decimals?: number;
    colorKey: "highCfg" | "highShift" | "highStrength" | "highSteps" | "lowSteps";
  }[];

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
                    Comparing against: {props.compareBaseNodeLabel} (First node takes role as parent node)
                  </Typography>
                )}
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" display="block">
                    <strong>Parameters</strong>
                  </Typography>

                  <Tooltip title="Show parameter info">
                    <IconButton size="small" onClick={openParamsInfo} sx={{ p: 0.25 }}>
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

                {parameterItems.length > 0 && (
                  <ParameterBarGroup items={parameterItems} history={props.parameterHistory} isInCompareMode={Boolean(props.compareBaseNodeLabel)} />
                )}

                {props.showWeightSuggestionsEnabled && props.branchSuggestion && (
                  <>
                    <Divider />

                    <Typography variant="caption" sx={{ mt: 1 }}>
                      <strong>Branch pattern detected</strong>
                    </Typography>

                    <Stack spacing={0.75}>
                      <Chip
                        size="small"
                        label={`Affected category: ${categoryLabel(
                          props.branchSuggestion.targetCategory,
                          mergedCategoryLabels
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
                        label={`Parameter to adjust: ${paramLabel(props.branchSuggestion.parameter)}`}
                        sx={{
                          alignSelf: "flex-start",
                          border: "1px solid",
                          borderColor: "#ff9800",
                          boxShadow: "0 0 0 1px rgba(255,152,0,0.18)",
                        }}
                      />

                      <Typography
                        variant="caption"
                        sx={{
                          cursor: "pointer",
                          width: "fit-content",
                        }}
                        onClick={() => setShowSuggestionDetails((prev) => !prev)}
                      >
                        {showSuggestionDetails ? "Hide details" : "Click for details"}
                      </Typography>

                      <Collapse in={showSuggestionDetails} timeout="auto" unmountOnExit>
                        <Stack spacing={0.75}>
                          <Typography variant="body2" color="text.secondary">
                            {buildSuggestionMessage({
                              category: props.branchSuggestion.targetCategory,
                              categoryLabels: mergedCategoryLabels,
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

                          <Typography variant="caption" color="text.secondary">
                            Confidence: {Math.round(props.branchSuggestion.confidence * 100)}% ·
                            Hits: {props.branchSuggestion.hitCount} · Longest streak:{" "}
                            {props.branchSuggestion.streakLength} · Average category delta:{" "}
                            {props.branchSuggestion.avgCategoryDelta} · Average parameter delta:{" "}
                            {props.branchSuggestion.avgParamDelta}
                          </Typography>
                        </Stack>
                      </Collapse>
                    </Stack>
                  </>
                )}

                <Divider />

                <>
                  <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                    <strong>Category scores</strong>
                  </Typography>

                  <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                    {visibleCategoryEntries.map((entry) => (
                      <Chip
                        key={entry.key}
                        size="small"
                        label={`${entry.label}: ${entry.value} ${fmt(entry.delta, 2)}`}
                        sx={deltaChipSx(entry.delta)}
                        onClick={() => openCategoryDialog(entry)}
                      />
                    ))}

                    <Chip
                      sx={{
                        borderStyle: "dashed",
                        opacity: 0.8,
                      }}
                      size="small"
                      variant="outlined"
                      label="Show all categories"
                      onClick={() => props.onShowAllCategories?.()}
                    />
                  </Stack>
                </>
              </>
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
                No video attached to this clip yet.
              </Typography>
            )}

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
                  value={localNote}
                  onChange={(e) => setLocalNote(e.target.value)}
                  placeholder="Add notes for this node..."
                />
              </>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            {props.type === "params" && (
              <Button
                variant="outlined"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (props.notesEnabled) {
                    props.onSaveNote?.(props.nodeId, localNote);
                  }

                  props.onStartCompare?.(props.nodeId);
                }}
              >
                Compare to
              </Button>
            )}

            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (props.notesEnabled) {
                  props.onSaveNote?.(props.nodeId, localNote);
                }
                props.onClose();
              }}
            >
              {props.notesEnabled ? "Save Notes and close" : "Close"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <CategoryVisibilityDialog
        open={!!selectedCategory}
        category={selectedCategory}
        onClose={() => setSelectedCategory(null)}
        onHide={(categoryId) => props.onSetCategoryVisible?.(categoryId, false)}
      />

      <Popover
        open={isParamsInfoOpen}
        anchorEl={paramsInfoAnchorEl}
        onClose={closeParamsInfo}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
      >
        <Box sx={{ p: 2, maxWidth: 320 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Fixed low-noise parameters
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Low CFG, Low Shift, and Low Strength are fixed per mode and are therefore not included
            in this visualization.
          </Typography>

          <Stack spacing={1}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Quality mode (20 - 24 steps)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low CFG: 2
                <br />
                Low Strength: 0.3
                <br />
                Low Shift: 2.6
              </Typography>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>
                Quick mode (4 - 5 steps)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low CFG: 1
                <br />
                Low Strength: 1
                <br />
                Low Shift: 5
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

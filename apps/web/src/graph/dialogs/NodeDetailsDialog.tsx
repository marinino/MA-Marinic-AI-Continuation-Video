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
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import { useEffect, useState } from "react";
import { categoryLabel, paramLabel } from "../graph_helpers/branchSuggestions";
import CloseIcon from "@mui/icons-material/Close";
import { deltaChipSx, deltaSxOrNeutral, fmt, withOptionalDelta } from "../nodes/Node";
import { DEFAULT_CATEGORY_LABELS, useSliderLogic } from "../graph_helpers/sliderLogic";
import { CategoryVisibilityDialog } from "./CategoryVisibilityDialog";
import {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  Delta,
  ParamDelats,
  SelectedCategory,
} from "../types/ui";

export interface NodeDetailsDialogProps {
  open: boolean;
  onClose: () => void;

  nodeId: string;
  type: "clip" | "params" | "edit";

  d: Delta;

  // video
  videoUrl?: string | null;
  videoFile?: {
    filename?: string;
  } | null;
  videoStatus?: string;

  // edit meta
  metaSummary?: React.ReactNode;

  // params
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

  categoryScores?: CategoryScoreMap;
  categoryScoreDeltas?: CategoryDeltaMap | null;
  categoryLabels?: CategoryLabelMap;

  // deltas
  paramDeltas?: ParamDelats;

  promptChanged?: boolean;

  // branch suggestion
  branchSuggestion?: BrachSuggestion;

  // notes
  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;

  // node actions

  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
}

export function NodeDetailsDialog(props: NodeDetailsDialogProps) {
  const [localNote, setLocalNote] = useState(props.note ?? "");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);

  function openCategoryDialog(entry: SelectedCategory) {
    setSelectedCategory(entry);
  }

  const mergedCategoryLabels = {
    ...DEFAULT_CATEGORY_LABELS,
    ...(props.categoryLabels ?? {}),
  };

  const categoryEntries = Object.entries(props.categoryScores ?? {})
    .filter(([, value]) => value != null)
    .map(([key, value]) => ({
      key,
      label: mergedCategoryLabels[key] ?? key,
      value: value as number | null,
      delta: props.categoryScoreDeltas?.[key] ?? null,
    }));

  const visibleCategoryEntries = categoryEntries.filter(
    (entry) => props.categoryVisibility?.[entry.key] !== false
  );

  useEffect(() => {
    setLocalNote(props.note ?? "");
  }, [props.note, props.open]);

  return (
    <>
      <Dialog
        open={props.open}
        onClose={(e) => {
          // blockt das "close click" bubbling
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
          <Stack spacing={1} sx={{ mt: 2 }}>
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
                <Typography variant="caption" display="block">
                  <strong>Parameters</strong>
                </Typography>

                <Typography variant="body2" sx={{ mt: 1 }}>
                  <strong>Prompt: {""}</strong>
                  {props.prompt?.trim()
                    ? `${props.prompt.slice(0, 3000)}${props.prompt.length > 3000 ? "…" : ""}`
                    : "No prompt set yet."}
                </Typography>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 0.75,
                    mt: 1,
                  }}
                >
                  <Chip
                    size="small"
                    label={withOptionalDelta(
                      "High CFG",
                      props.highNoiseCfg,
                      props.d?.highNoiseCfg,
                      2
                    )}
                    sx={deltaSxOrNeutral(props.d?.highNoiseCfg)}
                  />

                  <Chip
                    size="small"
                    label={withOptionalDelta("Low CFG", props.lowNoiseCfg, props.d?.lowNoiseCfg, 2)}
                    sx={deltaSxOrNeutral(props.d?.lowNoiseCfg)}
                  />

                  <Chip
                    size="small"
                    label={withOptionalDelta(
                      "High Shift",
                      props.highNoiseShift,
                      props.d?.highNoiseShift,
                      2
                    )}
                    sx={deltaSxOrNeutral(props.d?.highNoiseShift)}
                  />

                  <Chip
                    size="small"
                    label={withOptionalDelta(
                      "Low Shift",
                      props.lowNoiseShift,
                      props.d?.lowNoiseShift,
                      2
                    )}
                    sx={deltaSxOrNeutral(props.d?.lowNoiseShift)}
                  />

                  <Chip
                    size="small"
                    label={withOptionalDelta(
                      "High Strength",
                      props.highNoiseModelStrength,
                      props.d?.highNoiseModelStrength,
                      2
                    )}
                    sx={deltaSxOrNeutral(props.d?.highNoiseModelStrength)}
                  />

                  <Chip
                    size="small"
                    label={withOptionalDelta(
                      "Low Strength",
                      props.lowNoiseModelStrength,
                      props.d?.lowNoiseModelStrength,
                      2
                    )}
                    sx={deltaSxOrNeutral(props.d?.lowNoiseModelStrength)}
                  />

                  <Chip
                    size="small"
                    label={
                      props.d?.highNoiseStartStep != null && props.d?.highNoiseEndStep != null
                        ? `High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep} ${fmt(
                            props.d.highNoiseEndStep - props.d.highNoiseStartStep,
                            0
                          )}`
                        : `High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep}`
                    }
                    sx={
                      props.d?.highNoiseStartStep != null && props.d?.highNoiseEndStep != null
                        ? deltaChipSx(props.d.highNoiseEndStep - props.d.highNoiseStartStep)
                        : {}
                    }
                  />

                  <Chip
                    size="small"
                    label={
                      props.d?.lowNoiseStartStep != null && props.d?.lowNoiseEndStep != null
                        ? `Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep} ${fmt(
                            props.d.lowNoiseEndStep - props.d.lowNoiseStartStep,
                            0
                          )}`
                        : `Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep}`
                    }
                    sx={
                      props.d?.lowNoiseStartStep != null && props.d?.lowNoiseEndStep != null
                        ? deltaChipSx(props.d.lowNoiseEndStep - props.d.lowNoiseStartStep)
                        : {}
                    }
                  />
                </Box>

                {props.showWeightSuggestionsEnabled && props.branchSuggestion && (
  <>
    <Divider />

    <Typography variant="caption" sx={{ mt: 1 }}>
      <strong>Branch pattern detected</strong>
    </Typography>

    <Stack spacing={0.75}>
      <Chip
        size="small"
        label={`Affected category: ${categoryLabel(props.branchSuggestion.targetCategory)}`}
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
            {props.branchSuggestion.message}
          </Typography>

          <Typography variant="caption" color="text.secondary">
            Confidence: {Math.round(props.branchSuggestion.confidence * 100)}% · Hits:{" "}
            {props.branchSuggestion.hitCount} · Longest streak:{" "}
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

                {
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
                }
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
    </>
  );
}

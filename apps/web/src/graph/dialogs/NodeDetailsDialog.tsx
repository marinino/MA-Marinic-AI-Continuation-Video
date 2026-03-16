import {
  Box,
  Button,
  Chip,
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
import { deltaChipSx, fmt } from "../nodes/Node";
import { useSliderLogic } from "../graph_helpers/sliderLogict";
import { CategoryVisibilityDialog } from "./CategoryVisibilityDialog";

type StandardCategoryKey =
  | "creativity"
  | "promptFaithfulness"
  | "motion"
  | "transitionSmoothness"
  | "videoFaithfulness";

type AnyCategoryKey = StandardCategoryKey | string;

type CategoryScoreMap = Partial<Record<AnyCategoryKey, number | null>>;
type CategoryDeltaMap = Partial<Record<AnyCategoryKey, number | null>>;
type CategoryLabelMap = Partial<Record<AnyCategoryKey, string>>;

export interface NodeDetailsDialogProps {
  open: boolean;
  onClose: () => void;

  nodeId: string;
  type: "clip" | "params" | "edit";

  d:
    | Partial<
        Record<
          | "highNoiseCfg"
          | "lowNoiseCfg"
          | "highNoiseShift"
          | "lowNoiseShift"
          | "highNoiseModelStrength"
          | "lowNoiseModelStrength"
          | "highNoiseSteps"
          | "lowNoiseSteps"
          | "highNoiseStartStep"
          | "lowNoiseStartStep"
          | "highNoiseEndStep"
          | "lowNoiseEndStep",
          number | null
        >
      >
    | null
    | undefined;

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
  paramDeltas?: Partial<
    Record<
      | "highNoiseCfg"
      | "lowNoiseCfg"
      | "highNoiseShift"
      | "lowNoiseShift"
      | "highNoiseModelStrength"
      | "lowNoiseModelStrength"
      | "highNoiseSteps"
      | "lowNoiseSteps"
      | "highNoiseStartStep"
      | "lowNoiseStartStep"
      | "highNoiseEndStep"
      | "lowNoiseEndStep",
      number | null
    >
  > | null;

  promptChanged?: boolean;

  // branch suggestion
  branchSuggestion?: {
    targetCategory:
      | "creativity"
      | "promptFaithfulness"
      | "motion"
      | "transitionSmoothness"
      | "videoFaithfulness";

    categoryDirection: "down" | "up";

    parameter:
      | "highNoiseCfg"
      | "lowNoiseCfg"
      | "highNoiseShift"
      | "lowNoiseShift"
      | "highNoiseModelStrength"
      | "lowNoiseModelStrength"
      | "highNoiseSteps"
      | "lowNoiseSteps"
      | "highNoiseStartStep"
      | "lowNoiseStartStep"
      | "highNoiseEndStep"
      | "lowNoiseEndStep";

    parameterDirection: "up" | "down";

    hitCount: number;
    streakLength: number;
    avgCategoryDelta: number;
    avgParamDelta: number;
    confidence: number;
    suggestedWeightDeltaPct: number;
    suggestedAction: "increase_param_weight" | "decrease_param_weight";
    message: string;
  } | null;

  // notes
  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;

  // node actions
  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;

  onHide?: (nodeId: string) => void;
  canHide?: boolean;

  notesEnabled: boolean;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
}

export function NodeDetailsDialog(props: NodeDetailsDialogProps) {
  const [localNote, setLocalNote] = useState(props.note ?? "");
  const [selectedCategory, setSelectedCategory] = useState<{
    key: string;
    label: string;
    value: number | null;
    delta: number | null;
  } | null>(null);

  function openCategoryDialog(entry: {
    key: string;
    label: string;
    value: number | null;
    delta: number | null;
  }) {
    setSelectedCategory(entry);
  }

  console.log(props.categoryVisibility, "vis");

  const { DEFAULT_CATEGORY_LABELS } = useSliderLogic();

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

  console.log(categoryEntries);
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
                {props.prevParamsId && props.promptChanged && (
                  <Chip
                    size="small"
                    label="Prompt changed"
                    sx={{
                      mt: 1,
                      alignSelf: "flex-start",
                      border: "1px solid",
                      borderColor: "#f73378", // blau vs rot
                      // optional: bisschen stärker sichtbar
                      boxShadow: "0 0 0 1px rgba(211,47,47,0.15)",
                    }}
                  />
                )}
                {/* Prompt */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Prompt:</strong>{" "}
                  {props.prompt?.trim()
                    ? `${props.prompt.slice(0, 3000)}${props.prompt.length > 3000 ? "…" : ""}`
                    : "No prompt set yet."}
                </Typography>

                {/* High Noise */}
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>High Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.highNoiseCfg} · Steps: {props.highNoiseSteps} · Start–End:{" "}
                  {props.highNoiseStartStep}–{props.highNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.highNoiseShift} · Strength: {props.highNoiseModelStrength}
                </Typography>

                {/* Low Noise */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  <strong>Low Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.lowNoiseCfg} · Steps: {props.lowNoiseSteps} · Start–End:{" "}
                  {props.lowNoiseStartStep}–{props.lowNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.lowNoiseShift} · Strength: {props.lowNoiseModelStrength}
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Category scores
                </Typography>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  {visibleCategoryEntries.map((entry) => (
                    <Chip key={entry.key} size="small" label={`${entry.label}: ${entry.value}`} />
                  ))}
                </Stack>
                {props.branchSuggestion && (
                  <>
                    <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                      Branch pattern detected
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
                  </>
                )}

                {props.prevParamsId && props.d && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      <strong>Parameters</strong>
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 0.75,
                        mt: 0.25,
                      }}
                    >
                      <Chip
                        size="small"
                        label={`High CFG: ${props.highNoiseCfg} ${fmt(props.d.highNoiseCfg, 2)}`}
                        sx={deltaChipSx(props.d.highNoiseCfg)}
                      />

                      <Chip
                        size="small"
                        label={`Low CFG: ${props.lowNoiseCfg} ${fmt(props.d.lowNoiseCfg, 2)}`}
                        sx={deltaChipSx(props.d.lowNoiseCfg)}
                      />

                      <Chip
                        size="small"
                        label={`High Shift: ${props.highNoiseShift} ${fmt(props.d.highNoiseShift, 2)}`}
                        sx={deltaChipSx(props.d.highNoiseShift)}
                      />

                      <Chip
                        size="small"
                        label={`Low Shift: ${props.lowNoiseShift} ${fmt(props.d.lowNoiseShift, 2)}`}
                        sx={deltaChipSx(props.d.lowNoiseShift)}
                      />

                      <Chip
                        size="small"
                        label={`High Strength: ${props.highNoiseModelStrength} ${fmt(props.d.highNoiseModelStrength, 2)}`}
                        sx={deltaChipSx(props.d.highNoiseModelStrength)}
                      />

                      <Chip
                        size="small"
                        label={`Low Strength: ${props.lowNoiseModelStrength} ${fmt(props.d.lowNoiseModelStrength, 2)}`}
                        sx={deltaChipSx(props.d.lowNoiseModelStrength)}
                      />

                      <Chip
                        size="small"
                        label={`High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep} ${fmt(props.d.highNoiseEndStep! - props.d.highNoiseStartStep!, 0)}`}
                        sx={deltaChipSx(props.d.highNoiseEndStep! - props.d.highNoiseStartStep!)}
                      />

                      <Chip
                        size="small"
                        label={`Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep} ${fmt(props.d.lowNoiseEndStep! - props.d.lowNoiseStartStep!, 0)}`}
                        sx={deltaChipSx(props.d.lowNoiseEndStep! - props.d.lowNoiseStartStep!)}
                      />
                    </Box>
                  </>
                )}

                {props.prevParamsId && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
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
                )}
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

            <Divider />

            {props.notesEnabled && (
              <TextField
                multiline
                minRows={3}
                fullWidth
                value={localNote}
                onChange={(e) => setLocalNote(e.target.value)}
                placeholder="Add notes for this node..."
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            {props.canDelete !== false && (
              <Button
                color="error"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onDelete?.(props.nodeId);
                  props.onClose();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Delete node
              </Button>
            )}
          </Box>

          {props.canHide !== false && (
            <Button
              color="warning"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onHide?.(props.nodeId);
                props.onClose();
              }}
            >
              Hide node
            </Button>
          )}

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

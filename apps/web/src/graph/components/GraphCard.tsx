import * as React from "react";
import { Card, CardContent, Typography, Chip, Stack, Box, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { NodeType } from "@ma/shared";

import {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  GraphCardContentMode,
  GraphCardDisplayMode,
  ParamDelats,
  SummaryChip,
} from "../types/ui";

import CompareIcon from "@mui/icons-material/Compare";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { getVisibleCategoryEntries } from "../graph_helpers/clipDialogLogic";
import { truncateLabel } from "../graph_helpers/layout";
import {
  fmt,
  deltaChipSx,
  buildParameterItems,
  deriveRangesFromPresets,
} from "../hooks/useV2VParams";
import { SAFE_PRESETS } from "../hooks/useV2VSliders";
import { ParameterBarGroup } from "./ParameterBarGroup";

export type NodeCardPreviewProps = {
  nodeId: string;
  type: NodeType;
  title: string;
  icon: React.ReactNode;
  selected?: boolean;

  borderColor: string;
  bg: string;
  shouldHighlightUnseen?: boolean;

  note?: string;
  promptChanged?: boolean;

  highNoiseCfg?: number;
  lowNoiseCfg?: number;
  highNoiseModelStrength?: number;
  lowNoiseModelStrength?: number;
  highNoiseShift?: number;
  lowNoiseShift?: number;
  highNoiseStartStep?: number;
  lowNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseEndStep?: number;

  paramDeltas?: ParamDelats;

  branchSuggestion?: BrachSuggestion;

  onOpen: () => void;
  onAdd?: (nodeId: string) => void;
  onVideoOpened?: (nodeId: string) => void;

  children?: React.ReactNode;
  highlightUnseenEnabled?: boolean;
  notesEnabled: boolean;
  showWeightSuggestionsEnabled: boolean;
  prevParamsId?: string | null | undefined;
  categoryScores?: CategoryScoreMap;
  categoryScoreDeltas?: CategoryDeltaMap | null;
  categoryLabels?: CategoryLabelMap;
  categoryVisibility?: Record<string, boolean>;
  graphCardContentMode?: GraphCardContentMode;
  graphCardDisplayMode?: GraphCardDisplayMode;

  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;

  onHide?: (nodeId: string) => void;
  canHide?: boolean;
  displayTotalSteps?: number;
  displayLowStepPct?: number;
  onStartCompare?: (nodeId: string) => void;
  isComparePicking?: boolean;
  compareSourceNodeId?: string | null;
  showOnlyChangedParameters: boolean;
  onSelectNode?: (nodeId: string) => void;
};

function GraphCardInner(props: NodeCardPreviewProps) {
  const d = props.paramDeltas;
  const suggestion = props.branchSuggestion;

  const currentHighSteps =
    props.highNoiseStartStep != null && props.highNoiseEndStep != null
      ? props.highNoiseEndStep - props.highNoiseStartStep
      : null;

  const currentLowSteps =
    props.lowNoiseStartStep != null && props.lowNoiseEndStep != null
      ? props.lowNoiseEndStep - props.lowNoiseStartStep
      : null;

  const highStepsDelta =
    d?.highNoiseStartStep != null && d?.highNoiseEndStep != null
      ? d.highNoiseEndStep - d.highNoiseStartStep
      : null;

  const lowStepsDelta =
    d?.lowNoiseStartStep != null && d?.lowNoiseEndStep != null
      ? d.lowNoiseEndStep - d.lowNoiseStartStep
      : null;

  const currentTotalSteps =
    props.displayTotalSteps ??
    (currentHighSteps != null && currentLowSteps != null
      ? currentHighSteps + currentLowSteps
      : null);

  const totalStepsDelta =
    highStepsDelta != null && lowStepsDelta != null ? highStepsDelta + lowStepsDelta : null;

  const oldHighSteps =
    currentHighSteps != null && highStepsDelta != null ? currentHighSteps - highStepsDelta : null;

  const oldLowSteps =
    currentLowSteps != null && lowStepsDelta != null ? currentLowSteps - lowStepsDelta : null;

  const oldTotalSteps =
    currentTotalSteps != null && totalStepsDelta != null
      ? currentTotalSteps - totalStepsDelta
      : null;

  const currentLowStepPctRaw =
    currentLowSteps != null && currentTotalSteps != null && currentTotalSteps > 0
      ? (currentLowSteps / currentTotalSteps) * 100
      : null;

  const oldLowStepPctRaw =
    oldLowSteps != null && oldTotalSteps != null && oldTotalSteps > 0
      ? (oldLowSteps / oldTotalSteps) * 100
      : null;

  const currentLowStepPct =
    props.displayLowStepPct ??
    (currentLowStepPctRaw != null ? Math.round(currentLowStepPctRaw) : null);

  const oldLowStepPct = oldLowStepPctRaw != null ? Math.round(oldLowStepPctRaw) : null;

  const lowStepPctDelta =
    currentLowStepPct != null && oldLowStepPct != null ? currentLowStepPct - oldLowStepPct : null;

  const visibleCategoryEntries = React.useMemo(() => {
    const entries = getVisibleCategoryEntries(
      props.categoryScores,
      props.categoryScoreDeltas,
      props.categoryLabels
    );

    return entries.filter((entry) => props.categoryVisibility?.[entry.key] !== false);
  }, [
    props.categoryScores,
    props.categoryScoreDeltas,
    props.categoryLabels,
    props.categoryVisibility,
  ]);

  const minWidth = props.type === "params" ? 420 : props.type === "edit" ? 300 : 220;

  const summaryChips = React.useMemo(() => {
    const suggestionChip =
      props.showWeightSuggestionsEnabled && props.type === "params" && suggestion
        ? {
            key: "branch-suggestion",
            label: "Hint: Adjust weights",
            sx: {
              border: "1px solid",
              borderColor: "#ff9800",
              boxShadow: "0 0 0 1px rgba(255,152,0,0.18)",
            },
          }
        : null;

    return [
      suggestionChip,
      props.prevParamsId && props.graphCardContentMode === "parameters" && props.promptChanged
        ? {
            key: "prompt-changed",
            label: "Prompt changed",
            sx: {
              border: "1px solid",
              borderColor: "#f73378",
              boxShadow: "0 0 0 1px rgba(211,47,47,0.15)",
            },
          }
        : null,

      ...(props.type === "params" && props.graphCardContentMode === "categories"
        ? visibleCategoryEntries
            .filter((entry) => entry.delta != null && entry.delta !== 0)
            .map((entry) => ({
              key: `category-${entry.key}`,
              label:
                entry.delta != null
                  ? `${truncateLabel(entry.label)}: ${entry.value} ${fmt(entry.delta, 2)}`
                  : `${truncateLabel(entry.label)}: ${entry.value}`,
              sx: entry.delta != null ? deltaChipSx(entry.delta) : {},
            }))
        : []),

      ...(props.type === "params" && props.graphCardContentMode === "parameters"
        ? [
            d && fmt(d.highNoiseCfg, 2) !== ""
              ? {
                  key: "high-cfg",
                  label: `High CFG: ${props.highNoiseCfg} ${fmt(d.highNoiseCfg, 2)}`,
                  sx: deltaChipSx(d.highNoiseCfg),
                }
              : null,
            // Rest wie vorher
          ].filter(Boolean)
        : []),
    ].filter(Boolean) as SummaryChip[];
  }, [
    props.showWeightSuggestionsEnabled,
    props.type,
    suggestion,
    props.prevParamsId,
    props.graphCardContentMode,
    props.promptChanged,
    visibleCategoryEntries,
    d,
    props.highNoiseCfg,
    props.lowNoiseCfg,
    props.highNoiseShift,
    props.lowNoiseShift,
    props.highNoiseModelStrength,
    props.lowNoiseModelStrength,
    currentTotalSteps,
    totalStepsDelta,
    currentLowStepPct,
    lowStepPctDelta,
  ]);

  const hasNote = Boolean(props.note?.trim());

  const PARAM_RANGES = React.useMemo(
    () => deriveRangesFromPresets([...SAFE_PRESETS.quality, ...SAFE_PRESETS.quick]),
    []
  );

  const parameterItems = React.useMemo(() => {
    if (props.type !== "params") return [];

    return buildParameterItems({
      highNoiseCfg: props.highNoiseCfg,
      highNoiseShift: props.highNoiseShift,
      highNoiseModelStrength: props.highNoiseModelStrength,
      totalStepsValue: currentTotalSteps,
      totalStepsDelta,
      lowStepPctValue: currentLowStepPct,
      lowStepPctDelta,
      d: props.paramDeltas,
      PARAM_RANGES,
    });
  }, [
    props.type,
    props.highNoiseCfg,
    props.highNoiseShift,
    props.highNoiseModelStrength,
    currentTotalSteps,
    totalStepsDelta,
    currentLowStepPct,
    lowStepPctDelta,
    props.paramDeltas,
    PARAM_RANGES,
  ]);
  return (
    <Card
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: "2px solid",
        borderColor: props.borderColor,
        backgroundColor: props.bg,
        outline: "none",
        minWidth,
        boxShadow: props.selected ? `0 0 0 5px ${props.borderColor}` : undefined,

        ...(props.highlightUnseenEnabled && props.shouldHighlightUnseen
          ? {
              boxShadow: `0 0 0 4px #ffffff55, 0 0 18px #ffffff55`,
              animation: "pulseGlow 1.6s ease-in-out infinite",
              "@keyframes pulseGlow": {
                "0%": {
                  transform: "scale(1)",
                  boxShadow: `0 0 0 3px #ffffff44, 0 0 10px #ffffff44`,
                },
                "50%": {
                  transform: "scale(1.02)",
                  boxShadow: `0 0 0 5px #ffffff66, 0 0 22px ${props.borderColor}66`,
                },
                "100%": {
                  transform: "scale(1)",
                  boxShadow: `0 0 0 3px #ffffff66, 0 0 10px #ffffff66`,
                },
              },
            }
          : null),
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        props.onSelectNode?.(props.nodeId);

        if (props.type === "clip") {
          props.onVideoOpened?.(props.nodeId);
          props.onOpen();
          return;
        }

        if (props.type === "edit" || props.type === "import") {
          props.onOpen();
          return;
        }

        if (props.type === "params" && props.isComparePicking) {
          props.onOpen();
          return;
        }
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <IconButton size="small">{props.icon}</IconButton>
            <Typography variant="subtitle2" noWrap>
              {props.title}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            {props.type === "clip" && (
              <IconButton
                size="small"
                title="Add node"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onAdd?.(props.nodeId);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
            )}

            {props.type === "params" && !props.isComparePicking && (
              <IconButton
                size="small"
                title="Add node"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onStartCompare?.(props.nodeId);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <CompareIcon fontSize="small" />
              </IconButton>
            )}
            {props.canHide !== false && (
              <IconButton
                size="small"
                title={"Hide node"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onHide?.(props.nodeId);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <VisibilityOffIcon fontSize="small" />
              </IconButton>
            )}

            {props.canDelete !== false && (
              <IconButton
                size="small"
                title="Delete node"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onDelete?.(props.nodeId);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Stack>

        <Box sx={{ mt: 0.5 }}>
          {props.type === "params" && (
            <Typography>
              {props.prevParamsId
                ? "Changed parameters are listed below"
                : "Click to see parameters"}
            </Typography>
          )}
        </Box>
        <Box sx={{ mt: 0.5 }}>
          {props.type === "edit" && <Typography>Changes contain</Typography>}
        </Box>
        <Box sx={{ mt: 0.5 }}>
          {props.type === "clip" && <Typography>Click to take a look</Typography>}
        </Box>

        {props.children}

        {(summaryChips.length > 0 || hasNote || !props.showOnlyChangedParameters) && (
          <>
            {summaryChips.length > 0 && props.graphCardDisplayMode === "chips" && (
              <Box
                sx={{
                  mt: 1,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 0.75,
                }}
              >
                {summaryChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    size="small"
                    label={chip.label}
                    sx={{
                      ...chip.sx,
                      width: "100%",
                      justifyContent: "flex-start",
                      "& .MuiChip-label": {
                        display: "block",
                        width: "100%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      },
                    }}
                  />
                ))}
              </Box>
            )}

            {props.type === "params" &&
              d &&
              props.graphCardDisplayMode === "bars" &&
              parameterItems.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <ParameterBarGroup
                    items={parameterItems}
                    isFromChip={true}
                    showOnlyChangedParameters={props.showOnlyChangedParameters}
                  />
                </Box>
              )}

            {props.notesEnabled && hasNote && (
              <Box sx={{ mt: summaryChips.length > 0 ? 0.75 : 1 }}>
                <Chip
                  size="small"
                  label={`Note: ${
                    props.type === "clip"
                      ? `${props.note!.trim().slice(0, 20)}...`
                      : props.note!.trim()
                  }`}
                  title={props.note!.trim()}
                  sx={{
                    width: "100%",
                    justifyContent: "flex-start",
                    "& .MuiChip-label": {
                      display: "block",
                      width: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const GraphCard = React.memo(GraphCardInner);

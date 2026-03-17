import * as React from "react";
import { Card, CardContent, Typography, Chip, Stack, Box, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { NodeType } from "@ma/shared";
import { deltaChipSx, fmt } from "../nodes/Node";
import {
  BrachSuggestion,
  CategoryDeltaMap,
  CategoryLabelMap,
  CategoryScoreMap,
  GraphCardContentMode,
  ParamDelats,
  SummaryChip,
} from "../types/ui";
import { DEFAULT_CATEGORY_LABELS } from "../graph_helpers/sliderLogic";

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
  graphCardContentMode: GraphCardContentMode;
};

export function GraphCard(props: NodeCardPreviewProps) {
  const d = props.paramDeltas;
  const suggestion = props.branchSuggestion;

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

  const minWidth = props.type === "params" ? 420 : props.type === "edit" ? 300 : 220;

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

  const summaryChips = [
    suggestionChip,
    props.prevParamsId && props.promptChanged
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
          .filter((entry) => entry.delta != null && entry.delta != 0)
          .map((entry) => ({
            key: `category-${entry.key}`,
            label:
              entry.delta != null
                ? `${entry.label}: ${entry.value} ${fmt(entry.delta, 2)}`
                : `${entry.label}: ${entry.value}`,
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
          d && fmt(d.lowNoiseCfg, 2) !== ""
            ? {
                key: "low-cfg",
                label: `Low CFG: ${props.lowNoiseCfg} ${fmt(d.lowNoiseCfg, 2)}`,
                sx: deltaChipSx(d.lowNoiseCfg),
              }
            : null,
          d && fmt(d.highNoiseShift, 2) !== ""
            ? {
                key: "high-shift",
                label: `High Shift: ${props.highNoiseShift} ${fmt(d.highNoiseShift, 2)}`,
                sx: deltaChipSx(d.highNoiseShift),
              }
            : null,
          d && fmt(d.lowNoiseShift, 2) !== ""
            ? {
                key: "low-shift",
                label: `Low Shift: ${props.lowNoiseShift} ${fmt(d.lowNoiseShift, 2)}`,
                sx: deltaChipSx(d.lowNoiseShift),
              }
            : null,
          d && fmt(d.highNoiseModelStrength, 2) !== ""
            ? {
                key: "high-strength",
                label: `High Strength: ${props.highNoiseModelStrength} ${fmt(
                  d.highNoiseModelStrength,
                  2
                )}`,
                sx: deltaChipSx(d.highNoiseModelStrength),
              }
            : null,
          d && fmt(d.lowNoiseModelStrength, 2) !== ""
            ? {
                key: "low-strength",
                label: `Low Strength: ${props.lowNoiseModelStrength} ${fmt(d.lowNoiseModelStrength, 2)}`,
                sx: deltaChipSx(d.lowNoiseModelStrength),
              }
            : null,
          d && fmt((d.highNoiseEndStep ?? 0) - (d.highNoiseStartStep ?? 0), 0) !== ""
            ? {
                key: "high-steps",
                label: `High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep} ${fmt(
                  (d.highNoiseEndStep ?? 0) - (d.highNoiseStartStep ?? 0),
                  0
                )}`,
                sx: deltaChipSx((d.highNoiseEndStep ?? 0) - (d.highNoiseStartStep ?? 0)),
              }
            : null,
          d && fmt((d.lowNoiseEndStep ?? 0) - (d.lowNoiseStartStep ?? 0), 0) !== ""
            ? {
                key: "low-steps",
                label: `Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep} ${fmt(
                  (d.lowNoiseEndStep ?? 0) - (d.lowNoiseStartStep ?? 0),
                  0
                )}`,
                sx: deltaChipSx((d.lowNoiseEndStep ?? 0) - (d.lowNoiseStartStep ?? 0)),
              }
            : null,
        ].filter(Boolean)
      : []),
  ].filter(Boolean) as SummaryChip[];

  const hasNote = Boolean(props.note?.trim());

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

        if (props.type === "clip") {
          props.onVideoOpened?.(props.nodeId);
        }

        props.onOpen();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton size="small">{props.icon}</IconButton>

          <Typography variant="subtitle2">{props.title}</Typography>

          {props.type === "clip" && (
            <IconButton
              size="small"
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

        {(summaryChips.length > 0 || hasNote) && (
          <>
            {summaryChips.length > 0 && (
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

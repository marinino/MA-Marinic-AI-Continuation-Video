import { useEffect, useMemo, useState } from "react";
import {
  buildSuggestionMessage,
  categoryLabel,
  paramLabel,
} from "../graph_helpers/branchSuggestions";
import { getVisibleCategoryEntries } from "../graph_helpers/clipDialogLogic";
import { DEFAULT_CATEGORY_LABELS } from "../graph_helpers/presets";
import {
  buildParameterItems,
  deltaChipSx,
  deriveRangesFromPresets,
  fmt,
} from "../hooks/useV2VParams";
import { SAFE_PRESETS } from "../hooks/useV2VSliders";
import type { SelectedCategory } from "../types/ui";
import { NodeDetailsDialogProps } from "../types/props";

export function useNodeDetailsDialog(props: NodeDetailsDialogProps) {
  const [localNote, setLocalNote] = useState(props.note ?? "");
  const [selectedCategory, setSelectedCategory] = useState<SelectedCategory | null>(null);
  const [showSuggestionDetails, setShowSuggestionDetails] = useState(false);
  const [paramsInfoAnchorEl, setParamsInfoAnchorEl] = useState<HTMLElement | null>(null);

  const isComparing = Boolean(props.compareBaseNodeLabel);
  const compareDeltas = isComparing ? props.d : undefined;

  useEffect(() => {
    setLocalNote(props.note ?? "");
  }, [props.note, props.open]);

  const mergedCategoryLabels = useMemo(
    () => ({
      ...DEFAULT_CATEGORY_LABELS,
      ...(props.categoryLabels ?? {}),
    }),
    [props.categoryLabels]
  );

  const categoryEntries = useMemo(
    () =>
      getVisibleCategoryEntries(
        props.categoryScores,
        props.categoryScoreDeltas,
        props.categoryLabels
      ),
    [props.categoryScores, props.categoryScoreDeltas, props.categoryLabels]
  );

  const visibleCategoryEntries = useMemo(
    () => categoryEntries.filter((entry) => props.categoryVisibility?.[entry.key] !== false),
    [categoryEntries, props.categoryVisibility]
  );

  const PARAM_RANGES = useMemo(
    () => deriveRangesFromPresets([...SAFE_PRESETS.quality, ...SAFE_PRESETS.quick]),
    []
  );

  const highStepsValue =
    props.highNoiseStartStep != null && props.highNoiseEndStep != null
      ? props.highNoiseEndStep - props.highNoiseStartStep
      : null;

  const lowStepsValue =
    props.lowNoiseStartStep != null && props.lowNoiseEndStep != null
      ? props.lowNoiseEndStep - props.lowNoiseStartStep
      : null;

  const highStepsDelta =
    compareDeltas?.highNoiseStartStep != null && compareDeltas?.highNoiseEndStep != null
      ? compareDeltas.highNoiseEndStep - compareDeltas.highNoiseStartStep
      : null;

  const lowStepsDelta =
    compareDeltas?.lowNoiseStartStep != null && compareDeltas?.lowNoiseEndStep != null
      ? compareDeltas.lowNoiseEndStep - compareDeltas.lowNoiseStartStep
      : null;

  const totalStepsValue =
    props.displayTotalSteps ??
    (highStepsValue != null && lowStepsValue != null ? highStepsValue + lowStepsValue : null);

  const lowStepPctValue =
    props.displayLowStepPct ??
    (totalStepsValue != null && totalStepsValue > 0 && lowStepsValue != null
      ? (lowStepsValue / totalStepsValue) * 100
      : null);

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

  const openParamsInfo = (event: React.MouseEvent<HTMLElement>) => {
    setParamsInfoAnchorEl(event.currentTarget);
  };

  const closeParamsInfo = () => {
    setParamsInfoAnchorEl(null);
  };

  const openCategoryDialog = (entry: SelectedCategory) => {
    setSelectedCategory(entry);
  };

  const closeCategoryDialog = () => {
    setSelectedCategory(null);
  };

  const handleSaveAndClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (props.notesEnabled) {
      props.onSaveNote?.(props.nodeId, localNote);
    }

    props.onClose();
  };

  const parameterItems = useMemo(
    () =>
      buildParameterItems({
        highNoiseCfg: props.highNoiseCfg,
        highNoiseShift: props.highNoiseShift,
        highNoiseModelStrength: props.highNoiseModelStrength,
        totalStepsValue,
        totalStepsDelta,
        lowStepPctValue,
        lowStepPctDelta,
        d: compareDeltas,
        PARAM_RANGES,
      }),
    [
      props.highNoiseCfg,
      props.highNoiseShift,
      props.highNoiseModelStrength,
      totalStepsValue,
      totalStepsDelta,
      lowStepPctValue,
      lowStepPctDelta,
      compareDeltas,
      PARAM_RANGES,
    ]
  );

  return {
    localNote,
    setLocalNote,

    selectedCategory,
    openCategoryDialog,
    closeCategoryDialog,

    showSuggestionDetails,
    setShowSuggestionDetails,

    paramsInfoAnchorEl,
    isParamsInfoOpen: Boolean(paramsInfoAnchorEl),
    openParamsInfo,
    closeParamsInfo,

    mergedCategoryLabels,
    visibleCategoryEntries,
    parameterItems,

    handleSaveAndClose,

    buildSuggestionMessage,
    categoryLabel,
    paramLabel,
    deltaChipSx,
    fmt,
  };
}

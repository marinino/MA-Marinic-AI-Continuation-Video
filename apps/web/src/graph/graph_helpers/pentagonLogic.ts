import React from "react";
import { axisLabel, axisValue, useClipDialogLogic } from "./clipDialogLogic";
import { AxisId, CustomScoreSlider } from "../types/ui";

export function pentagonLogic(
  allScores: Record<string, number>,
  customSliders: CustomScoreSlider[]
) {
  const PENTAGON_AXIS_STORAGE_KEY = "v2v.pentagonAxes.v1";

  const DEFAULT_PENTAGON_AXIS_IDS: AxisId[] = [
    "creativity",
    "promptFaithfulness",
    "motion",
    "transitionSmoothness",
    "videoFaithfulness",
  ];

  function loadPentagonAxes(): AxisId[] {
    try {
      const raw = localStorage.getItem(PENTAGON_AXIS_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AxisId[]) : null;
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_PENTAGON_AXIS_IDS;
    } catch {
      return DEFAULT_PENTAGON_AXIS_IDS;
    }
  }

  const [pentagonAxes, setPentagonAxes] = React.useState<AxisId[]>(() => loadPentagonAxes());
  const [pentagonAxesOpen, setPentagonAxesOpen] = React.useState(false);

  const pentagonAxisObjects = React.useMemo(() => {
    const ids = (pentagonAxes?.length === 5 ? pentagonAxes : DEFAULT_PENTAGON_AXIS_IDS).slice(0, 5);

    return ids.map((id) => ({
      id: String(id),
      label: axisLabel(id, customSliders),
      value: axisValue(id, allScores),
    }));
  }, [pentagonAxes, allScores, customSliders]);

  const availableAxisIds: AxisId[] = React.useMemo(() => {
    const builtins: AxisId[] = DEFAULT_PENTAGON_AXIS_IDS;
    const customs: AxisId[] = customSliders.map((c) => c.id);
    return [...builtins, ...customs];
  }, [customSliders]);

  return {
    DEFAULT_PENTAGON_AXIS_IDS,
    PENTAGON_AXIS_STORAGE_KEY,
    loadPentagonAxes,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    pentagonAxesOpen,
    setPentagonAxes,
    setPentagonAxesOpen,
  };
}

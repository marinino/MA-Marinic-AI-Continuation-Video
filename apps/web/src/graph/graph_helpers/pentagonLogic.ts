import React from "react";
import { axisLabel, axisValue } from "./clipDialogLogic";
import { AxisId, CustomScoreSlider } from "../types/ui";
import { getAxisBlockReason } from "./axisSimilarity";
import { DEFAULT_FORMULA_WEIGHTS } from "../hooks/useV2VParams";
import {
  loadPentagonAxes,
  savePentagonAxes,
  normalizePentagonAxes,
} from "../../utils/localStorage";

export function pentagonLogic(
  allScores: Record<string, number>,
  customSliders: CustomScoreSlider[]
) {
  const DEFAULT_PENTAGON_AXIS_IDS: AxisId[] = [
    "creativity",
    "promptFaithfulness",
    "motion",
    "transitionSmoothness",
    "videoFaithfulness",
  ];

  const availableAxisIds: AxisId[] = React.useMemo(() => {
    const builtins: AxisId[] = DEFAULT_PENTAGON_AXIS_IDS;
    const customs: AxisId[] = customSliders.map((c) => c.id);
    return [...builtins, ...customs];
  }, [customSliders]);

  const [pentagonAxes, setPentagonAxesState] = React.useState<AxisId[]>(DEFAULT_PENTAGON_AXIS_IDS);

  const [pentagonAxesOpen, setPentagonAxesOpen] = React.useState(false);

  React.useEffect(() => {
    const loaded = normalizePentagonAxes(
      loadPentagonAxes(DEFAULT_PENTAGON_AXIS_IDS, availableAxisIds),
      DEFAULT_PENTAGON_AXIS_IDS,
      availableAxisIds
    ) as AxisId[];

    setPentagonAxesState(loaded);
  }, [availableAxisIds]);

  const setPentagonAxes = React.useCallback(
    (next: AxisId[]) => {
      const clean = normalizePentagonAxes(
        next,
        DEFAULT_PENTAGON_AXIS_IDS,
        availableAxisIds
      ) as AxisId[];

      setPentagonAxesState(clean);
      savePentagonAxes(clean, DEFAULT_PENTAGON_AXIS_IDS, availableAxisIds);
    },
    [availableAxisIds]
  );

  const pentagonAxisObjects = React.useMemo(() => {
    const ids = (pentagonAxes?.length === 5 ? pentagonAxes : DEFAULT_PENTAGON_AXIS_IDS).slice(0, 5);

    return ids.map((id) => ({
      id: String(id),
      label: axisLabel(id, customSliders),
      value: axisValue(id, allScores),
    }));
  }, [pentagonAxes, allScores, customSliders]);

  function getDisabledAxisReasons(forIndex: number): Record<string, string> {
    const out: Record<string, string> = {};

    for (const candidate of availableAxisIds) {
      const reason = getAxisBlockReason(
        candidate,
        pentagonAxes,
        forIndex,
        DEFAULT_FORMULA_WEIGHTS,
        customSliders,
        (id) => axisLabel(id, customSliders).replace("\n", " ")
      );

      if (reason) {
        out[String(candidate)] = reason;
      }
    }

    return out;
  }

  return {
    DEFAULT_PENTAGON_AXIS_IDS,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    pentagonAxesOpen,
    setPentagonAxes,
    setPentagonAxesOpen,
    getDisabledAxisReasons,
  };
}

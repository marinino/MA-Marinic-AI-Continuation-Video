import React from "react";
import { axisLabel, axisValue } from "./clipDialogLogic";
import { AxisId, CustomScoreSlider, FormulaWeights } from "../types/ui";
import { getAxisBlockReason } from "./axisSimilarity";
import {
  loadTriangleAxes,
  saveTriangleAxes,
  normalizeTriangleAxes,
} from "../../utils/localStorage";

export function triangleLogic(
  allScores: Record<string, number>,
  customSliders: CustomScoreSlider[],
  formulaWeights: FormulaWeights
) {
  const DEFAULT_TRIANGLE_AXIS_IDS: AxisId[] = ["creativity", "motion", "videoFaithfulness"];

  const availableAxisIds: AxisId[] = React.useMemo(() => {
    const builtins = Object.keys(formulaWeights) as AxisId[];
    const customs = customSliders.map((c) => c.id);
    return [...builtins, ...customs];
  }, [formulaWeights, customSliders]);

  const [triangleAxes, setTriangleAxesState] = React.useState<AxisId[]>(DEFAULT_TRIANGLE_AXIS_IDS);

  const [triangleAxesOpen, setTriangleAxesOpen] = React.useState(false);

  React.useEffect(() => {
    const loaded = normalizeTriangleAxes(
      loadTriangleAxes(DEFAULT_TRIANGLE_AXIS_IDS, availableAxisIds),
      DEFAULT_TRIANGLE_AXIS_IDS,
      availableAxisIds
    ) as AxisId[];

    setTriangleAxesState(loaded);
  }, [availableAxisIds]);

  const setTriangleAxes = React.useCallback(
    (next: AxisId[]) => {
      const clean = normalizeTriangleAxes(
        next,
        DEFAULT_TRIANGLE_AXIS_IDS,
        availableAxisIds
      ) as AxisId[];

      setTriangleAxesState(clean);
      saveTriangleAxes(clean, DEFAULT_TRIANGLE_AXIS_IDS, availableAxisIds);
    },
    [availableAxisIds]
  );

  const triangleAxisObjects = React.useMemo(() => {
    const ids = (triangleAxes?.length === 3 ? triangleAxes : DEFAULT_TRIANGLE_AXIS_IDS).slice(0, 3);

    return ids.map((id) => ({
      id: String(id),
      label: axisLabel(id, customSliders),
      value: axisValue(id, allScores),
    }));
  }, [triangleAxes, allScores, customSliders]);

  function getDisabledAxisReasons(forIndex: number): Record<string, string> {
    const out: Record<string, string> = {};

    for (const candidate of availableAxisIds) {
      const reason = getAxisBlockReason(
        candidate,
        triangleAxes,
        forIndex,
        formulaWeights,
        customSliders,
        (id) => axisLabel(id, customSliders).replace("\n", " "),
        0.9
      );

      if (reason) {
        out[String(candidate)] = reason;
      }
    }

    return out;
  }

  return {
    DEFAULT_TRIANGLE_AXIS_IDS,
    triangleAxes,
    triangleAxesOpen,
    setTriangleAxes,
    setTriangleAxesOpen,
    triangleAxisObjects,
    availableAxisIds,
    getDisabledAxisReasons,
  };
}

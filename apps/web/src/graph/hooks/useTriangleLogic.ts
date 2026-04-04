import React from "react";
import { buildAxisLabelGetter, axisValue } from "../graph_helpers/clipDialogLogic";
import { AxisId, CustomScoreSlider, FormulaWeights } from "../types/ui";
import { getAxisBlockReason } from "../graph_helpers/axisSimilarity";
import {
  loadTriangleAxes,
  saveTriangleAxes,
  normalizeTriangleAxes,
} from "../../utils/localStorage";

const DEFAULT_TRIANGLE_AXIS_IDS: AxisId[] = ["creativity", "motion", "videoFaithfulness"];

export function useTriangleLogic(
  allScores: Record<string, number>,
  customSliders: CustomScoreSlider[],
  formulaWeights: FormulaWeights,
  enabled: boolean
) {
  const getAxisLabel = React.useMemo(() => buildAxisLabelGetter(customSliders), [customSliders]);
  const availableAxisIds: AxisId[] = React.useMemo(() => {
    const builtins = Object.keys(formulaWeights) as AxisId[];
    const customs = customSliders.map((c) => c.id);
    return [...builtins, ...customs];
  }, [formulaWeights, customSliders]);

  const [triangleAxes, setTriangleAxesState] = React.useState<AxisId[]>(DEFAULT_TRIANGLE_AXIS_IDS);

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
    if (!enabled) return [];

    const ids = (triangleAxes?.length === 3 ? triangleAxes : DEFAULT_TRIANGLE_AXIS_IDS).slice(0, 3);

    return ids.map((id) => ({
      id: String(id),
      label: getAxisLabel(id),
      value: axisValue(id, allScores),
    }));
  }, [enabled, triangleAxes, allScores, customSliders]);

  const getDisabledAxisReasons = React.useCallback(
    (forIndex: number): Record<string, string> => {
      const out: Record<string, string> = {};

      for (const candidate of availableAxisIds) {
        const reason = getAxisBlockReason(
          candidate,
          triangleAxes,
          forIndex,
          formulaWeights,
          customSliders,
          (id) => getAxisLabel(id).replace("\n", " "),
          0.9
        );

        if (reason) {
          out[String(candidate)] = reason;
        }
      }

      return out;
    },
    [availableAxisIds, triangleAxes, formulaWeights, customSliders]
  );

  return {
    DEFAULT_TRIANGLE_AXIS_IDS,
    triangleAxes,
    setTriangleAxes,
    triangleAxisObjects,
    availableAxisIds,
    getDisabledAxisReasons,
  };
}

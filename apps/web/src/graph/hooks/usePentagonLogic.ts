import React from "react";
import { buildAxisLabelGetter, axisValue } from "../graph_helpers/clipDialogLogic";
import { AxisId, CustomScoreSlider } from "../types/ui";
import { getAxisBlockReason } from "../graph_helpers/axisSimilarity";
import {
  loadPentagonAxes,
  savePentagonAxes,
  normalizePentagonAxes,
} from "../../utils/localStorage";
import { DEFAULT_FORMULA_WEIGHTS } from "../graph_helpers/presets";

const DEFAULT_PENTAGON_AXIS_IDS: AxisId[] = [
  "creativity",
  "promptFaithfulness",
  "motion",
  "transitionSmoothness",
  "videoFaithfulness",
];

export function usePentagonLogic(
  allScores: Record<string, number>,
  customSliders: CustomScoreSlider[],
  enabled: boolean
) {
  const getAxisLabel = React.useMemo(() => buildAxisLabelGetter(customSliders), [customSliders]);

  const availableAxisIds: AxisId[] = React.useMemo(() => {
    const customs: AxisId[] = customSliders.map((c) => c.id);
    return [...DEFAULT_PENTAGON_AXIS_IDS, ...customs];
  }, [customSliders]);

  const [pentagonAxes, setPentagonAxesState] = React.useState<AxisId[]>(DEFAULT_PENTAGON_AXIS_IDS);

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
    if (!enabled) return [];

    const ids = (pentagonAxes?.length === 5 ? pentagonAxes : DEFAULT_PENTAGON_AXIS_IDS).slice(0, 5);

    return ids.map((id) => ({
      id: String(id),
      label: getAxisLabel(id),
      value: axisValue(id, allScores),
    }));
  }, [enabled, pentagonAxes, allScores, customSliders]);

  const getDisabledAxisReasons = React.useCallback(
    (forIndex: number): Record<string, string> => {
      const out: Record<string, string> = {};

      for (const candidate of availableAxisIds) {
        const reason = getAxisBlockReason(
          candidate,
          pentagonAxes,
          forIndex,
          DEFAULT_FORMULA_WEIGHTS,
          customSliders,
          (id) => getAxisLabel(id).replace("\n", " ")
        );

        if (reason) out[String(candidate)] = reason;
      }

      return out;
    },
    [availableAxisIds, pentagonAxes, customSliders]
  );

  return {
    DEFAULT_PENTAGON_AXIS_IDS,
    availableAxisIds,
    pentagonAxisObjects,
    pentagonAxes,
    setPentagonAxes,
    getDisabledAxisReasons,
  };
}

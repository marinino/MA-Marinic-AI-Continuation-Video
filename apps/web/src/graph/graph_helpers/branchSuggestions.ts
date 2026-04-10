import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { ParamKey, ParamStep, ParamNodeData, ParamWeightSuggestion } from "../types/ui";
import { clamp01 } from "./clipDialogLogic";

const PARAM_KEYS: ParamKey[] = [
  "highNoiseCfg",
  "lowNoiseCfg",
  "highNoiseShift",
  "lowNoiseShift",
  "highNoiseModelStrength",
  "lowNoiseModelStrength",
  "highNoiseSteps",
  "lowNoiseSteps",
  "highNoiseStartStep",
  "lowNoiseStartStep",
  "highNoiseEndStep",
  "lowNoiseEndStep",
];

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function getIncomingMap(edges: RFEdge[]) {
  const map = new Map<string, RFEdge[]>();
  for (const e of edges) {
    const arr = map.get(e.target) ?? [];
    arr.push(e);
    map.set(e.target, arr);
  }
  return map;
}

function getCategoryKeys(steps: ParamStep[]): string[] {
  const keys = new Set<string>();

  for (const step of steps) {
    for (const key of Object.keys(step.categoryDeltas ?? {})) {
      keys.add(key);
    }
  }

  return Array.from(keys);
}

export function collectParamBranchSteps(
  targetParamId: string,
  nodesById: Map<string, RFNode>,
  edges: RFEdge[]
): ParamStep[] {
  const incomingMap = getIncomingMap(edges);

  const paramNodes: RFNode[] = [];
  let currentId: string | null = targetParamId;

  while (currentId) {
    const node = nodesById.get(currentId);
    if (!node) break;

    if (node.type === "params") {
      paramNodes.push(node);
    }

    const parentEdge: RFEdge | undefined = incomingMap.get(currentId)?.[0];
    if (!parentEdge) break;

    currentId = parentEdge.source;
  }

  return paramNodes.reverse().map((node) => {
    const data = (node.data ?? {}) as ParamNodeData;

    return {
      nodeId: node.id,
      paramDeltas: data.paramDeltas ?? {},
      categoryDeltas: data.categoryScoreDeltas ?? {},
    };
  });
}

export function detectParamWeightSuggestion(
  steps: ParamStep[],
  opts?: {
    minSteps?: number;
    minCategoryDeltaAbs?: number;
    minParamDeltaAbs?: number;
    minStreak?: number;
    recencyWindow?: number;
    categoryLabels?: Record<string, string | undefined>;
  }
): ParamWeightSuggestion | null {
  const minSteps = opts?.minSteps ?? 5;
  const minCategoryDeltaAbs = opts?.minCategoryDeltaAbs ?? 2;
  const minParamDeltaAbs = opts?.minParamDeltaAbs ?? 0.25;
  const minStreak = opts?.minStreak ?? 5;
  const recencyWindow = opts?.recencyWindow ?? 15;

  if (steps.length < minSteps) return null;

  const recent = steps.slice(-recencyWindow);

  let best: ParamWeightSuggestion | null = null;

  const categoryKeys = getCategoryKeys(recent);

  for (const category of categoryKeys) {
    let categoryStreakLength = 0;
    let currentCategoryStreak = 0;
    let categoryHitCount = 0;
    let totalCategoryDelta = 0;

    for (const step of recent) {
      const d = step.categoryDeltas?.[category];
      const matches = typeof d === "number" && Number.isFinite(d) && d <= -minCategoryDeltaAbs;

      if (matches) {
        currentCategoryStreak += 1;
        categoryStreakLength = Math.max(categoryStreakLength, currentCategoryStreak);
        categoryHitCount += 1;
        totalCategoryDelta += d;
      } else {
        currentCategoryStreak = 0;
      }
    }

    // Nur echte streak erlaubt
    if (categoryStreakLength < minStreak) continue;

    for (const param of PARAM_KEYS) {
      let hitCount = 0;
      let streakLength = 0;
      let currentStreak = 0;
      let totalParamDelta = 0;

      for (const step of recent) {
        const categoryDelta = step.categoryDeltas?.[category];
        const paramDelta = step.paramDeltas?.[param];

        const categoryMatches =
          typeof categoryDelta === "number" &&
          Number.isFinite(categoryDelta) &&
          categoryDelta <= -minCategoryDeltaAbs;

        const paramMatches =
          typeof paramDelta === "number" &&
          Number.isFinite(paramDelta) &&
          Math.abs(paramDelta) >= minParamDeltaAbs;

        if (categoryMatches && paramMatches) {
          hitCount += 1;
          totalParamDelta += paramDelta;
          currentStreak += 1;
          streakLength = Math.max(streakLength, currentStreak);
        } else {
          currentStreak = 0;
        }
      }

      // Auch hier nur echte streak erlaubt
      if (streakLength < minStreak) continue;

      const avgCategoryDelta = totalCategoryDelta / categoryHitCount;
      const avgParamDelta = totalParamDelta / hitCount;

      const parameterDirection: "up" | "down" = avgParamDelta >= 0 ? "up" : "down";

      const streakScore = streakLength / recent.length;
      const magnitudeScore = clamp01(
        (Math.abs(avgCategoryDelta) / 10) * 0.6 + (Math.abs(avgParamDelta) / 2) * 0.4
      );

      // hitScore entfernt, weil wir nicht mehr auf Häufigkeit gehen wollen
      const confidence = clamp01(streakScore * 0.7 + magnitudeScore * 0.3);

      const suggestedAction: "increase_param_weight" | "decrease_param_weight" =
        "decrease_param_weight";

      const suggestedWeightDeltaPct =
        confidence >= 0.85 ? 10 : confidence >= 0.7 ? 8 : confidence >= 0.55 ? 6 : 4;

      const candidate: ParamWeightSuggestion = {
        targetCategory: category,
        categoryDirection: "down",
        parameter: param,
        parameterDirection,
        hitCount,
        streakLength,
        avgCategoryDelta: round2(avgCategoryDelta),
        avgParamDelta: round2(avgParamDelta),
        confidence: round2(confidence),
        suggestedWeightDeltaPct,
        suggestedAction,
message: buildSuggestionMessage({
  category,
  categoryLabels: opts?.categoryLabels,
  parameter: param,
  parameterDirection,
  hitCount,
  streakLength,
  avgCategoryDelta: round2(avgCategoryDelta),
  avgParamDelta: round2(avgParamDelta),
  suggestedWeightDeltaPct,
}),
      };

      if (
        !best ||
        candidate.streakLength > best.streakLength ||
        (candidate.streakLength === best.streakLength && candidate.confidence > best.confidence) ||
        (candidate.streakLength === best.streakLength &&
          candidate.confidence === best.confidence &&
          Math.abs(candidate.avgParamDelta) > Math.abs(best.avgParamDelta))
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

export function buildSuggestionMessage(args: {
  category: string;
  categoryLabels?: Record<string, string | undefined>;
  parameter: ParamKey;
  parameterDirection: "up" | "down";
  hitCount: number;
  streakLength: number;
  avgCategoryDelta: number;
  avgParamDelta: number;
  suggestedWeightDeltaPct: number;
}) {
  const categoryText = categoryLabel(args.category, args.categoryLabels);
  const paramText = paramLabel(args.parameter);
  const paramDirText = args.parameterDirection === "up" ? "increases" : "decreases";

  return `${categoryText} drops repeatedly in this branch. The most recurring associated parameter change is ${paramText} (${paramDirText}, avg ${args.avgParamDelta}) in ${args.hitCount} recent steps, longest streak ${args.streakLength}. Consider reducing the ${paramText} weight by about ${args.suggestedWeightDeltaPct}% for the ${categoryText} mapping.`;
}

export function categoryLabel(category: string, labels?: Record<string, string | undefined>) {
  if (labels?.[category]) return labels[category];

  switch (category) {
    case "creativity":
      return "Creativity";
    case "promptFaithfulness":
      return "Prompt Faithfulness";
    case "motion":
      return "Motion";
    case "transitionSmoothness":
      return "Transition Smoothness";
    case "videoFaithfulness":
      return "Video Faithfulness";
    default:
      return category;
  }
}

export function paramLabel(param: ParamKey) {
  switch (param) {
    case "highNoiseCfg":
      return "High CFG";
    case "lowNoiseCfg":
      return "Low CFG";
    case "highNoiseShift":
      return "High Shift";
    case "lowNoiseShift":
      return "Low Shift";
    case "highNoiseModelStrength":
      return "High Strength";
    case "lowNoiseModelStrength":
      return "Low Strength";
    case "highNoiseSteps":
      return "High Steps";
    case "lowNoiseSteps":
      return "Low Steps";
    case "highNoiseStartStep":
      return "High Start Step";
    case "lowNoiseStartStep":
      return "Low Start Step";
    case "highNoiseEndStep":
      return "High End Step";
    case "lowNoiseEndStep":
      return "Low End Step";
  }
}

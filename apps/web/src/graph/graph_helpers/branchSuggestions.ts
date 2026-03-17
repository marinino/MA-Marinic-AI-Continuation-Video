import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import {
  StandardCategoryKey,
  ParamKey,
  ParamStep,
  ParamNodeData,
  ParamWeightSuggestion,
} from "../types/ui";

const SCORE_KEYS: StandardCategoryKey[] = [
  "creativity",
  "promptFaithfulness",
  "motion",
  "transitionSmoothness",
  "videoFaithfulness",
];

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

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

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
    minHits?: number;
    minStreak?: number;
    recencyWindow?: number;
  }
): ParamWeightSuggestion | null {
  const minSteps = opts?.minSteps ?? 5;
  const minCategoryDeltaAbs = opts?.minCategoryDeltaAbs ?? 2;
  const minParamDeltaAbs = opts?.minParamDeltaAbs ?? 0.25;
  const minHits = opts?.minHits ?? 7;
  const minStreak = opts?.minStreak ?? 5;
  const recencyWindow = opts?.recencyWindow ?? 15;

  if (steps.length < minSteps) return null;

  const recent = steps.slice(-recencyWindow);

  let best: ParamWeightSuggestion | null = null;

  for (const category of SCORE_KEYS) {
    const relevantCategoryDropSteps = recent.filter((step) => {
      const d = step.categoryDeltas?.[category];
      return typeof d === "number" && Number.isFinite(d) && d <= -minCategoryDeltaAbs;
    });

    const categoryHitCount = relevantCategoryDropSteps.length;

    let categoryStreakLength = 0;
    let currentCategoryStreak = 0;
    let totalCategoryDelta = 0;

    for (const step of recent) {
      const d = step.categoryDeltas?.[category];
      if (typeof d === "number" && Number.isFinite(d) && d <= -minCategoryDeltaAbs) {
        currentCategoryStreak += 1;
        categoryStreakLength = Math.max(categoryStreakLength, currentCategoryStreak);
        totalCategoryDelta += d;
      } else {
        currentCategoryStreak = 0;
      }
    }

    const passesCategoryHitRule = categoryHitCount >= minHits;
    const passesCategoryStreakRule = categoryStreakLength >= minStreak;

    if (!passesCategoryHitRule && !passesCategoryStreakRule) continue;

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

      const passesHitRule = hitCount >= minHits;
      const passesStreakRule = streakLength >= minStreak;

      if (!passesHitRule && !passesStreakRule) continue;

      const avgCategoryDelta = totalCategoryDelta / categoryHitCount;
      const avgParamDelta = totalParamDelta / hitCount;

      const parameterDirection: "up" | "down" = avgParamDelta >= 0 ? "up" : "down";

      const hitScore = hitCount / recent.length;
      const streakScore = streakLength / recent.length;
      const magnitudeScore = clamp01(
        (Math.abs(avgCategoryDelta) / 10) * 0.6 + (Math.abs(avgParamDelta) / 2) * 0.4
      );

      const confidence = clamp01(hitScore * 0.4 + streakScore * 0.35 + magnitudeScore * 0.25);

      // Wenn Kategorie fällt und Parameter in gleicher Richtung immer mitläuft,
      // dann Einfluss dieses Parameters eher reduzieren.
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
        (candidate.streakLength === best.streakLength && candidate.hitCount > best.hitCount) ||
        (candidate.streakLength === best.streakLength &&
          candidate.hitCount === best.hitCount &&
          candidate.confidence > best.confidence) ||
        (candidate.streakLength === best.streakLength &&
          candidate.hitCount === best.hitCount &&
          candidate.confidence === best.confidence &&
          Math.abs(candidate.avgParamDelta) > Math.abs(best.avgParamDelta))
      ) {
        best = candidate;
      }
    }
  }

  return best;
}

function buildSuggestionMessage(args: {
  category: StandardCategoryKey;
  parameter: ParamKey;
  parameterDirection: "up" | "down";
  hitCount: number;
  streakLength: number;
  avgCategoryDelta: number;
  avgParamDelta: number;
  suggestedWeightDeltaPct: number;
}) {
  const categoryText = categoryLabel(args.category);
  const paramText = paramLabel(args.parameter);
  const paramDirText = args.parameterDirection === "up" ? "increases" : "decreases";

  return `${categoryText} drops repeatedly in this branch. The most recurring associated parameter change is ${paramText} (${paramDirText}, avg ${args.avgParamDelta}) in ${args.hitCount} recent steps, longest streak ${args.streakLength}. Consider reducing the ${paramText} weight by about ${args.suggestedWeightDeltaPct}% for the ${categoryText} mapping.`;
}

export function categoryLabel(category: StandardCategoryKey) {
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

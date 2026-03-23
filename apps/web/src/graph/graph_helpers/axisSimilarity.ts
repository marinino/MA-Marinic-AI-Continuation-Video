import { AxisId, CleanWeights, CustomScoreSlider, FormulaWeights } from "../types/ui";

function dot(a: CleanWeights, b: CleanWeights): number {
  return (
    a.steps * b.steps +
    a.ratio * b.ratio +
    a.shift * b.shift +
    a.cfg * b.cfg +
    a.strength * b.strength
  );
}

function norm(a: CleanWeights): number {
  return Math.sqrt(dot(a, a));
}

export function cosineSimilarity(a: CleanWeights, b: CleanWeights): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

export function getAxisWeights(
  axisId: string,
  formulaWeights: FormulaWeights,
  customSliders: CustomScoreSlider[]
): CleanWeights | null {
  if (axisId in formulaWeights) {
    return formulaWeights[axisId as keyof FormulaWeights];
  }

  const custom = customSliders.find((s) => s.id === axisId);
  return custom?.w ?? null;
}

export function getAxisBlockReason(
  candidate: string,
  selectedAxes: string[],
  currentIndex: number,
  formulaWeights: FormulaWeights,
  customSliders: CustomScoreSlider[],
  getLabel: (id: AxisId) => string,
  threshold = 0.9
): string | null {
  const candidateWeights = getAxisWeights(candidate, formulaWeights, customSliders);
  if (!candidateWeights) return null;

  for (let i = 0; i < selectedAxes.length; i++) {
    if (i === currentIndex) continue;

    const selected = selectedAxes[i];

    if (selected === candidate) {
      return "Already selected";
    }

    const selectedWeights = getAxisWeights(selected, formulaWeights, customSliders);
    if (!selectedWeights) continue;

    const sim = cosineSimilarity(candidateWeights, selectedWeights);
    if (sim >= threshold) {
      return `Too similar to ${getLabel(selected)}`;
    }
  }

  return null;
}

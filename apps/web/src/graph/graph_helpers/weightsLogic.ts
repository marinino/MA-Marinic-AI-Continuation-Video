import React from "react";
import { loadFormulaWeights } from "../../utils/weightsStorage";
import { FormulaWeights, DEFAULT_FORMULA_WEIGHTS } from "../hooks/useV2VParams";
import { CatKey } from "../types/ui";

export function useWeightsLogic() {
  const [weightsOpen, setWeightsOpen] = React.useState(false);
  const [weightsCat, setWeightsCat] = React.useState<CatKey | null>(null);
  const [formulaWeights, setFormulaWeights] = React.useState<FormulaWeights>(() =>
    loadFormulaWeights()
  );

  function openWeights(cat: CatKey) {
    setWeightsCat(cat);
    setWeightsOpen(true);
  }

  function closeWeights() {
    setWeightsOpen(false);
    setWeightsCat(null);
  }

  function resetWeights() {
    setFormulaWeights(DEFAULT_FORMULA_WEIGHTS);
  }

  function patchFormulaWeights<K extends keyof FormulaWeights>(
    cat: K,
    patch: Partial<FormulaWeights[K]>
  ) {
    setFormulaWeights((prev) => ({
      ...prev,
      [cat]: { ...prev[cat], ...patch },
    }));
  }

  return {
    weightsOpen,
    weightsCat,
    formulaWeights,
    setFormulaWeights,
    setWeightsCat,
    setWeightsOpen,
    openWeights,
    closeWeights,
    resetWeights,
    patchFormulaWeights,
  };
}

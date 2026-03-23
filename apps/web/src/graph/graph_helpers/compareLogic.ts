export function buildCompareDelta(sourceData: any, baseData: any) {
  return {
    highNoiseCfg:
      sourceData?.highNoiseCfg != null && baseData?.highNoiseCfg != null
        ? sourceData.highNoiseCfg - baseData.highNoiseCfg
        : null,

    lowNoiseCfg:
      sourceData?.lowNoiseCfg != null && baseData?.lowNoiseCfg != null
        ? sourceData.lowNoiseCfg - baseData.lowNoiseCfg
        : null,

    highNoiseShift:
      sourceData?.highNoiseShift != null && baseData?.highNoiseShift != null
        ? sourceData.highNoiseShift - baseData.highNoiseShift
        : null,

    lowNoiseShift:
      sourceData?.lowNoiseShift != null && baseData?.lowNoiseShift != null
        ? sourceData.lowNoiseShift - baseData.lowNoiseShift
        : null,

    highNoiseModelStrength:
      sourceData?.highNoiseModelStrength != null && baseData?.highNoiseModelStrength != null
        ? sourceData.highNoiseModelStrength - baseData.highNoiseModelStrength
        : null,

    lowNoiseModelStrength:
      sourceData?.lowNoiseModelStrength != null && baseData?.lowNoiseModelStrength != null
        ? sourceData.lowNoiseModelStrength - baseData.lowNoiseModelStrength
        : null,

    highNoiseStartStep:
      sourceData?.highNoiseStartStep != null && baseData?.highNoiseStartStep != null
        ? sourceData.highNoiseStartStep - baseData.highNoiseStartStep
        : null,

    lowNoiseStartStep:
      sourceData?.lowNoiseStartStep != null && baseData?.lowNoiseStartStep != null
        ? sourceData.lowNoiseStartStep - baseData.lowNoiseStartStep
        : null,

    highNoiseEndStep:
      sourceData?.highNoiseEndStep != null && baseData?.highNoiseEndStep != null
        ? sourceData.highNoiseEndStep - baseData.highNoiseEndStep
        : null,

    lowNoiseEndStep:
      sourceData?.lowNoiseEndStep != null && baseData?.lowNoiseEndStep != null
        ? sourceData.lowNoiseEndStep - baseData.lowNoiseEndStep
        : null,

    displayTotalSteps:
      sourceData?.displayTotalSteps != null && baseData?.displayTotalSteps != null
        ? sourceData.displayTotalSteps - baseData.displayTotalSteps
        : null,

    displayLowStepPct:
      sourceData?.displayLowStepPct != null && baseData?.displayLowStepPct != null
        ? sourceData.displayLowStepPct - baseData.displayLowStepPct
        : null,
  };
}

export function buildCompareCategoryDeltas(
  sourceScores?: Record<string, number | null>,
  baseScores?: Record<string, number | null>
) {
  const result: Record<string, number | null> = {};
  const keys = new Set([...Object.keys(sourceScores ?? {}), ...Object.keys(baseScores ?? {})]);

  for (const key of keys) {
    const source = sourceScores?.[key];
    const base = baseScores?.[key];

    result[key] =
      typeof source === "number" && typeof base === "number" ? +(source - base).toFixed(2) : null;
  }

  return result;
}

import { useState } from "react";

export type V2VTab = "simple" | "advanced";
export type CatView = "sliders" | "pentagon";

export function useV2VSliders() {
  const [v2vTab, setV2vTab] = useState<V2VTab>("simple");
  const [catView, setCatView] = useState<CatView>("sliders");

  const [simpleTotalSteps, setSimpleTotalSteps] = useState(0);
  const [simpleStepRatio, setSimpleStepRatio] = useState(50);
  const [simpleHighShift, setSimpleHighShift] = useState(50);
  const [simpleHighCfg, setSimpleHighCfg] = useState(50);
  const [simpleHighStrength, setSimpleHighStrength] = useState(50);

  function handleChangeTotalStepsSlider(_event: Event, value: number | number[]) {
    setSimpleTotalSteps(value as number);
  }

  function handleChangeRatio(_event: Event, value: number | number[]) {
    setSimpleStepRatio(value as number);
  }

  function handleChangeShift(_event: Event, value: number | number[]) {
    setSimpleHighShift(value as number);
  }

  function handleChangeCFG(_event: Event, value: number | number[]) {
    setSimpleHighCfg(value as number);
  }

  function handleChangeStrength(_event: Event, value: number | number[]) {
    setSimpleHighStrength(value as number);
  }

  return {
    v2vTab,
    setV2vTab,
    catView,
    setCatView,

    simpleTotalSteps,
    simpleStepRatio,
    simpleHighShift,
    simpleHighCfg,
    simpleHighStrength,

    handleChangeTotalStepsSlider,
    handleChangeRatio,
    handleChangeShift,
    handleChangeCFG,
    handleChangeStrength,
  };
}

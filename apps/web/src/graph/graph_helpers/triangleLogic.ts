import React from "react";
import { AxisId } from "../types/ui";

export function trinagleLogic() {
  const DEFAULT_TRIANGLE_AXIS_IDS: AxisId[] = ["creativity", "motion", "videoFaithfulness"];

  const TRIANGLE_AXIS_STORAGE_KEY = "v2v.triangleAxes.v1";

  const [triangleAxes, setTriangleAxes] = React.useState<AxisId[]>(() => loadTriangleAxes());
  const [triangleAxesOpen, setTriangleAxesOpen] = React.useState(false);

  function loadTriangleAxes(): AxisId[] {
    try {
      const raw = localStorage.getItem(TRIANGLE_AXIS_STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AxisId[]) : null;
      return Array.isArray(arr) && arr.length ? arr : DEFAULT_TRIANGLE_AXIS_IDS;
    } catch {
      return DEFAULT_TRIANGLE_AXIS_IDS;
    }
  }

  return {
    DEFAULT_TRIANGLE_AXIS_IDS,
    TRIANGLE_AXIS_STORAGE_KEY,
    triangleAxes,
    triangleAxesOpen,
    setTriangleAxes,
    setTriangleAxesOpen,
    loadTriangleAxes,
  };
}

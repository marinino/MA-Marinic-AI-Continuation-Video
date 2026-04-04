import { createContext, useContext } from "react";
import { GraphUIContextValue } from "../types/ui";

const GraphUIContext = createContext<GraphUIContextValue | null>(null);

export function useGraphUI() {
  const value = useContext(GraphUIContext);
  if (!value) throw new Error("useGraphUI must be used inside GraphUIContext.Provider");
  return value;
}

export default GraphUIContext;

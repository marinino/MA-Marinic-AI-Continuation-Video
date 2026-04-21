import { NodeType } from "./schema";

export function getNodeColors(kind: NodeType, isRoot: boolean) {
  if (isRoot) return { border: "#ff9800", bg: "#FFF8E1" };

  switch (kind) {
    case "params":
      return { border: "#3f51b5", bg: "#E3F2FD" };
    case "clip":
      return { border: "#8bc34a", bg: "#E8F5E9" };
    case "edit":
      return { border: "#9c27b0", bg: "#F3E5F5" };
    case "import":
      return { border: "#00897b", bg: "#E0F2F1" };
  }
}

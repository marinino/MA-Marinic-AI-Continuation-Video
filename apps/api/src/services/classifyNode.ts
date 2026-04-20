import type { Node } from "@ma/shared";

export function isResetNode(node: Node): boolean {
  return node.type === "import" || node.type === "edit";
}

export function isVisibleTimelineNode(node: Node): boolean {
  return node.type === "clip" || node.type === "import" || node.type === "edit";
}

export function isGeneratedClipNode(node: Node): boolean {
  return node.type === "clip";
}

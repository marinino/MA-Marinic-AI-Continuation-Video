import type { Project } from "@ma/shared";

export function getGeneratedFramesForParamsNode(
  project: Project,
  paramsNodeId: string
): number | null {
  const node = project.nodes.find((n) => n.id === paramsNodeId) as any;
  if (!node || node.type !== "params") return null;

  const value = node.data?.generatedFrames;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

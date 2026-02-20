import type { Edge as RFEdge, Node as RFNode } from "reactflow";

export type XY = { x: number; y: number };

export function edgeLabel(e: RFEdge): string | undefined {
  return (e.data as any)?.label as string | undefined;
}

/**
 * EXACT semantics from mega-file:
 * "branches" are outgoing edges of a clip with type "input" or "edit_in"
 * (type stored in RFEdge.data.label)
 */
export function countBranches(edges: RFEdge[], clipId: string) {
  return edges.filter(
    (e) => e.source === clipId && (edgeLabel(e) === "input" || edgeLabel(e) === "edit_in")
  ).length;
}

export function isColliding(a: XY, b: XY, w = 220, h = 120, pad = 30) {
  return Math.abs(a.x - b.x) < w + pad && Math.abs(a.y - b.y) < h + pad;
}

export function findFreePosition(
  desired: XY,
  existing: { position: XY }[],
  opts?: { stepY?: number; maxTries?: number; nodeW?: number; nodeH?: number; pad?: number }
): XY {
  const stepY = opts?.stepY ?? 160;
  const maxTries = opts?.maxTries ?? 50;
  const nodeW = opts?.nodeW ?? 220;
  const nodeH = opts?.nodeH ?? 120;
  const pad = opts?.pad ?? 30;

  let pos = { ...desired };

  for (let i = 0; i < maxTries; i++) {
    const hit = existing.some((n) => isColliding(pos, n.position, nodeW, nodeH, pad));
    if (!hit) return pos;
    pos = { x: pos.x, y: pos.y + stepY };
  }
  return pos;
}

/**
 * Small helper used frequently
 */
export function findNode(nodes: RFNode[], id: string) {
  return nodes.find((n) => n.id === id) ?? null;
}

import type { Edge as RFEdge, Node as RFNode, ReactFlowInstance } from "reactflow";

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

export type CenterOnNodeOpts = {
  duration?: number;
  fallbackW?: number;
  fallbackH?: number;
  onAfter?: () => void; // z.B. vp.saveViewport
};

export function centerOnNode(
  rf: ReactFlowInstance | null,
  nodeId: string,
  opts?: CenterOnNodeOpts
) {
  if (!rf) return;

  const duration = opts?.duration ?? 250;
  const fallbackW = opts?.fallbackW ?? 220;
  const fallbackH = opts?.fallbackH ?? 120;

  requestAnimationFrame(() => {
    const n = rf.getNode(nodeId);
    if (!n) return;

    const w = (n as any).width ?? fallbackW;
    const h = (n as any).height ?? fallbackH;

    const cx = n.position.x + w / 2;
    const cy = n.position.y + h / 2;
    const currentZoom = rf.getZoom();

    rf.setCenter(cx, cy, { duration, zoom: currentZoom });

    if (opts?.onAfter) {
      setTimeout(opts.onAfter, duration + 50);
    }
  });
}

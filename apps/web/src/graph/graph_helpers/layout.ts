import type { Edge as RFEdge, Node as RFNode, ReactFlowInstance } from "reactflow";
import { XY, BoxNode } from "../types/ui";

export function edgeLabel(e: RFEdge): string | undefined {
  return (e.data as any)?.label as string | undefined;
}

export function countBranches(edges: RFEdge[], clipId: string) {
  return edges.filter(
    (e) => e.source === clipId && (edgeLabel(e) === "input" || edgeLabel(e) === "edit_in")
  ).length;
}

export function isColliding(a: XY, b: XY, w = 220, h = 120, pad = 30) {
  return Math.abs(a.x - b.x) < w + pad && Math.abs(a.y - b.y) < h + pad;
}

export function getDefaultNodeSize(type?: string) {
  switch (type) {
    case "params":
      return { w: 420, h: 500 };
    case "edit":
      return { w: 280, h: 170 };
    case "import":
      return { w: 280, h: 170 };
    case "clip":
    default:
      return { w: 220, h: 120 };
  }
}

function getMeasuredSize(node: BoxNode) {
  const fallback = getDefaultNodeSize(node.type);

  const measuredW = typeof node.width === "number" ? node.width : fallback.w;
  const measuredH = typeof node.height === "number" ? node.height : fallback.h;

  if (node.type === "params") {
    return {
      w: measuredW,
      h: Math.max(measuredH, 350),
    };
  }

  return {
    w: measuredW,
    h: measuredH,
  };
}

function isCollidingBoxes(a: BoxNode, b: BoxNode, pad = 30) {
  const sa = getMeasuredSize(a);
  const sb = getMeasuredSize(b);

  const aLeft = a.position.x - pad;
  const aTop = a.position.y - pad;
  const aRight = a.position.x + sa.w + pad;
  const aBottom = a.position.y + sa.h + pad;

  const bLeft = b.position.x;
  const bTop = b.position.y;
  const bRight = b.position.x + sb.w;
  const bBottom = b.position.y + sb.h;

  const separated = aRight <= bLeft || aLeft >= bRight || aBottom <= bTop || aTop >= bBottom;

  return !separated;
}

export function findFreePosition(
  desired: XY,
  existing: BoxNode[],
  opts?: {
    stepY?: number;
    maxTries?: number;
    pad?: number;
    newNodeType?: string;
    newNodeWidth?: number;
    newNodeHeight?: number;
    extraBottom?: number;
  }
): XY {
  const stepY = opts?.stepY ?? 160;
  const maxTries = opts?.maxTries ?? 100;
  const pad = opts?.pad ?? 30;
  const extraBottom = opts?.extraBottom ?? 0;

  const baseHeight =
    typeof opts?.newNodeHeight === "number" ? opts.newNodeHeight + extraBottom : undefined;

  const candidateBase: BoxNode = {
    position: desired,
    type: opts?.newNodeType,
    width: opts?.newNodeWidth,
    height: baseHeight,
  };

  let pos = { ...desired };

  for (let i = 0; i < maxTries; i++) {
    const candidate: BoxNode = {
      ...candidateBase,
      position: pos,
    };

    const hit = existing.some((n) => isCollidingBoxes(candidate, n, pad));
    if (!hit) return pos;

    pos = { x: pos.x, y: pos.y + stepY };
  }

  return pos;
}

export function findNode(nodes: RFNode[], id: string) {
  return nodes.find((n) => n.id === id) ?? null;
}

export type CenterOnNodeOpts = {
  duration?: number;
  fallbackW?: number;
  fallbackH?: number;
  onAfter?: () => void;
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

export function truncateLabel(str: string, max = 13) {
  return str.length > max ? str.slice(0, max) + "..." : str;
}

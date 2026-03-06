import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";

/**
 * EXACT behavior from mega-file:
 * - best case: clip.data.producedByEditId
 * - fallback: incoming edge edit_out (edit -> clip)
 * - NO fallback via edit_in (parent clip), intentionally
 */
export function resolveEditIdForClipId(project: Project, clipId: string): string | null {
  const clip = project.nodes.find((n) => n.id === clipId) as any;
  const direct = clip?.data?.producedByEditId ?? null;
  if (direct) return direct;

  const inc = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
  if (inc) return inc.source;

  return null;
}

/**
 * EXACT: selected node id from uiState
 */
export function getSelectedNodeId(project: Project): string | null {
  return project.uiState?.selectedNodeId ?? null;
}

/**
 * EXACT mega-file logic:
 * - If selected node is edit: return it
 * - If selected node is clip: resolve editId that produced that clip
 */
export function getCurrentEditId(project: Project): string | null {
  const sel = getSelectedNodeId(project);
  if (!sel) return null;

  const selNode = project.nodes.find((n) => n.id === sel) as any;
  if (selNode?.type === "edit") return sel;

  if (selNode?.type === "clip") {
    return resolveEditIdForClipId(project, sel);
  }

  return null;
}

/**
 * EXACT: clip->edit relationship for "parent edit" context
 * (used elsewhere; kept for parity)
 */
export function findEditNodeIdForClipProject(project: Project, clipId: string): string | null {
  const incomingFromEdit = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
  if (incomingFromEdit) return incomingFromEdit.source;

  const outgoingToEdit = project.edges.find((e) => e.source === clipId && e.type === "edit_in");
  if (outgoingToEdit) return outgoingToEdit.target;

  return null;
}

export function findOutClipIdForEditProject(project: Project, editId: string): string | null {
  const out = project.edges.find((e) => e.source === editId && e.type === "edit_out");
  return out?.target ?? null;
}

/**
 * EXACT mega-file: find previous edit by walking edit.data.parentClipId then find edit that has outClipId==parentClipId
 */
export function findPrevEditId(project: Project, currentEditId: string): string | null {
  const editNode = project.nodes.find((n) => n.id === currentEditId) as any;
  const parentClipId = editNode?.data?.parentClipId;
  if (!parentClipId) return null;

  const prevEdit = project.nodes.find(
    (n) => n.type === "edit" && (n as any).data?.outClipId === parentClipId
  ) as any;

  return prevEdit?.id ?? null;
}

export function getPrevEffectKeysFromParentClip(project: Project, parentClipId: string): string[] {
  const prevEdit = project.nodes.find(
    (n) => n.type === "edit" && (n as any).data?.outClipId === parentClipId
  ) as any;

  return prevEdit?.data?.effectKeys ?? [];
}

/**
 * EXACT: baseline stored timeline filename for a clip = storedTimelineFilename from the edit that produced that clip.
 */
export function getBaselineStoredTimelineFilenameForClip(
  project: Project,
  clipId: string
): string | null {
  const editId = (() => {
    const clip = project.nodes.find((n) => n.id === clipId) as any;
    if (clip?.data?.producedByEditId) return clip.data.producedByEditId as string;

    const inc = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
    if (inc) return inc.source;

    return null;
  })();

  if (!editId) return null;

  const editNode = project.nodes.find((n) => n.id === editId) as any;
  return editNode?.data?.timeline?.storedTimelineFilename ?? null;
}

export function buildIncomingMap(edges: RFEdge[]) {
  const m = new Map<string, RFEdge>();
  for (const e of edges) {
    // eindeutig: pro target genau 1 incoming
    m.set(e.target, e);
  }
  return m;
}

export function findPrevParamsId(
  paramsNodeId: string,
  nodesById: Map<string, RFNode>,
  incoming: Map<string, RFEdge>
) {
  // params <- clip <- params
  const e0 = incoming.get(paramsNodeId);
  if (!e0) return null;
  const parentClipId = e0.source;

  const e1 = incoming.get(parentClipId);
  if (!e1) return null;
  const prevNodeId = e1.source;

  const prevNode = nodesById.get(prevNodeId);
  if (!prevNode) return null;

  return prevNode.type === "params" ? prevNodeId : null;
}

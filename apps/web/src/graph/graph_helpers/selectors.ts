import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";
import { BranchNodeLike, BranchTimelineStep, ParameterHistoryMap, SimpleReal, TransitionPair } from "../types/ui";

export function resolveEditIdForClipId(project: Project, clipId: string): string | null {
  const clip = project.nodes.find((n) => n.id === clipId) as any;
  const direct = clip?.data?.producedByEditId ?? null;
  if (direct) return direct;

  const inc = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
  if (inc) return inc.source;

  return null;
}

export function getSelectedNodeId(project: Project): string | null {
  return project.uiState?.selectedNodeId ?? null;
}

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
    m.set(e.target, e);
  }
  return m;
}

export function findPrevParamsId(
  paramsNodeId: string,
  nodesById: Map<string, RFNode>,
  incoming: Map<string, RFEdge>
) {
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

export function collectSubtreeNodeIds(nodeId: string, rfEdges: RFEdge[]): Set<string> {
  const result = new Set<string>();
  const stack: string[] = [nodeId];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (!currentId) continue;

    if (result.has(currentId)) continue;
    result.add(currentId);

    const childIds = rfEdges.filter((e) => e.source === currentId).map((e) => e.target);

    for (const childId of childIds) {
      if (!result.has(childId)) {
        stack.push(childId);
      }
    }
  }

  return result;
}

export function getHiddenDescendantIds(nodeId: string, nodes: RFNode[], edges: RFEdge[]): string[] {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const result = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = edges.filter((e) => e.source === current).map((e) => e.target);

    for (const childId of children) {
      queue.push(childId);
      const child = nodeById.get(childId);
      if (child?.hidden) {
        result.add(childId);
      }
    }
  }

  return Array.from(result);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function getStepData(step: any) {
  if (step?.data) return step.data;
  if (step?.node?.data) return step.node.data;
  return step;
}

export function buildParameterHistoryFromBranchSteps(
  branchSteps: any[],
  nodesById: Map<string, RFNode>
): ParameterHistoryMap {
  const raw = Array.isArray(branchSteps) ? branchSteps : [];

  const normalized = raw
    .map((step, index) => {
      const nodeId = step?.nodeId;
      const node = nodeId ? nodesById.get(nodeId) : null;
      const d = (node?.data as any) ?? null;

      if (!d) return null;

      const highStart = d.highNoiseStartStep;
      const highEnd = d.highNoiseEndStep;
      const lowStart = d.lowNoiseStartStep;
      const lowEnd = d.lowNoiseEndStep;

      const hasStepWindow =
        isFiniteNumber(highStart) &&
        isFiniteNumber(highEnd) &&
        isFiniteNumber(lowStart) &&
        isFiniteNumber(lowEnd);

      const highSteps = hasStepWindow ? highEnd - highStart : null;
      const lowSteps = hasStepWindow ? lowEnd - lowStart : null;
      const totalSteps = highSteps != null && lowSteps != null ? highSteps + lowSteps : null;

      const lowStepPct =
        totalSteps != null && totalSteps > 0 && lowSteps != null
          ? (lowSteps / totalSteps) * 100
          : null;

      return {
        index: index + 1,
        highNoiseCfg: isFiniteNumber(d.highNoiseCfg) ? d.highNoiseCfg : null,
        highNoiseShift: isFiniteNumber(d.highNoiseShift) ? d.highNoiseShift : null,
        highNoiseModelStrength: isFiniteNumber(d.highNoiseModelStrength)
          ? d.highNoiseModelStrength
          : null,
        totalSteps,
        lowStepPct,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return {
    highNoiseCfg: normalized
      .filter((x) => x.highNoiseCfg != null)
      .map((x) => ({
        index: x.index,
        value: x.highNoiseCfg as number,
      })),

    highNoiseShift: normalized
      .filter((x) => x.highNoiseShift != null)
      .map((x) => ({
        index: x.index,
        value: x.highNoiseShift as number,
      })),

    highNoiseModelStrength: normalized
      .filter((x) => x.highNoiseModelStrength != null)
      .map((x) => ({
        index: x.index,
        value: x.highNoiseModelStrength as number,
      })),

    totalSteps: normalized
      .filter((x) => x.totalSteps != null)
      .map((x) => ({
        index: x.index,
        value: x.totalSteps as number,
      })),

    lowStepPct: normalized
      .filter((x) => x.lowStepPct != null)
      .map((x) => ({
        index: x.index,
        value: x.lowStepPct as number,
      })),
  };
}

export function getSimpleFromParentClip(
  clipId: string,
  nodesById: Map<string, RFNode>,
  incoming: Map<string, RFEdge>
): SimpleReal {
  const fallback: SimpleReal = {
    totalSteps: 20,
    stepRatioPct: 65,
    highShift: 2.6,
    highCfg: 2.6,
    highStrength: 0.3,
  };

  const edge = incoming.get(clipId);
  if (!edge) return fallback;

  const sourceNode = nodesById.get(edge.source);
  if (!sourceNode || sourceNode.type !== "params") return fallback;

  const d = (sourceNode.data as any) ?? {};

  const highStart = typeof d.highNoiseStartStep === "number" ? d.highNoiseStartStep : null;
  const highEnd = typeof d.highNoiseEndStep === "number" ? d.highNoiseEndStep : null;
  const lowStart = typeof d.lowNoiseStartStep === "number" ? d.lowNoiseStartStep : null;
  const lowEnd = typeof d.lowNoiseEndStep === "number" ? d.lowNoiseEndStep : null;

  const highWindow = highStart != null && highEnd != null ? highEnd - highStart : null;
  const lowWindow = lowStart != null && lowEnd != null ? lowEnd - lowStart : null;

  const derivedTotalSteps =
    highWindow != null && lowWindow != null && highWindow + lowWindow > 0
      ? highWindow + lowWindow
      : typeof d.highNoiseSteps === "number"
        ? d.highNoiseSteps
        : typeof d.lowNoiseSteps === "number"
          ? d.lowNoiseSteps
          : fallback.totalSteps;

  const derivedLowStepPct =
    lowWindow != null && derivedTotalSteps > 0
      ? Math.round((lowWindow / derivedTotalSteps) * 100)
      : fallback.stepRatioPct;

  return {
    totalSteps: derivedTotalSteps,
    stepRatioPct: derivedLowStepPct,
    highShift: typeof d.highNoiseShift === "number" ? d.highNoiseShift : fallback.highShift,
    highCfg: typeof d.highNoiseCfg === "number" ? d.highNoiseCfg : fallback.highCfg,
    highStrength:
      typeof d.highNoiseModelStrength === "number"
        ? d.highNoiseModelStrength
        : fallback.highStrength,
  };
}

export function collectParamTimelineForClip(
  clipId: string,
  nodes: RFNode[],
  edges: RFEdge[]
): BranchTimelineStep[] {
  const nodesById = new Map(nodes.map((n) => [n.id, n]));
  const incoming = new Map<string, RFEdge[]>();

  for (const e of edges) {
    const arr = incoming.get(e.target) ?? [];
    arr.push(e);
    incoming.set(e.target, arr);
  }

  const steps: BranchTimelineStep[] = [];
  let currentId: string | null = clipId;

  while (currentId) {
    const currentNode = nodesById.get(currentId);
    if (!currentNode) break;

    const inEdges = incoming.get(currentId) ?? [];
    const parentEdge = inEdges[0];
    if (!parentEdge) break;

    const parentNode = nodesById.get(parentEdge.source);
    if (!parentNode) break;

    if (currentNode.type === "clip" && parentNode.type === "params") {
      const data = (parentNode.data as any) ?? {};

      steps.push({
        kind: "params",
        nodeId: parentNode.id,
        paramNodeId: parentNode.id,
        clipNodeId: currentNode.id,
        label: data.label ?? "Params",
        frames: Number(data.generatedFrames ?? data.length ?? 71),
        prompt: data.prompt ?? "",
      });

      currentId = parentNode.id;
      continue;
    }

    if (currentNode.type === "clip" && parentNode.type !== "params") {
      steps.push({
        kind: "non-param",
        nodeId: parentNode.id,
        paramNodeId: null,
        clipNodeId: currentNode.id,
        label: "non param",
        frames: 25,
        prompt: "",
      });

      currentId = parentNode.id;
      continue;
    }

    if (parentNode.type === "edit") {
      currentId = parentNode.id;
      continue;
    }

    currentId = parentNode.id;
  }

  return steps.reverse();
}



import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";

/**
 * EXACT behavior from mega-file:
 * - RF edges: type is always "labeled"
 * - actual semantic edge type is stored in e.data.label
 * - showLabel is stored in e.data.showLabel
 */

export function toRF(
  project: Project,
  showEdgeLabels: boolean
): { nodes: RFNode[]; edges: RFEdge[] } {
  return {
    nodes: project.nodes.map((n) => ({
      id: n.id,
      type: n.type as any,
      position: n.position as any,
      data: (n as any).data,
      draggable: true,
    })),
    edges: project.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: "labeled",
      data: { label: e.type, showLabel: showEdgeLabels },
      sourceHandle: "out",
      targetHandle: "in",
    })),
  };
}

export function fromRF(project: Project, nodes: RFNode[], edges: RFEdge[]): Project {
  return {
    ...project,
    nodes: nodes.map((n) => {
      const original = project.nodes.find((x) => x.id === n.id);
      const type = (n.type ?? original?.type ?? "clip") as any;
      const data = (n.data ?? (original as any)?.data ?? { label: "Node" }) as any;
      return { id: n.id, type, position: n.position, data } as any;
    }),
    edges: edges.map((e) => {
      const original = project.edges.find((x) => x.id === e.id);

      // ✅ EXACT FIX from mega-file:
      // RF edge "type" is "labeled"; semantic type lives in data.label.
      const type = ((e.data as any)?.label ?? original?.type ?? "input") as any;

      return { id: e.id, type, source: e.source, target: e.target } as any;
    }),
  };
}

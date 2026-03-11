import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode } from "reactflow";

export function toRF(
  project: Project,
  showEdgeLabels: boolean
): { nodes: RFNode[]; edges: RFEdge[] } {
  return {
    nodes: project.nodes.map((n) => {
      const data = ((n as any).data ?? {}) as any;

      return {
        id: n.id,
        type: n.type as any,
        position: n.position as any,
        data,
        hidden: Boolean(data.isHidden),
        draggable: true,
      };
    }),

    edges: project.edges.map((e) => {
      const data = ((e as any).data ?? {}) as any;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "labeled",
        hidden: Boolean(data.isHidden),
        data: {
          ...data,
          label: e.type,
          showLabel: showEdgeLabels,
        },
        sourceHandle: "out",
        targetHandle: "in",
      };
    }),
  };
}

export function fromRF(project: Project, nodes: RFNode[], edges: RFEdge[]): Project {
  return {
    ...project,

    nodes: nodes.map((n) => {
      const original = project.nodes.find((x) => x.id === n.id);
      const type = (n.type ?? original?.type ?? "clip") as any;

      const baseData = (n.data ?? (original as any)?.data ?? { label: "Node" }) as any;

      const data = {
        ...baseData,
        isHidden: Boolean(baseData?.isHidden ?? n.hidden),
      };

      return {
        id: n.id,
        type,
        position: n.position,
        data,
      } as any;
    }),

    edges: edges.map((e) => {
      const original = project.edges.find((x) => x.id === e.id);
      const edgeData = ((e.data as any) ?? {}) as any;

      const type = (edgeData.label ?? original?.type ?? "input") as any;

      return {
        id: e.id,
        type,
        source: e.source,
        target: e.target,
        data: {
          ...((original as any)?.data ?? {}),
          ...edgeData,
          isHidden: Boolean(edgeData?.isHidden ?? e.hidden),
        },
      } as any;
    }),
  };
}

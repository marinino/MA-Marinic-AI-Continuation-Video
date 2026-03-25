import { useEffect, useMemo, useState } from "react";
import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode, NodeChange, EdgeChange } from "reactflow";
import { useNodesState, useEdgesState } from "reactflow";
import { toRF, fromRF } from "../graph_helpers/rfMapping";

type Args = {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;
  onAdd?: (nodeId: string) => void;
};

export function useProjectGraph({ project, onChange, showEdgeLabels, onAdd }: Args) {
  const [{ nodes: initialNodes, edges: initialEdges }] = useState(() =>
    toRF(project, showEdgeLabels)
  );

  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState(initialEdges);

  const [clickedNodeId, setClickedNodeId] = useState<string | null>(
    project.uiState?.selectedNodeId ?? null
  );

  useEffect(() => {
    const next = toRF(project, showEdgeLabels);
    setRfNodes(next.nodes);
    setRfEdges(next.edges);
  }, [project.id, showEdgeLabels, setRfNodes, setRfEdges]);

  const commit = (nodes = rfNodes, edges = rfEdges) => {
    onChange((prev) => fromRF(prev, nodes, edges));
  };

  const clickedNode = useMemo(() => {
    if (!clickedNodeId) return null;
    return rfNodes.find((n) => n.id === clickedNodeId) ?? null;
  }, [clickedNodeId, rfNodes]);

  const nodesWithRootFlag = useMemo(() => {
    const incomingTargets = new Set(rfEdges.map((e) => e.target));

    return rfNodes.map((n) => {
      const isRoot = n.type === "clip" && !incomingTargets.has(n.id);

      return {
        ...n,
        data: {
          ...(n.data as any),
          isRoot,
          onAdd: (nodeId: string) => onAdd?.(nodeId),
        },
      };
    });
  }, [rfNodes, rfEdges, onAdd]);

  return {
    rfNodes,
    rfEdges,
    setRfNodes,
    setRfEdges,
    onNodesChange: (c: NodeChange[]) => onNodesChangeRF(c),
    onEdgesChange: (c: EdgeChange[]) => onEdgesChangeRF(c),
    commit,
    clickedNodeId,
    setClickedNodeId,
    clickedNode,
    nodesWithRootFlag,
  };
}

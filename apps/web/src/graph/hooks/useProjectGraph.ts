import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project } from "@ma/shared";
import type { Edge as RFEdge, Node as RFNode, NodeChange, EdgeChange } from "reactflow";
import { useNodesState, useEdgesState } from "reactflow";
import { toRF, fromRF } from "../graph_helpers/rfMapping";

type Args = {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;
};

export function useProjectGraph({ project, onChange, showEdgeLabels }: Args) {
  const [{ nodes: initialNodes, edges: initialEdges }] = useState(() =>
    toRF(project, showEdgeLabels)
  );

  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState(initialEdges);

  const [clickedNodeId, setClickedNodeId] = useState<string | null>(
    project.uiState?.selectedNodeId ?? null
  );

  useEffect(() => {
    setRfEdges((prev) =>
      prev.map((e) => ({
        ...e,
        data: {
          ...(e.data as any),
          showLabel: showEdgeLabels,
        },
      }))
    );
  }, [showEdgeLabels, setRfEdges]);

  useEffect(() => {
    const next = toRF(project, showEdgeLabels);
    setRfNodes(next.nodes);
    setRfEdges(next.edges);
  }, [project.id]);

  const commit = useCallback(
    (nodes = rfNodes, edges = rfEdges) => {
      onChange((prev) => fromRF(prev, nodes, edges));
    },
    [onChange, rfNodes, rfEdges]
  );

  const onNodesChange = useCallback((c: NodeChange[]) => onNodesChangeRF(c), [onNodesChangeRF]);

  const onEdgesChange = useCallback((c: EdgeChange[]) => onEdgesChangeRF(c), [onEdgesChangeRF]);

  const clickedNode = useMemo(() => {
    if (!clickedNodeId) return null;
    return rfNodes.find((n) => n.id === clickedNodeId) ?? null;
  }, [clickedNodeId, rfNodes]);

  const nodesWithRootFlag = useMemo(() => {
    const incomingTargets = new Set(rfEdges.map((e) => e.target));

    return rfNodes.map((n) => {
      const isRoot = n.type === "clip" && !incomingTargets.has(n.id);
      const oldData = (n.data as any) ?? {};

      if (oldData.isRoot === isRoot) {
        return n;
      }

      return {
        ...n,
        data: {
          ...oldData,
          isRoot,
        },
      };
    });
  }, [rfNodes, rfEdges]);

  return {
    rfNodes,
    rfEdges,
    setRfNodes,
    setRfEdges,
    onNodesChange,
    onEdgesChange,
    commit,
    clickedNodeId,
    setClickedNodeId,
    clickedNode,
    nodesWithRootFlag,
  };
}

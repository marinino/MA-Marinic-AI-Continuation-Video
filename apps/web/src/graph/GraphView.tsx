import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type Edge as RFEdge,
  type Node as RFNode,
  type NodeChange,
  type EdgeChange,
  type NodeMouseHandler,
  useNodesState,
  useEdgesState,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";

import type { Project } from "@ma/shared";
import { nodeTypes } from "./nodes/nodes";
import { LabeledEdge } from "./edges/edges";
import { useReactFlow } from "reactflow";
import type { ReactFlowInstance } from "reactflow";


// MUI
import { Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography } from "@mui/material";

const edgeTypes = { labeled: LabeledEdge };

/* ---------- Project ↔ ReactFlow ---------- */

function toRF(project: Project, showEdgeLabels: boolean): { nodes: RFNode[]; edges: RFEdge[] } {
  return {
    nodes: project.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
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


function fromRF(project: Project, nodes: RFNode[], edges: RFEdge[]): Project {
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
      const type = (original?.type ?? "input") as any;
      return { id: e.id, type, source: e.source, target: e.target };
    }),
  };
}

/* ---------- Layout helpers ---------- */

function countBranches(edges: { source: string; type?: string }[], clipId: string) {
  return edges.filter((e) => e.source === clipId && (e.type === "input" || e.type === "edit_in")).length;
}

type XY = { x: number; y: number };

function isColliding(a: XY, b: XY, w = 220, h = 120, pad = 30) {
  return Math.abs(a.x - b.x) < w + pad && Math.abs(a.y - b.y) < h + pad;
}

function findFreePosition(
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






/* =========================
   GraphView
   ========================= */

export function GraphView(props: { project: Project; onChange: (p: Project) => void, showEdgeLabels: boolean}) {

  const rf = useReactFlow();

  // ✅ local ReactFlow state (the key fix)
  const [{ nodes: initialNodes, edges: initialEdges }] = useState(() =>
    toRF(props.project, props.showEdgeLabels)
  );

  const [rfNodes, setRfNodes, onNodesChangeRF] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChangeRF] = useEdgesState(initialEdges);

  const viewportKey = useMemo(() => `ma.viewport.${props.project.id}`, [props.project.id]);
  const hasRestoredRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);


  const scheduleSaveViewport = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!hasRestoredRef.current) return;
      saveViewport();
    }, 150);
  };

  const restoreViewport = () => {
    const raw = localStorage.getItem(viewportKey);
    if (!raw) return false;

    try {
      const vp = JSON.parse(raw) as Viewport;
      rf.setViewport(vp, { duration: 250 });
      return true;
    } catch {
      return false;
    }
  };

  const saveViewport = () => {
    const vp = rf.getViewport();
    console.log("SAVE", viewportKey, vp);
    localStorage.setItem(viewportKey, JSON.stringify(vp));
  };


  // Project → RF sync
  useEffect(() => {
    const next = toRF(props.project, props.showEdgeLabels);
    setRfNodes(next.nodes);
    setRfEdges(next.edges);
    setClickedNodeId(null);
    setActionDialogOpen(false);

    // Wir triggern restore/fit erst, wenn rfInstance da ist
    hasRestoredRef.current = false;
  }, [props.project.id, props.showEdgeLabels, setRfNodes, setRfEdges]);

  useEffect(() => {
    if (!pendingFocusId) return;

    // versuch ein paar frames lang, bis node existiert und Maße hat
    let tries = 0;
    let raf = 0;

    const run = () => {
      const n = rf.getNode(pendingFocusId);
      const w = (n as any)?.width;
      const h = (n as any)?.height;

      if (n && w && h) {
        rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
          zoom: rf.getViewport().zoom,
          duration: 350,
        });
        // optional: viewport speichern
        requestAnimationFrame(saveViewport);

        setPendingFocusId(null);
        return;
      }

      tries++;
      if (tries < 20) raf = requestAnimationFrame(run);
      else setPendingFocusId(null); // give up
    };

    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [pendingFocusId, rfNodes.length]); // rfNodes.length triggert wenn Node dazu kommt


  useEffect(() => {
    if (!rfInstance) return;

    // restore/fit AFTER init + after nodes are in state
    requestAnimationFrame(() => {
      const restored = restoreViewport();
      hasRestoredRef.current = true;

      if (!restored) {
        rfInstance.fitView({ padding: 0.5, duration: 200 });
        requestAnimationFrame(saveViewport);
      }
    });
  }, [rfInstance, props.project.id, rfNodes.length]); // rfNodes.length damit es nach Node-Update nochmal greift


  // show/hide edge labels without recreating edges
  useEffect(() => {
    setRfEdges((prev) =>
      prev.map((e) => ({
        ...e,
        data: { ...(e.data as any), showLabel: props.showEdgeLabels },
      }))
    );
  }, [props.showEdgeLabels, setRfEdges]);




  // commit local RF → project
  const commit = (nodes = rfNodes, edges = rfEdges) => {
    props.onChange(fromRF(props.project, nodes, edges));
  };

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);

  const clickedNode = useMemo(() => {
    if (!clickedNodeId) return null;
    return rfNodes.find((n) => n.id === clickedNodeId) ?? null;
  }, [clickedNodeId, rfNodes]);

  function focusNode(nodeId: string) {
    requestAnimationFrame(() => {
      const n = rf.getNode(nodeId);
      if (!n) return;

      // Node-Mitte (wenn width/height noch nicht da sind, fallback)
      const w = (n as any).width ?? 220;
      const h = (n as any).height ?? 120;

      rf.setCenter(n.position.x + w / 2, n.position.y + h / 2, {
        zoom: rf.getViewport().zoom, // Zoom behalten
        duration: 250,
      });
    });
  }


  const createRoot = () => {
    // Root = clip with no incoming edge
    const hasRoot = rfNodes.some((n) => {
      if (n.type !== "clip") return false;
      const hasIncoming = rfEdges.some((e) => e.target === n.id);
      return !hasIncoming;
    });

    if (hasRoot) {
      alert("There is already a root node for tis project. Create a new project if you want to start with a new root.");
      return;
    }

    const id = nanoid();     // ✅

    const rootClip: RFNode = {
      id: id,
      type: "clip",
      position: { x: 50, y: 80 },
      data: { label: "Root Clip"} as any,
      draggable: true
    };

    const nextNodes = [...rfNodes, rootClip];
    setRfNodes(nextNodes);
    commit(nextNodes, rfEdges);
    setPendingFocusId(id);
  };

  const nodesWithRootFlag = useMemo(() => {
    const incomingTargets = new Set(rfEdges.map((e) => e.target));
    return rfNodes.map((n) => {
      const isRoot = n.type === "clip" && !incomingTargets.has(n.id);

      return {
        ...n,
        data: {
          ...(n.data as any),
          isRoot,
          onAdd: (nodeId: string) => {
            setClickedNodeId(nodeId);
            setActionDialogOpen(true);
          },
        },
      };
    });
  }, [rfNodes, rfEdges, setClickedNodeId, setActionDialogOpen]);



  const onNodeClick: NodeMouseHandler = (evt, node) => {
    // falls Klick aus einem Button/Icon/Dialog kommt -> ignorieren
    const target = evt.target as HTMLElement | null;
    if (target?.closest("button, a, [role='button'], .MuiDialog-root")) return;

    if (node.type !== "clip") return;
    setClickedNodeId(node.id);
    setActionDialogOpen(true);
  };


  const addAIContinuation = (fromClipId: string) => {
    const paramId = nanoid();
    const newClipId = nanoid();

    const fromNode = rfNodes.find((n) => n.id === fromClipId);
    const baseX = fromNode?.position.x ?? 50;
    const baseY = fromNode?.position.y ?? 80;

    // IMPORTANT: use RF edges for branch counting (not project)
    const branchIndex = countBranches(rfEdges as any, fromClipId);
    const yOffset = branchIndex * 180;

    const desiredParamPos = { x: baseX + 260, y: baseY + yOffset };
    const paramPos = findFreePosition(desiredParamPos, rfNodes);

    const desiredClipPos = { x: baseX + 520, y: paramPos.y };
    const clipPos = findFreePosition(desiredClipPos, rfNodes);

    const paramNode: RFNode = {
      id: paramId,
      type: "params",
      position: paramPos,
      data: { label: "AI Params (dummy)", prompt: "continuation…", mode: "continuation"} as any,
      draggable: true
    };

    const newClipNode: RFNode = {
      id: newClipId,
      type: "clip",
      position: clipPos,
      data: { label: "New Clip (dummy)"} as any,
      draggable: true
    };

    const e1 = { id: nanoid(), type: "input" as const, source: fromClipId, target: paramId };
    const e2 = { id: nanoid(), type: "output" as const, source: paramId, target: newClipId };

    const nextNodes = [...rfNodes, paramNode, newClipNode];
    const nextEdgesProject = [...props.project.edges, e1 as any, e2 as any]; // keep schema types
    const nextEdgesRF: RFEdge[] = [
      ...rfEdges,
      {
        id: e1.id,
        source: e1.source,
        target: e1.target,
        type: "labeled",
        data: { label: e1.type, showLabel: props.showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      },
      {
        id: e2.id,
        source: e2.source,
        target: e2.target,
        type: "labeled",
        data: { label: e2.type, showLabel: props.showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      },
    ];

    setRfNodes(nextNodes);
    setRfEdges(nextEdgesRF);
    // commit using fromRF to keep your project schema in sync
    props.onChange({
      ...props.project,
      nodes: fromRF(props.project, nextNodes, nextEdgesRF).nodes,
      edges: nextEdgesProject,
      uiState: { ...props.project.uiState, selectedNodeId: newClipId },
    });
    setPendingFocusId(newClipId);
  };

  const addManualEdit = (fromClipId: string) => {
    const editId = nanoid();
    const newClipId = nanoid();

    const fromNode = rfNodes.find((n) => n.id === fromClipId);
    const baseX = fromNode?.position.x ?? 50;
    const baseY = fromNode?.position.y ?? 80;

    const branchIndex = countBranches(rfEdges as any, fromClipId);
    const yOffset = branchIndex * 180;

    const desiredEditPos = { x: baseX + 260, y: baseY + yOffset };
    const editPos = findFreePosition(desiredEditPos, rfNodes);

    const desiredClipPos = { x: baseX + 520, y: editPos.y };
    const clipPos = findFreePosition(desiredClipPos, rfNodes);

    const editNode: RFNode = {
      id: editId,
      type: "edit",
      position: editPos,
      data: { label: "Edit (dummy)", tool: "manual", notes: ""} as any,
      draggable: true
    };

    const newClipNode: RFNode = {
      id: newClipId,
      type: "clip",
      position: clipPos,
      data: { label: "New Clip (dummy)"} as any,
      draggable: true
    };

    // Keep your edge semantics:
    const e1 = { id: nanoid(), type: "edit_in" as const, source: fromClipId, target: editId };
    const e2 = { id: nanoid(), type: "edit_out" as const, source: editId, target: newClipId };

    const nextNodes = [...rfNodes, editNode, newClipNode];
    const nextEdgesProject = [...props.project.edges, e1 as any, e2 as any];
    const nextEdgesRF: RFEdge[] = [
      ...rfEdges,
      {
        id: e1.id,
        source: e1.source,
        target: e1.target,
        type: "labeled",
        data: { label: e1.type, showLabel: props.showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      },
      {
        id: e2.id,
        source: e2.source,
        target: e2.target,
        type: "labeled",
        data: { label: e2.type, showLabel: props.showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      },
    ];

    setRfNodes(nextNodes);
    setRfEdges(nextEdgesRF);
    props.onChange({
      ...props.project,
      nodes: fromRF(props.project, nextNodes, nextEdgesRF).nodes,
      edges: nextEdgesProject,
      uiState: { ...props.project.uiState, selectedNodeId: newClipId },
    });

    
    setPendingFocusId(newClipId);

  };

  // ✅ Let ReactFlow update local state; commit to project on drag stop
  const onNodesChange = (changes: NodeChange[]) => {
    onNodesChangeRF(changes);
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    onEdgesChangeRF(changes);
  };

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Paper
        elevation={2}
        style={{ position: "absolute", zIndex: 10, top: 12, left: 12, padding: 8, display: "flex", gap: 8 }}
      >
        <Button variant="contained" onClick={createRoot}>
          Start Root
        </Button>
      </Paper>

      <ReactFlow
        onInit={(instance) => setRfInstance(instance)}
        nodes={nodesWithRootFlag}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={true}
        // ❌ fitView raus!
        // ❌ fitViewOptions raus!
        panOnDrag={[1, 2]}
        zoomOnScroll
        deleteKeyCode={null}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={() => {
          commit();
          requestAnimationFrame(saveViewport);
        }}
        onMove={scheduleSaveViewport}
        onMoveEnd={() => {
          if (!hasRestoredRef.current) return;
          saveViewport();
        }}
      >
        <Background />
        <Controls />
      </ReactFlow>


      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Next step</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Selected clip:
          </Typography>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            {clickedNode?.type === "clip" ? (clickedNode.data as any)?.label : "(none)"}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Choose what you want to do. (Dummy nodes for now.)
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
          <Stack direction="row" spacing={1} sx={{ pr: 1 }}>
            <Button
              variant="outlined"
              onClick={() => {
                if (clickedNodeId) addManualEdit(clickedNodeId);
                setActionDialogOpen(false);
              }}
            >
              Manual edit
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                if (clickedNodeId) addAIContinuation(clickedNodeId);
                setActionDialogOpen(false);
              }}
            >
              AI continuation
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </div>
  );
}

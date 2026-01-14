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

import type { Project, StoredMediaFile } from "@ma/shared";
import { nodeTypes } from "./nodes/nodes";
import { LabeledEdge } from "./edges/edges";
import { useReactFlow } from "reactflow";
import type { ReactFlowInstance } from "reactflow";


// MUI
import { Button, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Stack, Typography, LinearProgress, TextField } from "@mui/material";
import { comfyBuildVideoUrl, comfyFindVideoFromHistory, comfyGetHistory, comfyStartV2V, comfyStartVideo } from "../api";

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
  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [rootPrompt, setRootPrompt] = useState("");
  const [creatingVideo, setCreatingVideo] = useState(false);
  const [createStatus, setCreateStatus] = useState<string>("");
  const [createdVideoUrl, setCreatedVideoUrl] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const promptIdRef = useRef<string | null>(null);

  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipPrompt, setClipPrompt] = useState("");
  const [clipGenerating, setClipGenerating] = useState(false);
  const [clipStatus, setClipStatus] = useState("");
  const [clipPreviewUrl, setClipPreviewUrl] = useState<string | null>(null);

  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [activeParamId, setActiveParamId] = useState<string | null>(null);







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

  const clickedVideoUrl =
    (clickedNode?.data as any)?.videoUrl ??
    (((clickedNode?.data as any)?.videoFile)
      ? comfyBuildVideoUrl((clickedNode?.data as any).videoFile)
      : null);

  const clickedVideoFile =
    ((clickedNode?.data as any)?.videoFile as StoredMediaFile | null) ?? null;

  const clickedVideoStatus =
    (clickedNode?.data as any)?.videoStatus as string | undefined;

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

  function updateNodeData(nodeId: string, patch: Record<string, any>) {
    setRfNodes((prev) => {
      const next = prev.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...(n.data as any), ...patch } }
          : n
      );

      // Wichtig: direkt committen, damit es auch im Project persistiert
      commit(next, rfEdges);
      return next;
    });
  }


  const createRoot = () => {
    const hasRoot = rfNodes.some((n) => {
      if (n.type !== "clip") return false;
      const hasIncoming = rfEdges.some((e) => e.target === n.id);
      return !hasIncoming;
    });

    if (hasRoot) {
      alert("There is already a root node for this project. Create a new project if you want to start with a new root.");
      return;
    }

    setCreatedVideoUrl(null);
    setCreateStatus("");
    setRootPrompt("");
    setRootDialogOpen(true);
  };

  function pickMediaFile(output: any) {
    const candidate =
      output?.images?.[0] ??
      output?.videos?.[0] ??
      output?.gifs?.[0];

    if (!candidate?.filename) return null;

    return {
      filename: candidate.filename,
      subfolder: candidate.subfolder ?? "video",
      type: candidate.type ?? "output",
    };
  }


  async function handleCreateRootVideo() {
    if (!rootPrompt.trim()) return;

    setCreatingVideo(true);
    setCreateStatus("Starting workflow…");
    setCreatedVideoUrl(null);

    try {
      // Root Node erzeugen (wie du es schon machst)
      const id = nanoid();
      const rootClip: RFNode = {
        id,
        type: "clip",
        position: { x: 50, y: 80 },
        data: { label: "Root Clip" } as any,
        draggable: true,
      };
      const nextNodes = [...rfNodes, rootClip];
      setRfNodes(nextNodes);
      commit(nextNodes, rfEdges);
      setPendingFocusId(id);

      // Start Comfy job
      const { prompt_id, client_id } = await comfyStartVideo({ text: rootPrompt });
      promptIdRef.current = prompt_id;

      setCreateStatus("Generating…");
      updateNodeData(id, { videoStatus: "generating", videoUrl: null, videoFile: null });

      // WS connect
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}/api/comfy/ws?clientId=${client_id}`);
      wsRef.current = ws;
      
      const timeout = window.setTimeout(() => {
        ws.close();
        wsRef.current = null;
        timeoutRef.current = null;
        setCreateStatus("Timeout waiting for websocket events.");
        setCreatingVideo(false);
      }, 10 * 60 * 1000);


      timeoutRef.current = timeout;

      ws.onmessage = async (evt) => {
        console.log("WS RAW:", evt.data);  // <-- wichtig
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }


        // status updates (optional)
        if (msg?.type === "status") {
          // kannst du anzeigen, wenn du willst
          return;
        }

        // node output event
        if (msg?.type === "executed") {
          // prompt filter (robust)
          if (promptIdRef.current && msg?.data?.prompt_id && msg.data.prompt_id !== promptIdRef.current) return;

          // SaveVideo node id = "123"
          if (String(msg?.data?.node ?? msg?.data?.display_node) === "123") {
            const file = pickMediaFile(msg?.data?.output);
            if (!file) {
              console.warn("No media file in executed output:", msg?.data?.output);
              setCreateStatus("Done, but no output file found.");
              clearTimeout(timeout);
              ws.close();
              setCreatingVideo(false);
              return;
            }

            const url = comfyBuildVideoUrl(file);
            setCreatedVideoUrl(url);
            setCreateStatus("Done ✅");

            if (id) {
              updateNodeData(id, {
                videoFile: file,
                videoUrl: url,
                videoStatus: "done",
              });
            }

            clearTimeout(timeout);
            ws.close();
            setCreatingVideo(false);
            setRootDialogOpen(false)
          }
        }


        if (msg?.type === "execution_error") {
          clearTimeout(timeout);
          ws.close();
          setCreateStatus("Execution error (see console).");
          console.error(msg);
          setCreatingVideo(false);
        }

        // safety fallback: wenn success kommt, aber kein executed(14) abgefangen wurde
        if (msg?.type === "execution_success") {
          // FALLBACK: history holen und video suchen
          setCreateStatus("Finalizing…");

          try {
            if (!prompt_id) return;

            const history = await comfyGetHistory(prompt_id); // oder comfyGetHistory(currentPrompt) je nach deiner API
            const file = comfyFindVideoFromHistory(history, prompt_id); // muss dir file {filename, subfolder, type} liefern

            if (file) {
              const url = comfyBuildVideoUrl(file);
              setCreatedVideoUrl(url);
              setCreateStatus("Done ✅");

              if (id) {
                updateNodeData(id, {
                  videoFile: file,
                  videoUrl: url,
                  videoStatus: "done",
                });
              }
            } else {
              setCreateStatus("Done ✅ (but no output found in history)");
            }
          } catch (e) {
            console.error(e);
            setCreateStatus("Done ✅ (but history lookup failed)");
          } finally {
            clearTimeout(timeout);
            ws.close();
            setCreatingVideo(false);
          }
        }
      };

      ws.onerror = (e) => {
        clearTimeout(timeout);
        ws.close();
        wsRef.current = null;
        setCreateStatus("WebSocket error.");
        console.error(e);
        setCreatingVideo(false);
      };

    } catch (e: any) {
      setCreateStatus(`Error: ${e?.message ?? String(e)}`);
      setCreatingVideo(false);
    }
  }




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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
  }, []);

  function getNodeVideoFile(nodeId: string): StoredMediaFile | null {
    const n = rfNodes.find((x) => x.id === nodeId);
    return ((n?.data as any)?.videoFile as StoredMediaFile | null) ?? null;
  }

  const addAIGenerateFromParent = (fromClipId: string) => {
    const paramId = nanoid();
    const newClipId = nanoid();

    const fromNode = rfNodes.find((n) => n.id === fromClipId);
    const baseX = fromNode?.position.x ?? 50;
    const baseY = fromNode?.position.y ?? 80;

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
      data: {
        label: "V2V Params",
        prompt: "",
        mode: "v2v",          // ✅ wichtig: unterscheidet sich von continuation
        parentClipId: fromClipId, // ✅ damit du später Parent Video findest
      } as any,
      draggable: true,
    };

    const newClipNode: RFNode = {
      id: newClipId,
      type: "clip",
      position: clipPos,
      data: { label: "Generated Clip" } as any,
      draggable: true,
    };

    const e1 = { id: nanoid(), type: "input" as const, source: fromClipId, target: paramId };
    const e2 = { id: nanoid(), type: "output" as const, source: paramId, target: newClipId };

    const nextNodes = [...rfNodes, paramNode, newClipNode];
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

    // ✅ Optional: direkt Dialog öffnen und merken, welche Nodes dazugehören
    setActiveParamId(paramId);
    setActiveClipId(newClipId);
    
    setClipPrompt("");        // ✅ fehlt bei dir
    setClipStatus("");
    setClipPreviewUrl(null);

    setClipDialogOpen(true);

  };


  async function handleGenerateClipVideo() {
    if (!activeClipId || !activeParamId) return;

    const paramNode = rfNodes.find((n) => n.id === activeParamId);
    const parentId = (paramNode?.data as any)?.parentClipId as string | undefined;

    if (!parentId) {
      setClipStatus("Missing parentClipId on params node.");
      return;
    }

    const parentFile = getNodeVideoFile(parentId);
    if (!parentFile) {
      setClipStatus("Parent clip has no video yet.");
      return;
    }

    if (!clipPrompt.trim()) return;

      setClipGenerating(true);
      setClipStatus("Starting workflow…");
      setClipPreviewUrl(null);

      try {
        updateNodeData(activeClipId, { videoStatus: "generating", videoUrl: null, videoFile: null });

        const { prompt_id, client_id } = await comfyStartV2V({
          text: clipPrompt,
          videoFile: parentFile,
        });
        promptIdRef.current = prompt_id;

        setClipStatus("Generating…");

        const proto = window.location.protocol === "https:" ? "wss" : "ws";
        const ws = new WebSocket(`${proto}://${window.location.host}/api/comfy/ws?clientId=${client_id}`);
        wsRef.current = ws;

        const timeout = window.setTimeout(() => {
          ws.close();
          wsRef.current = null;
          timeoutRef.current = null;
          setClipStatus("Timeout waiting for websocket events.");
          setClipGenerating(false);
        }, 10 * 60 * 1000);

        timeoutRef.current = timeout;

        ws.onmessage = async (evt) => {
          console.log("WS RAW:", evt.data);  // <-- wichtig
          let msg: any;
          try { msg = JSON.parse(evt.data); } catch { return; }

          if (msg?.type === "executed") {
            if (promptIdRef.current && msg?.data?.prompt_id && msg.data.prompt_id !== promptIdRef.current) return;

            // ✅ v2v SaveVideo node = "123"
            if (String(msg?.data?.node ?? msg?.data?.display_node) === "123") {
              const file = pickMediaFile(msg?.data?.output);
              if (!file) {
                setClipStatus("Done, but no output file found.");
                clearTimeout(timeout);
                ws.close();
                setClipGenerating(false);
                return;
              }

              const url = comfyBuildVideoUrl(file);
              setClipPreviewUrl(url);
              setClipStatus("Done ✅");

              updateNodeData(activeClipId, {
                videoFile: file,
                videoUrl: url,
                videoStatus: "done",
              });

              clearTimeout(timeout);
              ws.close();
              setClipGenerating(false);
              return;
            }
          }

          if (msg?.type === "execution_error") {
            clearTimeout(timeout);
            ws.close();
            setClipStatus("Execution error (see console).");
            console.error(msg);
            setClipGenerating(false);
          }

          if (msg?.type === "execution_success") {
            // fallback wie bei root: history holen
            setClipStatus("Finalizing…");
            try {
              const history = await comfyGetHistory(prompt_id);
              const file = comfyFindVideoFromHistory(history, prompt_id);
              if (file) {
                const url = comfyBuildVideoUrl(file);
                setClipPreviewUrl(url);
                setClipStatus("Done ✅");
                updateNodeData(activeClipId, { videoFile: file, videoUrl: url, videoStatus: "done" });
              } else {
                setClipStatus("Done ✅ (but no output found in history)");
              }
            } finally {
              clearTimeout(timeout);
              ws.close();
              setClipGenerating(false);
            }
          }
        };

        ws.onerror = (e) => {
          clearTimeout(timeout);
          ws.close();
          setClipStatus("WebSocket error.");
          console.error(e);
          setClipGenerating(false);
        };
      } catch (e: any) {
        setClipStatus(`Error: ${e?.message ?? String(e)}`);
        setClipGenerating(false);
      }
    }



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
                if (clickedNodeId) addAIGenerateFromParent(clickedNodeId);
                setActionDialogOpen(false);
              }}
              disabled={!clickedNodeId || !getNodeVideoFile(clickedNodeId)}
            >
              Generate Clip (V2V)
            </Button>

          </Stack>
        </DialogActions>
      </Dialog>

      <Dialog open={rootDialogOpen} onClose={() => !creatingVideo && setRootDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Root – Positive Prompt</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Positive prompt"
              value={rootPrompt}
              onChange={(e) => setRootPrompt(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              placeholder="Describe the video you want…"
              disabled={creatingVideo}
            />

            {creatingVideo && <LinearProgress />}

            {createStatus && (
              <Typography variant="body2" color="text.secondary">
                {createStatus}
              </Typography>
            )}

            {createdVideoUrl && (
              <video
                src={createdVideoUrl}
                controls
                style={{ width: "100%", borderRadius: 8 }}
              />
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              wsRef.current?.close();
              wsRef.current = null;

              if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
              timeoutRef.current = null;

              setCreatingVideo(false);
              setCreateStatus("Cancelled");
              setRootDialogOpen(false);
            }}
            disabled={creatingVideo}
          >
            Close
          </Button>


          <Button
            variant="contained"
            onClick={handleCreateRootVideo}
            disabled={creatingVideo || !rootPrompt.trim()}
          >
            {creatingVideo ? "Working…" : "Create Video"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={clipDialogOpen}
        onClose={() => !clipGenerating && setClipDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Clip – Prompt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Prompt"
              value={clipPrompt}
              onChange={(e) => setClipPrompt(e.target.value)}
              multiline
              minRows={4}
              fullWidth
              disabled={clipGenerating}
            />

            {clipGenerating && <LinearProgress />}

            {clipStatus && (
              <Typography variant="body2" color="text.secondary">
                {clipStatus}
              </Typography>
            )}

            {clipPreviewUrl && (
              <video src={clipPreviewUrl} controls style={{ width: "100%", borderRadius: 8 }} />
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              wsRef.current?.close();
              wsRef.current = null;
              if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
              timeoutRef.current = null;

              setClipGenerating(false);
              setClipDialogOpen(false);
            }}
            disabled={clipGenerating}
          >
            Close
          </Button>

          <Button
            variant="contained"
            onClick={handleGenerateClipVideo}
            disabled={clipGenerating || !clipPrompt.trim()}
          >
            {clipGenerating ? "Working…" : "Generate Video"}
          </Button>
        </DialogActions>
      </Dialog>


    </div>
  );
}

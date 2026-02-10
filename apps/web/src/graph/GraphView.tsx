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
import {
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  LinearProgress,
  TextField,
  Tabs,
  Tab,
  Box,
  Tooltip,
} from "@mui/material";
import {
  comfyBuildVideoUrl,
  comfyFindVideoFromHistory,
  comfyGetHistory,
  comfyStartV2V,
  comfyStartVideo,
  comfyUploadVideo,
  openInResolve,
  openTimelineInResolve,
  resolveExportTimeline,
  uploadTimelineFile,
} from "../api";

import { Job } from "../jobs/types";

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

      // ✅ HIER IST DER FIX:
    const type =
      ((e.data as any)?.label ??
        original?.type ??
        "input") as any;


      return { id: e.id, type, source: e.source, target: e.target };
    }),
  };
}


/* ---------- Layout helpers ---------- */

function countBranches(edges: { source: string; type?: string }[], clipId: string) {
  return edges.filter((e) => e.source === clipId && (e.type === "input" || e.type === "edit_in"))
    .length;
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

export function GraphView(props: {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;
}) {
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
  const [clipGenerating, setClipGenerating] = useState(false);
  const [clipStatus, setClipStatus] = useState("");
  const [clipPreviewUrl, setClipPreviewUrl] = useState<string | null>(null);

  const [pendingRootPos] = useState({ x: 50, y: 80 }); // oder dynamisch

  const [v2vParentClipId, setV2vParentClipId] = useState<string | null>(null);
  const [v2vPrompt, setV2vPrompt] = useState("");
  const [highNoiseCfg, setHighNoiseCfg] = useState(1);
  const [lowNoiseCfg, setLowNoiseCfg] = useState(1);
  const [highNoiseModelStrength, setHighNoiseModelStrength] = useState(1);
  const [lowNoiseModelStrength, setLowNoiseModelStrength] = useState(1);
  const [highNoiseShift, setHighNoiseShift] = useState(5);
  const [lowNoiseShift, setLowNoiseShift] = useState(5);
  const [highNoiseSteps, setHighNoiseSteps] = useState(4);
  const [lowNoiseSteps, setLowNoiseSteps] = useState(4);
  const [highNoiseStartStep, setHighNoiseStartStep] = useState(0);
  const [lowNoiseStartStep, setLowNoiseStartStep] = useState(2);
  const [highNoiseEndStep, setHighNoiseEndStep] = useState(2);
  const [lowNoiseEndStep, setLowNoiseEndStep] = useState(4);

  const [rootMode, setRootMode] = useState<"generate" | "upload">("generate");
  const [rootUploadFile, setRootUploadFile] = useState<File | null>(null);
  const [rootUploadStatus, setRootUploadStatus] = useState("");
  const [rootUploading, setRootUploading] = useState(false);

  const [namingConventionInfoOpen, setNamingConventionInfoOpen] = useState(false);
  const [namingConventionName, setNamingConventionName] = useState("");




  const [daVinciActionDalogOpen, setDaVinciActionDalogOpen] = useState(false)

  const rfEdgesRef = useRef<RFEdge[]>([]);
  useEffect(() => {
    rfEdgesRef.current = rfEdges;
  }, [rfEdges]);


  const rfNodesRef = useRef<RFNode[]>([]);
  useEffect(() => {
    rfNodesRef.current = rfNodes;
  }, [rfNodes]);


  const [jobsOpen, setJobsOpen] = useState(false);

  type GenState = "idle" | "running" | "error";

  const [genState, setGenState] = useState<GenState>("idle");

  const [jobs, setJobs] = useState<Job[]>([]);

  const [timeLineUploadOpen, setTimeLineImportOpen] = useState(false);
  const [uploadedTimeLineFile, setUploadedTimeLineFile] = useState<File | null>(null);
  const [editedVideoUploadFile, setEditedVideoUploadFile] = useState<File | null>(null);



  const davinciContextEditIdRef = useRef<string | null>(null);


  type ManualEditDraft = {
    fromClipId: string;
    expectedBasename: string;
  };

  const [manualEditDraft, setManualEditDraft] = useState<ManualEditDraft | null>(null);



  const jobsRef = useRef<Job[]>([]);
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  const wsMapRef = useRef(new Map<string, WebSocket>());
  const activeJobId = useMemo(
    () =>
      jobs.find(
        (j) => j.status === "connecting" || j.status === "running" || j.status === "finalizing"
      )?.id ?? null,
    [jobs]
  );

  useEffect(() => {
    const sel = props.project.uiState?.selectedNodeId ?? null;
    setClickedNodeId(sel);
  }, [props.project.uiState?.selectedNodeId]);



  const anyBusy = useMemo(
    () =>
      jobs.some(
        (j) =>
          j.status === "queued" ||
          j.status === "connecting" ||
          j.status === "running" ||
          j.status === "finalizing"
      ),
    [jobs]
  );

  const state: GenState = jobs.some((j) => j.status === "error")
    ? "error"
    : anyBusy
      ? "running"
      : "idle";

  function StatusDot({ state }: { state: "idle" | "running" | "error" }) {
    const color =
      state === "idle" ? "success.main" : state === "running" ? "warning.main" : "error.main";

    const label = state === "idle" ? "Ready" : state === "running" ? "Generating…" : "Error";

    return (
      <Tooltip title={label} arrow>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "999px",
            bgcolor: color,
            boxShadow: 1,
            // optional: pulsiert nur wenn running
            ...(state === "running"
              ? {
                  animation: "pulse 1.2s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%": { transform: "scale(1)", opacity: 0.9 },
                    "50%": { transform: "scale(1.35)", opacity: 0.6 },
                    "100%": { transform: "scale(1)", opacity: 0.9 },
                  },
                }
              : {}),
          }}
        />
      </Tooltip>
    );
  }

  const scheduleSaveViewport = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!hasRestoredRef.current) return;
      saveViewport();
    }, 150);
  };

  function findEditNodeIdForClipProject(project: Project, clipId: string): string | null {
    const incomingFromEdit = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
    if (incomingFromEdit) return incomingFromEdit.source;

    const outgoingToEdit = project.edges.find((e) => e.source === clipId && e.type === "edit_in");
    if (outgoingToEdit) return outgoingToEdit.target;

    return null;
  }

  function findOutClipIdForEditProject(project: Project, editId: string): string | null {
    const out = project.edges.find((e) => e.source === editId && e.type === "edit_out");
    return out?.target ?? null;
  }

  function getSelectedClipId(project: Project): string | null {
    return project.uiState?.selectedNodeId ?? null;
  }

  function getEditIdForSelectedClip(project: Project): string | null {
    const clipId = getSelectedClipId(project);
    if (!clipId) return null;
    return findEditNodeIdForClipProject(project, clipId);
  }


  function buildTimelineDownloadUrl(projectId: string, storedTimelineFilename: string) {
    // muss zu deinem Backend passen; Beispiel:
    // GET /api/projects/:projectId/timelines/:filename
    return `${window.location.origin}/api/projects/${projectId}/timelines/${encodeURIComponent(
      storedTimelineFilename
    )}`;
  }


  useEffect(() => {
    if (activeJobId) return;

    const next = jobs.find((j) => j.status === "queued");
    if (!next) return;

    startJob(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, activeJobId]);

  async function startJob(jobId: string) {
    // mark connecting
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: "connecting", progressText: "Starting…" } : j
      )
    );

    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) return;

    try {
      const { prompt_id, client_id } = await job.startPayload();

      // store prompt+client
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                promptId: prompt_id,
                clientId: client_id,
                status: "running",
                progressText: "Generating…",
              }
            : j
        )
      );

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${window.location.host}/api/comfy/ws?clientId=${client_id}`
      );

      wsMapRef.current.set(jobId, ws);

      const timeout = window.setTimeout(
        () => {
          ws.close();
          wsMapRef.current.delete(jobId);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: "error",
                    progressText: "Timeout waiting for websocket events.",
                  }
                : j
            )
          );
        },
        100 * 60 * 100000
      );

      const finalizeSuccess = (file: StoredMediaFile) => {
        window.clearTimeout(timeout);

        const previewUrl = comfyBuildVideoUrl(file);

        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "done",
                  progressText: "Done ✅",
                  file,
                  previewUrl,
                }
              : j
          )
        );

        ws.close();
        wsMapRef.current.delete(jobId);

        // callback: create nodes, commit, focus etc.
        const latest = jobsRef.current.find((j) => j.id === jobId);
        latest?.onSuccess?.(file);
      };

      ws.onmessage = async (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }

        // optional: set progress text if comfy sends it
        // setJobs(prev => prev.map(j => j.id === jobId ? { ...j, progressText: msg?.type ?? j.progressText } : j));

        if (msg?.type === "executed") {
          // IMPORTANT: filter to this job's prompt_id
          if (msg?.data?.prompt_id && msg.data.prompt_id !== prompt_id) return;

          if (String(msg?.data?.node ?? msg?.data?.display_node) === "123") {
            const file = pickMediaFile(msg?.data?.output);
            if (file) finalizeSuccess(file);
          }
        }

        if (msg?.type === "execution_error") {
          window.clearTimeout(timeout);
          ws.close();
          wsMapRef.current.delete(jobId);

          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    status: "error",
                    progressText: "Execution error (see console).",
                  }
                : j
            )
          );
          console.error(msg);
          job.onError?.(msg);
        }

        if (msg?.type === "execution_success") {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "finalizing", progressText: "Finalizing…" } : j
            )
          );

          try {
            const history = await comfyGetHistory(prompt_id);
            const file = comfyFindVideoFromHistory(history, prompt_id);
            if (file) finalizeSuccess(file);
            else {
              window.clearTimeout(timeout);
              ws.close();
              wsMapRef.current.delete(jobId);
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId
                    ? { ...j, status: "done", progressText: "Done ✅ (no output found in history)" }
                    : j
                )
              );
            }
          } catch (e) {
            window.clearTimeout(timeout);
            ws.close();
            wsMapRef.current.delete(jobId);
            setJobs((prev) =>
              prev.map((j) =>
                j.id === jobId
                  ? { ...j, status: "done", progressText: "Done ✅ (history lookup failed)" }
                  : j
              )
            );
          }
        }
      };

      ws.onerror = (e) => {
        window.clearTimeout(timeout);
        ws.close();
        wsMapRef.current.delete(jobId);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "error", progressText: "WebSocket error." } : j
          )
        );
        console.error(e);
      };
    } catch (e) {
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: "error", progressText: `Error: ${String((e as any)?.message ?? e)}` }
            : j
        )
      );
      job.onError?.(e);
    }
  }



 







  function resolveEditIdForClipId(clipId: string): string | null {
  // 1) Best case: edited clip kennt seinen edit
  const clip = props.project.nodes.find((n) => n.id === clipId) as any;
  const direct = clip?.data?.producedByEditId ?? null;
  if (direct) return direct;

  // 2) Fallback: über edges (reload-safe)
  const inc = props.project.edges.find((e) => e.target === clipId && e.type === "edit_out");
  if (inc) return inc.source;

  const out = props.project.edges.find((e) => e.source === clipId && e.type === "edit_in");
  if (out) return out.target;

  return null;
}

function timelineUrl(projectId: string, filename: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/timelines/${encodeURIComponent(filename)}`;
}


function requireTimelineFromContext(): { stored: string; url: string } | null {
  const editId = getCurrentEditId();

  if (!editId) {
    alert("No edit context selected. Select an edited clip or the edit node first.");
    return null;
  }

  const prNode = props.project.nodes.find((n) => n.id === editId) as any;

  const stored =
    prNode?.data?.timeline?.storedTimelineFilename ?? null;

  if (!stored) {
    alert("No timeline file found in this edit node. Upload a timeline first.");
    return null;
  }

  const url = `${window.location.origin}${timelineUrl(props.project.id, stored)}`;
  return { stored, url };
}





async function copyTimelineFileURL() {
  const ctx = requireTimelineFromContext();
  if (!ctx) return;
  try {
    await navigator.clipboard.writeText(ctx.url);
  } catch {
    window.prompt("Copy this URL:", ctx.url);
  }
}

function downloadTImelineFile(projectId: string) {
  const ctx = requireTimelineFromContext();
  if (!ctx) return;
  window.open(timelineUrl(projectId, ctx.stored), "_blank", "noopener,noreferrer");
}

async function openTimelineFileInDavinciBackend() {
  const ctx = requireTimelineFromContext();
  if (!ctx) return;

  try {
    const res = await openTimelineInResolve(props.project.id, ctx.stored);
    if (res && "ok" in res && !res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Open failed (${res.status}): ${txt || res.statusText}`);
    }
  } catch (e: any) {
    console.error(e);
    alert("Could not open timeline in Resolve: " + (e?.message ?? String(e)));
  }
}


function getCurrentEditId(): string | null {
  const sel = props.project.uiState?.selectedNodeId ?? null;
  if (!sel) return null;

  // Falls der selected Node selbst ein edit ist
  const selNode = props.project.nodes.find((n) => n.id === sel) as any;
  if (selNode?.type === "edit") return sel;

  // Falls selected Node ein Clip ist: finde zugehörigen Edit über persisted Daten
  if (selNode?.type === "clip") {
    return resolveEditIdForClipId(sel);
  }

  return null;
}






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

  useEffect(() => {
    wsRef.current?.close();
    wsRef.current = null;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;

    promptIdRef.current = null;

    setCreatingVideo(false);
    setClipGenerating(false);
    setRootDialogOpen(false);
    setClipDialogOpen(false);
  }, [props.project.id]);

  // commit local RF → project
  const commit = (nodes = rfNodes, edges = rfEdges) => {
    props.onChange((prev) => fromRF(prev, nodes, edges));
  };

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);

  const clickedNode = useMemo(() => {
    if (!clickedNodeId) return null;
    return rfNodes.find((n) => n.id === clickedNodeId) ?? null;
  }, [clickedNodeId, rfNodes]);

  const createRoot = () => {
    const hasRoot = rfNodes.some((n) => {
      if (n.type !== "clip") return false;
      const hasIncoming = rfEdges.some((e) => e.target === n.id);
      return !hasIncoming;
    });

    if (hasRoot) {
      alert(
        "There is already a root node for this project. Create a new project if you want to start with a new root."
      );
      return;
    }

    setCreatedVideoUrl(null);
    setCreateStatus("");
    setRootPrompt("");
    setRootDialogOpen(true);
  };

  function pickMediaFile(output: any) {
    const candidate = output?.images?.[0] ?? output?.videos?.[0] ?? output?.gifs?.[0];

    if (!candidate?.filename) return null;

    return {
      filename: candidate.filename,
      subfolder: candidate.subfolder ?? "video",
      type: candidate.type ?? "output",
    };
  }

  async function handleUploadRootVideo() {
    if (!rootUploadFile) return;

    setRootUploading(true);
    setRootUploadStatus("Uploading…");

    try {
      const stored = await comfyUploadVideo(rootUploadFile);

      // preview URL: entweder lokal oder über comfy/view
      // lokal (sofort):
      const localUrl = URL.createObjectURL(rootUploadFile);
      setCreatedVideoUrl(localUrl);
      setCreateStatus("Uploaded ✅");

      // Root Node erzeugen (ohne Comfy job)
      const id = nanoid();
      const rootClip: RFNode = {
        id,
        type: "clip",
        position: pendingRootPos,
        data: {
          label: "Root Clip",
          videoFile: stored,
          videoStatus: "done",
        } as any,
        draggable: true,
      };

      setRfNodes((prevNodes) => {
        const nextNodes = [...prevNodes, rootClip];
        setRfEdges((prevEdges) => {
          commit(nextNodes, prevEdges);
          return prevEdges;
        });
        return nextNodes;
      });

      setPendingFocusId(id);
      setRootUploading(false);
      setRootDialogOpen(false);
    } catch (e: any) {
      setRootUploadStatus(`Error: ${e?.message ?? String(e)}`);
      setRootUploading(false);
    }
  }

  async function importResolveMetaIntoEdit(editNodeId: string) {
    const timelineJson = await resolveExportTimeline();

    setRfNodes((prevNodes) => {
      const nextNodes = prevNodes.map((n) => {
        if (n.id !== editNodeId) return n;

        const oldData = (n.data as any) ?? {};
        return {
          ...n,
          data: {
            ...oldData,
            meta: {
              ...(oldData.meta ?? {}),
              resolveTimeline: timelineJson,
              importedAt: new Date().toISOString(),
              error: null,
            },
            export: { ...(oldData.export ?? {}), status: "imported" },
          },
        };
      });

      props.onChange((prevProject) =>
        fromRF(prevProject, nextNodes as any, rfEdgesRef.current as any)
      );
      return nextNodes;
    });
  }

  function enqueueRootJob() {
    if (!rootPrompt.trim()) return;

    const jobId = nanoid();
    const prompt = rootPrompt;

    setJobs((prev) => [
      {
        id: jobId,
        kind: "t2v_root",
        createdAt: Date.now(),
        status: prev.some((j) => ["connecting", "running", "finalizing"].includes(j.status))
          ? "queued"
          : "queued",
        label: `Root: ${prompt.slice(0, 30)}${prompt.length > 30 ? "…" : ""}`,
        startPayload: () => comfyStartVideo({ text: prompt }),
        onSuccess: (file) => {
          const id = nanoid();
          const rootClip: RFNode = {
            id,
            type: "clip",
            position: pendingRootPos,
            data: {
              label: "Root Clip",
              videoFile: file,
              videoStatus: "done",
            } as any,
            draggable: true,
          };

          setRfNodes((prevNodes) => {
            const nextNodes = [...prevNodes, rootClip];

            setRfEdges((prevEdges) => {
              commit(nextNodes, prevEdges);
              return prevEdges;
            });

            return nextNodes;
          });

          setPendingFocusId(id);
          setRootDialogOpen(false);
        },
      },
      ...prev,
    ]);
  }

  function enqueueExtendJob() {
    if (!v2vParentClipId) return;
    if (!v2vPrompt.trim()) return;

    const parentFile = getNodeVideoFile(v2vParentClipId);
    if (!parentFile) {
      setClipStatus("Parent clip has no video yet.");
      return;
    }

    const jobId = nanoid();
    const prompt = v2vPrompt;

    // capture all params NOW (wichtig, falls user danach slider ändert)
    const payload = {
      text: prompt,
      videoFile: parentFile,
      highNoiseCfg,
      lowNoiseCfg,
      highNoiseModelStrength,
      lowNoiseModelStrength,
      highNoiseShift,
      lowNoiseShift,
      highNoiseSteps,
      lowNoiseSteps,
      highNoiseStartStep,
      lowNoiseStartStep,
      highNoiseEndStep,
      lowNoiseEndStep,
    };

    const { videoFile: _parentVideoFile, ...paramsOnly } = payload;

    setJobs((prev) => [
      {
        id: jobId,
        kind: "v2v_clip", // <- passend zu JobKind
        createdAt: Date.now(),
        status: "queued",
        label: `V2V: ${prompt.slice(0, 30)}${prompt.length > 30 ? "…" : ""}`,
        startPayload: () => comfyStartV2V(payload),
        onSuccess: (file) => {
          // === das ist dein finalizeSuccess-Block, nur ohne WS-Kram ===

          const newClipId = nanoid();
          const paramId = nanoid();

          const e1 = {
            id: nanoid(),
            type: "input" as const,
            source: v2vParentClipId,
            target: paramId,
          };
          const e2 = { id: nanoid(), type: "output" as const, source: paramId, target: newClipId };

          setRfEdges((prevEdges) => {
            const edge1: RFEdge = {
              id: e1.id,
              source: e1.source,
              target: e1.target,
              type: "labeled",
              data: { label: e1.type, showLabel: props.showEdgeLabels },
              sourceHandle: "out",
              targetHandle: "in",
            };

            const edge2: RFEdge = {
              id: e2.id,
              source: e2.source,
              target: e2.target,
              type: "labeled",
              data: { label: e2.type, showLabel: props.showEdgeLabels },
              sourceHandle: "out",
              targetHandle: "in",
            };

            const nextEdgesRF = [...prevEdges, edge1, edge2];

            setRfNodes((prevNodes) => {
              const fromNode = prevNodes.find((n) => n.id === v2vParentClipId);
              const baseX = fromNode?.position.x ?? 50;
              const baseY = fromNode?.position.y ?? 80;

              const branchIndex = countBranches(prevEdges as any, v2vParentClipId);
              const yOffset = branchIndex * 180;

              const paramPos = findFreePosition({ x: baseX + 260, y: baseY + yOffset }, prevNodes);
              const clipPos = findFreePosition({ x: baseX + 520, y: paramPos.y }, prevNodes);

              const paramNode: RFNode = {
                id: paramId,
                type: "params",
                position: paramPos,
                data: {
                  label: "V2V Params",
                  prompt,
                  mode: "v2v",
                  parentClipId: v2vParentClipId,
                  ...paramsOnly, // enthält cfg/steps/shift/strength etc.
                } as any,
                draggable: true,
              };

              const clipNode: RFNode = {
                id: newClipId,
                type: "clip",
                position: clipPos,
                data: {
                  label: "Generated Clip",
                  videoFile: file,
                  videoStatus: "done",
                } as any,
                draggable: true,
              };

              const nextNodes = [...prevNodes, paramNode, clipNode];

              props.onChange((prevProject) => {
                const base = fromRF(prevProject, nextNodes, nextEdgesRF);
                return {
                  ...base,
                  uiState: { ...prevProject.uiState, selectedNodeId: newClipId },
                };
              });

              return nextNodes;
            });

            return nextEdgesRF;
          });

          setPendingFocusId(newClipId);
        },
        onError: (err) => {
          console.error("V2V job failed", err);
        },
      },
      ...prev,
    ]);

    // optional: Dialog zu + Status resetten
    setClipStatus("");
    setClipPreviewUrl(null);
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

            props.onChange((prev) => ({
              ...prev,
              uiState: { ...(prev.uiState ?? {}), selectedNodeId: nodeId },
            }));

            setActionDialogOpen(true);
          },

        },
      };
    });
  }, [rfNodes, rfEdges, props.onChange]);

  const onNodeClick: NodeMouseHandler = (evt, node) => {
    const target = evt.target as HTMLElement | null;
    if (target?.closest("button, a, [role='button'], .MuiDialog-root")) return;

    if (node.type !== "clip") return;

    setClickedNodeId(node.id);

    props.onChange((prev) => ({
      ...prev,
      uiState: { ...(prev.uiState ?? {}), selectedNodeId: node.id },
    }));

    setActionDialogOpen(true);
  };


const addManualEdit = (fromClipId: string) => {
  // wir erzeugen jetzt NUR einen erwarteten Dateinamen (ohne Nodes)
  const outClipId = nanoid();
  const expectedBasename = `${outClipId}.mp4`;
  console.log("DRAFT SET")
  setManualEditDraft({ fromClipId, expectedBasename });

  // Kontext "locked": wir benutzen später den Draft, nicht irgendeine ID
  // (editId gibt es ja noch nicht)
  const file = getNodeVideoFile(fromClipId);
  if (file?.filename) openInResolve(file.filename);

  setNamingConventionName(expectedBasename);
  setNamingConventionInfoOpen(true);

  return { expectedBasename };
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
      promptIdRef.current = null;
    };
  }, []);

  function getNodeVideoFile(nodeId: string): StoredMediaFile | null {
    const n = rfNodes.find((x) => x.id === nodeId);
    return ((n?.data as any)?.videoFile as StoredMediaFile | null) ?? null;
  }

  const addAIGenerateFromParent = (fromClipId: string) => {
    setV2vParentClipId(fromClipId);
    setV2vPrompt("");
    setHighNoiseCfg(1);
    setHighNoiseEndStep(2);
    setHighNoiseModelStrength(1);
    setHighNoiseShift(5);
    setHighNoiseStartStep(0);
    setHighNoiseSteps(4);
    setLowNoiseCfg(1);
    setLowNoiseEndStep(4);
    setLowNoiseModelStrength(1);
    setLowNoiseShift(5);
    setLowNoiseStartStep(2);
    setLowNoiseSteps(4);
    setClipStatus("");
    setClipPreviewUrl(null);
    setClipDialogOpen(true);
  };

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <Paper elevation={2} sx={{ position: "absolute", zIndex: 10, top: 12, right: 12, p: 1 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <StatusDot state={state} />
          <Button size="small" onClick={() => setJobsOpen((v) => !v)}>
            Jobs ({jobs.length})
          </Button>
        </Stack>

        {jobsOpen && (
          <Box sx={{ mt: 1, minWidth: 320, maxHeight: 280, overflow: "auto" }}>
            <Stack spacing={1}>
              {jobs.map((j) => (
                <Paper key={j.id} variant="outlined" sx={{ p: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {j.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {j.status}
                    </Typography>
                  </Stack>

                  {j.progressText && (
                    <Typography variant="caption" color="text.secondary">
                      {j.progressText}
                    </Typography>
                  )}

                  {j.previewUrl && (
                    <video
                      src={j.previewUrl}
                      controls
                      style={{ width: "100%", borderRadius: 8, marginTop: 6 }}
                    />
                  )}
                </Paper>
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper
        elevation={2}
        style={{
          position: "absolute",
          zIndex: 10,
          top: 12,
          left: 12,
          padding: 8,
          display: "flex",
          gap: 8,
        }}
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

      <Dialog
        open={actionDialogOpen}
        onClose={() => setActionDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
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

      <Dialog
        open={rootDialogOpen}
        onClose={() => !creatingVideo && setRootDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Root</DialogTitle>

        <DialogContent>
          <Tabs value={rootMode} onChange={(_, v) => setRootMode(v)} sx={{ mb: 2 }}>
            <Tab value="generate" label="Generate" />
            <Tab value="upload" label="Upload video" />
          </Tabs>

          {rootMode === "generate" && (
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
                <video src={createdVideoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
              )}
            </Stack>
          )}

          {rootMode === "upload" && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Button variant="outlined" component="label" disabled={rootUploading}>
                Choose video…
                <input
                  hidden
                  type="file"
                  accept="video/*"
                  onChange={(e) => setRootUploadFile(e.target.files?.[0] ?? null)}
                />
              </Button>

              {rootUploadFile && (
                <Typography variant="body2" color="text.secondary">
                  Selected: {rootUploadFile.name}
                </Typography>
              )}

              {rootUploading && <LinearProgress />}
              {rootUploadStatus && (
                <Typography variant="body2" color="text.secondary">
                  {rootUploadStatus}
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              // dein cleanup wie gehabt + zusätzlich upload state resetten
              wsRef.current?.close();
              wsRef.current = null;
              if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
              promptIdRef.current = null;

              setCreatingVideo(false);
              setRootUploading(false);
              setRootUploadStatus("");
              setRootUploadFile(null);

              setCreateStatus("Cancelled");
              setRootDialogOpen(false);
            }}
            disabled={creatingVideo || rootUploading}
          >
            Close
          </Button>

          {rootMode === "generate" ? (
            <Button variant="contained" onClick={enqueueRootJob}>
              {creatingVideo ? "Working…" : "Create Video"}
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleUploadRootVideo}
              disabled={rootUploading || !rootUploadFile}
            >
              {rootUploading ? "Uploading…" : "Use Uploaded Video"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={clipDialogOpen}
        onClose={() => setClipDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Generate Clip – Prompt</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Prompt"
              value={v2vPrompt}
              onChange={(e) => setV2vPrompt(e.target.value)}
              multiline
              minRows={4}
              fullWidth
            />

            <TextField
              type="number"
              label="Low Noise CFG"
              value={lowNoiseCfg}
              onChange={(e) => setLowNoiseCfg(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise CFG"
              value={highNoiseCfg}
              onChange={(e) => setHighNoiseCfg(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Model Strength"
              value={lowNoiseModelStrength}
              onChange={(e) => setLowNoiseModelStrength(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Model Strength"
              value={highNoiseModelStrength}
              onChange={(e) => setHighNoiseModelStrength(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Shift"
              value={lowNoiseShift}
              onChange={(e) => setLowNoiseShift(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Shift"
              value={highNoiseShift}
              onChange={(e) => setHighNoiseShift(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Steps"
              value={lowNoiseSteps}
              onChange={(e) => setLowNoiseSteps(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Steps"
              value={highNoiseSteps}
              onChange={(e) => setHighNoiseSteps(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise Start Step"
              value={lowNoiseStartStep}
              onChange={(e) => setLowNoiseStartStep(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise Start Step"
              value={highNoiseStartStep}
              onChange={(e) => setHighNoiseStartStep(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="Low Noise End Step"
              value={lowNoiseEndStep}
              onChange={(e) => setLowNoiseEndStep(Number(e.target.value))}
              fullWidth
            />
            <TextField
              type="number"
              label="High Noise End Step"
              value={highNoiseEndStep}
              onChange={(e) => setHighNoiseEndStep(Number(e.target.value))}
              fullWidth
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
              setClipDialogOpen(false);
            }}
          >
            Close
          </Button>

          <Button variant="contained" onClick={enqueueExtendJob} disabled={!v2vPrompt.trim()}>
            Start COMFYUI Genration
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={namingConventionInfoOpen}
        onClose={() => setNamingConventionInfoOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          IMPORTANT: Name your Video as follows - Only close the button when the editing is done
        </DialogTitle>
        <DialogContent>Name: {namingConventionName}</DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setManualEditDraft(null)
              setNamingConventionInfoOpen(false);
            }}
          >
            Close
          </Button>

          <Button onClick={() => navigator.clipboard.writeText(namingConventionName)}>
            Copy name
          </Button>

          <Button
            variant="contained"
            onClick={async () => {
              const editId = davinciContextEditIdRef.current;
              if (!editId) {
                alert("No edit node found for the selected clip.");
                return;
              }

              try {
                await importResolveMetaIntoEdit(editId);
              } catch (e: any) {
                console.error(e);

                // optional: error auch in meta speichern
                setRfNodes((prevNodes) => {
                  const nextNodes = prevNodes.map((n) => {
                    if (n.id !== editId) return n;
                    const oldData = (n.data as any) ?? {};
                    return {
                      ...n,
                      data: {
                        ...oldData,
                        meta: { ...(oldData.meta ?? {}), error: e?.message ?? String(e) },
                      },
                    };
                  });

                  props.onChange((prevProject) =>
                    fromRF(prevProject, nextNodes as any, rfEdgesRef.current as any)
                  );
                  return nextNodes;
                });

                alert("Import changes failed: " + (e?.message ?? String(e)));
              }
            }}
          >
            Import changes
          </Button>

          <Button
            variant="contained"
           onClick={() => {
            console.log(manualEditDraft)
              if (!manualEditDraft) {
                alert("No manual edit in progress.");
                return;
              }
              setDaVinciActionDalogOpen(true);
            }}

          >
            Choose Davinci option
          </Button>

        </DialogActions>
      </Dialog>

      <Dialog
        open={timeLineUploadOpen}
        onClose={() => setTimeLineImportOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Timeline from Da Vinci Resolve</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Button variant="outlined" component="label">
              Upload exported timeline...
              <input
                hidden
                type="file"
                accept=".drt,application/xml,text/xml"
                onChange={(e) => setUploadedTimeLineFile(e.target.files?.[0] ?? null)}
              />
            </Button>

            {uploadedTimeLineFile && (
              <Typography variant="body2" color="text.secondary">
                Selected: {uploadedTimeLineFile.name}
              </Typography>
            )}

            <Button variant="outlined" component="label">
              Upload edited video...
              <input
                hidden
                type="file"
                accept="video/*"
                onChange={(e) => setEditedVideoUploadFile(e.target.files?.[0] ?? null)}
              />
            </Button>

            {editedVideoUploadFile && (
              <Typography variant="body2" color="text.secondary">
                Selected: {editedVideoUploadFile.name}
              </Typography>
            )}
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button
onClick={async () => {
  if (!uploadedTimeLineFile) return;
  if (!editedVideoUploadFile) return;

  if (!manualEditDraft) {
    alert("No manual edit draft found. Start a manual edit from a clip first.");
    return;
  }

  const { fromClipId, expectedBasename } = manualEditDraft;

  try {
    // 1) uploads
    const storedVideo = await comfyUploadVideo(editedVideoUploadFile);
    const res = await uploadTimelineFile(props.project.id, uploadedTimeLineFile);

    // 2) jetzt IDs erzeugen (final!)
    const editId = nanoid();
    const outClipId = nanoid(); // <- oder: aus expectedBasename ableiten, wenn du willst
    // wenn du den outClipId an expectedBasename koppeln willst:
    // const outClipId = expectedBasename.replace(/\.mp4$/i, "");


    // 3) positions berechnen (wie vorher)
    const fromNode = rfNodesRef.current.find((n) => n.id === fromClipId);
    const baseX = fromNode?.position.x ?? 50;
    const baseY = fromNode?.position.y ?? 80;

    const branchIndex = countBranches(rfEdgesRef.current as any, fromClipId);
    const yOffset = branchIndex * 180;

    const desiredEditPos = { x: baseX + 260, y: baseY + yOffset };
    const editPos = findFreePosition(desiredEditPos, rfNodesRef.current);

    const desiredClipPos = { x: baseX + 520, y: editPos.y };
    const clipPos = findFreePosition(desiredClipPos, rfNodesRef.current);

    // 4) nodes bauen
    const editNode: RFNode = {
      id: editId,
      type: "edit",
      position: editPos,
      data: {
        label: "Manual edit",
        tool: "resolve",
        parentClipId: fromClipId,
        outClipId,
        export: {
          expectedBasename, // bleibt stabil, den hat der User ja exportiert
          status: "imported",
          foundPath: null,
        },
        timeline: {
          snapshot: res.snapshot,
          changelog: res.changelog,
          importedAt: new Date().toISOString(),
          fileName: uploadedTimeLineFile.name,
          storedTimelineFilename: res.storedTimelineFilename,
          version: "latest",
        },
        meta: null,
        notes: `Export as: ${expectedBasename}`,
      } as any,
      draggable: true,
    };

    const outClipNode: RFNode = {
      id: outClipId,
      type: "clip",
      position: clipPos,
      data: {
        label: "Edited Clip",
        videoFile: storedVideo,
        videoStatus: "done",
        producedByEditId: editId,
      } as any,
      draggable: true,
    };

    const e1 = { id: nanoid(), type: "edit_in" as const, source: fromClipId, target: editId };
    const e2 = { id: nanoid(), type: "edit_out" as const, source: editId, target: outClipId };

    const edge1: RFEdge = {
      id: e1.id,
      source: e1.source,
      target: e1.target,
      type: "labeled",
      data: { label: e1.type, showLabel: props.showEdgeLabels },
      sourceHandle: "out",
      targetHandle: "in",
    };

    const edge2: RFEdge = {
      id: e2.id,
      source: e2.source,
      target: e2.target,
      type: "labeled",
      data: { label: e2.type, showLabel: props.showEdgeLabels },
      sourceHandle: "out",
      targetHandle: "in",
    };

    // 5) state + persist in einem Rutsch
    setRfNodes((prevNodes) => {
      const nextNodes = [...prevNodes, editNode, outClipNode];

      setRfEdges((prevEdges) => {
        const nextEdges = [...prevEdges, edge1, edge2];

        props.onChange((prevProject) => {
          const base = fromRF(prevProject, nextNodes as any, nextEdges as any);
          return { ...base, uiState: { ...prevProject.uiState, selectedNodeId: editId } };
        });

        return nextEdges;
      });

      return nextNodes;
    });

    // 6) cleanup + focus
    setPendingFocusId(outClipId);

    setTimeLineImportOpen(false);
    setUploadedTimeLineFile(null);
    setEditedVideoUploadFile(null);
    setManualEditDraft(null);
  } catch (e: any) {
    console.error(e);
    alert("Timeline upload failed: " + (e?.message ?? String(e)));
  }
}}

            disabled={!uploadedTimeLineFile || !editedVideoUploadFile}
          >
            Finish
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={daVinciActionDalogOpen}
        onClose={() => setDaVinciActionDalogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Choose how you want to open the timeline file
        </DialogTitle>
        <DialogContent>There are three options</DialogContent>

        <DialogActions>
          <Button
            onClick={async () => {
              await copyTimelineFileURL();
              setDaVinciActionDalogOpen(false)
              setTimeLineImportOpen(true);
            }}
          >
            Copy URL
          </Button>

          <Button 
            onClick={async () => {
              downloadTImelineFile(props.project.id)
              setDaVinciActionDalogOpen(false)
              setTimeLineImportOpen(true);
            }}
          >
            Download timeline file
          </Button>

          <Button
            variant="contained"
            onClick={async () => {
              await openTimelineFileInDavinciBackend()
              setDaVinciActionDalogOpen(false)
              setTimeLineImportOpen(true);
            }}
          >
            Open timeline file in Da Vinci
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

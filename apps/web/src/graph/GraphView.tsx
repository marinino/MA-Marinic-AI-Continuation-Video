import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  type NodeMouseHandler,
  type Edge as RFEdge,
  type Node as RFNode,
} from "reactflow";
import "reactflow/dist/style.css";

import type { Project, StoredMediaFile } from "@ma/shared";
import { useReactFlow } from "reactflow";
import type { ReactFlowInstance } from "reactflow";

// node/edge renderer
import { nodeTypes } from "./nodes/nodes";
import { LabeledEdge } from "./edges/edges";

// api
import {
  comfyStartVideo,
  comfyStartV2V,
  comfyUploadVideo,
  openInResolve,
  openTimelineInResolve,
  resolveExportTimeline,
  uploadTimelineFile,
} from "../api";
import { parsedChangelogLines } from "../utils/parseTimelineChangelog";

// hooks
import { useProjectGraph } from "./hooks/useProjectGraph";
import { useViewport } from "./hooks/useViewport";
import { useV2VSliders } from "./hooks/useV2VSliders";
import {
  sliderToIntRange,
  sliderToRange,
  deriveV2VParamsFromSimple,
  useCategoryScores,
} from "./hooks/useV2VParams";
import { useDavinciTimeline } from "./hooks/useDaVinciTimeline";
import { useComfyJobs } from "./hooks/useComfyJobs"; // IMPORTANT: needs to call onSuccess(file)!

// dialogs
import { RootDialog } from "./dialogs/RootDialog";
import { ClipDialog } from "./dialogs/ClipDialog";
import { ActionDialog } from "./dialogs/ActionDialog";
import { NamingConventionDialog } from "./dialogs/NamingConventionDialog";
import { TimelineUploadDialog } from "./dialogs/TimelineUploadDialog";
import { DavinciActionDialog } from "./dialogs/DaVinciActionDialog";
import { ErrorDialog } from "./dialogs/ErrorDialog";

// components
import { StatusDot } from "./components/StatusDot";
import { JobsPanel } from "./components/JobsPanel";

// MUI
import { Box, Button, Paper, Stack } from "@mui/material";
import { centerOnNode, countBranches, findFreePosition } from "./graph_helpers/layout";

// edgeTypes
const edgeTypes = { labeled: LabeledEdge };

type RootMode = "generate" | "upload";
type ManualEditDraft = { fromClipId: string; expectedBasename: string };

export function GraphView(props: {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;
}) {
  // ---------- reactflow instance ----------
  const rf = useReactFlow();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  // ---------- graph state ----------
  const g = useProjectGraph({
    project: props.project,
    onChange: props.onChange,
    showEdgeLabels: props.showEdgeLabels,

    onAdd: (nodeId: string) => {
      // selection persistieren
      props.onChange((prev) => ({
        ...prev,
        uiState: { ...(prev.uiState ?? {}), selectedNodeId: nodeId },
      }));

      // local selection (hook synced from project uiState anyway)
      setActionDialogOpen(true);
    },
  });

  useEffect(() => {
    const sel = props.project.uiState?.selectedNodeId ?? null;
    g.setClickedNodeId(sel);
  }, [props.project.uiState?.selectedNodeId]);

  const markVideoOpened = useCallback(
    (nodeId: string) => {
      g.setRfNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data as any), videoOpened: true } } : n
        );

        // ✅ commit muss den "next" state bekommen
        g.setRfEdges((prevE) => {
          g.commit(next, prevE);
          return prevE;
        });

        return next;
      });
    },
    [g]
  );

  // ✅ inject onAdd handler for the "+" button inside nodes
  const nodesForUI = useMemo(() => {
    return g.nodesWithRootFlag.map((n) => ({
      ...n,
      data: {
        ...(n.data as any),
        videoOpened: Boolean((n.data as any)?.videoOpened),

        // ✅ callback für den MovieIcon-click im Node
        markVideoOpened,
        onAdd: (nodeId: string) => {
          // selection persistieren
          g.setClickedNodeId(nodeId);
          props.onChange((prev) => ({
            ...prev,
            uiState: { ...(prev.uiState ?? {}), selectedNodeId: nodeId },
          }));

          // ✅ Plus => ActionDialog
          setActionDialogOpen(true);
        },
      },
    }));
  }, [g.nodesWithRootFlag, g.setClickedNodeId, props.onChange, markVideoOpened]);

  // keep selection in project uiState (same behavior)
  useEffect(() => {
    const sel = props.project.uiState?.selectedNodeId ?? null;
    g.setClickedNodeId(sel);
  }, [props.project.uiState?.selectedNodeId]);

  // ---------- viewport ----------
  const vp = useViewport(props.project.id, rfInstance);

  // do the “restore OR fitView once rfInstance exists” behavior like mega-file
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!rfInstance) return;
    if (didInitRef.current) return;

    requestAnimationFrame(() => {
      const restored = vp.restoreViewport();
      if (!restored) {
        rfInstance.fitView({ padding: 0.5, duration: 200 });
        requestAnimationFrame(vp.saveViewport);
      }
      didInitRef.current = true;
    });
  }, [rfInstance, props.project.id]);

  // ---------- comfy jobs ----------
  const jobsApi = useComfyJobs(); // must support onSuccess(file) internally
  const jobs = jobsApi.jobs;

  const anyBusy = useMemo(
    () => jobs.some((j) => ["queued", "connecting", "running", "finalizing"].includes(j.status)),
    [jobs]
  );

  const genState = jobs.some((j) => j.status === "error") ? "error" : anyBusy ? "running" : "idle";

  // ---------- dialogs ----------
  const [jobsOpen, setJobsOpen] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const [rootDialogOpen, setRootDialogOpen] = useState(false);
  const [rootMode, setRootMode] = useState<RootMode>("generate");
  const [rootPrompt, setRootPrompt] = useState("");
  const [rootUploadFile, setRootUploadFile] = useState<File | null>(null);
  const [rootUploading, setRootUploading] = useState(false);
  const [rootUploadStatus, setRootUploadStatus] = useState("");

  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipGenerating, setClipGenerating] = useState(false); // just UI; generation is job-based
  const [clipStatus, setClipStatus] = useState("");
  const [clipPreviewUrl, setClipPreviewUrl] = useState<string | null>(null);

  const [namingConventionOpen, setNamingConventionOpen] = useState(false);
  const [davinciActionOpen, setDavinciActionOpen] = useState(false);
  const [timelineUploadOpen, setTimelineUploadOpen] = useState(false);

  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  // ---------- V2V state ----------
  const [v2vParentClipId, setV2vParentClipId] = useState<string | null>(null);
  const [v2vPrompt, setV2vPrompt] = useState("");
  const [v2vLength, setV2VLength] = useState(71);

  const paletteKey = genState === "idle" ? "success" : genState === "running" ? "warning" : "error";

  // advanced raw params (same as mega-file)
  const [advanced, setAdvanced] = useState({
    lowNoiseCfg: 1,
    highNoiseCfg: 1,
    lowNoiseModelStrength: 1,
    highNoiseModelStrength: 1,
    lowNoiseShift: 5,
    highNoiseShift: 5,
    lowNoiseSteps: 4,
    highNoiseSteps: 4,
    lowNoiseStartStep: 2,
    highNoiseStartStep: 0,
    lowNoiseEndStep: 4,
    highNoiseEndStep: 2,
  });

  // simple sliders hook (your preference)
  const v2v = useV2VSliders();

  const stepsRange = v2v.simpleSpeedMode === "quick" ? { min: 4, max: 5 } : { min: 20, max: 24 };

  const scores = useCategoryScores(
    {
      totalSteps: v2v.simple.totalSteps,
      stepRatio: v2v.simple.stepRatioPct, // % 50..80
      highShift: v2v.simple.highShift,
      highCfg: v2v.simple.highCfg,
      highStrength: v2v.simple.highStrength,
    },
    stepsRange
  );

  // ---------- davinci timeline helper ----------

  // manual edit draft
  const [manualEditDraft, setManualEditDraft] = useState<ManualEditDraft | null>(null);
  const [uploadedTimelineFile, setUploadedTimelineFile] = useState<File | null>(null);
  const [editedVideoFile, setEditedVideoFile] = useState<File | null>(null);

  // ---------- helpers ----------
  function getNodeVideoFile(nodeId: string): StoredMediaFile | null {
    const n = g.rfNodes.find((x) => x.id === nodeId);
    return ((n?.data as any)?.videoFile as StoredMediaFile | null) ?? null;
  }

  const clickedClipFilename = useMemo(() => {
    if (!g.clickedNodeId) return null;
    const node = g.rfNodes.find((n) => n.id === g.clickedNodeId) as any;
    if (!node || node.type !== "clip") return null;
    return (node.data?.videoFile?.filename as string | undefined) ?? null;
  }, [g.clickedNodeId, g.rfNodes]);

  const davinci = useDavinciTimeline({
    project: props.project,
    clickedClipFilename,
  });

  // helper (z.B. in GraphView oder in einer kleinen utils-Datei)
  function jobStateStyle(state: "idle" | "running" | "error") {
    const paletteKey = state === "idle" ? "success" : state === "running" ? "warning" : "error";

    return {
      borderColor: `${paletteKey}.main`,
      bgColor: `${paletteKey}.50`, // sehr dezent
    } as const;
  }

  // ---------- Root create ----------
  function createRoot() {
    const hasRoot = g.rfNodes.some((n) => {
      if (n.type !== "clip") return false;
      const hasIncoming = g.rfEdges.some((e) => e.target === n.id);
      return !hasIncoming;
    });

    if (hasRoot) {
      setErrorDialog({
        title: "Only one root allowed",
        message: "Create a new project to start with a new root",
      });
      return;
    }

    setRootPrompt("");
    setRootDialogOpen(true);
  }

  function enqueueRootJob() {
    if (!rootPrompt.trim()) return;

    const prompt = rootPrompt;

    jobsApi.enqueue({
      label: `Root: ${prompt.slice(0, 30)}${prompt.length > 30 ? "…" : ""}`,
      startPayload: () => comfyStartVideo({ text: prompt }),
      onSuccess: (file) => {
        const id = nanoid();

        const rootClip: RFNode = {
          id,
          type: "clip",
          position: { x: 50, y: 80 },
          data: {
            label: "Root Clip",
            videoFile: file,
            videoStatus: "done",
            videoOpened: false,
          } as any,
          draggable: true,
        };

        g.setRfNodes((prev) => {
          const next = [...prev, rootClip];

          g.setRfEdges((prevE) => {
            g.commit(next, prevE);

            if (rfInstance) {
              centerOnNode(rfInstance, id, { onAfter: vp.saveViewport });
            } else {
              // falls rfInstance noch null ist, wenigstens Viewport später speichern
              requestAnimationFrame(vp.saveViewport);
            }
            return prevE;
          });

          return next;
        });

        props.onChange((prev) => ({
          ...prev,
          uiState: { ...(prev.uiState ?? {}), selectedNodeId: id },
        }));

        setRootDialogOpen(false);
      },
      onError: (e) => console.error(e),
    });
  }

  async function handleUploadRootVideo() {
    if (!rootUploadFile) return;

    setRootUploading(true);
    setRootUploadStatus("Uploading…");

    try {
      const stored = await comfyUploadVideo(rootUploadFile);

      const id = nanoid();
      const rootClip: RFNode = {
        id,
        type: "clip",
        position: { x: 50, y: 80 },
        data: {
          label: "Root Clip",
          videoFile: stored,
          videoStatus: "done",
          videoOpened: false,
        } as any,
        draggable: true,
      };

      g.setRfNodes((prev) => {
        const next = [...prev, rootClip];

        g.setRfEdges((prevE) => {
          g.commit(next, prevE);

          if (rfInstance) {
            centerOnNode(rfInstance, id, { onAfter: vp.saveViewport });
          } else {
            // falls rfInstance noch null ist, wenigstens Viewport später speichern
            requestAnimationFrame(vp.saveViewport);
          }
          return prevE;
        });

        return next;
      });

      props.onChange((prev) => ({
        ...prev,
        uiState: { ...(prev.uiState ?? {}), selectedNodeId: id },
      }));

      setRootUploading(false);
      setRootDialogOpen(false);
      setRootUploadStatus("");
    } catch (e: any) {
      setRootUploadStatus(`Error: ${e?.message ?? String(e)}`);
      setRootUploading(false);
    }
  }

  // ---------- Action dialog actions ----------
  function addAIGenerateFromParent(fromClipId: string) {
    setV2vParentClipId(fromClipId);
    setV2vPrompt("");
    setV2VLength(71);
    setClipStatus("");
    setClipPreviewUrl(null);

    // reset advanced like before
    setAdvanced({
      lowNoiseCfg: 1,
      highNoiseCfg: 1,
      lowNoiseModelStrength: 1,
      highNoiseModelStrength: 1,
      lowNoiseShift: 5,
      highNoiseShift: 5,
      lowNoiseSteps: 4,
      highNoiseSteps: 4,
      lowNoiseStartStep: 2,
      highNoiseStartStep: 0,
      lowNoiseEndStep: 4,
      highNoiseEndStep: 2,
    });

    setClipDialogOpen(true);
  }

  function addManualEdit(fromClipId: string) {
    const outClipId = nanoid();
    const expectedBasename = `${outClipId}.mp4`;
    setManualEditDraft({ fromClipId, expectedBasename });

    const file = getNodeVideoFile(fromClipId);
    if (file?.filename) openInResolve(file.filename);

    setNamingConventionOpen(true);
  }

  // ---------- V2V start ----------
  function handleStartV2V() {
    if (!v2vParentClipId) return;
    if (!v2vPrompt.trim()) return;

    const parentFile = getNodeVideoFile(v2vParentClipId);
    if (!parentFile) {
      setClipStatus("Parent clip has no video yet.");
      return;
    }

    // Simple mode: derive overrides
    if (v2v.v2vTab === "simple") {
      const s = v2v.simple;

      const d = deriveV2VParamsFromSimple({
        totalSteps: s.totalSteps,
        stepRatio01: s.stepRatioPct / 100,
        highShift: s.highShift,
        highCfg: s.highCfg,
        highStrength: s.highStrength,
      });

      enqueueExtendJob(parentFile, {
        lowNoiseCfg: 2,
        lowNoiseModelStrength: 0.3,
        lowNoiseShift: 2.6,
        ...d,
      });
      return;
    }

    // advanced: use exact raw advanced values
    enqueueExtendJob(parentFile, { ...advanced });
  }

  function enqueueExtendJob(
    parentFile: StoredMediaFile,
    params: any // keep as any because it matches comfy payload keys
  ) {
    const parentId = v2vParentClipId!;
    const prompt = v2vPrompt;
    const length = v2vLength;

    jobsApi.enqueue({
      label: `V2V: ${prompt.slice(0, 30)}${prompt.length > 30 ? "…" : ""}`,
      startPayload: () =>
        comfyStartV2V({
          text: prompt,
          videoFile: parentFile,
          length: length,
          ...params,
        } as any),
      onSuccess: (file) => {
        // IMPORTANT: this block is the same as your mega-file logic (nodes+edges)
        // If you already extracted it into a helper/hook, call that here.
        // For brevity I keep it local. (No behavior change.)

        const newClipId = nanoid();
        const paramId = nanoid();

        const e1 = {
          id: nanoid(),
          type: "input" as const,
          source: parentId,
          target: paramId,
        };

        const e2 = {
          id: nanoid(),
          type: "output" as const,
          source: paramId,
          target: newClipId,
        };

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

        g.setRfEdges((prevEdges) => {
          const nextEdges = [...prevEdges, edge1, edge2];

          g.setRfNodes((prevNodes) => {
            const fromNode = prevNodes.find((n) => n.id === parentId);
            const baseX = fromNode?.position.x ?? 50;
            const baseY = fromNode?.position.y ?? 80;

            // NOTE: If you extracted countBranches/findFreePosition, use them here.
            // I'm assuming you still have the same helpers wired in your project.
            // If not: import from graph_helpers/layout (same as mega-file).

            const branchIndex = countBranches(nextEdges, parentId);
            // nextEdges enthält edge1 schon -> branchIndex ist damit praktisch "neue Anzahl"

            const desiredParam: { x: number; y: number } = {
              x: baseX + 260,
              y: baseY + (branchIndex - 1) * 160, // -1 weil edge1 schon drin ist
            };

            const paramPos = findFreePosition(desiredParam, prevNodes, { stepY: 160 });

            const clipPos = findFreePosition({ x: baseX + 520, y: paramPos.y }, prevNodes, {
              stepY: 160,
            });

            const paramNode: RFNode = {
              id: paramId,
              type: "params",
              position: paramPos,
              data: {
                label: "V2V Params",
                prompt,
                mode: "v2v",
                parentClipId: parentId,
                ...params,
                categoryScores: scores,
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
                videoOpened: false,
              } as any,
              draggable: true,
            };

            const nextNodes = [...prevNodes, paramNode, clipNode];

            props.onChange((prevProject) => {
              // commit via fromRF inside hook
              // but easiest: call commit now
              // (your useProjectGraph.commit uses fromRF)
              // ensure selectedNodeId updated
              const base = prevProject; // we just do uiState update through props.onChange below if you prefer
              return {
                ...base,
                uiState: { ...(prevProject.uiState ?? {}), selectedNodeId: newClipId },
              };
            });

            // commit graph
            g.commit(nextNodes, nextEdges);
            centerOnNode(rfInstance, newClipId, { onAfter: vp.saveViewport });

            return nextNodes;
          });

          return nextEdges;
        });

        setClipDialogOpen(false);
      },
    });
  }

  // ---------- node click ----------
  const onNodeClick: NodeMouseHandler = (evt, node) => {
    const target = evt.target as HTMLElement | null;
    if (target?.closest("button, a, [role='button'], .MuiDialog-root")) return;
    if (node.type !== "clip") return;

    g.setClickedNodeId(node.id);
    props.onChange((prev) => ({
      ...prev,
      uiState: { ...(prev.uiState ?? {}), selectedNodeId: node.id },
    }));

    setActionDialogOpen(true);
  };

  return (
    <div style={{ height: "100%", position: "relative" }}>
      {/* Jobs */}
      <Paper
        elevation={3}
        sx={{
          position: "absolute",
          zIndex: 10,
          top: 12,
          right: 12,
          p: 1.5,
          borderLeft: 6,
          borderLeftColor: `${paletteKey}.main`,
          bgcolor: genState === "idle" ? "background.paper" : `${paletteKey}.50`,
        }}
      >
        <JobsPanel
          jobs={jobs}
          open={jobsOpen}
          onToggle={() => setJobsOpen((v) => !v)}
          title="Jobs"
        />
      </Paper>

      {/* Root */}
      <Paper elevation={2} sx={{ position: "absolute", zIndex: 10, top: 12, left: 12, p: 1 }}>
        <Button variant="contained" onClick={createRoot}>
          Start Root
        </Button>
      </Paper>

      <ReactFlow
        onInit={(instance) => setRfInstance(instance)}
        nodes={nodesForUI}
        edges={g.rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        deleteKeyCode={null}
        panOnDrag={[1, 2]}
        zoomOnScroll
        onNodesChange={g.onNodesChange}
        onEdgesChange={g.onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeDragStop={() => {
          g.commit();
          requestAnimationFrame(vp.saveViewport);
        }}
        onMove={vp.scheduleSaveViewport}
        onMoveEnd={vp.saveViewport}
      >
        <Background />
        <Controls />
      </ReactFlow>

      {/* dialogs */}
      <ActionDialog
        open={actionDialogOpen}
        selectedLabel={(g.clickedNode as any)?.data?.label ?? "(none)"}
        canGenerate={!!g.clickedNodeId && !!getNodeVideoFile(g.clickedNodeId)}
        onClose={() => setActionDialogOpen(false)}
        onManualEdit={() => {
          if (g.clickedNodeId) addManualEdit(g.clickedNodeId);
          setActionDialogOpen(false);
        }}
        onGenerate={() => {
          if (g.clickedNodeId) addAIGenerateFromParent(g.clickedNodeId);
          setActionDialogOpen(false);
        }}
      />

      <RootDialog
        open={rootDialogOpen}
        mode={rootMode}
        onModeChange={setRootMode}
        prompt={rootPrompt}
        onPromptChange={setRootPrompt}
        uploadFile={rootUploadFile}
        onUploadFileChange={setRootUploadFile}
        uploading={rootUploading}
        uploadStatusText={rootUploadStatus}
        onUpload={handleUploadRootVideo}
        onGenerate={enqueueRootJob}
        onClose={() => setRootDialogOpen(false)}
      />

      <ClipDialog
        open={clipDialogOpen}
        tab={v2v.v2vTab}
        onTabChange={v2v.setV2vTab}
        prompt={v2vPrompt}
        onPromptChange={setV2vPrompt}
        length={v2vLength}
        onLengthChange={setV2VLength}
        // ✅ NEW
        simple={v2v.simple}
        sliderCfg={v2v.sliderCfg}
        onChangeTotalSteps={v2v.onTotalSteps}
        onChangeStepRatio={v2v.onRatio}
        onChangeHighShift={v2v.onShift}
        onChangeHighCfg={v2v.onCfg}
        onChangeHighStrength={v2v.onStrength}
        advanced={advanced}
        onAdvancedChange={(patch) => setAdvanced((prev) => ({ ...prev, ...patch }))}
        generating={clipGenerating}
        statusText={clipStatus}
        previewUrl={clipPreviewUrl}
        onClose={() => setClipDialogOpen(false)}
        onStart={handleStartV2V}
        simpleSpeedMode={v2v.simpleSpeedMode}
        onSimpleSpeedModeChange={v2v.setSimpleSpeedMode}
        getBounds={v2v.getBounds}
        roundTo={v2v.roundTo}
      />

      <NamingConventionDialog
        open={namingConventionOpen}
        onClose={() => {
          setManualEditDraft(null);
          setNamingConventionOpen(false);
        }}
        onStudio={async () => {
          // If you want: importResolveMetaIntoEdit logic here or in a hook.
          // Keeping it minimal: call resolveExportTimeline and store into node data.
          setNamingConventionOpen(false);
        }}
        onFree={() => {
          if (!manualEditDraft) {
            setErrorDialog({ title: "No edit found", message: "No manual edit in progress." });
            return;
          }
          setDavinciActionOpen(true);
          setNamingConventionOpen(false);
        }}
      />

      <DavinciActionDialog
        open={davinciActionOpen}
        onClose={() => setDavinciActionOpen(false)}
        onCopyUrl={async () => {
          await davinci.copyTimelineFileURL();
          setDavinciActionOpen(false);
          setTimelineUploadOpen(true);
        }}
        onDownload={() => {
          davinci.downloadTimelineFile();
          setDavinciActionOpen(false);
          setTimelineUploadOpen(true);
        }}
        onOpenInResolve={async () => {
          await davinci.openTimelineFileInDavinciBackend();
          setDavinciActionOpen(false);
          setTimelineUploadOpen(true);
        }}
      />

      <TimelineUploadDialog
        open={timelineUploadOpen}
        disableBackdropClose
        timelineFile={uploadedTimelineFile}
        editedVideoFile={editedVideoFile}
        onTimelineFileChange={setUploadedTimelineFile}
        onEditedVideoFileChange={setEditedVideoFile}
        onCancel={() => setTimelineUploadOpen(false)}
        onFinish={async () => {
          // keep your old mega-file finish logic here or move into a hook.
          setTimelineUploadOpen(false);
        }}
      />

      <ErrorDialog error={errorDialog} onClose={() => setErrorDialog(null)} />
    </div>
  );
}

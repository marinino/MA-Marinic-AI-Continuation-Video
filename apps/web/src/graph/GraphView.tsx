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

import type { Edge, Node, Project, StoredMediaFile } from "@ma/shared";
import { useReactFlow } from "reactflow";
import type { ReactFlowInstance } from "reactflow";

// node/edge renderer
import { nodeTypes } from "./nodes/Node";
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
  getScoreRanges,
  CustomScoreSlider,
  DEFAULT_FORMULA_WEIGHTS,
  FormulaWeights,
  computeAllScores,
  numDelta,
  scoreDelta,
  buildScoreDeltaMap,
  useCategoryIds,
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
import {
  centerOnNode,
  countBranches,
  findFreePosition,
  getDefaultNodeSize,
} from "./graph_helpers/layout";
import {
  buildIncomingMap,
  findPrevParamsId,
  collectSubtreeNodeIds,
  getHiddenDescendantIds,
} from "./graph_helpers/selectors";
import { useManualTimelineImport } from "./hooks/useManualTimelineImport";
import { DeleteNodeDialog } from "./dialogs/DeleteNodeDialog";
import {
  collectParamBranchSteps,
  detectParamWeightSuggestion,
} from "./graph_helpers/branchSuggestions";
import { HideNodeDialog } from "./dialogs/HideNodeDialog";
import {
  loadCategoryVisibility,
  loadCustomSliders,
  loadFormulaWeights,
  saveCategoryVisibility,
} from "../utils/weightsStorage";

// edgeTypes
const edgeTypes = { labeled: LabeledEdge };

type RootMode = "generate" | "upload";
type ManualEditDraft = { fromClipId: string; expectedBasename: string };

export function GraphView(props: {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;
  highlightUnseenEnabled: boolean;
  notesEnabled: boolean;
}) {
  // ---------- reactflow instance ----------
  const rf = useReactFlow();
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
  const vp = useViewport(props.project.id, rfInstance);

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

  const saveNodeNote = useCallback(
    (nodeId: string, note: string) => {
      g.setRfNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data as any), note } } : n
        );

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

  // keep selection in project uiState (same behavior)
  useEffect(() => {
    const sel = props.project.uiState?.selectedNodeId ?? null;
    g.setClickedNodeId(sel);
  }, [props.project.uiState?.selectedNodeId]);

  // ---------- viewport ----------

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [nodeToDeleteId, setNodeToDeleteId] = useState<string | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [hideTargetId, setHideTargetId] = useState<string | null>(null);
  const [hideTargetIds, setHideTargetIds] = useState<string[]>([]);

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

  const [customSliders, setCustomSliders] = useState<CustomScoreSlider[]>([]);
  const [formulaWeights, setFormulaWeights] = useState<FormulaWeights>(DEFAULT_FORMULA_WEIGHTS);
  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>(() =>
    loadCategoryVisibility()
  );

  useEffect(() => {
    setCustomSliders(loadCustomSliders());
    setFormulaWeights(loadFormulaWeights());
  }, []);

  useEffect(() => {
    saveCategoryVisibility(categoryVisibility);
  }, [categoryVisibility]);

  const { allCategoryIds } = useCategoryIds(customSliders);

  const categoryLabels = useMemo(
    () => ({
      creativity: "Creativity",
      promptFaithfulness: "Prompt",
      motion: "Motion",
      transitionSmoothness: "Transition",
      videoFaithfulness: "Video",
      ...Object.fromEntries(customSliders.map((cs) => [cs.id, cs.name])),
    }),
    [customSliders]
  );

  useEffect(() => {
    setCategoryVisibility((prev) => {
      const next = { ...prev };

      for (const id of allCategoryIds) {
        if (!(id in next)) {
          next[id] = true;
        }
      }

      return next;
    });
  }, [allCategoryIds]);

  const setCategoryVisible = useCallback((id: string, visible: boolean) => {
    setCategoryVisibility((prev) => ({
      ...prev,
      [id]: visible,
    }));
  }, []);

  const scoreRanges = getScoreRanges(v2v.simpleSpeedMode);

  const allScores = useMemo(() => {
    return computeAllScores(
      {
        totalSteps: v2v.simple.totalSteps,
        stepRatio: v2v.simple.stepRatioPct,
        highShift: v2v.simple.highShift,
        highCfg: v2v.simple.highCfg,
        highStrength: v2v.simple.highStrength,
      },
      scoreRanges,
      formulaWeights,
      customSliders
    );
  }, [v2v.simple, scoreRanges, formulaWeights, customSliders]);

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

  const hasRoot = useMemo(() => {
    return g.rfNodes.some((n) => {
      if (n.type !== "clip") return false;
      const hasIncoming = g.rfEdges.some((e) => e.target === n.id);
      return !hasIncoming;
    });
  }, [g.rfNodes, g.rfEdges]);

  const handleHideNode = useCallback(
    (nodeId: string) => {
      const nodeToHide = g.rfNodes.find((n) => n.id === nodeId);
      if (!nodeToHide) return;

      if ((nodeToHide.data as any)?.isRoot) {
        setErrorDialog({
          title: "Cannot hide root node",
          message: "The root clip cannot be hidden.",
        });
        return;
      }

      const subtreeIds = Array.from(collectSubtreeNodeIds(nodeId, g.rfEdges));
      setHideTargetId(nodeId);
      setHideTargetIds(subtreeIds);
      setHideDialogOpen(true);
    },
    [g.rfNodes, g.rfEdges]
  );

  const showAllCategories = useCallback(() => {
    setCategoryVisibility((prev) => {
      const next: Record<string, boolean> = {};

      for (const key of Object.keys(prev)) {
        next[key] = true;
      }

      return next;
    });
  }, []);

  const { finishManualTimelineImport } = useManualTimelineImport({
    project: props.project,
    onChange: props.onChange,
    showEdgeLabels: props.showEdgeLabels,

    rfInstance,
    saveViewport: vp.saveViewport,

    g,

    uploadedTimelineFile,
    editedVideoFile,
    manualEditDraft,

    setUploadedTimelineFile,
    setEditedVideoFile,
    setManualEditDraft,
    setTimelineUploadOpen,
    setErrorDialog,
  });

  const clickedClipFilename = useMemo(() => {
    if (!g.clickedNodeId) return null;
    const node = g.rfNodes.find((n) => n.id === g.clickedNodeId) as any;
    if (!node || node.type !== "clip") return null;
    return (node.data?.videoFile?.filename as string | undefined) ?? null;
  }, [g.clickedNodeId, g.rfNodes]);

  const selectedNodeHasHiddenChildren = useMemo(() => {
    if (!g.clickedNodeId) return false;
    return getHiddenDescendantIds(g.clickedNodeId, g.rfNodes, g.rfEdges).length > 0;
  }, [g.clickedNodeId, g.rfNodes, g.rfEdges]);

  const hiddenChildCount = useMemo(() => {
    if (!g.clickedNodeId) return 0;
    return getHiddenDescendantIds(g.clickedNodeId, g.rfNodes, g.rfEdges).length;
  }, [g.clickedNodeId, g.rfNodes, g.rfEdges]);

  const davinci = useDavinciTimeline({
    project: props.project,
    clickedClipFilename,
    manualEditDraft,
  });

  // helper (z.B. in GraphView oder in einer kleinen utils-Datei)
  function jobStateStyle(state: "idle" | "running" | "error") {
    const paletteKey = state === "idle" ? "success" : state === "running" ? "warning" : "error";

    return {
      borderColor: `${paletteKey}.main`,
      bgColor: `${paletteKey}.50`, // sehr dezent
    } as const;
  }

  const confirmHideNode = useCallback(() => {
    if (!hideTargetId || hideTargetIds.length === 0) return;

    const idsToHide = new Set(hideTargetIds);

    const nextNodes = g.rfNodes.map((n) =>
      idsToHide.has(n.id)
        ? {
            ...n,
            hidden: true,
            data: {
              ...(n.data as any),
              isHidden: true,
            },
          }
        : n
    );

    const nextEdges = g.rfEdges.map((e) =>
      idsToHide.has(e.source) || idsToHide.has(e.target)
        ? {
            ...e,
            hidden: true,
            data: {
              ...(e.data as any),
              isHidden: true,
            },
          }
        : e
    );

    g.setRfNodes(nextNodes);
    g.setRfEdges(nextEdges);
    g.commit(nextNodes, nextEdges);

    if (g.clickedNodeId && idsToHide.has(g.clickedNodeId)) {
      g.setClickedNodeId(null);
      setActionDialogOpen(false);
    }

    props.onChange((prev) => {
      const wasSelected =
        prev.uiState?.selectedNodeId && idsToHide.has(prev.uiState.selectedNodeId);

      return {
        ...prev,
        uiState: {
          ...(prev.uiState ?? {}),
          selectedNodeId: wasSelected ? undefined : prev.uiState?.selectedNodeId,
        },
      };
    });

    setHideDialogOpen(false);
    setHideTargetId(null);
    setHideTargetIds([]);

    requestAnimationFrame(vp.saveViewport);
  }, [hideTargetId, hideTargetIds, g, props.onChange, vp.saveViewport]);

  const cancelHideNode = useCallback(() => {
    setHideDialogOpen(false);
    setHideTargetId(null);
    setHideTargetIds([]);
  }, []);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const nodeToDelete = g.rfNodes.find((n) => n.id === nodeId);
      if (!nodeToDelete) return;

      if ((nodeToDelete.data as any)?.isRoot) {
        setErrorDialog({
          title: "Cannot delete root node",
          message: "The root clip cannot be deleted.",
        });
        return;
      }

      const subtreeIds = Array.from(collectSubtreeNodeIds(nodeId, g.rfEdges));
      setDeleteTargetId(nodeId);
      setDeleteTargetIds(subtreeIds);
      setDeleteDialogOpen(true);
    },
    [g.rfNodes, g.rfEdges]
  );

  const showHiddenChildren = useCallback(
    (parentId: string) => {
      const directHiddenChildIds = getHiddenDescendantIds(parentId, g.rfNodes, g.rfEdges);
      if (directHiddenChildIds.length === 0) return;

      const idsToShow = new Set<string>();

      for (const childId of directHiddenChildIds) {
        const subtreeIds = collectSubtreeNodeIds(childId, g.rfEdges);
        for (const id of subtreeIds) {
          idsToShow.add(id);
        }
      }

      const nextNodes = g.rfNodes.map((n) =>
        idsToShow.has(n.id)
          ? {
              ...n,
              hidden: false,
              data: {
                ...(n.data as any),
                isHidden: false,
              },
            }
          : n
      );

      const nextEdges = g.rfEdges.map((e) =>
        idsToShow.has(e.source) || idsToShow.has(e.target)
          ? {
              ...e,
              hidden: false,
              data: {
                ...(e.data as any),
                isHidden: false,
              },
            }
          : e
      );

      g.setRfNodes(nextNodes);
      g.setRfEdges(nextEdges);
      g.commit(nextNodes, nextEdges);

      requestAnimationFrame(vp.saveViewport);
    },
    [g, vp.saveViewport]
  );

  const confirmDeleteNode = useCallback(() => {
    if (!deleteTargetId || deleteTargetIds.length === 0) return;

    const idsToDelete = new Set(deleteTargetIds);

    const nextNodes = g.rfNodes.filter((n) => !idsToDelete.has(n.id));
    const nextEdges = g.rfEdges.filter(
      (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
    );

    g.setRfNodes(nextNodes);
    g.setRfEdges(nextEdges);
    g.commit(nextNodes, nextEdges);

    if (g.clickedNodeId && idsToDelete.has(g.clickedNodeId)) {
      g.setClickedNodeId(null);
      setActionDialogOpen(false);
    }

    props.onChange((prev) => {
      const wasSelected =
        prev.uiState?.selectedNodeId && idsToDelete.has(prev.uiState.selectedNodeId);

      return {
        ...prev,
        uiState: {
          ...(prev.uiState ?? {}),
          selectedNodeId: wasSelected ? undefined : prev.uiState?.selectedNodeId,
        },
      };
    });

    setDeleteDialogOpen(false);
    setDeleteTargetId(null);
    setDeleteTargetIds([]);

    requestAnimationFrame(vp.saveViewport);
  }, [deleteTargetId, deleteTargetIds, g, props.onChange, vp.saveViewport]);

  const nodesForUI = useMemo(() => {
    const nodes = g.nodesWithRootFlag as Node[];
    const edges = g.rfEdges as Edge[];

    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const incoming = buildIncomingMap(edges);

    // 1) Erst alle Nodes für UI vorbereiten, aber branchSuggestion noch leer lassen
    const precomputedNodes = nodes.map((n) => {
      const baseData = (n.data as any) ?? {};

      const injectedCommon = {
        ...baseData,
        videoOpened: Boolean(baseData?.videoOpened),
        highlightUnseenEnabled: props.highlightUnseenEnabled,
        notesEnabled: props.notesEnabled,
        onSaveNote: saveNodeNote,
        markVideoOpened,
        onDelete: handleDeleteNode,
        onHide: handleHideNode,
        categoryLabels,
        categoryVisibility,
        onSetCategoryVisible: setCategoryVisible,
        onShowAllCategories: showAllCategories,
        onAdd: (nodeId: string) => {
          g.setClickedNodeId(nodeId);
          props.onChange((prev) => ({
            ...prev,
            uiState: { ...(prev.uiState ?? {}), selectedNodeId: nodeId },
          }));
          setActionDialogOpen(true);
        },
      };

      if (n.type !== "params") {
        return { ...n, data: injectedCommon, hidden: Boolean(baseData?.isHidden) };
      }

      const prevParamsId = findPrevParamsId(n.id, nodesById, incoming);
      const prevParamsData = prevParamsId ? (nodesById.get(prevParamsId)?.data as any) : null;

      const curPrompt = injectedCommon.prompt ?? "";
      const prevPrompt = prevParamsData?.prompt ?? "";

      const promptChanged =
        typeof curPrompt === "string" &&
        typeof prevPrompt === "string" &&
        curPrompt.trim() !== prevPrompt.trim();

      const deltas = prevParamsData
        ? {
            highNoiseCfg: numDelta(injectedCommon, prevParamsData, "highNoiseCfg"),
            lowNoiseCfg: numDelta(injectedCommon, prevParamsData, "lowNoiseCfg"),

            highNoiseShift: numDelta(injectedCommon, prevParamsData, "highNoiseShift"),
            lowNoiseShift: numDelta(injectedCommon, prevParamsData, "lowNoiseShift"),

            highNoiseModelStrength: numDelta(
              injectedCommon,
              prevParamsData,
              "highNoiseModelStrength"
            ),
            lowNoiseModelStrength: numDelta(
              injectedCommon,
              prevParamsData,
              "lowNoiseModelStrength"
            ),

            highNoiseSteps: numDelta(injectedCommon, prevParamsData, "highNoiseSteps"),
            lowNoiseSteps: numDelta(injectedCommon, prevParamsData, "lowNoiseSteps"),

            highNoiseStartStep: numDelta(injectedCommon, prevParamsData, "highNoiseStartStep"),
            lowNoiseStartStep: numDelta(injectedCommon, prevParamsData, "lowNoiseStartStep"),

            highNoiseEndStep: numDelta(injectedCommon, prevParamsData, "highNoiseEndStep"),
            lowNoiseEndStep: numDelta(injectedCommon, prevParamsData, "lowNoiseEndStep"),
          }
        : null;

      const curScores = injectedCommon.categoryScores;
      const prevScores = prevParamsData?.categoryScores;

      const categoryScoreDeltas =
        curScores && prevScores ? buildScoreDeltaMap(curScores, prevScores) : null;

      return {
        ...n,
        hidden: Boolean(baseData?.isHidden),
        data: {
          ...injectedCommon,
          prevParamsId,
          paramDeltas: deltas,
          categoryScoreDeltas,
          promptChanged,
          branchSuggestion: null,
        },
      };
    });

    // 2) Jetzt Map auf Basis der bereits angereicherten Nodes bauen
    const precomputedById = new Map(precomputedNodes.map((n) => [n.id, n as RFNode]));

    console.log(
      "nodesWithRootFlag",
      nodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        isHidden: n.data?.isHidden,
      }))
    );

    // 3) Jetzt branchSuggestion wirklich berechnen
    return precomputedNodes.map((n) => {
      if (n.type !== "params") return n;

      const branchSteps = collectParamBranchSteps(n.id, precomputedById, edges);

      const branchSuggestion = detectParamWeightSuggestion(branchSteps, {
        minSteps: 5,
        minCategoryDeltaAbs: 1,
        minParamDeltaAbs: 0.01,
        minHits: 7,
        minStreak: 5,
        recencyWindow: 15,
      });

      return {
        ...n,
        data: {
          ...(n.data as any),
          branchSuggestion,
        },
      };
    });
  }, [
    g.nodesWithRootFlag,
    g.rfEdges,
    g.setClickedNodeId,
    props.onChange,
    markVideoOpened,
    saveNodeNote,
    handleDeleteNode,
    handleHideNode,
    props.highlightUnseenEnabled,
    props.notesEnabled,
    categoryLabels,
    categoryVisibility,
  ]);

  // ---------- Root create ----------
  function createRoot() {
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

            const PARAM_BRANCH_SPACING = 140;
            const NODE_GAP_X = 60;

            const paramSize = getDefaultNodeSize("params");
            const clipSize = getDefaultNodeSize("clip");

            const desiredParam: { x: number; y: number } = {
              x: baseX + clipSize.w + NODE_GAP_X,
              y: baseY + (branchIndex - 1) * PARAM_BRANCH_SPACING,
            };

            const paramPos = findFreePosition(desiredParam, prevNodes, {
              stepY: 50,
              pad: 40,
              newNodeType: "params",
              newNodeWidth: paramSize.w,
              newNodeHeight: paramSize.h,
              extraBottom: 20,
            });

            const desiredClip: { x: number; y: number } = {
              x: paramPos.x + paramSize.w + NODE_GAP_X,
              y: paramPos.y,
            };

            const tempParamNode: RFNode = {
              id: paramId,
              type: "params",
              position: paramPos,
              data: {} as any,
              width: paramSize.w,
              height: paramSize.h + 20,
            };

            const clipPos = findFreePosition(desiredClip, [...prevNodes, tempParamNode], {
              stepY: 50,
              pad: 30,
              newNodeType: "clip",
              newNodeWidth: clipSize.w,
              newNodeHeight: clipSize.h,
              extraBottom: 20,
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
                categoryScores: allScores,
                categoryLabels,
                categoryVisibility,
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
      {!hasRoot && (
        <Paper elevation={2} sx={{ position: "absolute", zIndex: 10, top: 12, left: 12, p: 1 }}>
          <Button variant="contained" onClick={createRoot}>
            Start Root
          </Button>
        </Paper>
      )}

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
        showHiddenChildrenButton={selectedNodeHasHiddenChildren}
        hiddenChildrenCount={hiddenChildCount}
        onClose={() => setActionDialogOpen(false)}
        onManualEdit={() => {
          if (g.clickedNodeId) addManualEdit(g.clickedNodeId);
          setActionDialogOpen(false);
        }}
        onGenerate={() => {
          if (g.clickedNodeId) addAIGenerateFromParent(g.clickedNodeId);
          setActionDialogOpen(false);
        }}
        onShowHiddenChildren={() => {
          if (g.clickedNodeId) showHiddenChildren(g.clickedNodeId);
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
        simulateSliderChange={v2v.simulateSliderChange}
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
        onFinish={finishManualTimelineImport}
      />

      <ErrorDialog error={errorDialog} onClose={() => setErrorDialog(null)} />

      <DeleteNodeDialog
        open={deleteDialogOpen}
        nodeLabel={
          deleteTargetId
            ? (g.rfNodes.find((n) => n.id === deleteTargetId)?.data as any)?.label
            : undefined
        }
        affectedCount={deleteTargetIds.length}
        onClose={() => {
          setDeleteDialogOpen(false);
          setDeleteTargetId(null);
          setDeleteTargetIds([]);
        }}
        onConfirm={confirmDeleteNode}
      />

      <HideNodeDialog
        open={hideDialogOpen}
        nodeLabel={
          hideTargetId
            ? (g.rfNodes.find((n) => n.id === hideTargetId)?.data as any)?.label
            : undefined
        }
        affectedCount={hideTargetIds.length}
        onClose={() => {
          setHideDialogOpen(false);
          setHideTargetId(null);
          setHideTargetIds([]);
        }}
        onConfirm={confirmHideNode}
      />
    </div>
  );
}

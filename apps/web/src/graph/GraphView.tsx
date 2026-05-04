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

import {
  buildNodeMap,
  getBranchEdgeIds,
  getBranchNodeIds,
  getBranchPathThroughSelected,
  type Edge,
  type Node,
  type Project,
  type StoredMediaFile,
} from "@ma/shared";
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
  comfyBuildVideoUrl,
} from "../api";
import { parsedChangelogLines } from "../utils/parseTimelineChangelog";

// hooks
import { useProjectGraph } from "./hooks/useProjectGraph";
import { useViewport } from "./hooks/useViewport";
import { useV2VSliders } from "./hooks/useV2VSliders";
import {
  deriveV2VParamsFromSimple,
  getScoreRanges,
  computeAllScores,
  numDelta,
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
  scoreToEdgeColor,
  scoreToStrokeWidth,
} from "./graph_helpers/layout";
import {
  buildIncomingMap,
  findPrevParamsId,
  collectSubtreeNodeIds,
  getHiddenDescendantIds,
  buildParameterHistoryFromBranchSteps,
  getSimpleFromParentClip,
  collectParamTimelineForClip,
  getVideoSegmentPlaybackForClip,
  useLatestRef,
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
  loadSliderOrder,
  saveCategoryVisibility,
  saveCustomSliders,
  saveFormulaWeights,
  saveSliderOrder,
} from "../utils/localStorage";
import {
  BrachSuggestion,
  CustomScoreSlider,
  FormulaWeights,
  GraphCardContentMode,
  GraphCardDisplayMode,
  OrderedSliderItem,
  ParamDeltaCacheEntry,
  StandardCategoryKey,
  TransitionEvaluation,
} from "./types/ui";
import { buildCompareCategoryDeltas, buildCompareDelta } from "./graph_helpers/compareLogic";
import { NodeDetailsDialog } from "./dialogs/NodeDetailsDialog";
import { DEFAULT_FORMULA_WEIGHTS, DEFAULT_BASE_ORDER } from "./graph_helpers/presets";
import { ImportVideoDialog } from "./dialogs/ImportVideoDialog";

import { useClipDialogLogic } from "./graph_helpers/clipDialogLogic";
import { useNodeDetailsDialog } from "./hooks/useNodeDetailsDialogLogic";

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
  showWeightSuggestionsEnabled: boolean;
  graphCardContentMode: GraphCardContentMode;
  graphCardDisplayMode: GraphCardDisplayMode;
  restrictCategories: boolean;
  showOnlyChangedParameters: boolean;
  transitionEvaluations: Record<string, TransitionEvaluation>;
  showOnlyGeneratedPart: boolean;
  onSidebarDataChange?: (data: {
    selectedNodeId: string | null;
    selectedNodeLabel: string | null;
    selectedNodeType: string | null;
    computed: any | null;
    orderedSliderItems: OrderedSliderItem[];
    clipLogic: any;
    parameterItems: any[];
    parameterHistory: any;
    compareBaseNodeLabel: string | null;
    prompt: string;
    note: string;
    notesEnabled: boolean;
    onChangeNote: (value: string) => void;
    onSaveNote: () => void;
    branchSuggestion: BrachSuggestion | null;
  }) => void;
  activeClipPick?: {
    slotIndex: number;
  } | null;
  onClipPicked?: (clip: { id: string; label?: string | null; videoUrl?: string | null }) => void;
  externalCompareRequest?: {
    sourceNodeId: string;
    targetNodeId: string;
    requestKey: number;
  } | null;
  externalOpenDetailsRequest?: {
    nodeId: string;
    requestKey: number;
  } | null;
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
  });

  const markVideoOpened = useCallback(
    (nodeId: string) => {
      g.setRfNodes((prev) => {
        const next = prev.map((n) =>
          n.id === nodeId ? { ...n, data: { ...(n.data as any), videoOpened: true } } : n
        );

        g.setRfEdges((prevE) => {
          g.commit(next, prevE);
          return prevE;
        });

        return next;
      });
    },
    [g.setRfNodes, g.setRfEdges, g.commit]
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
    [g.setRfNodes, g.setRfEdges, g.commit]
  );

  // ✅ inject onAdd handler for the "+" button inside nodes

  // keep selection in project uiState (same behavior)

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

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [hideTargetId, setHideTargetId] = useState<string | null>(null);
  const [hideTargetIds, setHideTargetIds] = useState<string[]>([]);
  const [sidebarLocalNote, setSidebarLocalNote] = useState("");
  const [detailsLocalNote, setDetailsLocalNote] = useState("");
  const [compareModeSource, setCompareModeSource] = useState<"graph" | "sidebar" | null>(null);

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

  const [categoryVisibility, setCategoryVisibility] = useState<Record<string, boolean>>(() =>
    loadCategoryVisibility()
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    props.project.uiState?.selectedNodeId ?? null
  );

  const [formulaWeights, setFormulaWeights] = useState<FormulaWeights>(() => loadFormulaWeights());
  const [sliderOrder, setSliderOrder] = useState<string[]>(() => loadSliderOrder());

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);

  const [compareSourceNodeId, setCompareSourceNodeId] = useState<string | null>(null);
  const [isComparePicking, setIsComparePicking] = useState(false);
  const [compareTargetNodeId, setCompareTargetNodeId] = useState<string | null>(null);

  const [importVideoDialogOpen, setImportVideoDialogOpen] = useState(false);
  const [importVideoFile, setImportVideoFile] = useState<File | null>(null);
  const [importVideoUploading, setImportVideoUploading] = useState(false);
  const [importVideoStatus, setImportVideoStatus] = useState("");

  const v2v = useV2VSliders(formulaWeights);

  const finishComparePick = useCallback(
    (targetNodeId: string) => {
      if (!compareSourceNodeId) return;

      if (targetNodeId === compareSourceNodeId) return;

      setCompareTargetNodeId(targetNodeId);
      setIsComparePicking(false);
      setDetailsNodeId(compareSourceNodeId);
      setDetailsOpen(true);
    },
    [compareSourceNodeId]
  );

  const handleOpenDetails = useCallback(
    (nodeId: string) => {
      if (props.activeClipPick !== null) return;

      if (isComparePicking && compareSourceNodeId) {
        finishComparePick(nodeId);
        return;
      }

      setDetailsNodeId(nodeId);
      setDetailsOpen(true);
    },
    [props.activeClipPick, isComparePicking, compareSourceNodeId, finishComparePick]
  );

  const handleCloseDetails = useCallback(() => {
    setDetailsOpen(false);
    setCompareSourceNodeId(null);
    setCompareTargetNodeId(null);
    setIsComparePicking(false);
    setCompareModeSource(null);
  }, []);

  const [customSliders, setCustomSliders] = useState<CustomScoreSlider[]>(() =>
    loadCustomSliders()
  );

  const createCustomSlider = useCallback((name: string, w: any) => {
    const id = `custom:${Date.now()}`;

    const newSlider: CustomScoreSlider = {
      id,
      name: name.trim(),
      w,
    };

    setCustomSliders((prev) => {
      const next = [...prev, newSlider];
      saveCustomSliders(next);
      return next;
    });

    setSliderOrder((prev) => {
      const next = [...prev, id];
      saveSliderOrder(next);
      return next;
    });
  }, []);

  const updateCustomSlider = useCallback((id: string, name: string, w: any) => {
    setCustomSliders((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, name: name.trim(), w } : x));
      saveCustomSliders(next);
      return next;
    });
  }, []);

  const deleteCustomSlider = useCallback((id: string) => {
    setCustomSliders((prev) => {
      const next = prev.filter((x) => x.id !== id);
      saveCustomSliders(next);
      return next;
    });

    setSliderOrder((prev) => {
      const next = prev.filter((x) => x !== id);
      saveSliderOrder(next);
      return next;
    });

    setCategoryVisibility((prev) => {
      const next = { ...prev };
      delete next[id];
      saveCategoryVisibility(next);
      return next;
    });
  }, []);

  const patchFormulaWeights = useCallback(
    <K extends keyof FormulaWeights>(cat: K, patch: Partial<FormulaWeights[K]>) => {
      setFormulaWeights((prev) => {
        const current = prev[cat] as FormulaWeights[K] & Record<string, unknown>;

        const next: FormulaWeights = {
          ...prev,
          [cat]: {
            ...current,
            ...patch,
          } as FormulaWeights[K],
        };

        saveFormulaWeights(next);
        return next;
      });
    },
    []
  );

  const resetFormulaWeights = useCallback(() => {
    setFormulaWeights(DEFAULT_FORMULA_WEIGHTS);
    saveFormulaWeights(DEFAULT_FORMULA_WEIGHTS);
  }, []);

  useEffect(() => {
    saveCategoryVisibility(categoryVisibility);
  }, [categoryVisibility]);

  useEffect(() => {
    const customIds = customSliders.map((s) => s.id);
    const validIds = [...DEFAULT_BASE_ORDER, ...customIds];

    setSliderOrder((prev) => {
      const filtered = prev.filter((id) => validIds.includes(id));
      const missing = validIds.filter((id) => !filtered.includes(id));
      const next = [...filtered, ...missing];
      saveSliderOrder(next);
      return next;
    });
  }, [customSliders]);

  useEffect(() => {
    if (props.activeClipPick !== null) {
      setActionDialogOpen(false);
      setDetailsOpen(false);
    }
  }, [props.activeClipPick]);

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

  const orderedSliderItems = useMemo<OrderedSliderItem[]>(() => {
    const customById = new Map(customSliders.map((s) => [s.id, s]));

    return sliderOrder
      .map((id): OrderedSliderItem | null => {
        if (DEFAULT_BASE_ORDER.includes(id as StandardCategoryKey)) {
          return { id: id as StandardCategoryKey, kind: "base" };
        }

        const custom = customById.get(id);
        return custom ? { id: custom.id, kind: "custom", slider: custom } : null;
      })
      .filter((item): item is OrderedSliderItem => item !== null);
  }, [sliderOrder, customSliders]);

  const moveSlider = useCallback((id: string, direction: "up" | "down") => {
    setSliderOrder((prev) => {
      const index = prev.indexOf(id);
      if (index === -1) return prev;

      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      saveSliderOrder(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!props.externalCompareRequest) return;

    const { sourceNodeId, targetNodeId } = props.externalCompareRequest;

    setCompareModeSource("sidebar");
    setCompareSourceNodeId(sourceNodeId);
    setCompareTargetNodeId(targetNodeId);
    setIsComparePicking(false);
    setDetailsNodeId(sourceNodeId);
    setDetailsOpen(true);

    selectNode(sourceNodeId);
  }, [props.externalCompareRequest?.requestKey]);

  useEffect(() => {
    if (!props.externalOpenDetailsRequest) return;

    const { nodeId } = props.externalOpenDetailsRequest;

    selectNode(nodeId);
    setDetailsNodeId(nodeId);
    setDetailsOpen(true);

    setActionDialogOpen(false);
  }, [props.externalOpenDetailsRequest?.requestKey]);

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

  const canonicalSimple = useMemo(() => {
    const totalStepsInt = Math.round(v2v.simple.totalSteps);
    const stepRatioPctInt = Math.round(v2v.simple.stepRatioPct);
    const lowStepsInt = Math.round((totalStepsInt * stepRatioPctInt) / 100);
    const effectiveLowStepPct = Math.round((lowStepsInt / totalStepsInt) * 100);

    return {
      totalSteps: totalStepsInt,
      stepRatioPct: effectiveLowStepPct,
      lowStepsInt,
      stepRatio01: lowStepsInt / totalStepsInt,
      highShift: v2v.simple.highShift,
      highCfg: v2v.simple.highCfg,
      highStrength: v2v.simple.highStrength,
    };
  }, [v2v.simple]);

  const allScores = useMemo(() => {
    return computeAllScores(
      {
        totalSteps: canonicalSimple.totalSteps,
        stepRatioPct: canonicalSimple.stepRatioPct,
        highShift: canonicalSimple.highShift,
        highCfg: canonicalSimple.highCfg,
        highStrength: canonicalSimple.highStrength,
      },
      scoreRanges,
      formulaWeights,
      customSliders
    );
  }, [canonicalSimple, scoreRanges, formulaWeights, customSliders]);

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

  const hiddenDescendantIds = useMemo(() => {
    if (!g.clickedNodeId) return [];
    return getHiddenDescendantIds(g.clickedNodeId, g.rfNodes, g.rfEdges);
  }, [g.clickedNodeId, g.rfNodes, g.rfEdges]);

  const selectedNodeHasHiddenChildren = hiddenDescendantIds.length > 0;
  const hiddenChildCount = hiddenDescendantIds.length;

  const davinci = useDavinciTimeline({
    project: props.project,
    clickedClipFilename,
    manualEditDraft,
  });

  // helper (z.B. in GraphView oder in einer kleinen utils-Datei)

  const exitCompareMode = useCallback(() => {
    setIsComparePicking(false);
    setCompareSourceNodeId(null);
    setCompareTargetNodeId(null);
    setCompareModeSource(null);
  }, []);

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

  const handleStartCompare = useCallback((nodeId: string) => {
    setCompareModeSource("graph");
    setCompareSourceNodeId(nodeId);
    setCompareTargetNodeId(null);
    setIsComparePicking(true);
    setDetailsOpen(false);
  }, []);

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

  const setClickedNodeId = g.setClickedNodeId;

const selectNode = useCallback(
  (nodeId: string) => {
    setClickedNodeId(nodeId);
    setSelectedNodeId(nodeId);

    props.onChange((prev) => ({
      ...prev,
      uiState: {
        ...(prev.uiState ?? {}),
        selectedNodeId: nodeId,
      },
    }));
  },
  [setClickedNodeId, props.onChange]
);

  const renderStartRef = useRef(0);
  renderStartRef.current = performance.now();

  useEffect(() => {
    console.log("render GraphView", Math.round(performance.now() - renderStartRef.current), "ms");
  });

  const projectNodeMap = useMemo(() => {
    return buildNodeMap(props.project);
  }, [props.project.nodes]);

  const highlightedBranch = useMemo(() => {
    if (!selectedNodeId) {
      return {
        branchPath: [],
        edgeIds: new Set<string>(),
        nodeIds: new Set<string>(),
      };
    }

    const branchPath = getBranchPathThroughSelected(selectedNodeId, props.project, projectNodeMap);

    return {
      branchPath,
      edgeIds: getBranchEdgeIds(branchPath, props.project),
      nodeIds: getBranchNodeIds(branchPath),
    };
  }, [selectedNodeId, props.project.nodes, props.project.edges, projectNodeMap]);

  const activeClipPickRef = useLatestRef(props.activeClipPick);
  const selectNodeRef = useLatestRef(selectNode);
  const markVideoOpenedRef = useLatestRef(markVideoOpened);
  const saveNodeNoteRef = useLatestRef(saveNodeNote);
  const handleDeleteNodeRef = useLatestRef(handleDeleteNode);
  const handleHideNodeRef = useLatestRef(handleHideNode);
  const handleOpenDetailsRef = useLatestRef(handleOpenDetails);
  const handleStartCompareRef = useLatestRef(handleStartCompare);

  const graphActions = useMemo(
    () => ({
      onAdd: (nodeId: string) => {
        if (activeClipPickRef.current !== null) return;
        selectNodeRef.current(nodeId);
        setActionDialogOpen(true);
      },
      onVideoOpened: (nodeId: string) => markVideoOpenedRef.current(nodeId),
      onSaveNote: (nodeId: string, note: string) => saveNodeNoteRef.current(nodeId, note),
      onDelete: (nodeId: string) => handleDeleteNodeRef.current(nodeId),
      onHide: (nodeId: string) => handleHideNodeRef.current(nodeId),
      onOpenDetails: (nodeId: string) => handleOpenDetailsRef.current(nodeId),
      onStartCompare: (nodeId: string) => handleStartCompareRef.current(nodeId),
      onSelectNode: (nodeId: string) => selectNodeRef.current(nodeId),
    }),
    []
  );

  const deltaCacheRef = useRef(new Map<string, ParamDeltaCacheEntry>());

  function scoreKey(scores: any): string {
    if (!scores) return "";

    return Object.keys(scores)
      .sort()
      .map((k) => `${k}:${scores[k]}`)
      .join("|");
  }

  function paramDeltaKey(nodeId: string, cur: any, prevParamsId: string | null, prev: any): string {
    return [
      nodeId,
      prevParamsId ?? "",
      cur.prompt ?? "",
      prev?.prompt ?? "",

      cur.highNoiseCfg,
      prev?.highNoiseCfg,
      cur.lowNoiseCfg,
      prev?.lowNoiseCfg,

      cur.highNoiseShift,
      prev?.highNoiseShift,
      cur.lowNoiseShift,
      prev?.lowNoiseShift,

      cur.highNoiseModelStrength,
      prev?.highNoiseModelStrength,
      cur.lowNoiseModelStrength,
      prev?.lowNoiseModelStrength,

      cur.highNoiseSteps,
      prev?.highNoiseSteps,
      cur.lowNoiseSteps,
      prev?.lowNoiseSteps,

      cur.highNoiseStartStep,
      prev?.highNoiseStartStep,
      cur.lowNoiseStartStep,
      prev?.lowNoiseStartStep,

      cur.highNoiseEndStep,
      prev?.highNoiseEndStep,
      cur.lowNoiseEndStep,
      prev?.lowNoiseEndStep,

      cur.displayTotalSteps,
      prev?.displayTotalSteps,
      cur.displayLowStepPct,
      prev?.displayLowStepPct,

      scoreKey(cur.categoryScores),
      scoreKey(prev?.categoryScores),
    ].join("§");
  }

  const baseNodesForUI = useMemo(() => {
    const nodes = g.nodesWithRootFlag as Node[];
    const edges = g.rfEdges as Edge[];

    const rawNodesById = new Map(nodes.map((n) => [n.id, n]));
    const incoming = buildIncomingMap(edges);

    // 1) Erst alle UI-Nodes mit Deltas vorberechnen
    const basePrecomputedNodes = nodes.map((n: RFNode) => {
      const baseData = (n.data as any) ?? {};

      const injectedCommon = {
        ...baseData,
        videoOpened: Boolean(baseData?.videoOpened),

        onAdd: graphActions.onAdd,
        onVideoOpened: graphActions.onVideoOpened,
        onSaveNote: graphActions.onSaveNote,
        onDelete: graphActions.onDelete,
        onHide: graphActions.onHide,
        onOpenDetails: graphActions.onOpenDetails,
        onStartCompare: graphActions.onStartCompare,
        onSelectNode: graphActions.onSelectNode,

        highlightUnseenEnabled: props.highlightUnseenEnabled,
        notesEnabled: props.notesEnabled,
        showWeightSuggestionsEnabled: props.showWeightSuggestionsEnabled,
        graphCardContentMode: props.graphCardContentMode,
        graphCardDisplayMode: props.graphCardDisplayMode,
        showOnlyChangedParameters: props.showOnlyChangedParameters,
        activeClipPick: props.activeClipPick ?? null,
        onPickClipNode: props.onClipPicked,
      };

      // ---------- clip ----------
      if (n.type === "clip") {
        const videoFile = baseData.videoFile ?? null;
        const videoStatus = baseData.videoStatus;
        const videoUrl = baseData.videoUrl ?? (videoFile ? comfyBuildVideoUrl(videoFile) : null);

        return {
          ...n,
          hidden: Boolean(baseData?.isHidden),
          data: {
            ...injectedCommon,
            videoFile,
            videoStatus,
            videoUrl,
          },
        };
      }

      // ---------- edit ----------
      if (n.type === "edit") {
        const exportInfo = baseData?.export;
        const timeline = baseData?.timeline;
        const importedAt = timeline?.importedAt;
        const changelog = (timeline?.changelog as any[]) ?? [];
        const prevEffectKeys: string[] = baseData?.prevEffectKeys ?? [];

        const { summaryLines, detailLines } = parsedChangelogLines(changelog, prevEffectKeys);

        const counts = changelog.reduce(
          (acc, c) => {
            acc[c.type] = (acc[c.type] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          ...n,
          hidden: Boolean(baseData?.isHidden),
          data: {
            ...injectedCommon,
            export: exportInfo,
            timeline,
            importedAt,
            changelog,
            summaryLines,
            detailLines,
            prevEffectKeys,
            metaSummaryData: {
              tool: baseData?.tool ?? "resolve",
              status: exportInfo?.status ?? "waiting",
              importedAt,
              changelogLength: changelog.length,
              counts,
              summaryLines,
              detailLines,
            },
          },
        };
      }

      // ---------- other ----------
      if (n.type !== "params") {
        return {
          ...n,
          hidden: Boolean(baseData?.isHidden),
          data: injectedCommon,
        };
      }

      // ---------- params ----------
      const prevParamsId = findPrevParamsId(n.id, rawNodesById, incoming);
      const prevParamsData = prevParamsId ? (rawNodesById.get(prevParamsId)?.data as any) : null;

      const cacheKey = paramDeltaKey(n.id, injectedCommon, prevParamsId, prevParamsData);
      const cached = deltaCacheRef.current.get(n.id);

      let finalDeltas: any = null;
      let finalCategoryScoreDeltas: any = null;
      let finalPromptChanged = false;

      if (cached?.key === cacheKey) {
        finalDeltas = cached.deltas;
        finalCategoryScoreDeltas = cached.categoryScoreDeltas;
        finalPromptChanged = cached.promptChanged;
      } else {
        const curPrompt = injectedCommon.prompt ?? "";
        const prevPrompt = prevParamsData?.prompt ?? "";

        finalPromptChanged =
          typeof curPrompt === "string" &&
          typeof prevPrompt === "string" &&
          curPrompt.trim() !== prevPrompt.trim();

        finalDeltas = prevParamsData
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

              displayTotalSteps: numDelta(injectedCommon, prevParamsData, "displayTotalSteps"),
              displayLowStepPct: numDelta(injectedCommon, prevParamsData, "displayLowStepPct"),
            }
          : null;

        const curScores = injectedCommon.categoryScores;
        const prevScores = prevParamsData?.categoryScores;

        finalCategoryScoreDeltas =
          curScores && prevScores ? buildScoreDeltaMap(curScores, prevScores) : null;

        deltaCacheRef.current.set(n.id, {
          key: cacheKey,
          deltas: finalDeltas,
          categoryScoreDeltas: finalCategoryScoreDeltas,
          promptChanged: finalPromptChanged,
        });
      }

      return {
        ...n,
        hidden: Boolean(baseData?.isHidden),
        data: {
          ...injectedCommon,
          categoryLabels,
          prevParamsId,
          paramDeltas: finalDeltas,
          categoryScoreDeltas: finalCategoryScoreDeltas,
          promptChanged: finalPromptChanged,

          categoryVisibility,
          onSetCategoryVisible: setCategoryVisible,
          onShowAllCategories: showAllCategories,
          isComparePicking,
          compareSourceNodeId,
        },
      };
    });

    // 2) Jetzt mit den vorberechneten Nodes branchSuggestion + parameterHistory berechnen

    return basePrecomputedNodes;
  }, [
    g.nodesWithRootFlag,
    g.rfEdges,
    categoryLabels,
    graphActions,
    props.highlightUnseenEnabled,
    props.notesEnabled,
    props.showWeightSuggestionsEnabled,
    props.graphCardContentMode,
    props.graphCardDisplayMode,
    props.showOnlyChangedParameters,
    categoryVisibility,
    setCategoryVisible,
    showAllCategories,
    isComparePicking,
    compareSourceNodeId,
    props.activeClipPick,
    props.onClipPicked,
  ]);

  const handleInit = useCallback((instance: ReactFlowInstance) => {
    setRfInstance(instance);
  }, []);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      if (props.activeClipPick && node.type === "clip") {
        const nodeData = node.data as any;

        props.onClipPicked?.({
          id: node.id,
          label: nodeData?.label ?? null,
          videoUrl: nodeData?.videoUrl ?? null,
        });

        setActionDialogOpen(false);
        setDetailsOpen(false);
        return;
      }

      if (isComparePicking && compareSourceNodeId) {
        finishComparePick(node.id);
        return;
      }

      selectNode(node.id);

      if (node.type === "clip" || node.type === "edit" || node.type === "import") {
        setActionDialogOpen(true);
      }
    },
    [
      props.activeClipPick,
      props.onClipPicked,
      isComparePicking,
      compareSourceNodeId,
      finishComparePick,
      selectNode,
    ]
  );

  const handleNodeDragStop = useCallback(
    (_: any, node: RFNode) => {
      g.setRfNodes((prev) => {
        const next = prev.map((n) => (n.id === node.id ? { ...n, position: node.position } : n));

        g.commit(next, g.rfEdges);
        return next;
      });

      requestAnimationFrame(vp.saveViewport);
    },
    [g.setRfNodes, g.commit, g.rfEdges, vp.saveViewport]
  );

  const baseNodesById = useMemo(() => {
    return new Map(baseNodesForUI.map((n) => [n.id, n]));
  }, [baseNodesForUI]);

  const nodesForUICacheRef = useRef(new Map<string, RFNode>());

  const nodesForUI = useMemo(() => {
    const prevCache = nodesForUICacheRef.current;
    const nextCache = new Map<string, RFNode>();

    const nextNodes = baseNodesForUI.map((n) => {
      const prev = prevCache.get(n.id);
      const isTimelineNode = highlightedBranch.nodeIds.has(n.id);
      const prevData = prev?.data as any;

      if (
        prev &&
        prevData?.isTimelineNode === isTimelineNode &&
        prevData?.__baseDataRef === n.data
      ) {
        nextCache.set(n.id, prev);
        return prev;
      }

      const next: RFNode = {
        ...n,
        data: {
          ...(n.data as any),
          isTimelineNode,
          __baseDataRef: n.data,
        },
      };

      nextCache.set(n.id, next);
      return next;
    });

    nodesForUICacheRef.current = nextCache;
    return nextNodes;
  }, [baseNodesForUI, highlightedBranch.nodeIds]);

  const edgesForUICacheRef = useRef(new Map<string, RFEdge>());

  const edgesForUI = useMemo(() => {
    const prevCache = edgesForUICacheRef.current;
    const nextCache = new Map<string, RFEdge>();

    const nextEdges = g.rfEdges.map((edge) => {
      const sourceNode = baseNodesById.get(edge.source);
      const targetNode = baseNodesById.get(edge.target);

      const isParamToClip = sourceNode?.type === "params" && targetNode?.type === "clip";
      const evaluation = isParamToClip ? props.transitionEvaluations[edge.target] : undefined;

      const score = evaluation?.overallScore;
      const strokeWidth =
        typeof score === "number" ? scoreToStrokeWidth(score) : (edge.data as any)?.strokeWidth;

      const isTimelineEdge = highlightedBranch.edgeIds.has(edge.id);
      const prev = prevCache.get(edge.id);
      const prevData = prev?.data as any;

      if (
        prev &&
        prevData?.__baseEdgeRef === edge &&
        prevData?.isTimelineEdge === isTimelineEdge &&
        prevData?.transitionScore === score &&
        prevData?.transitionLabel === evaluation?.label &&
        prevData?.appearanceScore === evaluation?.appearanceScore &&
        prevData?.motionScore === evaluation?.motionScore &&
        prevData?.boundaryJumpScore === evaluation?.boundaryJumpScore &&
        prevData?.strokeWidth === strokeWidth
      ) {
        nextCache.set(edge.id, prev);
        return prev;
      }

      const next: RFEdge = {
        ...edge,
        data: {
          ...(edge.data as any),
          __baseEdgeRef: edge,
          isTimelineEdge,
          transitionScore: score,
          transitionLabel: evaluation?.label,
          appearanceScore: evaluation?.appearanceScore,
          motionScore: evaluation?.motionScore,
          boundaryJumpScore: evaluation?.boundaryJumpScore,
          strokeWidth,
          scoreColorHint:
            typeof score === "number"
              ? scoreToEdgeColor(score, "")
              : (edge.data as any)?.scoreColorHint,
        },
      };

      nextCache.set(edge.id, next);
      return next;
    });

    edgesForUICacheRef.current = nextCache;
    return nextEdges;
  }, [g.rfEdges, baseNodesById, props.transitionEvaluations, highlightedBranch.edgeIds]);

  const compareSelector = useMemo(() => {
    if (!compareSourceNodeId || !compareTargetNodeId) return undefined;

    const sourceNode = nodesForUI.find((n) => n.id === compareSourceNodeId) as RFNode | undefined;
    const targetNode = nodesForUI.find((n) => n.id === compareTargetNodeId) as RFNode | undefined;

    const sourceParentClipId = (sourceNode?.data as any)?.parentClipId ?? null;
    const targetParentClipId = (targetNode?.data as any)?.parentClipId ?? null;

    const sourceOutEdge = g.rfEdges.find((e) => e.source === compareSourceNodeId);
    const targetOutEdge = g.rfEdges.find((e) => e.source === compareTargetNodeId);

    const sourceClipId = sourceOutEdge?.target ?? null;
    const targetClipId = targetOutEdge?.target ?? null;

    const baseClipId = sourceClipId ?? sourceParentClipId;
    const compareClipId = targetClipId ?? targetParentClipId;

    if (!baseClipId || !compareClipId) return undefined;

    const baseSteps = collectParamTimelineForClip(baseClipId, nodesForUI as any, g.rfEdges as any);
    const compareSteps = collectParamTimelineForClip(
      compareClipId,
      nodesForUI as any,
      g.rfEdges as any
    );

    const baseOptions = baseSteps
      .filter((step) => !!step.paramNodeId)
      .map((step) => ({
        nodeId: step.paramNodeId as string,
        label: step.label,
        frames: step.frames,
      }));

    const compareOptions = compareSteps
      .filter((step) => !!step.paramNodeId)
      .map((step) => ({
        nodeId: step.paramNodeId as string,
        label: step.label,
        frames: step.frames,
      }));

    return {
      selectedBaseNodeId: compareSourceNodeId,
      selectedCompareNodeId: compareTargetNodeId,
      baseOptions,
      compareOptions,
      onChangeBaseNode: (nodeId: string) => {
        setCompareSourceNodeId(nodeId);
        setDetailsNodeId(nodeId);
      },
      onChangeCompareNode: (nodeId: string) => {
        setCompareTargetNodeId(nodeId);
      },
    };
  }, [compareSourceNodeId, compareTargetNodeId, nodesForUI, g.rfEdges]);

  const sidebarNode = useMemo(() => {
    if (!g.clickedNodeId) return null;
    return baseNodesById.get(g.clickedNodeId) ?? null;
  }, [g.clickedNodeId, baseNodesById]);

  const compareParameterHistory = useMemo(() => {
    if (compareModeSource !== "sidebar") return undefined;
    if (!compareSourceNodeId || !compareTargetNodeId) return undefined;

    const nodes = baseNodesForUI as RFNode[];
    const edges = g.rfEdges as RFEdge[];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));

    const baseBranchSteps = collectParamBranchSteps(compareSourceNodeId, nodesById, edges);
    const compareBranchSteps = collectParamBranchSteps(compareTargetNodeId, nodesById, edges);

    return {
      baseHistory: buildParameterHistoryFromBranchSteps(baseBranchSteps, nodesById),
      compareHistory: buildParameterHistoryFromBranchSteps(compareBranchSteps, nodesById),
    };
  }, [compareModeSource, compareSourceNodeId, compareTargetNodeId, baseNodesForUI, g.rfEdges]);

  const detailsNode = useMemo(() => {
    if (!detailsNodeId) return null;
    return baseNodesById.get(detailsNodeId) ?? null;
  }, [detailsNodeId, baseNodesById]);

  const detailsNodeData = detailsNode?.data as any | undefined;

  const compareBaseNode = useMemo(() => {
    if (!compareTargetNodeId) return null;
    return nodesForUI.find((n) => n.id === compareTargetNodeId) ?? null;
  }, [compareTargetNodeId, nodesForUI]);

  const sidebarNodeData = sidebarNode?.data as any | undefined;

  useEffect(() => {
    setSidebarLocalNote(sidebarNodeData?.note ?? "");
  }, [sidebarNode?.id, sidebarNodeData?.note]);

  useEffect(() => {
    setDetailsLocalNote(detailsNodeData?.note ?? "");
  }, [detailsNode?.id, detailsNodeData?.note]);

  const handleSaveSidebarNote = useCallback(() => {
    if (!sidebarNode?.id) return;
    saveNodeNote(sidebarNode.id, sidebarLocalNote);
  }, [sidebarNode?.id, saveNodeNote, sidebarLocalNote]);

  const handleSaveDetailsNote = useCallback(() => {
    if (!detailsNode?.id) return;
    saveNodeNote(detailsNode.id, detailsLocalNote);
  }, [detailsNode?.id, detailsLocalNote, saveNodeNote]);

  const sidebarComputed = useMemo(() => {
    if (!sidebarNodeData?.categoryScores || sidebarNode?.type !== "params") return null;

    const scores = sidebarNodeData.categoryScores as Record<string, number>;

    return {
      scores,
      allScores: scores,
    };
  }, [sidebarNode, sidebarNodeData]);

  const clipLogic = useClipDialogLogic(formulaWeights, customSliders);

  const compareBaseNodeData = compareBaseNode?.data as any | undefined;

  const effectiveDelta = useMemo(() => {
    if (!sidebarNodeData) return null;

    if (
      compareSourceNodeId &&
      compareTargetNodeId &&
      sidebarNode?.id === compareSourceNodeId &&
      compareBaseNodeData
    ) {
      return buildCompareDelta(sidebarNodeData, compareBaseNodeData);
    }

    return sidebarNodeData.paramDeltas ?? sidebarNodeData.d ?? null;
  }, [sidebarNode, sidebarNodeData, compareSourceNodeId, compareTargetNodeId, compareBaseNodeData]);

  const detailsEffectiveDelta = useMemo(() => {
    if (!detailsNodeData) return null;

    if (
      compareSourceNodeId &&
      compareTargetNodeId &&
      detailsNode?.id === compareSourceNodeId &&
      compareBaseNodeData
    ) {
      return buildCompareDelta(detailsNodeData, compareBaseNodeData);
    }

    return detailsNodeData.paramDeltas ?? detailsNodeData.d ?? null;
  }, [detailsNode, detailsNodeData, compareSourceNodeId, compareTargetNodeId, compareBaseNodeData]);

  const detailsEffectiveCategoryScoreDeltas = useMemo(() => {
    if (!detailsNodeData) return null;

    if (
      compareSourceNodeId &&
      compareTargetNodeId &&
      detailsNode?.id === compareSourceNodeId &&
      compareBaseNodeData
    ) {
      return buildCompareCategoryDeltas(
        detailsNodeData.categoryScores,
        compareBaseNodeData.categoryScores
      );
    }

    return detailsNodeData.categoryScoreDeltas ?? null;
  }, [detailsNode, detailsNodeData, compareSourceNodeId, compareTargetNodeId, compareBaseNodeData]);

  const effectiveCategoryScoreDeltas = useMemo(() => {
    if (!sidebarNodeData) return null;

    if (
      compareSourceNodeId &&
      compareTargetNodeId &&
      sidebarNode?.id === compareSourceNodeId &&
      compareBaseNodeData
    ) {
      return buildCompareCategoryDeltas(
        sidebarNodeData.categoryScores,
        compareBaseNodeData.categoryScores
      );
    }

    return sidebarNodeData.categoryScoreDeltas ?? null;
  }, [sidebarNode, sidebarNodeData, compareSourceNodeId, compareTargetNodeId, compareBaseNodeData]);

  const sidebarParamAnalysis = useMemo(() => {
    if (!sidebarNode || sidebarNode.type !== "params") return null;

    const nodes = baseNodesForUI as RFNode[];
    const edges = g.rfEdges as Edge[];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));

    const branchSteps = collectParamBranchSteps(sidebarNode.id, nodesById, edges);

    return {
      branchSuggestion: detectParamWeightSuggestion(branchSteps, {
        minSteps: 5,
        minCategoryDeltaAbs: 1,
        minParamDeltaAbs: 0.01,
        minStreak: 5,
        recencyWindow: 15,
        categoryLabels,
      }),
      parameterHistory: buildParameterHistoryFromBranchSteps(branchSteps, nodesById),
    };
  }, [sidebarNode?.id, baseNodesForUI, g.rfEdges, categoryLabels]);

  const detailsParamAnalysis = useMemo(() => {
    if (!detailsNode || detailsNode.type !== "params") return null;

    const nodes = baseNodesForUI as RFNode[];
    const edges = g.rfEdges as Edge[];
    const nodesById = new Map(nodes.map((n) => [n.id, n]));

    const branchSteps = collectParamBranchSteps(detailsNode.id, nodesById, edges);

    return {
      branchSuggestion: detectParamWeightSuggestion(branchSteps, {
        minSteps: 5,
        minCategoryDeltaAbs: 1,
        minParamDeltaAbs: 0.01,
        minStreak: 5,
        recencyWindow: 15,
        categoryLabels,
      }),
      parameterHistory: buildParameterHistoryFromBranchSteps(branchSteps, nodesById),
    };
  }, [detailsNode?.id, baseNodesForUI, g.rfEdges, categoryLabels]);

  const detailsVideoPlayback = useMemo(() => {
    if (!detailsNode || detailsNode.type !== "clip") return undefined;

    return getVideoSegmentPlaybackForClip(
      detailsNode.id,
      baseNodesForUI as RFNode[],
      g.rfEdges as RFEdge[]
    );
  }, [detailsNode?.id, detailsNode?.type, baseNodesForUI, g.rfEdges]);

  const sharedNodeDetailsProps = useMemo(() => {
    if (!sidebarNode || sidebarNode.type !== "params") return null;

    return {
      open: false,
      onClose: () => {},
      nodeId: sidebarNode.id,
      type: "params" as const,
      d: (effectiveDelta as any) ?? {},
      videoUrl: (sidebarNodeData?.videoUrl as string | null | undefined) ?? null,
      videoFile: sidebarNodeData?.videoFile,
      videoStatus: sidebarNodeData?.videoStatus,
      metaSummary: sidebarNodeData?.metaSummaryData,
      prompt: sidebarNodeData?.prompt,
      prevParamsId: sidebarNodeData?.prevParamsId,
      highNoiseCfg: sidebarNodeData?.highNoiseCfg,
      lowNoiseCfg: sidebarNodeData?.lowNoiseCfg,
      highNoiseModelStrength: sidebarNodeData?.highNoiseModelStrength,
      lowNoiseModelStrength: sidebarNodeData?.lowNoiseModelStrength,
      highNoiseShift: sidebarNodeData?.highNoiseShift,
      lowNoiseShift: sidebarNodeData?.lowNoiseShift,
      highNoiseSteps: sidebarNodeData?.highNoiseSteps,
      lowNoiseSteps: sidebarNodeData?.lowNoiseSteps,
      highNoiseStartStep: sidebarNodeData?.highNoiseStartStep,
      lowNoiseStartStep: sidebarNodeData?.lowNoiseStartStep,
      highNoiseEndStep: sidebarNodeData?.highNoiseEndStep,
      lowNoiseEndStep: sidebarNodeData?.lowNoiseEndStep,
      displayTotalSteps: sidebarNodeData?.displayTotalSteps,
      displayLowStepPct: sidebarNodeData?.displayLowStepPct,
      categoryScores: sidebarNodeData?.categoryScores,
      categoryScoreDeltas: effectiveCategoryScoreDeltas as any,
      categoryLabels: sidebarNodeData?.categoryLabels,
      paramDeltas: sidebarNodeData?.paramDeltas,
      promptChanged: sidebarNodeData?.promptChanged,
      branchSuggestion: sidebarParamAnalysis?.branchSuggestion,
      note: sidebarNodeData?.note,
      onSaveNote: saveNodeNote,
      notesEnabled: props.notesEnabled,
      showWeightSuggestionsEnabled: props.showWeightSuggestionsEnabled,
      categoryVisibility,
      onSetCategoryVisible: setCategoryVisible,
      onShowAllCategories: showAllCategories,
      parameterHistory: sidebarParamAnalysis?.parameterHistory,
      compareBaseNodeLabel:
        compareSourceNodeId === sidebarNode.id
          ? ((compareBaseNodeData?.label as string | undefined) ?? compareTargetNodeId) || null
          : null,
    };
  }, [
    sidebarNode,
    sidebarNodeData,
    effectiveDelta,
    effectiveCategoryScoreDeltas,
    saveNodeNote,
    props.notesEnabled,
    props.showWeightSuggestionsEnabled,
    categoryVisibility,
    setCategoryVisible,
    showAllCategories,
    compareSourceNodeId,
    compareTargetNodeId,
    compareBaseNodeData,
    sidebarParamAnalysis,
  ]);

  const sidebarDetailsLogic = useNodeDetailsDialog(
    sharedNodeDetailsProps ??
      ({
        open: false,
        onClose: () => {},
        nodeId: "",
        type: "params",
        d: {},
        categoryVisibility,
        onSetCategoryVisible: setCategoryVisible,
        onShowAllCategories: showAllCategories,
        notesEnabled: props.notesEnabled,
        showWeightSuggestionsEnabled: props.showWeightSuggestionsEnabled,
      } as any)
  );

  const lastNodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const currentId = sidebarNode?.id ?? null;

    // Nur feuern wenn sich der Node wirklich geändert hat


    lastNodeIdRef.current = currentId;

    const isParamsNode = sidebarNode?.type === "params";

    props.onSidebarDataChange?.({
      selectedNodeLabel: isParamsNode
        ? ((sidebarNodeData?.label as string | undefined) ?? null)
        : null,
      selectedNodeType: sidebarNode?.type ?? null,
      computed: isParamsNode ? sidebarComputed : null,
      orderedSliderItems,
      clipLogic,
      parameterItems: isParamsNode ? sidebarDetailsLogic.parameterItems : [],
      parameterHistory: isParamsNode ? (sidebarParamAnalysis?.parameterHistory ?? {}) : {},
      branchSuggestion: isParamsNode ? (sidebarParamAnalysis?.branchSuggestion ?? null) : null,
      compareBaseNodeLabel: isParamsNode
        ? (sharedNodeDetailsProps?.compareBaseNodeLabel ?? null)
        : null,
      prompt: isParamsNode ? String(sidebarNodeData?.prompt ?? "") : "",
      note: isParamsNode ? sidebarLocalNote : "",
      notesEnabled: props.notesEnabled,
      onChangeNote: isParamsNode ? setSidebarLocalNote : () => {},
      onSaveNote: isParamsNode ? handleSaveSidebarNote : () => {},
      selectedNodeId: currentId,
    });
  }, [sidebarNode?.id, sidebarLocalNote]);

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
            totalFrames: 81,
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
          totalFrames: 0,
          durationSec: stored.durationSec,
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

    const incoming = buildIncomingMap(g.rfEdges);
    const nodesById = new Map(g.rfNodes.map((n) => [n.id, n]));
    const parentSimple = getSimpleFromParentClip(fromClipId, nodesById, incoming);

    v2v.replaceSimple(parentSimple);

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
      const d = deriveV2VParamsFromSimple({
        totalSteps: canonicalSimple.totalSteps,
        stepRatio01: canonicalSimple.stepRatio01,
        highShift: canonicalSimple.highShift,
        highCfg: canonicalSimple.highCfg,
        highStrength: canonicalSimple.highStrength,
      });

      const lowNoiseParams =
        v2v.simpleSpeedMode === "quality"
          ? {
              lowNoiseCfg: 2,
              lowNoiseModelStrength: 0.3,
              lowNoiseShift: 2.6,
            }
          : {
              lowNoiseCfg: 1,
              lowNoiseModelStrength: 1,
              lowNoiseShift: 5,
            };

      enqueueExtendJob(parentFile, {
        ...lowNoiseParams,
        ...d,
        displayTotalSteps: canonicalSimple.totalSteps,
        displayLowStepPct: canonicalSimple.stepRatioPct,
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
                generatedFrames: length,
                ...params,
                categoryScores: allScores,
                categoryLabels,
              } as any,
              draggable: true,
            };

            const parentNode = prevNodes.find((n) => n.id === parentId);
            const parentTotalFrames =
              typeof (parentNode?.data as any)?.totalFrames === "number"
                ? (parentNode?.data as any).totalFrames
                : 0;

            const newTotalFrames = parentTotalFrames + length;

            const clipNode: RFNode = {
              id: newClipId,
              type: "clip",
              position: clipPos,
              data: {
                label: "Generated Clip",
                videoFile: file,
                videoStatus: "done",
                videoOpened: false,
                totalFrames: newTotalFrames,
              } as any,
              draggable: true,
            };

            const nextNodes = [...prevNodes, paramNode, clipNode];

            g.commit(nextNodes, nextEdges);

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

            centerOnNode(rfInstance, newClipId, { onAfter: vp.saveViewport });

            return nextNodes;
          });

          return nextEdges;
        });
      },
    });
  }

  async function handleCreateImportedBranch() {
    if (!importVideoFile) return;

    const parentId = g.clickedNodeId;
    if (!parentId) {
      setImportVideoStatus("No parent clip selected.");
      return;
    }

    setImportVideoUploading(true);
    setImportVideoStatus("Uploading…");

    try {
      const stored = await comfyUploadVideo(importVideoFile);

      const importId = nanoid();
      const clipId = nanoid();

      const edgeParentToImport: RFEdge = {
        id: nanoid(),
        source: parentId,
        target: importId,
        type: "labeled",
        data: {
          label: "import",
          showLabel: props.showEdgeLabels,
        },
        sourceHandle: "out",
        targetHandle: "in",
      };

      const edgeImportToClip: RFEdge = {
        id: nanoid(),
        source: importId,
        target: clipId,
        type: "labeled",
        data: {
          label: "output",
          showLabel: props.showEdgeLabels,
        },
        sourceHandle: "out",
        targetHandle: "in",
      };

      g.setRfEdges((prevEdges) => {
        const nextEdges = [...prevEdges, edgeParentToImport, edgeImportToClip];

        g.setRfNodes((prevNodes) => {
          const fromNode = prevNodes.find((n) => n.id === parentId);
          const baseX = fromNode?.position.x ?? 50;
          const baseY = fromNode?.position.y ?? 80;

          const branchIndex = countBranches(nextEdges, parentId);

          const NODE_GAP_X = 60;
          const BRANCH_SPACING = 140;

          const importSize = getDefaultNodeSize("import" as any);
          const clipSize = getDefaultNodeSize("clip");

          const desiredImport = {
            x: baseX + clipSize.w + NODE_GAP_X,
            y:
              baseY +
              (clipSize.h - (importSize?.h ?? 100)) / 2 +
              (branchIndex - 1) * BRANCH_SPACING,
          };

          const importPos = findFreePosition(desiredImport, prevNodes, {
            stepY: 50,
            pad: 40,
            newNodeType: "import" as any,
            newNodeWidth: importSize?.w ?? 240,
            newNodeHeight: importSize?.h ?? 100,
            extraBottom: 20,
          });

          const desiredClip = {
            x: importPos.x + (importSize?.w ?? 240) + NODE_GAP_X,
            y: importPos.y,
          };

          const tempImportNode: RFNode = {
            id: importId,
            type: "import",
            position: importPos,
            data: {} as any,
            width: importSize?.w ?? 240,
            height: importSize?.h ?? 100,
          };

          const clipPos = findFreePosition(desiredClip, [...prevNodes, tempImportNode], {
            stepY: 50,
            pad: 30,
            newNodeType: "clip",
            newNodeWidth: clipSize.w,
            newNodeHeight: clipSize.h,
            extraBottom: 20,
          });

          const importNode: RFNode = {
            id: importId,
            type: "import",
            position: importPos,
            data: {
              label: "Imported Video",
              importedFileName: stored.filename,
              parentClipId: parentId,
              videoFile: stored,
              durationSec: stored.durationSec,
            } as any,
            draggable: true,
          };

          const clipNode: RFNode = {
            id: clipId,
            type: "clip",
            position: clipPos,
            data: {
              label: "Imported Clip",
              videoFile: stored,
              videoStatus: "done",
              videoOpened: false,
              totalFrames: 0,
            } as any,
            draggable: true,
          };

          const nextNodes = [...prevNodes, importNode, clipNode];

          g.commit(nextNodes, nextEdges);

          props.onChange((prev) => ({
            ...prev,
            uiState: { ...(prev.uiState ?? {}), selectedNodeId: clipId },
          }));

          if (rfInstance) {
            centerOnNode(rfInstance, clipId, { onAfter: vp.saveViewport });
          } else {
            requestAnimationFrame(vp.saveViewport);
          }

          return nextNodes;
        });

        return nextEdges;
      });

      setImportVideoDialogOpen(false);
      setImportVideoFile(null);
      setImportVideoStatus("");
      setImportVideoUploading(false);
    } catch (e: any) {
      setImportVideoStatus(`Error: ${e?.message ?? String(e)}`);
      setImportVideoUploading(false);
    }
  }

  // ---------- node click ----------
  const onNodeClick: NodeMouseHandler = (_evt, node) => {
    if (props.activeClipPick && node.type === "clip") {
      const nodeData = node.data as any;

      props.onClipPicked?.({
        id: node.id,
        label: nodeData?.label ?? null,
        videoUrl: nodeData?.videoUrl ?? null,
      });

      setActionDialogOpen(false);
      setDetailsOpen(false);
      return;
    }

    if (isComparePicking && compareSourceNodeId) {
      finishComparePick(node.id);
      return;
    }

    selectNode(node.id);

    if (node.type === "clip" || node.type === "edit" || node.type === "import") {
      setActionDialogOpen(true);
    }

    requestAnimationFrame(() => {});
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
      {/* Top-left status / root action */}
      {isComparePicking ? (
        <Paper
          elevation={2}
          sx={{
            position: "absolute",
            zIndex: 10,
            top: 12,
            left: 12,
            p: 1.25,
            borderLeft: 6,
            borderLeftColor: "warning.main",
            bgcolor: "warning.50",
            minWidth: 260,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StatusDot state="running" />
            <Box sx={{ fontSize: 14, fontWeight: 600 }}>Compare mode: Choose second node</Box>
            <Button size="small" variant="outlined" onClick={exitCompareMode}>
              Cancel
            </Button>
          </Stack>
        </Paper>
      ) : (
        !hasRoot && (
          <Paper elevation={2} sx={{ position: "absolute", zIndex: 10, top: 12, left: 12, p: 1 }}>
            <Button variant="contained" onClick={createRoot}>
              Create Root
            </Button>
          </Paper>
        )
      )}
      {props.activeClipPick !== null && (
        <Paper
          elevation={2}
          sx={{
            position: "absolute",
            zIndex: 10,
            top: isComparePicking ? 80 : 12,
            left: 12,
            p: 1.25,
            borderLeft: 6,
            borderLeftColor: "primary.main",
            bgcolor: "primary.50",
            minWidth: 260,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <StatusDot state="running" />
            <Box sx={{ fontSize: 14, fontWeight: 600 }}>
              Select clip for window {(props.activeClipPick?.slotIndex ?? -1) + 1}
            </Box>
          </Stack>
        </Paper>
      )}

      <ReactFlow
        onlyRenderVisibleElements
        onInit={handleInit}
        nodes={nodesForUI}
        edges={edgesForUI}
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
        onNodeClick={handleNodeClick}
        onNodeDragStop={handleNodeDragStop}
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
        onOpenImportVideo={() => {
          setImportVideoFile(null);
          setImportVideoStatus("");
          setImportVideoDialogOpen(true);
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
        onCreateCustomSlider={createCustomSlider}
        onUpdateCustomSlider={updateCustomSlider}
        onDeleteCustomSlider={deleteCustomSlider}
        orderedSliderItems={orderedSliderItems}
        customSliders={customSliders}
        moveSlider={moveSlider}
        formulaWeights={formulaWeights}
        onPatchFormulaWeights={patchFormulaWeights}
        onResetFormulaWeights={resetFormulaWeights}
        restrictCategories={props.restrictCategories}
        setCategoryScore={v2v.setCategoryScore}
        setCustomCategoryScore={v2v.setCustomCategoryScore}
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

      <ImportVideoDialog
        open={importVideoDialogOpen}
        file={importVideoFile}
        uploading={importVideoUploading}
        statusText={importVideoStatus}
        onClose={() => {
          setImportVideoDialogOpen(false);
          setImportVideoFile(null);
          setImportVideoStatus("");
        }}
        onFileChange={setImportVideoFile}
        onCreate={handleCreateImportedBranch}
      />

      <NodeDetailsDialog
        open={detailsOpen && !!detailsNode}
        onClose={handleCloseDetails}
        nodeId={detailsNode?.id ?? ""}
        type={(detailsNode?.type as "clip" | "params" | "edit" | "import") ?? "clip"}
        d={(detailsEffectiveDelta as any) ?? {}}
        videoUrl={(detailsNodeData?.videoUrl as string | null | undefined) ?? null}
        videoPlayback={detailsVideoPlayback}
        showOnlyGeneratedPart={props.showOnlyGeneratedPart}
        videoFile={detailsNodeData?.videoFile}
        videoStatus={detailsNodeData?.videoStatus}
        metaSummary={detailsNodeData?.metaSummaryData}
        prompt={detailsNodeData?.prompt}
        prevParamsId={detailsNodeData?.prevParamsId}
        highNoiseCfg={detailsNodeData?.highNoiseCfg}
        lowNoiseCfg={detailsNodeData?.lowNoiseCfg}
        highNoiseModelStrength={detailsNodeData?.highNoiseModelStrength}
        lowNoiseModelStrength={detailsNodeData?.lowNoiseModelStrength}
        highNoiseShift={detailsNodeData?.highNoiseShift}
        lowNoiseShift={detailsNodeData?.lowNoiseShift}
        highNoiseSteps={detailsNodeData?.highNoiseSteps}
        lowNoiseSteps={detailsNodeData?.lowNoiseSteps}
        highNoiseStartStep={detailsNodeData?.highNoiseStartStep}
        lowNoiseStartStep={detailsNodeData?.lowNoiseStartStep}
        highNoiseEndStep={detailsNodeData?.highNoiseEndStep}
        lowNoiseEndStep={detailsNodeData?.lowNoiseEndStep}
        displayTotalSteps={detailsNodeData?.displayTotalSteps}
        displayLowStepPct={detailsNodeData?.displayLowStepPct}
        categoryScores={detailsNodeData?.categoryScores}
        categoryScoreDeltas={detailsEffectiveCategoryScoreDeltas as any}
        categoryLabels={detailsNodeData?.categoryLabels}
        paramDeltas={detailsNodeData?.paramDeltas}
        promptChanged={detailsNodeData?.promptChanged}
        note={detailsLocalNote}
        onChangeNote={setDetailsLocalNote}
        onSaveNote={handleSaveDetailsNote}
        notesEnabled={props.notesEnabled}
        showWeightSuggestionsEnabled={props.showWeightSuggestionsEnabled}
        categoryVisibility={categoryVisibility}
        onSetCategoryVisible={setCategoryVisible}
        onShowAllCategories={showAllCategories}
        branchSuggestion={detailsParamAnalysis?.branchSuggestion}
        parameterHistory={detailsParamAnalysis?.parameterHistory}
        importedFileName={detailsNodeData?.importedFileName ?? null}
        compareBaseNodeLabel={
          compareSourceNodeId === detailsNode?.id
            ? ((compareBaseNodeData?.label as string | undefined) ?? compareTargetNodeId) || null
            : null
        }
        compareSelector={compareModeSource === "sidebar" ? compareSelector : undefined}
        compareParameterHistory={
          compareModeSource === "sidebar" ? compareParameterHistory : undefined
        }
      />
    </div>
  );
}

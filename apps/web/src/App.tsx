import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@ma/shared";
import { createProject, saveProject, loadProject, evaluateTransitions } from "./api";
import { GraphView } from "./graph/GraphView";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { ReactFlowProvider } from "reactflow";
import { Settings } from "./settings/Settings";
import { InformationDialog } from "./graph/dialogs/InformationDialog";

import { loadSettings, saveSettings } from "./utils/localStorage";
import { LoadProjectDialog } from "./graph/dialogs/LoadProjectsDialog";
import { CategoryScoresSidebar } from "./graph/components/CategoryScoresSidebar";
import { BrachSuggestion, CompareTimelineOption } from "./graph/types/ui";
import { ClipSelectionSidebar } from "./graph/components/ClipSelectionSidebar";
import { collectParamTimelineForClip } from "./graph/graph_helpers/selectors";
import BugReportIcon from "@mui/icons-material/BugReport";

type ColorMode = "light" | "dark";

const STORAGE_ACTIVE_PROJECT = "ma.activeProjectId";

export default function App({
  mode,
  toggleColorMode,
}: {
  mode: ColorMode;
  toggleColorMode: () => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  const [legendOpen, setLegendOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("New Project");
  const [creating, setCreating] = useState(false);
  const [evaluatingTransitions, setEvaluatingTransitions] = useState(false);

  const initialSettings = loadSettings();

  const [showEdgeLabels, setShowEdgeLabels] = useState(initialSettings.showEdgeLabels);
  const [highlightUnseenEnabled, setHighlightUnseenEnabled] = useState(
    initialSettings.highlightUnseenEnabled
  );
  const [notesEnabled, setNotesEnabled] = useState(initialSettings.notesEnabled);
  const [showWeightSuggestionsEnabled, setShowWeightSuggestionsEnabled] = useState(
    initialSettings.showWeightSuggestionsEnabled
  );

  const [graphCardContentMode, setGraphCardContentMode] = useState(
    initialSettings.graphCardContentMode
  );

  const [graphCardDisplayMode, setGraphCardDisplayMode] = useState(
    initialSettings.graphCardDisplayMode
  );

  const [restrictCategories, setRestrictCategories] = useState(initialSettings.restrictCategories);

  const [showOnlyChangedParameters, setShowOnlyChangedParameters] = useState(
    initialSettings.showOnlyChangedParameters
  );

  const [loopComparisonVideos, setLoopComparisonVideos] = useState(
    initialSettings.loopComparisonVideos
  );

  const [isCategorySidebarOpen, setIsCategorySidebarOpen] = useState(true);

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const [clipCompareSlots, setClipCompareSlots] = useState<
    { id: string | null; label?: string | null; videoUrl?: string | null }[]
  >([
    { id: null, label: null, videoUrl: null },
    { id: null, label: null, videoUrl: null },
  ]);

  const [timelineCompareDraft, setTimelineCompareDraft] = useState<{
    leftSlotIndex: number;
    rightSlotIndex: number;
    leftOptions: CompareTimelineOption[];
    rightOptions: CompareTimelineOption[];
    leftSelectedParamNodeId: string | null;
    rightSelectedParamNodeId: string | null;
  } | null>(null);

  const [externalCompareRequest, setExternalCompareRequest] = useState<{
    sourceNodeId: string;
    targetNodeId: string;
    requestKey: number;
  } | null>(null);

  const canCompareClips = clipCompareSlots.filter((x) => x.id).length >= 2;

  const clipCompareTimelineSlots = useMemo(() => {
    if (!project) return [];

    return clipCompareSlots.map((slot) => {
      if (!slot.id) return [];

      const rawSteps = collectParamTimelineForClip(
        slot.id,
        project.nodes as any,
        project.edges as any
      );

      const totalFrames = rawSteps.reduce((sum, step) => sum + Math.max(0, step.frames || 0), 0);

      return rawSteps.map((step, index) => ({
        index,
        kind: step.kind,
        paramNodeId: step.paramNodeId,
        label: step.label,
        frames: step.frames,
        widthPct:
          totalFrames > 0 ? (step.frames / totalFrames) * 100 : 100 / Math.max(rawSteps.length, 1),
      }));
    });
  }, [project, clipCompareSlots]);

  const [activeClipPick, setActiveClipPick] = useState<{
    slotIndex: number;
  } | null>(null);

  const [sidebarData, setSidebarData] = useState<{
    selectedNodeId: string | null;
    selectedNodeLabel: string | null;
    selectedNodeType: string | null;
    computed: any | null;
    orderedSliderItems: any[];
    clipLogic: any;
    parameterItems: any[];
    parameterHistory: any;
    compareBaseNodeLabel: string | null;
    prompt: string;
    note: string;
    notesEnabled: boolean;
    onChangeNote?: (value: string) => void;
    onSaveNote?: () => void;
    branchSuggestion: BrachSuggestion | null;
  }>({
    selectedNodeId: null,
    selectedNodeLabel: null,
    selectedNodeType: null,
    computed: null,
    orderedSliderItems: [],
    clipLogic: null,
    parameterItems: [],
    parameterHistory: {},
    compareBaseNodeLabel: null,
    prompt: "",
    note: "",
    notesEnabled: false,
    onChangeNote: undefined,
    onSaveNote: undefined,
    branchSuggestion: null,
  });

  const dirtyRef = useRef(false);
  const projectRef = useRef<Project | null>(null);

  useEffect(() => {
    saveSettings({
      showEdgeLabels,
      highlightUnseenEnabled,
      notesEnabled,
      showWeightSuggestionsEnabled,
      graphCardContentMode,
      graphCardDisplayMode,
      restrictCategories,
      showOnlyChangedParameters,
      loopComparisonVideos,
    });
  }, [
    showEdgeLabels,
    highlightUnseenEnabled,
    notesEnabled,
    showWeightSuggestionsEnabled,
    graphCardContentMode,
    graphCardDisplayMode,
    restrictCategories,
    showOnlyChangedParameters,
    loopComparisonVideos,
  ]);

  const handleSelectParamNodeFromTimeline = (nodeId: string) => {
    setProject((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        uiState: {
          ...(prev.uiState ?? {}),
          selectedNodeId: nodeId,
        },
      };
    });
  };

  const handleConfirmTimelineCompare = () => {
    if (!timelineCompareDraft) return;
    if (
      !timelineCompareDraft.leftSelectedParamNodeId ||
      !timelineCompareDraft.rightSelectedParamNodeId
    ) {
      return;
    }

    setExternalCompareRequest({
      sourceNodeId: timelineCompareDraft.leftSelectedParamNodeId,
      targetNodeId: timelineCompareDraft.rightSelectedParamNodeId,
      requestKey: Date.now(),
    });
  };

  const handleOpenTimelineCompare = () => {
    const filledSlots = clipCompareSlots
      .map((slot, index) => ({ slot, index }))
      .filter((x) => !!x.slot.id);

    if (filledSlots.length < 2) return;

    const left = filledSlots[0];
    const right = filledSlots[1];

    const leftOptions = clipCompareTimelineSlots[left.index] ?? [];
    const rightOptions = clipCompareTimelineSlots[right.index] ?? [];

    const leftLastParam = [...leftOptions].reverse().find((x) => !!x.paramNodeId) ?? null;
    const rightLastParam = [...rightOptions].reverse().find((x) => !!x.paramNodeId) ?? null;

    if (!leftLastParam?.paramNodeId || !rightLastParam?.paramNodeId) return;

    setExternalCompareRequest({
      sourceNodeId: leftLastParam.paramNodeId,
      targetNodeId: rightLastParam.paramNodeId,
      requestKey: Date.now(),
    });
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_PROJECT);

      if (savedId) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const loaded = await withTimeout(loadProject(savedId), 1500);
            if (!cancelled) setProject(loaded);
            return;
          } catch (err: any) {
            // wenn du status sauber hast: nur bei 404 löschen
            const status = err?.status ?? err?.response?.status;
            if (status === 404) {
              localStorage.removeItem(STORAGE_ACTIVE_PROJECT);
              break;
            }
            // sonst kurzer retry
            await new Promise((r) => setTimeout(r, 200));
          }
        }
      }

      // Fallback: neues Demo-Projekt
      const p = await withTimeout(createProject("Demo Project"), 1500);
      if (!cancelled) {
        setProject(p);
        localStorage.setItem(STORAGE_ACTIVE_PROJECT, p.id);
      }
    })().catch((e) => {
      console.error(e);
      // letzte Rettung: wenn wirklich alles schiefgeht, nicht hängen bleiben
      if (!cancelled) setProject(null);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ whenever project changes, persist active id
  useEffect(() => {
    if (project?.id) {
      localStorage.setItem(STORAGE_ACTIVE_PROJECT, project.id);
    }
  }, [project?.id]);

  const title = useMemo(() => project?.name ?? "Loading...", [project]);

  function withTimeout<T>(p: Promise<T>, ms = 1500): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error("timeout")), ms);
      p.then(
        (v) => {
          window.clearTimeout(t);
          resolve(v);
        },
        (e) => {
          window.clearTimeout(t);
          reject(e);
        }
      );
    });
  }

  const onChange = (upd: Project | ((prev: Project) => Project)) => {
    dirtyRef.current = true;
    setProject((prev) => {
      if (!prev) return typeof upd === "function" ? prev : upd;
      return typeof upd === "function" ? (upd as any)(prev) : upd;
    });
  };

  useEffect(() => {
    if (!project) return;
    if (!dirtyRef.current) return; // ✅ nur speichern wenn geändert
    const t = window.setTimeout(() => {
      saveProject(project);
      dirtyRef.current = false; // ✅ wieder “clean”
    }, 500);
    return () => window.clearTimeout(t);
  }, [project]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const newProject = async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      setCreating(true);
      const p = await withTimeout(createProject(trimmed), 1500);
      localStorage.setItem(STORAGE_ACTIVE_PROJECT, p.id);
      setProject(p);
      setNewDialogOpen(false);
    } catch (e) {
      console.error("create new project failed", e);
    } finally {
      setCreating(false);
    }
  };

  const handlePickClipSlot = (index: number) => {
    setActiveClipPick({
      slotIndex: index,
    });
  };

  const handleClearClipSlot = (index: number) => {
    setClipCompareSlots((prev) =>
      prev.map((slot, i) => (i === index ? { id: null, label: null, videoUrl: null } : slot))
    );

    setActiveClipPick((prev) => (prev?.slotIndex === index ? null : prev));
  };

  const handleClipPickedFromGraph = (clip: {
    id: string;
    label?: string | null;
    videoUrl?: string | null;
  }) => {
    if (!activeClipPick) return;

    setClipCompareSlots((prev) =>
      prev.map((slot, i) =>
        i === activeClipPick.slotIndex
          ? {
              id: clip.id,
              label: clip.label ?? null,
              videoUrl: clip.videoUrl ?? null,
            }
          : slot
      )
    );

    setActiveClipPick(null);
  };

  if (!project) return <div style={{ padding: 16 }}>{title}</div>;

  return (
    <>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar sx={{ position: "relative" }}>
            {/* LEFT */}
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setNewProjectName("New Project");
                  setNewDialogOpen(true);
                }}
              >
                New Project
              </Button>
            </Box>

            {/* CENTER (always screen-centered) */}
            <Typography
              variant="h6"
              sx={{
                position: "absolute",
                left: "50%",
                transform: "translateX(-50%)",
                maxWidth: "60vw",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                pointerEvents: "none", // avoids blocking clicks on buttons if it overlaps
              }}
            >
              {project.name}
            </Typography>

            {/* RIGHT */}
            <Box sx={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>

              <Tooltip title={"Debug transition evaluation"}>
  <span>
    <IconButton
      onClick={async () => {
        if (!project?.id || evaluatingTransitions) return;

        try {
          setEvaluatingTransitions(true);
const result = await evaluateTransitions(project.id, 5);
console.log("transition evaluation result", result);
console.log("evaluations", result.evaluations);
console.log("debug", result.debug);
alert(
  `pairs=${result.debug?.pairCount ?? 0}, evals=${Object.keys(result.evaluations ?? {}).length}, skipped=${result.debug?.skipped?.length ?? 0}`
);
        } catch (err) {
          console.error("transition evaluation failed", err);
        } finally {
          setEvaluatingTransitions(false);
        }
      }}
      sx={{ mr: 1 }}
      aria-label="debug transition evaluation"
      disabled={!project?.id || evaluatingTransitions}
    >
      <BugReportIcon />
    </IconButton>
  </span>
</Tooltip>
              <Tooltip title={"Save"}>
                <IconButton
                  onClick={() => {
                    if (projectRef.current) {
                      saveProject(projectRef.current);
                      dirtyRef.current = false;
                    }
                  }}
                  sx={{ mr: 1 }}
                  aria-label="save project"
                >
                  <SaveIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Open folder"}>
                <IconButton onClick={() => setLoadOpen(true)} sx={{ mr: 1 }} aria-label="open file">
                  <FolderOpenIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={"Settings"}>
                <IconButton
                  onClick={() => setSettingsOpen(true)}
                  sx={{ mr: 1 }}
                  aria-label="toggle settings"
                >
                  <SettingsIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
                <IconButton onClick={toggleColorMode} sx={{ mr: 1 }} aria-label="toggle dark mode">
                  {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
                </IconButton>
              </Tooltip>

              <Tooltip title={"Information"}>
                <IconButton
                  onClick={() => setLegendOpen(true)}
                  sx={{ mr: 1 }}
                  aria-label="toggle info"
                >
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flexGrow: 1,
            minHeight: 0,
            display: "flex",
            overflow: "hidden",
          }}
        >
          {/* LEFT SIDEBAR */}
          <Box
            sx={{
              flex: isCategorySidebarOpen ? "0 0 33%" : "0 0 52px",
              width: isCategorySidebarOpen ? "33%" : "52px",
              minWidth: 0,
              maxWidth: isCategorySidebarOpen ? "33%" : "52px",
              height: "100%",
              borderRight: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
              transition: "width 0.2s ease, flex-basis 0.2s ease",
            }}
          >
            <CategoryScoresSidebar
              open={isCategorySidebarOpen}
              onToggle={() => setIsCategorySidebarOpen((prev) => !prev)}
              selectedNodeLabel={sidebarData.selectedNodeLabel}
              orderedSliderItems={sidebarData.orderedSliderItems}
              computed={sidebarData.computed}
              clipLogic={sidebarData.clipLogic}
              parameterItems={sidebarData.parameterItems}
              parameterHistory={sidebarData.parameterHistory}
              compareBaseNodeLabel={sidebarData.compareBaseNodeLabel}
              prompt={sidebarData.prompt}
              notesEnabled={sidebarData.notesEnabled}
              note={sidebarData.note}
              onChangeNote={sidebarData.onChangeNote}
              onSaveNote={sidebarData.onSaveNote}
              branchSuggestion={sidebarData.branchSuggestion}
              showWeightSuggestionsEnabled={showWeightSuggestionsEnabled}
              selectedNodeType={sidebarData.selectedNodeType}
            />
          </Box>

          {/* CENTER GRAPH */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              minHeight: 0,
            }}
          >
            <ReactFlowProvider>
              <GraphView
                project={project}
                onChange={onChange}
                showEdgeLabels={showEdgeLabels}
                highlightUnseenEnabled={highlightUnseenEnabled}
                notesEnabled={notesEnabled}
                showWeightSuggestionsEnabled={showWeightSuggestionsEnabled}
                graphCardContentMode={graphCardContentMode}
                restrictCategories={restrictCategories}
                graphCardDisplayMode={graphCardDisplayMode}
                showOnlyChangedParameters={showOnlyChangedParameters}
                onSidebarDataChange={setSidebarData}
                activeClipPick={activeClipPick}
                onClipPicked={handleClipPickedFromGraph}
                externalCompareRequest={externalCompareRequest}
              />
            </ReactFlowProvider>
          </Box>

          {/* RIGHT SIDEBAR */}
          <Box
            sx={{
              flex: isRightSidebarOpen ? "0 0 33%" : "0 0 52px",
              width: isRightSidebarOpen ? "33%" : "52px",
              minWidth: 0,
              maxWidth: isRightSidebarOpen ? "33%" : "52px",
              height: "100%",
              borderLeft: "1px solid",
              borderColor: "divider",
              bgcolor: "background.paper",
              overflow: "hidden",
              transition: "width 0.2s ease, flex-basis 0.2s ease",
            }}
          >
            <ClipSelectionSidebar
              open={isRightSidebarOpen}
              onToggle={() => setIsRightSidebarOpen((prev) => !prev)}
              slots={clipCompareSlots}
              timelines={clipCompareTimelineSlots}
              activePickSlot={activeClipPick?.slotIndex ?? null}
              onPickSlot={handlePickClipSlot}
              onClearSlot={handleClearClipSlot}
              onSelectParamNode={handleSelectParamNodeFromTimeline}
              onCompare={handleOpenTimelineCompare}
              canCompare={canCompareClips}
              loopVideos={loopComparisonVideos}
            />
          </Box>
        </Box>
      </Box>

      <Settings
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        showEdgeLabels={showEdgeLabels}
        setShowEdgeLabels={setShowEdgeLabels}
        highlightUnseenEnabled={highlightUnseenEnabled}
        setHighlightUnseenEnabled={setHighlightUnseenEnabled}
        notesEnabled={notesEnabled}
        setNotesEnabled={setNotesEnabled}
        setShowWeightSuggestionsEnabled={setShowWeightSuggestionsEnabled}
        showWeightSuggestionsEnabled={showWeightSuggestionsEnabled}
        graphCardContentMode={graphCardContentMode}
        setGraphCardContentMode={setGraphCardContentMode}
        restrictCategories={restrictCategories}
        setRestrictCategories={setRestrictCategories}
        graphCardDisplayMode={graphCardDisplayMode}
        setGraphCardDisplayMode={setGraphCardDisplayMode}
        showOnlyChangedParameters={showOnlyChangedParameters}
        setShowOnlyChangedParameters={setShowOnlyChangedParameters}
        loopComparisonVideos={loopComparisonVideos}
        setLoopComparisonVideos={setLoopComparisonVideos}
      />

      <InformationDialog open={legendOpen} onClose={() => setLegendOpen(false)} />

      <LoadProjectDialog
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoaded={(p) => {
          // ✅ set + persist active
          localStorage.setItem(STORAGE_ACTIVE_PROJECT, p.id);
          setProject(p);
        }}
      />

      <Dialog
        open={newDialogOpen}
        onClose={() => (creating ? null : setNewDialogOpen(false))}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create new project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") newProject(newProjectName);
            }}
            disabled={creating}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewDialogOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => newProject(newProjectName)}
            disabled={creating || !newProjectName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

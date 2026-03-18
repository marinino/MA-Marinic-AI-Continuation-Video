import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@ma/shared";
import { createProject, saveProject, loadProject } from "./api"; // ✅ getProject dazu
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

  const dirtyRef = useRef(false);
  const projectRef = useRef<Project | null>(null);

  useEffect(() => {
    saveSettings({
      showEdgeLabels,
      highlightUnseenEnabled,
      notesEnabled,
      showWeightSuggestionsEnabled,
      graphCardContentMode,
    });
  }, [
    showEdgeLabels,
    highlightUnseenEnabled,
    notesEnabled,
    showWeightSuggestionsEnabled,
    graphCardContentMode,
  ]);

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

        <Box sx={{ flexGrow: 1 }}>
          <ReactFlowProvider>
            <GraphView
              project={project}
              onChange={onChange}
              showEdgeLabels={showEdgeLabels}
              highlightUnseenEnabled={highlightUnseenEnabled}
              notesEnabled={notesEnabled}
              showWeightSuggestionsEnabled={showWeightSuggestionsEnabled}
              graphCardContentMode={graphCardContentMode}
            />
          </ReactFlowProvider>
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

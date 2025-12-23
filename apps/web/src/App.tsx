import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@ma/shared";
import { createProject, saveProject, getProject } from "./api"; // ✅ getProject dazu
import { GraphView } from "./graph/GraphView";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Tooltip,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { ReactFlowProvider } from "reactflow";
import { Settings } from "./settings/Settings";
import { InformationDialog } from "./InformationDialog";
import { LoadProjectDialog } from "./LoadProjectsDialog";

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
  const [showEdgeLabels, setShowEdgeLabels] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const savedId = localStorage.getItem(STORAGE_ACTIVE_PROJECT);

      if (savedId) {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const loaded = await withTimeout(getProject(savedId), 1500);
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


  if (!project) return <div style={{ padding: 16 }}>{title}</div>;

  return (
    <>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <AppBar position="static" color="default" elevation={1}>
          <Toolbar>
            <Typography variant="h6">
              {project.name} (ID: {project.id})
            </Typography>

            <Box sx={{ flexGrow: 1 }} />

            <Tooltip title={"Save"}>
              <IconButton onClick={() => saveProject(project)} sx={{ mr: 1 }} aria-label="save project">
                <SaveIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={"Open folder"}>
              <IconButton onClick={() => setLoadOpen(true)} sx={{ mr: 1 }} aria-label="open file">
                <FolderOpenIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={"Settings"}>
              <IconButton onClick={() => setSettingsOpen(true)} sx={{ mr: 1 }} aria-label="toggle settings">
                <SettingsIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
              <IconButton onClick={toggleColorMode} sx={{ mr: 1 }} aria-label="toggle dark mode">
                {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title={"Information"}>
              <IconButton onClick={() => setLegendOpen(true)} sx={{ mr: 1 }} aria-label="toggle info">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box sx={{ flexGrow: 1 }}>
          <ReactFlowProvider>
            <GraphView project={project} onChange={setProject} showEdgeLabels={showEdgeLabels} />
          </ReactFlowProvider>
        </Box>
      </Box>

      <Settings
        settingsOpen={settingsOpen}
        setSettingsOpen={setSettingsOpen}
        showEdgeLabels={showEdgeLabels}
        setShowEdgeLabels={setShowEdgeLabels}
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
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import type { Project } from "@ma/shared";
import { createProject, saveProject } from "./api";
import { GraphView } from "./graph/GraphView";
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Tooltip } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { ReactFlowProvider } from "reactflow";

type ColorMode = "light" | "dark";

export default function App({
  mode,
  toggleColorMode,
}: {
  mode: ColorMode;
  toggleColorMode: () => void;
}) {
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    (async () => {
      const p = await createProject("Demo Project");
      setProject(p);
    })().catch(console.error);
  }, []);

  const title = useMemo(() => project?.name ?? "Loading...", [project]);

  if (!project) return <div style={{ padding: 16 }}>{title}</div>;

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6">
            {project.name} (ID: {project.id})
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => saveProject(project)}
          >
            Save
          </Button>

          <Tooltip title={mode === "dark" ? "Light Mode" : "Dark Mode"}>
            <IconButton onClick={toggleColorMode} sx={{ mr: 1 }} aria-label="toggle dark mode">
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flexGrow: 1 }}>
        <ReactFlowProvider>
          <GraphView project={project} onChange={setProject} />
        </ReactFlowProvider>
      </Box>
    </Box>
  );
}

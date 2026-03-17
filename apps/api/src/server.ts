import Fastify from "fastify";
import cors from "@fastify/cors";
import { nanoid } from "nanoid";
import { ProjectSchema, type Project } from "@ma/shared";
import { listProjects, loadProject, saveProject } from "./storage";
import { comfyRoutes } from "./routes/comfy";
import websocket from "@fastify/websocket";
import multipart from "@fastify/multipart";
import { editorRoutes } from "./routes/editor";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import { timelineRoutes } from "./routes/timline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
});

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true,
});

app.get("/health", async () => ({ ok: true }));

await app.register(multipart, {
  limits: {
    fileSize: 1024 * 1024 * 200, // 200MB
  },
});

await app.register(websocket);

await app.register(comfyRoutes);

await app.register(editorRoutes);
await app.register(timelineRoutes);

app.get("/projects", async () => {
  return await listProjects();
});

app.post("/projects", async (req, reply) => {
  const body = (req.body ?? {}) as { name?: string };
  const project: Project = ProjectSchema.parse({
    id: nanoid(),
    name: body.name ?? "Untitled Project",
    nodes: [],
    edges: [],
    uiState: {
      selectedNodeId: undefined,
      activePath: [],
      layerVisibility: { clip: true, params: true, edit: true },
    },
  });
  await saveProject(project);
  reply.code(201);
  return project;
});

app.get("/projects/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const project = await loadProject(id);
  if (!project) return reply.code(404).send({ error: "not_found" });
  return project;
});

app.put("/projects/:id", async (req, reply) => {
  const { id } = req.params as { id: string };
  const incoming = ProjectSchema.parse(req.body);
  if (incoming.id !== id) return reply.code(400).send({ error: "id_mismatch" });
  await saveProject(incoming);
  return { ok: true };
});

app.listen({ port: 3001, host: "0.0.0.0" });

import Fastify from "fastify";
import cors from "@fastify/cors";
import { nanoid } from "nanoid";
import { ProjectSchema, type Project } from "@ma/shared";
import { listProjects, loadProject, saveProject } from "./storage";
import { comfyRoutes } from "./routes/comfy";
import websocket from "@fastify/websocket";


const app = Fastify({ logger: true });

await app.register(cors, {
  origin: true
});

app.get("/health", async () => ({ ok: true }));

await app.register(websocket);

await app.register(comfyRoutes);

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
      layerVisibility: { clip: true, params: true, edit: true }
    }
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
  console.log("RAW BODY", JSON.stringify(req.body, null, 2));  // <- check
  const { id } = req.params as { id: string };
  const incoming = ProjectSchema.parse(req.body);
  console.log("PARSED", JSON.stringify(incoming, null, 2));    // <- check
  if (incoming.id !== id) return reply.code(400).send({ error: "id_mismatch" });
  await saveProject(incoming);
  return { ok: true };
});

app.listen({ port: 3001, host: "0.0.0.0" });

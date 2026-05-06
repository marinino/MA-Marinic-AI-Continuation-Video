import type { FastifyInstance } from "fastify";
import { buildBranchTimeline } from "../services/buildBranchTimeline";
import { loadProject } from "../storage"; // an deinen echten Pfad anpassen
import path from "node:path";
import fs from "node:fs";

export async function registerTimelineRoutes(app: FastifyInstance) {
  app.get("/projects/:projectId/timeline/:nodeId", async (req, reply) => {
    const { projectId, nodeId } = req.params as {
      projectId: string;
      nodeId: string;
    };

    const project = await loadProject(projectId); // an deine echte Funktion anpassen

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const timeline = await buildBranchTimeline(project, nodeId);
    return timeline;
  });

  app.get("/timeline-frames/:clipId/:file", async (req, reply) => {
    const { clipId, file } = req.params as {
      clipId: string;
      file: string;
    };

    const filePath = path.join(process.cwd(), "data", "timeline-frames", clipId, file);

    if (!fs.existsSync(filePath)) {
      return reply.code(404).send({ error: "Frame not found" });
    }

    return reply.type("image/png").send(fs.createReadStream(filePath));
  });
}

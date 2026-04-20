import type { FastifyInstance } from "fastify";
import { buildBranchTimeline } from "../services/buildBranchTimeline";
import { loadProject } from "../storage"; // an deinen echten Pfad anpassen

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

    const timeline = buildBranchTimeline(project, nodeId);
    return timeline;
  });
}

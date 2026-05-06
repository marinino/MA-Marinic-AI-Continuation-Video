import type { FastifyInstance } from "fastify";
import { loadProject } from "../storage";
import { evaluateProjectTransitions } from "../services/transitionEvaluation";
import fs from "node:fs";

export async function transitionEvaluationRoutes(app: FastifyInstance) {
  app.post("/projects/:id/evaluate-transitions", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body ?? {}) as { frameCount?: number };

    const project = await loadProject(id);
    if (!project) {
      return reply.code(404).send({ error: "not_found" });
    }

    try {
      return await evaluateProjectTransitions(project, {
        frameCount: body.frameCount ?? 5,
      });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({
        error: "transition_evaluation_failed",
      });
    }
  });

app.get("/transition-frames", async (req, reply) => {
  const { path: encodedPath } = req.query as { path?: string };

  if (!encodedPath) {
    return reply.code(400).send({ error: "missing_path" });
  }

  const filePath = decodeURIComponent(encodedPath);

  if (!fs.existsSync(filePath)) {
    return reply.code(404).send({ error: "frame_not_found", filePath });
  }

  return reply.type("image/png").send(fs.createReadStream(filePath));
});
}

import { z } from "zod";

export const NodeTypeSchema = z.enum(["clip", "params", "edit"]);

export const BaseNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() }),
});

export const ParamNodeDataSchema = z
  .object({
    label: z.string(),
    prompt: z.string().optional(),
    strength: z.number().min(0).max(1).optional(),
    mode: z.enum(["continuation", "variation", "extension", "v2v"]).optional(),

    parentClipId: z.string().optional(),

    negativePrompt: z.string().optional(),
    seed: z.number().optional(),
    steps: z.number().optional(),
    cfg: z.number().optional(),
    fps: z.number().optional(),
    length: z.number().optional(),

    // Job-Meta (optional, aber sehr nützlich)
    status: z.enum(["idle", "queued", "running", "done", "error"]).optional(),
    promptId: z.string().optional(),
    error: z.string().optional(),
    note: z.string().optional(),
    isHidden: z.boolean().optional(),
  })
  .passthrough();

export const EditNodeDataSchema = z
  .object({
    label: z.string(),
    tool: z.string().optional(),
    notes: z.string().optional(),
    note: z.string().optional(),
    isHidden: z.boolean().optional(),

    // optional: strukturierter Platz für Timeline-Import
    timeline: z
      .object({
        snapshot: z.any().optional(),
        changelog: z.any().optional(),
        importedAt: z.string().optional(),
        fileName: z.string().optional(),
        storedTimelineFilename: z.string(),
        version: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

export const EdgeTypeSchema = z.enum(["input", "output", "edit_in", "edit_out"]);

export const EdgeSchema = z.object({
  id: z.string(),
  type: EdgeTypeSchema,
  source: z.string(),
  target: z.string(),
  data: z
    .object({
      isHidden: z.boolean().optional(),
    })
    .passthrough()
    .optional(),
});

export const StoredMediaFileSchema = z.object({
  filename: z.string(),
  subfolder: z.string(),
  type: z.string(),
});

export const ClipNodeDataSchema = z
  .object({
    label: z.string(),
    mediaId: z.string().optional(),
    durationSec: z.number().optional(),

    // ✅ neu: comfy outputs persistieren
    videoStatus: z.enum(["idle", "generating", "done", "error"]).optional(),
    videoUrl: z.string().optional(),
    videoFile: StoredMediaFileSchema.optional(),

    videoOpened: z.boolean().optional(),
    note: z.string().optional(),
    isHidden: z.boolean().optional(),
  })
  .passthrough();

export const NodeSchema = z.discriminatedUnion("type", [
  BaseNodeSchema.extend({ type: z.literal("clip"), data: ClipNodeDataSchema }),
  BaseNodeSchema.extend({ type: z.literal("params"), data: ParamNodeDataSchema }),
  BaseNodeSchema.extend({ type: z.literal("edit"), data: EditNodeDataSchema }),
]);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  uiState: z.object({
    selectedNodeId: z.string().optional(),
    activePath: z.array(z.string()).default([]),
    layerVisibility: z.object({
      clip: z.boolean().default(true),
      params: z.boolean().default(true),
      edit: z.boolean().default(true),
    }),
  }),
});





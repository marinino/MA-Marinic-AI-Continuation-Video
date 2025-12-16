import { z } from "zod";

export const NodeTypeSchema = z.enum(["clip", "params", "edit"]);

export const BaseNodeSchema = z.object({
  id: z.string(),
  type: NodeTypeSchema,
  position: z.object({ x: z.number(), y: z.number() })
});

export const ClipNodeDataSchema = z.object({
  label: z.string(),
  mediaId: z.string().optional(),      // später: referenz auf upload/stream
  durationSec: z.number().optional()
});

export const ParamNodeDataSchema = z.object({
  label: z.string(),
  // minimal: später erweiterbar für comfyui workflow, seed, steps, etc.
  prompt: z.string().optional(),
  strength: z.number().min(0).max(1).optional(),
  mode: z.enum(["continuation", "variation", "extension"]).optional()
});

export const EditNodeDataSchema = z.object({
  label: z.string(),
  tool: z.string().optional(),         // "davinci", "blender", ...
  notes: z.string().optional()
});

export const NodeSchema = z.discriminatedUnion("type", [
  BaseNodeSchema.extend({ type: z.literal("clip"), data: ClipNodeDataSchema }),
  BaseNodeSchema.extend({ type: z.literal("params"), data: ParamNodeDataSchema }),
  BaseNodeSchema.extend({ type: z.literal("edit"), data: EditNodeDataSchema })
]);

export const EdgeTypeSchema = z.enum(["input", "output", "edit_in", "edit_out"]);

export const EdgeSchema = z.object({
  id: z.string(),
  type: EdgeTypeSchema,
  source: z.string(),
  target: z.string()
});

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
      edit: z.boolean().default(true)
    })
  })
});

export type Project = z.infer<typeof ProjectSchema>;
export type Node = z.infer<typeof NodeSchema>;
export type Edge = z.infer<typeof EdgeSchema>;
export type NodeType = z.infer<typeof NodeTypeSchema>;
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

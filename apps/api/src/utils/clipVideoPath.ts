import type { Project } from "@ma/shared";
import path from "node:path";
import fs from "node:fs";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function existingFile(p: string | null): string | null {
  if (!p) return null;
  return fs.existsSync(p) ? p : null;
}

function resolveComfyVideoFilePath(videoFile: any): string | null {
  if (!videoFile) return null;

  const filename = asString(videoFile.filename);
  const subfolder = typeof videoFile.subfolder === "string" ? videoFile.subfolder : "";
  const type = asString(videoFile.type) ?? "output";

  if (!filename) return null;

  const comfyInputDir =
    process.env.COMFY_INPUT_DIR || path.resolve(process.cwd(), "tools", "comfyui", "input");

  const comfyOutputDir =
    process.env.COMFY_OUTPUT_DIR || path.resolve(process.cwd(), "tools", "comfyui", "output");

  const comfyTempDir =
    process.env.COMFY_TEMP_DIR || path.resolve(process.cwd(), "tools", "comfyui", "temp");

  let baseDir: string;
  switch (type) {
    case "input":
      baseDir = comfyInputDir;
      break;
    case "temp":
      baseDir = comfyTempDir;
      break;
    case "output":
    default:
      baseDir = comfyOutputDir;
      break;
  }

  const candidate = subfolder
    ? path.join(baseDir, subfolder, filename)
    : path.join(baseDir, filename);

  console.log("trying comfy path", {
    filename,
    subfolder,
    type,
    candidate,
    exists: fs.existsSync(candidate),
  });

  return existingFile(candidate);
}

export function getVideoPathForClip(project: Project, clipId: string): string | null {
  const node = project.nodes.find((n) => n.id === clipId) as any;
  if (!node || node.type !== "clip") return null;

  const d = node.data ?? {};

  const fromVideoFile = resolveComfyVideoFilePath(d.videoFile);
  if (fromVideoFile) {
    console.log("resolved from videoFile", clipId, fromVideoFile);
    return fromVideoFile;
  }

  const directCandidates = [
    asString(d.videoPath),
    asString(d.filePath),
    asString(d.localPath),
    asString(d.storedVideoPath),
    asString(d.outputPath),
    asString(d.mediaPath),
  ];

  for (const candidate of directCandidates) {
    const resolved = candidate ? path.resolve(candidate) : null;
    const found = existingFile(resolved);
    if (found) return found;
  }

  const filenameCandidates = [
    asString(d.videoFilename),
    asString(d.storedVideoFilename),
    asString(d.filename),
  ];

  const mediaBaseDirs = [
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "storage"),
    path.resolve(process.cwd(), "uploads"),
    path.resolve(process.cwd(), "media"),
  ];

  for (const filename of filenameCandidates) {
    if (!filename) continue;
    for (const base of mediaBaseDirs) {
      const candidate = path.join(base, filename);
      const found = existingFile(candidate);
      if (found) return found;
    }
  }

  console.log("could not resolve video path", {
    clipId,
    videoFile: d.videoFile ?? null,
  });

  return null;
}

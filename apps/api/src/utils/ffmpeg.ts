import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} failed with code ${code}: ${stderr}`));
      }
    });
  });
}

function runCapture(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`${cmd} failed with code ${code}: ${stderr}`));
      }
    });
  });
}

async function makeTempDir(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function parseFraction(value?: string): number | undefined {
  if (!value) return undefined;

  if (value.includes("/")) {
    const [a, b] = value.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return undefined;
    return a / b;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export type VideoMetadata = {
  durationSec?: number;
  fps?: number;
  totalFrames?: number;
};

export async function probeVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  try {
    const { stdout } = await runCapture("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=r_frame_rate,avg_frame_rate,nb_frames,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      videoPath,
    ]);

    const parsed = JSON.parse(stdout);
    const stream = parsed?.streams?.[0] ?? {};
    const format = parsed?.format ?? {};

    const fps =
      parseFraction(stream?.avg_frame_rate) ?? parseFraction(stream?.r_frame_rate) ?? undefined;

    const durationFromStream =
      typeof stream?.duration === "string" ? Number(stream.duration) : stream?.duration;

    const durationFromFormat =
      typeof format?.duration === "string" ? Number(format.duration) : format?.duration;

    const durationSec = Number.isFinite(durationFromStream)
      ? durationFromStream
      : Number.isFinite(durationFromFormat)
        ? durationFromFormat
        : undefined;

    const nbFrames =
      typeof stream?.nb_frames === "string"
        ? Number(stream.nb_frames)
        : typeof stream?.nb_frames === "number"
          ? stream.nb_frames
          : undefined;

    const totalFrames = Number.isFinite(nbFrames)
      ? nbFrames
      : Number.isFinite(durationSec) && Number.isFinite(fps)
        ? Math.round((durationSec as number) * (fps as number))
        : undefined;

    return {
      durationSec: Number.isFinite(durationSec) ? durationSec : undefined,
      fps: Number.isFinite(fps) ? fps : undefined,
      totalFrames: Number.isFinite(totalFrames) ? totalFrames : undefined,
    };
  } catch (err) {
    return {};
  }
}

export async function extractFramesFromOffset(
  videoPath: string,
  count: number,
  startFrame: number,
  size = 224
): Promise<string[]> {
  const safeName = path.basename(videoPath).replace(/[^a-zA-Z0-9._-]/g, "_");
  const outDir = await makeTempDir(`transition-offset-${safeName}-`);
  const pattern = path.join(outDir, "frame-%03d.png");

  const vf = [
    `select='gte(n\\,${startFrame})'`,
    `scale=${size}:${size}:force_original_aspect_ratio=decrease`,
    `pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`,
  ].join(",");

  const args = [
    "-y",
    "-i",
    videoPath,
    "-vf",
    vf,
    "-vsync",
    "0",
    "-frames:v",
    String(count),
    pattern,
  ];

  await run("ffmpeg", args);

  return (await fs.readdir(outDir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(outDir, f));
}

export async function extractBoundaryFrames(
  videoPath: string,
  count: number,
  mode: "first" | "last",
  size = 224
): Promise<string[]> {
  const safeName = path.basename(videoPath).replace(/[^a-zA-Z0-9._-]/g, "_");
  const outDir = await makeTempDir(`transition-${mode}-${safeName}-`);
  const pattern = path.join(outDir, "frame-%03d.png");

  const vf =
    mode === "first"
      ? `scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`
      : `reverse,scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`;

  const args = ["-y", "-i", videoPath, "-vf", vf, "-frames:v", String(count), pattern];

  await run("ffmpeg", args);

  let files = (await fs.readdir(outDir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(outDir, f));

  if (mode === "last") {
    files = files.reverse();
  }

  console.log("extractBoundaryFrames", {
    videoPath,
    mode,
    outDir,
    files,
  });

  return files;
}

export async function extractTimelinePreviewFrames(opts: {
  clipId: string;
  videoPath: string;
  outputRoot: string;
  size?: number;
  generatedFrames?: number;
}): Promise<{ firstPath: string; lastPath: string }> {
  const { clipId, videoPath, outputRoot, size = 224, generatedFrames } = opts;

  const safeClipId = clipId.replace(/[^a-zA-Z0-9._-]/g, "_");
  const outDir = path.join(outputRoot, safeClipId);

  await fs.mkdir(outDir, { recursive: true });

  const firstPath =
    typeof generatedFrames === "number" && generatedFrames > 0
      ? path.join(outDir, `first-generated-${generatedFrames}.png`)
      : path.join(outDir, "first.png");

  const lastPath = path.join(outDir, "last.png");

  const exists = async (p: string) => {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  };

  if ((await exists(firstPath)) && (await exists(lastPath))) {
    return { firstPath, lastPath };
  }

  const vf = [
    `scale=${size}:${size}:force_original_aspect_ratio=decrease`,
    `pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`,
  ].join(",");

  if (typeof generatedFrames === "number" && generatedFrames > 0) {
    await run("ffmpeg", [
      "-y",
      "-i",
      videoPath,
      "-vf",
      `reverse,select='eq(n\\,${generatedFrames - 1})',${vf}`,
      "-vsync",
      "0",
      "-frames:v",
      "1",
      firstPath,
    ]);
  } else {
    await run("ffmpeg", ["-y", "-i", videoPath, "-vf", vf, "-frames:v", "1", firstPath]);
  }

  await run("ffmpeg", ["-y", "-i", videoPath, "-vf", `reverse,${vf}`, "-frames:v", "1", lastPath]);

  return { firstPath, lastPath };
}

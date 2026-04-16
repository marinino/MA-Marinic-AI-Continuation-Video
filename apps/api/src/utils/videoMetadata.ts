// server/utils/videoMetadata.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseFraction(value: string | undefined): number | null {
  if (!value) return null;

  if (value.includes("/")) {
    const [a, b] = value.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type VideoMetadata = {
  fps: number;
  totalFrames: number;
  durationSec: number;
};

export async function readVideoMetadata(filePath: string): Promise<VideoMetadata> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=avg_frame_rate,r_frame_rate,nb_frames,duration",
    "-of",
    "json",
    filePath,
  ]);

  const parsed = JSON.parse(stdout);
  const stream = parsed?.streams?.[0];

  if (!stream) {
    throw new Error("No video stream found.");
  }

  const fps =
    parseFraction(stream.avg_frame_rate) ??
    parseFraction(stream.r_frame_rate);

  const durationSec = Number(stream.duration);
  const nbFramesRaw = Number(stream.nb_frames);

  if (!fps || !Number.isFinite(fps) || fps <= 0) {
    throw new Error("Could not determine FPS.");
  }

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    throw new Error("Could not determine duration.");
  }

  const totalFrames =
    Number.isFinite(nbFramesRaw) && nbFramesRaw > 0
      ? Math.round(nbFramesRaw)
      : Math.max(1, Math.round(durationSec * fps));

  return {
    fps,
    totalFrames,
    durationSec,
  };
}
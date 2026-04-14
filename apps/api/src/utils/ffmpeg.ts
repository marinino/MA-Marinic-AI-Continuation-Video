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

async function makeTempDir(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function extractBoundaryFrames(
  videoPath: string,
  count: number,
  mode: "first" | "last",
  size = 224
): Promise<string[]> {
  const outDir = await makeTempDir(`transition-${mode}-`);
  const pattern = path.join(outDir, "frame-%03d.png");

  // Für first: erste count Frames
  // Für last: letzte count Frames durch reverse trick:
  //   reverse -> erste count Frames -> reverse Reihenfolge später in Node zurücksortieren
  const vf =
    mode === "first"
      ? `scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`
      : `reverse,scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2`;

  const args = [
    "-y",
    "-i",
    videoPath,
    "-vf",
    vf,
    "-frames:v",
    String(count),
    pattern,
  ];

  await run("ffmpeg", args);

  let files = (await fs.readdir(outDir))
    .filter((f) => f.endsWith(".png"))
    .sort()
    .map((f) => path.join(outDir, f));

  if (mode === "last") {
    files = files.reverse();
  }

  return files;
}
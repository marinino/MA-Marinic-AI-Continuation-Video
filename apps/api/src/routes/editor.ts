// routes/editor.ts
import type { FastifyInstance } from "fastify";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const COMFY_DIR = process.env.COMFY_DIR ?? path.resolve(process.cwd(), "tools/comfyui");
const COMFY_INPUT_DIR = path.join(COMFY_DIR, "input");

function defaultResolvePaths() {
  return {
    win32: [
      "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe",
      "C:\\Program Files (x86)\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe",
      "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve\\Resolve.exe",
    ],
    linux: [
      "/opt/resolve/bin/resolve",
      "/usr/bin/resolve",
      "/usr/local/bin/resolve",
    ],
  } as const;
}

function findResolveExecutable(): string | null {
  const plat = process.platform as "win32" | "linux" | string;
  const candidates = (defaultResolvePaths() as any)[plat] ?? [];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function revealInFileManager(filePath: string) {
  const plat = process.platform;

  if (plat === "win32") {
    const abs = path.resolve(filePath);
    spawn("explorer.exe", ["/select,", abs], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (plat === "linux") {
    spawn("xdg-open", [path.dirname(filePath)], { detached: true, stdio: "ignore" }).unref();
    return;
  }
}


function openResolve() {
  const plat = process.platform;

  // Optional: über ENV konfigurierbar machen (sehr empfehlenswert)
  const envPath = process.env.RESOLVE_PATH;
  const exe = envPath && fs.existsSync(envPath) ? envPath : findResolveExecutable();

  if (plat === "win32") {
    if (exe) {
      spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
      return;
    }
    // fallback: startet Resolve.exe wenn es im PATH/Registry gefunden wird
    spawn("cmd", ["/c", "start", "", "Resolve.exe"], {
      detached: true,
      stdio: "ignore",
    }).unref();
    return;
  }

  if (plat === "linux") {
    if (!exe) {
      throw new Error(
        "DaVinci Resolve not found. Set RESOLVE_PATH (e.g. /opt/resolve/bin/resolve)."
      );
    }
    spawn(exe, [], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  throw new Error(`Unsupported platform: ${plat}`);
}


export async function editorRoutes(app: FastifyInstance) {
    app.post("/editor/open/resolve", async (req, reply) => {
    const body = (req.body ?? {}) as { filename?: string };

    try {
        openResolve();

        if (body.filename) {
        const absPath = path.join(COMFY_INPUT_DIR, body.filename);

        app.log.info({ absPath }, "Reveal file in explorer");

        if (!fs.existsSync(absPath)) {
            throw new Error(`File not found: ${absPath}`);
        }

        revealInFileManager(absPath);
        }

        return reply.code(204).send();
    } catch (e: any) {
        req.log.error(e);
        return reply.code(500).send({ error: String(e?.message ?? e) });
    }
    });

    app.log.info(
        { RESOLVE_SCRIPT_LIB_DIR: process.env.RESOLVE_SCRIPT_LIB_DIR, py: process.env.PYTHON_BIN },
        "Resolve export env"
        );


    app.post("/editor/resolve/export-timeline", async (req, reply) => {
        try {
        const json = await runPythonExport();
        return reply.send(json);
        } catch (e: any) {
        req.log.error(e);
        return reply.code(500).send({ error: String(e?.message ?? e) });
        }
    });

}

function runPythonExport(): Promise<any> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "scripts/resolve_export_timeline.py");

    const py = process.env.PYTHON_BIN ?? "python";

    const resolveDir = process.env.RESOLVE_DIR ?? "C:\\Program Files\\Blackmagic Design\\DaVinci Resolve";
    const resolveScriptLib = process.env.RESOLVE_SCRIPT_LIB_DIR ?? "";

    const proc = spawn(py, [scriptPath], {
      env: {
        ...process.env,
        RESOLVE_DIR: resolveDir,
        RESOLVE_SCRIPT_LIB_DIR: resolveScriptLib,
        PATH: `${resolveDir};${process.env.PATH ?? ""}`,
        PYTHONIOENCODING: "utf-8",
      },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d) => (stdout += d.toString("utf8")));
    proc.stderr.on("data", (d) => (stderr += d.toString("utf8")));

    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code !== 0) return reject(new Error(`python exited ${code}\n${stderr}\n${stdout}`));
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Failed to parse JSON from python.\n${stderr}\n${stdout}`));
      }
    });
  });
}


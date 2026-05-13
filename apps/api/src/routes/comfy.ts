import type { FastifyInstance } from "fastify";
import { nanoid } from "nanoid";
import WebSocket from "ws";
import t2vWorkflow from "./../../../../workflows/Create_Video.json" with { type: "json" };
import v2vWorkflow from "./../../../../workflows/Extend_Video.json" with { type: "json" };
import { StoredMediaFile } from "@ma/shared";
import path from "node:path";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { probeVideoMetadata } from "../utils/ffmpeg";

const COMFY_URL = process.env.COMFY_URL ?? "http://127.0.0.1:8188";
const COMFY_WS = COMFY_URL.replace(/^http/, "ws");

const COMFY_DIR = process.env.COMFY_DIR ?? path.resolve(process.cwd(), "tools/comfyui");
const COMFY_INPUT_DIR = path.join(COMFY_DIR, "input");
const COMFY_OUTPUT_DIR = path.join(COMFY_DIR, "output");

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function safeBasename(name: string) {
  // verhindert ../ path traversal
  return path.basename(name);
}

function safeExt(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  // optional: nur erlaubte video-formate
  const allowed = new Set([".mp4", ".mov", ".webm", ".mkv"]);
  return allowed.has(ext) ? ext : "";
}

const execFileAsync = promisify(execFile);

function parseFraction(value?: string): number | null {
  if (!value) return null;

  if (value.includes("/")) {
    const [a, b] = value.split("/").map(Number);
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return a / b;
  }

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function ensureCopiedToInput(file: { filename: string; subfolder?: string; type?: string }) {
  const filename = safeBasename(file.filename);
  const sub = safeBasename(file.subfolder ?? "");
  const type = file.type ?? "output";

  const src =
    type === "output"
      ? path.join(COMFY_OUTPUT_DIR, sub, filename)
      : path.join(COMFY_INPUT_DIR, filename);

  // ✅ unique name
  const unique = `${Date.now()}_${filename}`;
  const dst = path.join(COMFY_INPUT_DIR, unique);

  await fs.copyFile(src, dst);
  return unique;
}

export async function comfyRoutes(app: FastifyInstance) {
  app.post("/comfy/video", async (req, reply) => {
    const body = (req.body ?? {}) as { text?: string; seed?: number; length?: number };
    if (!body.text || typeof body.text !== "string") {
      return reply.code(400).send({ error: "missing_text" });
    }

    const length =
  typeof body.length === "number" && Number.isFinite(body.length) && body.length > 0
    ? Math.round(body.length)
    : 81;

    const wf = deepClone(t2vWorkflow);
    wf["11"].inputs.text = body.text;
    wf["23"].inputs.length = length;
    wf["12"].inputs.noise_seed =
      typeof body.seed === "number" ? body.seed : Math.floor(Math.random() * 1e15);

    const client_id = nanoid();

    const r = await fetch(`${COMFY_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: wf, client_id }),
    });

    if (!r.ok) {
      const details = await r.text();
      return reply.code(500).send({ error: "comfy_prompt_failed", details });
    }

    const data = (await r.json()) as { prompt_id: string };
    return { prompt_id: data.prompt_id, client_id };
  });

  app.get("/comfy/history/:prompt_id", async (req, reply) => {
    const { prompt_id } = req.params as { prompt_id: string };
    const r = await fetch(`${COMFY_URL}/history/${prompt_id}`);
    if (!r.ok) {
      const details = await r.text();
      return reply.code(500).send({ error: "comfy_history_failed", details });
    }
    return await r.json();
  });

  app.get("/comfy/view", async (req, reply) => {
    const qs = new URLSearchParams(req.query as Record<string, string>).toString();
    const r = await fetch(`${COMFY_URL}/view?${qs}`);
    if (!r.ok) {
      const details = await r.text();
      return reply.code(500).send({ error: "comfy_view_failed", details });
    }
    reply.header("content-type", r.headers.get("content-type") ?? "application/octet-stream");
    return reply.send(Buffer.from(await r.arrayBuffer()));
  });

  // ✅ IMPORTANT: route should be /comfy/ws (NOT /api/comfy/ws)
  app.get("/comfy/ws", { websocket: true }, (connection, req) => {
    const { clientId } = req.query as any;
    if (!clientId) {
      connection.socket.close();
      return;
    }

    app.log.info({ clientId }, "CLIENT WS CONNECT");

    const upstreamUrl =
      `${COMFY_WS}/ws?clientId=${encodeURIComponent(clientId)}` +
      `&client_id=${encodeURIComponent(clientId)}`;

    app.log.info({ upstreamUrl }, "CONNECTING UPSTREAM WS");

    const upstream = new WebSocket(upstreamUrl);

    upstream.on("open", () => {
      app.log.info("UPSTREAM WS OPEN");
    });

    upstream.on("message", (data) => {
      app.log.info({ bytes: (data as any)?.length ?? 0 }, "UPSTREAM WS MESSAGE");
      connection.socket.send(typeof data === "string" ? data : data.toString());
    });

    upstream.on("close", (code, reason) => {
      app.log.info({ code, reason: reason?.toString() }, "UPSTREAM WS CLOSED");
      connection.socket.close();
    });

    upstream.on("error", (err) => {
      app.log.error({ err }, "UPSTREAM WS ERROR");
      connection.socket.close();
    });

    connection.socket.on("close", () => {
      app.log.info("CLIENT WS CLOSED");
      upstream.close();
    });

    // optional keepalive (hilft bei Proxies)
    const ping = setInterval(() => {
      if (upstream.readyState === WebSocket.OPEN) upstream.ping();
    }, 20000);

    connection.socket.on("close", () => clearInterval(ping));
  });

  app.post("/comfy/v2v", async (req, reply) => {
    const body = (req.body ?? {}) as {
      text?: string;
      seed?: number;
      videoFile?: StoredMediaFile;
      highNoiseCfg?: number;
      lowNoiseCfg?: number;

      highNoiseModelStrength?: number;
      lowNoiseModelStrength?: number;

      highNoiseShift?: number;
      lowNoiseShift?: number;

      highNoiseSteps?: number;
      lowNoiseSteps?: number;

      highNoiseStartStep?: number;
      lowNoiseStartStep?: number;

      highNoiseEndStep?: number;
      lowNoiseEndStep?: number;

      length?: number;
    };

    if (!body.text || typeof body.text !== "string") {
      return reply.code(400).send({ error: "missing_text" });
    }
    if (!body.videoFile?.filename) {
      return reply.code(400).send({ error: "missing_videoFile" });
    }

    const wf = deepClone(v2vWorkflow);

    const inputFilename = await ensureCopiedToInput(body.videoFile);

    // ✅ prompt patch
    wf["122:93"].inputs.text = body.text;

    const seed = typeof body.seed === "number" ? body.seed : Math.floor(Math.random() * 1e15);
    wf["122:86"].inputs.noise_seed = seed;
    wf["122:85"].inputs.noise_seed = seed + 1;

    wf["150"].inputs.value = inputFilename;
    wf["151"].inputs.file = inputFilename;
    wf["155"].inputs.video = inputFilename;

    // helper: patch nur wenn number
    const setNum = (nodeId: string, key: string, v: unknown) => {
      if (typeof v === "number" && Number.isFinite(v)) {
        (wf as any)[nodeId].inputs[key] = v;
      }
    };

    // ---- HIGH NOISE ----
    setNum("122:104", "shift", body.highNoiseShift);
    setNum("122:101", "strength_model", body.highNoiseModelStrength);

    setNum("122:86", "cfg", body.highNoiseCfg);
    setNum("122:86", "steps", body.highNoiseSteps);
    setNum("122:86", "start_at_step", body.highNoiseStartStep);
    setNum("122:86", "end_at_step", body.highNoiseEndStep);

    // ---- LOW NOISE ----
    setNum("122:103", "shift", body.lowNoiseShift);
    setNum("122:102", "strength_model", body.lowNoiseModelStrength);

    setNum("122:85", "cfg", body.lowNoiseCfg);
    setNum("122:85", "steps", body.lowNoiseSteps);
    setNum("122:85", "start_at_step", body.lowNoiseStartStep);
    setNum("122:85", "end_at_step", body.lowNoiseEndStep);

    setNum("122:98", "length", body.length);

    const client_id = nanoid();

    const r = await fetch(`${COMFY_URL}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: wf, client_id }),
    });

    if (!r.ok) {
      const details = await r.text();
      return reply.code(500).send({ error: "comfy_prompt_failed", details });
    }

    const data = (await r.json()) as { prompt_id: string };
    return { prompt_id: data.prompt_id, client_id };
  });

  app.post("/comfy/upload", async (req, reply) => {
    const file = await (req as any).file();
    if (!file) return reply.code(400).send({ error: "missing_file" });

    const orig = safeBasename(file.filename);
    const ext = safeExt(orig);
    if (!ext) return reply.code(400).send({ error: "unsupported_filetype" });

    const unique = `${Date.now()}_${nanoid()}${ext}`;
    const dstPath = path.join(COMFY_INPUT_DIR, unique);

    await fs.mkdir(COMFY_INPUT_DIR, { recursive: true });

    await pipeline(file.file, (await import("node:fs")).createWriteStream(dstPath));

    const meta = await probeVideoMetadata(dstPath);

    const stored: StoredMediaFile = {
      filename: unique,
      subfolder: "",
      type: "input",
      fps: meta.fps,
      durationSec: meta.durationSec,
      totalFrames: meta.totalFrames,
    };

    return reply.send(stored);
  });
}

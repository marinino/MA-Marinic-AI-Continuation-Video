// timeline.ts
import type { FastifyInstance } from "fastify";
import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { StoredMediaFile } from "@ma/shared";

type ClipSnap = {
  key: string;
  name?: string;
  lane?: number;
  offset?: number;
  start?: number;
  duration?: number;
  ref?: string;
  mediaFilePath?: string;
};

type TimelineSnapshot = {
  timelineName?: string;
  clips: ClipSnap[];
};

type Change =
  | { type: "clip_added"; key: string; clip: ClipSnap }
  | { type: "clip_removed"; key: string; clip: ClipSnap }
  | { type: "clip_moved"; key: string; from?: number; to?: number }
  | {
      type: "clip_trimmed";
      key: string;
      from?: { start?: number; duration?: number };
      to?: { start?: number; duration?: number };
    }
  | { type: "clip_renamed"; key: string; from?: string; to?: string };

const COMFY_DIR = process.env.COMFY_DIR ?? path.resolve(process.cwd(), "tools/comfyui");
const COMFY_INPUT_DIR = path.join(COMFY_DIR, "input");

function safeNum(x: any): number | undefined {
  if (x == null) return undefined;
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const m = x.match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : undefined;
  }
  return undefined;
}

function safeStr(x: any): string | undefined {
  return typeof x === "string" ? x : undefined;
}

function buildKey(parts: Array<string | number | undefined | null>): string {
  return parts.map((p) => (p == null || p === "" ? "∅" : String(p))).join("|");
}

function isZip(buf: Buffer) {
  return (
    buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04
  );
}

/* -------------------------
   DRT zip XML selection
   - We score XML files by keywords typical for timeline structure
------------------------- */
function scoreDrtXml(text: string): number {
  const t = text.toLowerCase();
  let s = 0;

  // timeline-ish signals
  if (t.includes("timeline")) s += 5;
  if (t.includes("track")) s += 4;
  if (t.includes("clip")) s += 4;
  if (t.includes("item")) s += 2;
  if (t.includes("edit")) s += 2;

  // effects-ish signals
  if (t.includes("openfx")) s += 3;
  if (t.includes("ofx")) s += 3;
  if (t.includes("fusion")) s += 2;
  if (t.includes("transition")) s += 2;

  // avoid picking pure mediapool-only files if possible
  if (t.includes("mediapool")) s -= 2;

  return s;
}

async function extractXmlTextFromDrtZip(
  buf: Buffer
): Promise<{
  xmlText: string;
  pickedName: string;
  candidates: Array<{ name: string; score: number }>;
}> {
  const zip = await JSZip.loadAsync(buf);

  const xmlFiles = Object.keys(zip.files).filter((name) => name.toLowerCase().endsWith(".xml"));
  if (!xmlFiles.length) throw new Error("drt_zip_has_no_xml");

  // score each candidate by reading a small preview (fast)
  const scored: Array<{ name: string; score: number }> = [];
  for (const name of xmlFiles) {
    const f = zip.file(name);
    if (!f) continue;
    const preview = (await f.async("string")).slice(0, 200_000); // limit read
    scored.push({ name, score: scoreDrtXml(preview) });
  }

  scored.sort((a, b) => b.score - a.score);
  const picked = scored[0]?.name ?? xmlFiles[0];

  const file = zip.file(picked);
  if (!file) throw new Error("drt_zip_xml_missing");
  const xmlText = await file.async("string");

  return { xmlText, pickedName: picked, candidates: scored.slice(0, 10) };
}

function detectFormat(filename: string, buf: Buffer, xmlObjMaybe: any): "fcpxml" | "drt" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".fcpxml")) return "fcpxml";
  if (lower.endsWith(".drt")) return "drt";
  if (isZip(buf)) return "drt";
  if (xmlObjMaybe?.fcpxml) return "fcpxml";
  return "drt";
}

/* ---------------- FCPXML ---------------- */
function extractClipsFromFcpxml(obj: any): TimelineSnapshot {
  const clips: ClipSnap[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== "object") return;

    for (const [k, v] of Object.entries(node)) {
      if (k === "asset-clip" || k === "clip" || k === "video" || k === "title") {
        const arr = Array.isArray(v) ? v : [v];
        for (const it of arr) {
          const clip: ClipSnap = {
            name: it?.["@_name"],
            ref: it?.["@_ref"],
            lane: safeNum(it?.["@_lane"]),
            offset: safeNum(it?.["@_offset"]),
            start: safeNum(it?.["@_start"]),
            duration: safeNum(it?.["@_duration"]),
            key: "",
          };
          clip.key = buildKey([clip.ref, clip.name, clip.start, clip.duration]);
          clips.push(clip);
          visit(it);
        }
      } else {
        visit(v);
      }
    }
  };

  visit(obj);
  return { timelineName: undefined, clips };
}

/* ---------------- DRT (Resolve) ----------------
   Key change: we do NOT rely on tag names.
   We detect "clip/effect/transition" by ATTRIBUTE PATTERNS.
*/
function extractFromDrt(obj: any): TimelineSnapshot {
  const clips: ClipSnap[] = [];

  const safeArr = <T>(x: T | T[] | undefined | null): T[] =>
    x == null ? [] : Array.isArray(x) ? x : [x];

  const textFromHexBlob = (hex: string): string[] => {
    // hex string -> bytes
    const clean = hex.replace(/[^0-9a-fA-F]/g, "");
    if (clean.length < 8) return [];

    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < clean.length; i += 2) {
      bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
    }

    const out: string[] = [];

    // 1) scan ASCII printable runs
    {
      let run: number[] = [];
      const flush = () => {
        if (run.length >= 4) {
          const s = String.fromCharCode(...run);
          out.push(s);
        }
        run = [];
      };

      for (const b of bytes) {
        if (b >= 32 && b <= 126) run.push(b);
        else flush();
      }
      flush();
    }

    // 2) scan UTF-16LE printable runs (byte pairs)
    {
      let chars: number[] = [];
      const flush = () => {
        if (chars.length >= 3) {
          out.push(String.fromCharCode(...chars));
        }
        chars = [];
      };

      for (let i = 0; i + 1 < bytes.length; i += 2) {
        const code = bytes[i] | (bytes[i + 1] << 8);
        // printable-ish unicode range (basic latin + a bit)
        if ((code >= 32 && code <= 126) || (code >= 160 && code <= 0x02ff)) {
          chars.push(code);
        } else {
          flush();
        }
      }
      flush();
    }

    // normalize + dedupe
    const norm = out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length >= 3);

    return Array.from(new Set(norm));
  };

  const extractEffectNames = (videoClip: any): string[] => {
    const names: string[] = [];

    // clip.FieldsBlob (often contains references)
    const fb1 = typeof videoClip?.FieldsBlob === "string" ? videoClip.FieldsBlob : null;
    if (fb1) names.push(...textFromHexBlob(fb1));

    // composition table blob (Fusion/effects)
    const fb2 =
      typeof videoClip?.CompositionTable?.Sm2TiCompositionTable?.FieldsBlob === "string"
        ? videoClip.CompositionTable.Sm2TiCompositionTable.FieldsBlob
        : null;
    if (fb2) names.push(...textFromHexBlob(fb2));

    const filtered = names.filter((s) => {
      const t = s.toLowerCase();
      // keep only likely effect-ish strings
      return (
        t.includes("effect") ||
        t.includes("openfx") ||
        t.includes("ofx") ||
        t.includes("fusion") ||
        t.includes("template") ||
        t.includes("binocular") ||
        t.includes("comic") ||
        t.includes("lut") ||
        t.includes("cctv")
      );
    });

    // also: we don’t want huge paths as “names” only
    const pretty = filtered
      .map((s) => {
        // if it's a path, take last segment
        const parts = s.split(/[\\/]/).filter(Boolean);
        const last = parts.length ? parts[parts.length - 1] : s;
        return last.length >= 3 ? last : s;
      })
      .filter((s) => s.length >= 3);

    return Array.from(new Set(pretty));
  };

  // --- Navigate Resolve Sm2 structure ---
  const root = obj?.Sm2SequenceContainer ?? obj;
  const videoTracks = safeArr(root?.VideoTrackVec?.Element);

  videoTracks.forEach((trackWrap: any, trackIdx: number) => {
    const track = trackWrap?.Sm2TiTrack ?? trackWrap;
    const items = safeArr(track?.Items?.Element);

    items.forEach((it: any) => {
      const vc = it?.Sm2TiVideoClip ?? null;
      if (!vc) return;

      const name = safeStr(vc?.Name) ?? "unnamed";
      const start = safeNum(vc?.Start);
      const duration = safeNum(vc?.Duration);
      const ref = safeStr(vc?.MediaRef) ?? safeStr(vc?.DbId);
      const offset = safeNum(vc?.Start); // fallback: Resolve uses Start as timeline-pos
      const mediaFilePath = safeStr(vc?.MediaFilePath);
      const lane = trackIdx;

      const clipKey = buildKey(["CLIP", vc?.DbId ?? ref ?? name, name, start, duration, lane]);

      clips.push({
        key: clipKey,
        name,
        ref,
        start,
        duration,
        offset,
        lane,
        mediaFilePath,
      });

      // Add “effects” as extra snapshot items (same time span as clip)
      const fxNames = extractEffectNames(vc);
      for (const fx of fxNames) {
        const fxKey = buildKey(["EFFECT", vc?.DbId ?? ref ?? name, fx, start, duration, lane]);
        clips.push({
          key: fxKey,
          name: `EFFECT: ${fx}`,
          ref: vc?.DbId ?? ref,
          start,
          duration,
          offset,
          lane,
        });
      }
    });
  });

  // dedupe by key
  const seen = new Set<string>();
  const deduped: ClipSnap[] = [];
  for (const c of clips) {
    if (seen.has(c.key)) continue;
    seen.add(c.key);
    deduped.push(c);
  }

  return { timelineName: undefined, clips: deduped };
}

/* ---------------- Diff ---------------- */
function diffSnapshots(prev: TimelineSnapshot | null, next: TimelineSnapshot): Change[] {
  if (!prev) return next.clips.map((c) => ({ type: "clip_added", key: c.key, clip: c }));

  const prevMap = new Map(prev.clips.map((c) => [c.key, c] as const));
  const nextMap = new Map(next.clips.map((c) => [c.key, c] as const));
  const changes: Change[] = [];

  for (const [key, clip] of prevMap)
    if (!nextMap.has(key)) changes.push({ type: "clip_removed", key, clip });
  for (const [key, clip] of nextMap)
    if (!prevMap.has(key)) changes.push({ type: "clip_added", key, clip });

  for (const [key, after] of nextMap) {
    const before = prevMap.get(key);
    if (!before) continue;

    if (before.offset !== after.offset || before.lane !== after.lane) {
      changes.push({ type: "clip_moved", key, from: before.offset, to: after.offset });
    }

    if (before.start !== after.start || before.duration !== after.duration) {
      changes.push({
        type: "clip_trimmed",
        key,
        from: { start: before.start, duration: before.duration },
        to: { start: after.start, duration: after.duration },
      });
    }

    if (before.name !== after.name) {
      changes.push({ type: "clip_renamed", key, from: before.name, to: after.name });
    }
  }

  return changes;
}

async function readJsonIfExists<T>(filePath: string): Promise<T | null> {
  try {
    const txt = await readFile(filePath, "utf-8");
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

function findClipByBasename(snapshot: TimelineSnapshot, expectedBasename: string) {
  const target = expectedBasename.toLowerCase();
  return snapshot.clips.find(
    (c) =>
      (c.mediaFilePath && c.mediaFilePath.toLowerCase().endsWith("\\" + target)) ||
      (c.name && c.name.toLowerCase() === target)
  );
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

/* ---------------- Route ---------------- */
export async function timelineRoutes(app: FastifyInstance) {
  app.post("/upload", async (req, reply) => {
    const q = req.query as { projectId?: string; expectedBasename?: string };

    if (!q.projectId) return reply.code(400).send({ error: "missing_projectId" });

    const mp = await (req as any).file();
    if (!mp) return reply.code(400).send({ error: "missing_file" });

    const filename = mp.filename ?? "timeline";
    const buf: Buffer = await mp.toBuffer();

    const baseDir = path.resolve(process.cwd(), "data", "projects", q.projectId, "timelines");
    await mkdir(baseDir, { recursive: true });

    const latestPath = path.join(baseDir, "latest.snapshot.json");
    const prev = await readJsonIfExists<TimelineSnapshot>(latestPath);

    const parser = new XMLParser({ ignoreAttributes: false });

    // 1) XML text (direct or extracted)
    let xmlText = "";
    let pickedInnerName: string | null = null;
    let drtCandidates: Array<{ name: string; score: number }> | null = null;

    try {
      if (isZip(buf) || filename.toLowerCase().endsWith(".drt")) {
        const extracted = await extractXmlTextFromDrtZip(buf);
        xmlText = extracted.xmlText;
        pickedInnerName = extracted.pickedName;
        drtCandidates = extracted.candidates;
      } else {
        xmlText = buf.toString("utf-8");
      }
    } catch (e: any) {
      req.log.error(
        { err: e?.message ?? String(e) },
        "timeline: failed to extract xml from upload"
      );
      return reply
        .code(400)
        .send({ error: "timeline_extract_failed", details: e?.message ?? String(e) });
    }

    // 2) parse
    let xmlObj: any;
    try {
      xmlObj = parser.parse(xmlText);
    } catch (e: any) {
      req.log.error({ err: e?.message ?? String(e) }, "timeline: xml parse failed");
      return reply
        .code(400)
        .send({ error: "timeline_xml_parse_failed", details: e?.message ?? String(e) });
    }

    // 3) detect + extract
    const format = detectFormat(filename, buf, xmlObj);
    const snapshot = format === "drt" ? extractFromDrt(xmlObj) : extractClipsFromFcpxml(xmlObj);
    const changelog = diffSnapshots(prev, snapshot);
    const finalClip = q.expectedBasename ? findClipByBasename(snapshot, q.expectedBasename) : null;

    // 4) persist
    const version = String(Date.now());
    await writeFile(path.join(baseDir, `${version}.${filename}`), buf);

    if (pickedInnerName) {
      const safeInner = path.basename(pickedInnerName).replace(/[^\w.\-]+/g, "_");
      await writeFile(
        path.join(baseDir, `${version}.drt.extracted.${safeInner}`),
        xmlText,
        "utf-8"
      );
    }

    await writeFile(
      path.join(baseDir, `${version}.snapshot.json`),
      JSON.stringify(snapshot, null, 2),
      "utf-8"
    );
    await writeFile(
      path.join(baseDir, `${version}.changelog.json`),
      JSON.stringify(changelog, null, 2),
      "utf-8"
    );
    await writeFile(latestPath, JSON.stringify(snapshot, null, 2), "utf-8");

    let storedFromTimeline: StoredMediaFile | null = null;

    if (finalClip?.mediaFilePath) {
      try {
        const base = safeBasename(finalClip?.mediaFilePath);
        const ext = safeExt(base);
        if (!ext) throw new Error("unsupported_filetype");

        // check file exists/readable
        await fs.access(finalClip?.mediaFilePath);

        await fs.mkdir(COMFY_INPUT_DIR, { recursive: true });

        const unique = `${Date.now()}_${nanoid()}${ext}`;
        const dstPath = path.join(COMFY_INPUT_DIR, unique);

        // copy (schnell & simpel)
        await fs.copyFile(finalClip?.mediaFilePath, dstPath);

        storedFromTimeline = { filename: unique, subfolder: "", type: "input" };
      } catch (e: any) {
        req.log.warn(
          { err: e?.message, mediaFilePath: finalClip.mediaFilePath },
          "auto import final clip failed"
        );
      }
    }

    return reply.send({
      ok: true,
      format,
      pickedInnerName,
      drtCandidates,
      snapshot,
      changelog,
      finalClip,
      storedFromTimeline,
    });
  });
}

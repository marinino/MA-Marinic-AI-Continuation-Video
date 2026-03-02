import type {
  ComfyHistory,
  ComfyStartVideoInput,
  ComfyStartVideoResult,
  Project,
  StoredMediaFile,
} from "@ma/shared";

const API = "/api";

export async function createProject(name?: string): Promise<Project> {
  const res = await fetch(`${API}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("createProject failed");
  return await res.json();
}

export async function loadProject(id: string): Promise<Project> {
  const res = await fetch(`${API}/projects/${id}`);
  if (!res.ok) {
    const err: any = new Error("loadProject failed");
    err.status = res.status;
    throw err;
  }
  return await res.json();
}

export async function saveProject(p: Project): Promise<void> {
  const res = await fetch(`${API}/projects/${p.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error("saveProject failed");
}

export async function listProjects(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${API}/projects`);
  if (!res.ok) throw new Error("listProjects failed");
  return await res.json();
}

export async function comfyStartVideo(input: ComfyStartVideoInput): Promise<ComfyStartVideoResult> {
  const res = await fetch(`${API}/comfy/video`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new Error("comfyStartVideo failed");
  return await res.json();
}

/**
 * Holt den kompletten History-Eintrag von ComfyUI
 */
export async function comfyGetHistory(promptId: string): Promise<ComfyHistory> {
  const res = await fetch(`${API}/comfy/history/${promptId}`);
  if (!res.ok) throw new Error("comfyGetHistory failed");
  return await res.json();
}

/**
 * Baut eine URL für ein gespeichertes Video (Proxy!)
 */
export function comfyBuildVideoUrl(opts: {
  filename: string;
  subfolder?: string;
  type?: string;
}): string {
  const params = new URLSearchParams({
    filename: opts.filename,
    subfolder: opts.subfolder ?? "video",
    type: opts.type ?? "output",
  });

  return `${API}/comfy/view?${params.toString()}`;
}

/* =======================
   ComfyUI – Helper
======================= */

/**
 * Versucht aus der History das SaveVideo-Result zu extrahieren
 */
export function comfyFindVideoFromHistory(history: ComfyHistory, promptId: string) {
  const entry = history[promptId];
  if (!entry?.outputs) return null;

  // ✅ bevorzugt: final SaveVideo node 123
  const preferred = (entry.outputs as any)["123"];
  const cand = preferred?.videos?.[0] ?? preferred?.gifs?.[0] ?? preferred?.images?.[0];

  if (cand?.filename) return cand;

  // fallback: irgendein output
  for (const node of Object.values(entry.outputs as any)) {
    const v = (node as any)?.videos?.[0] ?? (node as any)?.gifs?.[0] ?? (node as any)?.images?.[0];
    if (v?.filename) return v;
  }

  return null;
}

export async function comfyStartV2V(args: {
  text: string;
  seed?: number;
  videoFile: StoredMediaFile;
  highNoiseCfg: number;
  lowNoiseCfg: number;
  highNoiseModelStrength: number;
  lowNoiseModelStrength: number;
  highNoiseShift: number;
  lowNoiseShift: number;
  highNoiseSteps: number;
  lowNoiseSteps: number;
  highNoiseStartStep: number;
  lowNoiseStartStep: number;
  highNoiseEndStep: number;
  lowNoiseEndStep: number;
  length: number;
}) {
  const r = await fetch("/api/comfy/v2v", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as { prompt_id: string; client_id: string };
}

export async function comfyUploadVideo(file: File): Promise<StoredMediaFile> {
  const form = new FormData();
  form.append("file", file);

  const r = await fetch("/api/comfy/upload", {
    method: "POST",
    body: form,
  });

  if (!r.ok) {
    const details = await r.text();
    throw new Error(`upload_failed: ${details}`);
  }
  return (await r.json()) as StoredMediaFile;
}

export async function openInResolve(filename: string) {
  const res = await fetch("/api/editor/open/resolve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt);
  }
}

export async function resolveExportTimeline() {
  const r = await fetch("/api/editor/resolve/export-timeline", { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}

export async function uploadTimelineFile(
  projectId: string,
  file: File,
  baselineStoredTimelineFilename?: string,
  expectedBasename?: string
) {
  const fd = new FormData();
  fd.append("file", file);

  const qs = new URLSearchParams({ projectId });

  if (baselineStoredTimelineFilename) {
    qs.set("baselineStoredTimelineFilename", baselineStoredTimelineFilename);
  }

  if (expectedBasename) {
    qs.set("expectedBasename", expectedBasename);
  }

  const res = await fetch(`/api/timeline/upload?${qs.toString()}`, {
    method: "POST",
    body: fd,
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function openTimelineInResolve(projectId: string, filename: string) {
  const res = await fetch("/api/timeline/open-timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectId: projectId,
      filename: filename,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

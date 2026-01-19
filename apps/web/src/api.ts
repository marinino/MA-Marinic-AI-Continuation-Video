import type { ComfyHistory, ComfyStartVideoInput, ComfyStartVideoResult, Project, StoredMediaFile } from "@ma/shared";

const API = "/api";

export async function createProject(name?: string): Promise<Project> {
  const res = await fetch(`${API}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
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
    body: JSON.stringify(p)
  });
  if (!res.ok) throw new Error("saveProject failed");
}

export async function listProjects(): Promise<Array<{ id: string; name: string }>> {
  const res = await fetch(`${API}/projects`);
  if (!res.ok) throw new Error("listProjects failed");
  return await res.json();
}


export async function comfyStartVideo(
  input: ComfyStartVideoInput
): Promise<ComfyStartVideoResult> {
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
  const cand =
    preferred?.videos?.[0] ??
    preferred?.gifs?.[0] ??
    preferred?.images?.[0];

  if (cand?.filename) return cand;

  // fallback: irgendein output
  for (const node of Object.values(entry.outputs as any)) {
    const v = (node as any)?.videos?.[0] ?? (node as any)?.gifs?.[0] ?? (node as any)?.images?.[0];
    if (v?.filename) return v;
  }

  return null;
}


export async function comfyStartV2V(args: { text: string; seed?: number; videoFile: StoredMediaFile }) {
  const r = await fetch("/api/comfy/v2v", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()) as { prompt_id: string; client_id: string };
}



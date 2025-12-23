import type { Project } from "@ma/shared";

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
  if (!res.ok) throw new Error("loadProject failed");
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

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`);
  if (!res.ok) {
    const err: any = new Error("getProject failed");
    err.status = res.status;
    throw err;
  }
  return res.json();
}



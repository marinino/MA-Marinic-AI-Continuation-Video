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

import { promises as fs } from "node:fs";
import path from "node:path";
import { Project, ProjectSchema } from "@ma/shared";

const ROOT = path.resolve(process.cwd(), "../../storage/projects");

async function ensureDir() {
  await fs.mkdir(ROOT, { recursive: true });
}

export async function listProjects(): Promise<Array<{ id: string; name: string }>> {
  await ensureDir();
  const files = await fs.readdir(ROOT);
  const projects: Array<{ id: string; name: string }> = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(ROOT, f), "utf-8");
    const p = ProjectSchema.parse(JSON.parse(raw));
    projects.push({ id: p.id, name: p.name });
  }
  return projects;
}

export async function loadProject(id: string): Promise<Project | null> {
  await ensureDir();
  const fp = path.join(ROOT, `${id}.json`);
  try {
    const raw = await fs.readFile(fp, "utf-8");
    return ProjectSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function saveProject(project: Project): Promise<void> {
  await ensureDir();
  const parsed = ProjectSchema.parse(project);
  const fp = path.join(ROOT, `${parsed.id}.json`);
  await fs.writeFile(fp, JSON.stringify(parsed, null, 2), "utf-8");
}

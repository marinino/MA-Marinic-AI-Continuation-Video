import type { Node, Project, StoredMediaFile } from "@ma/shared";
import { getParentNode } from "@ma/shared";

const GENERATED_FPS = 16;

function isStoredMediaFile(value: unknown): value is StoredMediaFile {
  if (!value || typeof value !== "object") return false;

  const v = value as Record<string, unknown>;

  return (
    typeof v.filename === "string" &&
    typeof v.subfolder === "string" &&
    typeof v.type === "string" &&
    (v.fps === undefined || typeof v.fps === "number") &&
    (v.durationSec === undefined || typeof v.durationSec === "number") &&
    (v.totalFrames === undefined || typeof v.totalFrames === "number")
  );
}

function getVideoFile(node: Node): StoredMediaFile | undefined {
  if (node.type !== "clip" && node.type !== "import" && node.type !== "edit") {
    return undefined;
  }

  return isStoredMediaFile(node.data.videoFile) ? node.data.videoFile : undefined;
}

function getGeneratedFramesFromClipParent(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): number | null {
  if (node.type !== "clip") return null;

  const parent = getParentNode(node, project, nodeMap);
  if (parent?.type !== "params") return null;

  if (typeof parent.data.generatedFrames === "number" && parent.data.generatedFrames > 0) {
    return parent.data.generatedFrames;
  }

  return null;
}

function isGeneratedClip(node: Node, project: Project, nodeMap: Map<string, Node>): boolean {
  return getGeneratedFramesFromClipParent(node, project, nodeMap) !== null;
}

export function getNodeDurationFrames(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): number {
  if (node.type === "params") return 0;

  const generatedFrames = getGeneratedFramesFromClipParent(node, project, nodeMap);
  if (generatedFrames !== null) {
    return generatedFrames;
  }

  const videoFile = getVideoFile(node);

  if (typeof videoFile?.totalFrames === "number" && videoFile.totalFrames > 0) {
    return videoFile.totalFrames;
  }

  if (
    (node.type === "clip" || node.type === "import" || node.type === "edit") &&
    typeof node.data.durationSec === "number" &&
    node.data.durationSec > 0
  ) {
    const fps =
      typeof videoFile?.fps === "number" && videoFile.fps > 0 ? videoFile.fps : GENERATED_FPS;

    return Math.round(node.data.durationSec * fps);
  }

  if (typeof videoFile?.durationSec === "number" && videoFile.durationSec > 0) {
    const fps =
      typeof videoFile.fps === "number" && videoFile.fps > 0 ? videoFile.fps : GENERATED_FPS;

    return Math.round(videoFile.durationSec * fps);
  }

  return 0;
}

export function getNodeDurationSec(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): number {
  const generatedFrames = getGeneratedFramesFromClipParent(node, project, nodeMap);
  if (generatedFrames !== null) {
    return generatedFrames / GENERATED_FPS;
  }

  if (
    (node.type === "clip" || node.type === "import" || node.type === "edit") &&
    typeof node.data.durationSec === "number" &&
    node.data.durationSec > 0
  ) {
    return node.data.durationSec;
  }

  const videoFile = getVideoFile(node);

  if (typeof videoFile?.durationSec === "number" && videoFile.durationSec > 0) {
    return videoFile.durationSec;
  }

  if (
    typeof videoFile?.totalFrames === "number" &&
    videoFile.totalFrames > 0 &&
    typeof videoFile?.fps === "number" &&
    videoFile.fps > 0
  ) {
    return videoFile.totalFrames / videoFile.fps;
  }

  const frames = getNodeDurationFrames(node, project, nodeMap);
  return frames > 0 ? frames / GENERATED_FPS : 0;
}

export function isGeneratedTimelineClip(
  node: Node,
  project: Project,
  nodeMap: Map<string, Node>
): boolean {
  return isGeneratedClip(node, project, nodeMap);
}

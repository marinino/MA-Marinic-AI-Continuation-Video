import type { Node, StoredMediaFile } from "@ma/shared";

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

function getParentNode(node: Node, nodeMap: Map<string, Node>): Node | null {
  if (!node.parentId) return null;
  return nodeMap.get(node.parentId) ?? null;
}

function isGeneratedClip(node: Node, nodeMap: Map<string, Node>): boolean {
  if (node.type !== "clip") return false;

  const parent = getParentNode(node, nodeMap);
  return parent?.type === "params";
}

export function getNodeDurationFrames(node: Node, nodeMap: Map<string, Node>): number {
  if (node.type === "params") return 0;

  // generierter clip -> generatedFrames ist die Wahrheit
  if (isGeneratedClip(node, nodeMap)) {
    if (typeof node.data.generatedFrames === "number" && node.data.generatedFrames > 0) {
      return node.data.generatedFrames;
    }
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

export function getNodeDurationSec(node: Node, nodeMap: Map<string, Node>): number {
  // generierter clip -> fest 16 fps
  if (isGeneratedClip(node, nodeMap)) {
    if (typeof node.data.generatedFrames === "number" && node.data.generatedFrames > 0) {
      return node.data.generatedFrames / GENERATED_FPS;
    }
  }

  // echte Videos -> echte Dauer bevorzugen
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

  const frames = getNodeDurationFrames(node, nodeMap);
  return frames > 0 ? frames / GENERATED_FPS : 0;
}

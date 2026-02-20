// /types/ui.ts

import type { StoredMediaFile } from "@ma/shared";

/** Generic error dialog payload */
export type ErrorDialogState = { title: string; message: string } | null;

/** Root dialog tab */
export type RootMode = "generate" | "upload";

/** V2V dialog tab */
export type V2VTab = "simple" | "advanced";

/** Category view mode (read-only UI) */
export type CatView = "sliders" | "pentagon";

/** Manual edit flow draft (before the edit node exists) */
export type ManualEditDraft = {
  fromClipId: string;
  expectedBasename: string;
};

/** Category scores for read-only panel + pentagon map */
export type CategoryScores = {
  creativity: number;
  promptFaithfulness: number;
  motion: number;
  transitionSmoothness: number;
  videoFaithfulness: number;
};

/** Minimal job shape for JobsPanel UI */
export type JobsPanelJob = {
  id: string;
  label: string;
  status: string;
  progressText?: string;
  previewUrl?: string | null;
};

/** Payload snapshots for upload/import flow (optional) */
export type UploadedTimelineContext = {
  storedTimelineFilename: string;
  snapshot?: any;
  changelog?: string[];
};

/** Helper for Comfy job success handlers */
export type JobSuccess = {
  file: StoredMediaFile;
  previewUrl?: string | null;
};

import type { StoredMediaFile, ComfyStartVideoResult } from "@ma/shared";

/** Was für Jobs es gibt */
export type JobKind = "t2v_root" | "v2v_clip";

/** Status für Queue + WS + Finalizing */
export type JobStatus =
  | "queued"
  | "connecting"
  | "running"
  | "finalizing"
  | "done"
  | "error"
  | "canceled";

/** Minimaler Job, den die UI anzeigen kann */
export type Job = {
  /** local ID (nanoid) */
  id: string;

  kind: JobKind;
  createdAt: number;

  /** UI label (kurz) */
  label: string;

  /** Queue status */
  status: JobStatus;

  /** laufender Text ("Generating…", "Finalizing…", error msg, …) */
  progressText?: string;

  /** Comfy meta */
  promptId?: string;
  clientId?: string;

  /** Result */
  file?: StoredMediaFile;
  previewUrl?: string;

  /**
   * Startet den Job (wird erst bei dequeue aufgerufen).
   * Muss {prompt_id, client_id} liefern.
   */
  startPayload: () => Promise<ComfyStartVideoResult>;

  /**
   * Callback nach Erfolg (z.B. Nodes erzeugen).
   * (Keine Pflicht, aber praktisch)
   */
  onSuccess?: (file: StoredMediaFile) => void;

  /** Callback nach Error */
  onError?: (err: unknown) => void;
};

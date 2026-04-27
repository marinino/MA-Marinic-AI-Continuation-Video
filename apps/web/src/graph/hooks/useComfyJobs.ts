import { useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import type { StoredMediaFile } from "@ma/shared";

import { comfyBuildVideoUrl, comfyFindVideoFromHistory, comfyGetHistory } from "../../../src/api";
import { Job } from "../types/ui";

function pickMediaFile(output: any): StoredMediaFile | null {
  const candidate = output?.images?.[0] ?? output?.videos?.[0] ?? output?.gifs?.[0];
  if (!candidate?.filename) return null;

  return {
    filename: candidate.filename,
    subfolder: candidate.subfolder ?? "video",
    type: candidate.type ?? "output",
  };
}

export function useComfyJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);

  const jobsRef = useRef<Job[]>([]);
  useEffect(() => void (jobsRef.current = jobs), [jobs]);

  const wsMapRef = useRef(new Map<string, WebSocket>());
  const timeoutMapRef = useRef(new Map<string, number>());

  const activeJobId = useMemo(
    () =>
      jobs.find(
        (j) => j.status === "connecting" || j.status === "running" || j.status === "finalizing"
      )?.id ?? null,
    [jobs]
  );

  function cleanup(jobId: string) {
    const ws = wsMapRef.current.get(jobId);
    if (ws) {
      try {
        ws.close();
      } catch {}
      wsMapRef.current.delete(jobId);
    }

    const t = timeoutMapRef.current.get(jobId);
    if (t) {
      window.clearTimeout(t);
      timeoutMapRef.current.delete(jobId);
    }
  }

  function enqueue(job: Omit<Job, "id" | "status">) {
    const id = nanoid();
    setJobs((prev) => [
      {
        ...job,
        id,
        status: "queued",
        progressText: prev.some((j) => ["connecting", "running", "finalizing"].includes(j.status))
          ? "Queued…"
          : "Queued…",
      },
      ...prev,
    ]);
    return id;
  }

  useEffect(() => {
    if (activeJobId) return;

    const next = jobs.find((j) => j.status === "queued");
    if (!next) return;

    startJob(next.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, activeJobId]);

  async function startJob(jobId: string) {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId ? { ...j, status: "connecting", progressText: "Starting…" } : j
      )
    );

    const job = jobsRef.current.find((j) => j.id === jobId);
    if (!job) return;

    try {
      const { prompt_id, client_id } = await job.startPayload();

      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                promptId: prompt_id,
                clientId: client_id,
                status: "running",
                progressText: "Generating…",
              }
            : j
        )
      );

      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(
        `${proto}://${window.location.host}/api/comfy/ws?clientId=${client_id}`
      );
      wsMapRef.current.set(jobId, ws);

      const timeout = window.setTimeout(
        () => {
          cleanup(jobId);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, status: "error", progressText: "Timeout waiting for websocket events." }
                : j
            )
          );
        },
        100 * 60 * 100000
      );
      timeoutMapRef.current.set(jobId, timeout);

      const finalizeSuccess = (file: StoredMediaFile) => {
        const previewUrl = comfyBuildVideoUrl(file);

        cleanup(jobId);

        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status: "done",
                  progressText: "Done ✅",
                  file,
                  previewUrl,
                }
              : j
          )
        );

        const latest = jobsRef.current.find((j) => j.id === jobId);
        latest?.onSuccess?.(file);
      };

      ws.onmessage = async (evt) => {
        let msg: any;
        try {
          msg = JSON.parse(evt.data);
        } catch {
          return;
        }

        if (msg?.type === "executed") {
          if (msg?.data?.prompt_id && msg.data.prompt_id !== prompt_id) return;

          if (String(msg?.data?.node ?? msg?.data?.display_node) === "123") {
            const file = pickMediaFile(msg?.data?.output);
            if (file) finalizeSuccess(file);
          }
        }

        if (msg?.type === "execution_error") {
          cleanup(jobId);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId
                ? { ...j, status: "error", progressText: "Execution error (see console)." }
                : j
            )
          );

          job.onError?.(msg);
        }

        if (msg?.type === "execution_success") {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "finalizing", progressText: "Finalizing…" } : j
            )
          );

          try {
            const history = await comfyGetHistory(prompt_id);
            const file = comfyFindVideoFromHistory(history, prompt_id);

            if (file) finalizeSuccess(file);
            else {
              cleanup(jobId);
              setJobs((prev) =>
                prev.map((j) =>
                  j.id === jobId
                    ? { ...j, status: "done", progressText: "Done ✅ (no output found in history)" }
                    : j
                )
              );
            }
          } catch (e) {
            cleanup(jobId);
            setJobs((prev) =>
              prev.map((j) =>
                j.id === jobId
                  ? { ...j, status: "done", progressText: "Done ✅ (history lookup failed)" }
                  : j
              )
            );
          }
        }
      };

      ws.onerror = (e) => {
        cleanup(jobId);
        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "error", progressText: "WebSocket error." } : j
          )
        );

        job.onError?.(e);
      };
    } catch (e: any) {
      cleanup(jobId);
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: "error", progressText: `Error: ${String(e?.message ?? e)}` }
            : j
        )
      );
      job.onError?.(e);
    }
  }

  useEffect(() => {
    return () => {
      for (const j of jobsRef.current) cleanup(j.id);
    };
  }, []);

  return {
    jobs,
    enqueue,
    setJobs,
  };
}

import { useCallback, useState } from "react";
import type { Project } from "@ma/shared";

import { timelineUrl } from "../graph_helpers/urls";
import { getCurrentEditId } from "../graph_helpers/selectors";
import { openTimelineInResolve } from "../../api"; // <-- pfad ggf. anpassen

export function useDavinciTimeline(args: { project: Project; clickedClipFilename: string | null }) {
  const { project, clickedClipFilename } = args;

  const [errorDialog, setErrorDialog] = useState<{ title: string; message: string } | null>(null);

  function requireTimelineFromContext(): { stored: string; url: string } | null {
    const editId = getCurrentEditId(project);

    if (!editId) {
      const lines = [
        "No edit context has been found for this node. This is likely to happen when no edit node exists as a parent to the selected node.",
        "",
        "Use the clip file manually as highlighted in the file explorer:",
        `- ${clickedClipFilename ?? "(unknown upload name)"}`,
        "",
        "Tip: Use the highlighted file, create/export a timeline in DaVinci Resolve, then upload it in the next dialog.",
      ].filter(Boolean);

      setErrorDialog({ title: "No edit node found", message: lines.join("\n") });
      return null;
    }

    const editNode = project.nodes.find((n) => n.id === editId) as any;
    const stored = editNode?.data?.timeline?.storedTimelineFilename ?? null;

    if (!stored) {
      const lines = [
        "No timeline file found in this edit node.",
        "",
        "Expected / highlighted file in explorer:",
        `- ${clickedClipFilename ?? "(unknown upload name)"}`,
        "",
        "Tip: Use the highlighted file, create/export a timeline in DaVinci Resolve, then upload it in the next dialog.",
      ].filter(Boolean);

      setErrorDialog({ title: "No timeline found", message: lines.join("\n") });
      return null;
    }

    const url = `${window.location.origin}${timelineUrl(project.id, stored)}`;
    return { stored, url };
  }

  const copyTimelineFileURL = useCallback(async () => {
    const ctx = requireTimelineFromContext();
    if (!ctx) return;

    try {
      await navigator.clipboard.writeText(ctx.url);
    } catch {
      window.prompt("Copy this URL:", ctx.url);
    }
  }, [project.id, clickedClipFilename]);

  const downloadTimelineFile = useCallback(() => {
    const ctx = requireTimelineFromContext();
    if (!ctx) return;

    window.open(timelineUrl(project.id, ctx.stored), "_blank", "noopener,noreferrer");
  }, [project.id, clickedClipFilename]);

  const openTimelineFileInDavinciBackend = useCallback(async () => {
    const ctx = requireTimelineFromContext();
    if (!ctx) return;

    try {
      const res = await openTimelineInResolve(project.id, ctx.stored);
      if (res && "ok" in res && !res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Open failed (${res.status}): ${txt || res.statusText}`);
      }
    } catch (e) {
      console.error(e);
      setErrorDialog({
        title: "Could not open",
        message: "Could not open timeline in Resolve",
      });
    }
  }, [project.id, clickedClipFilename]);

  return {
    // dialog
    errorDialog,
    setErrorDialog,

    // core
    requireTimelineFromContext,
    copyTimelineFileURL,
    downloadTimelineFile,
    openTimelineFileInDavinciBackend,
  };
}

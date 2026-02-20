import { useEffect, useRef } from "react";
import type { ReactFlowInstance, Viewport } from "reactflow";

export function useViewport(projectId: string, rf: ReactFlowInstance | null) {
  const viewportKey = `ma.viewport.${projectId}`;
  const hasRestoredRef = useRef(false);
  const saveTimer = useRef<number | null>(null);

  const restoreViewport = () => {
    if (!rf) return false;

    const raw = localStorage.getItem(viewportKey);
    if (!raw) return false;

    try {
      const vp = JSON.parse(raw) as Viewport;
      rf.setViewport(vp, { duration: 250 });
      return true;
    } catch {
      return false;
    }
  };

  const saveViewport = () => {
    if (!rf) return;
    const vp = rf.getViewport();
    localStorage.setItem(viewportKey, JSON.stringify(vp));
  };

  const scheduleSaveViewport = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      if (!hasRestoredRef.current) return;
      saveViewport();
    }, 150);
  };

  // mega-file: when project changes, force re-init restore process
  useEffect(() => {
    hasRestoredRef.current = false;
  }, [projectId]);

  /**
   * Call once after rfInstance exists and nodes are in state (GraphView does it).
   * This matches mega-file: restore OR fitView fallback, then mark restored.
   */
  function initAfterRfReady(doFitView: () => void) {
    if (!rf) return;

    requestAnimationFrame(() => {
      const restored = restoreViewport();
      hasRestoredRef.current = true;

      if (!restored) {
        doFitView();
        requestAnimationFrame(saveViewport);
      }
    });
  }

  return {
    hasRestoredRef,
    restoreViewport,
    saveViewport,
    scheduleSaveViewport,
    initAfterRfReady,
  };
}

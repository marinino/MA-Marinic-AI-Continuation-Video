import { nanoid } from "nanoid";
import type { Edge as RFEdge, Node as RFNode, ReactFlowInstance } from "reactflow";
import type { Project, StoredMediaFile } from "@ma/shared";

import { comfyUploadVideo, uploadTimelineFile } from "../../api";
import { parsedChangelogLines } from "../../utils/parseTimelineChangelog";
import {
  centerOnNode,
  countBranches,
  findFreePosition,
  getDefaultNodeSize,
} from "../graph_helpers/layout";

type ManualEditDraft = {
  fromClipId: string;
  expectedBasename: string;
};

type ErrorDialogState = {
  title: string;
  message: string;
} | null;

type UseManualTimelineImportArgs = {
  project: Project;
  onChange: (updater: Project | ((prev: Project) => Project)) => void;
  showEdgeLabels: boolean;

  rfInstance: ReactFlowInstance | null;
  saveViewport: () => void;

  g: {
    rfNodes: RFNode[];
    rfEdges: RFEdge[];
    setRfNodes: React.Dispatch<React.SetStateAction<RFNode[]>>;
    setRfEdges: React.Dispatch<React.SetStateAction<RFEdge[]>>;
    commit: (nodes?: RFNode[], edges?: RFEdge[]) => void;
  };

  uploadedTimelineFile: File | null;
  editedVideoFile: File | null;
  manualEditDraft: ManualEditDraft | null;

  setUploadedTimelineFile: React.Dispatch<React.SetStateAction<File | null>>;
  setEditedVideoFile: React.Dispatch<React.SetStateAction<File | null>>;
  setManualEditDraft: React.Dispatch<React.SetStateAction<ManualEditDraft | null>>;
  setTimelineUploadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setErrorDialog: React.Dispatch<React.SetStateAction<ErrorDialogState>>;
};

function getBaselineStoredTimelineFilenameForClip(project: Project, clipId: string): string | null {
  const editId = (() => {
    const clip = project.nodes.find((n) => n.id === clipId) as any;
    if (clip?.data?.producedByEditId) return clip.data.producedByEditId as string;

    const inc = project.edges.find((e) => e.target === clipId && e.type === "edit_out");
    if (inc) return inc.source;

    return null;
  })();

  if (!editId) return null;

  const editNode = project.nodes.find((n) => n.id === editId) as any;
  return editNode?.data?.timeline?.storedTimelineFilename ?? null;
}

function getPrevEffectKeysFromParentClip(project: Project, parentClipId: string): string[] {
  const prevEdit = project.nodes.find(
    (n) => n.type === "edit" && (n as any).data?.outClipId === parentClipId
  ) as any;

  return prevEdit?.data?.effectKeys ?? [];
}

export function useManualTimelineImport({
  project,
  onChange,
  showEdgeLabels,
  rfInstance,
  saveViewport,
  g,
  uploadedTimelineFile,
  editedVideoFile,
  manualEditDraft,
  setUploadedTimelineFile,
  setEditedVideoFile,
  setManualEditDraft,
  setTimelineUploadOpen,
  setErrorDialog,
}: UseManualTimelineImportArgs) {
  async function finishManualTimelineImport() {
    if (!uploadedTimelineFile) return;
    if (!editedVideoFile) return;

    if (!manualEditDraft) {
      setErrorDialog({
        title: "No draft found",
        message: "No manual edit draft found. Start a manual edit from a clip first.",
      });
      return;
    }

    const { fromClipId, expectedBasename } = manualEditDraft;

    try {
      // 1) Uploads
      const storedVideo: StoredMediaFile = await comfyUploadVideo(editedVideoFile);

      const baseline = getBaselineStoredTimelineFilenameForClip(project, fromClipId);

      const res = await uploadTimelineFile(
        project.id,
        uploadedTimelineFile,
        baseline ?? undefined,
        expectedBasename
      );

      // 2) IDs
      const editId = nanoid();
      const outClipId = nanoid();

      // 3) Positionen
      const fromNode = g.rfNodes.find((n) => n.id === fromClipId);
      const baseX = fromNode?.position.x ?? 50;
      const baseY = fromNode?.position.y ?? 80;

      const branchIndex = countBranches(g.rfEdges, fromClipId);

      const EDIT_OFFSET_X = 260;
      const BRANCH_SPACING_Y = 140;
      const NODE_GAP_X = 60;

      const editSize = getDefaultNodeSize("edit");
      const clipSize = getDefaultNodeSize("clip");

      const desiredEditPos = {
        x: baseX + EDIT_OFFSET_X,
        y: baseY + Math.max(0, branchIndex - 1) * BRANCH_SPACING_Y,
      };

      const editPos = findFreePosition(desiredEditPos, g.rfNodes, {
        stepY: 50,
        pad: 40,
        newNodeType: "edit",
        newNodeWidth: editSize.w,
        newNodeHeight: editSize.h,
        extraBottom: 20,
      });

      const desiredClipPos = {
        x: editPos.x + editSize.w + NODE_GAP_X,
        y: editPos.y,
      };

      const tempEditNode: RFNode = {
        id: editId,
        type: "edit",
        position: editPos,
        data: {} as any,
        width: editSize.w,
        height: editSize.h + 20,
      };

      const clipPos = findFreePosition(desiredClipPos, [...g.rfNodes, tempEditNode], {
        stepY: 50,
        pad: 30,
        newNodeType: "clip",
        newNodeWidth: clipSize.w,
        newNodeHeight: clipSize.h,
        extraBottom: 20,
      });

      const prevEffectKeys = getPrevEffectKeysFromParentClip(project, fromClipId);
      const { nextEffectKeys } = parsedChangelogLines(res.changelog, prevEffectKeys);

      // 4) Nodes
      const editNode: RFNode = {
        id: editId,
        type: "edit",
        position: editPos,
        data: {
          label: "Manual edit",
          tool: "resolve",
          parentClipId: fromClipId,
          outClipId,
          export: {
            expectedBasename,
            status: "imported",
            foundPath: null,
          },
          timeline: {
            snapshot: res.snapshot,
            changelog: res.changelog,
            importedAt: new Date().toISOString(),
            fileName: uploadedTimelineFile.name,
            storedTimelineFilename: res.storedTimelineFilename,
            version: "latest",
          },
          prevEffectKeys,
          effectKeys: nextEffectKeys,
          meta: null,
          notes: `Export as: ${expectedBasename}`,
        } as any,
        draggable: true,
      };

      const outClipNode: RFNode = {
        id: outClipId,
        type: "clip",
        position: clipPos,
        data: {
          label: "Edited Clip",
          videoFile: storedVideo,
          videoStatus: "done",
          videoOpened: false,
          producedByEditId: editId,
        } as any,
        draggable: true,
      };

      // 5) Edges
      const edge1: RFEdge = {
        id: nanoid(),
        source: fromClipId,
        target: editId,
        type: "labeled",
        data: { label: "edit_in", showLabel: showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      };

      const edge2: RFEdge = {
        id: nanoid(),
        source: editId,
        target: outClipId,
        type: "labeled",
        data: { label: "edit_out", showLabel: showEdgeLabels },
        sourceHandle: "out",
        targetHandle: "in",
      };

      // 6) State + persist
      g.setRfEdges((prevEdges) => {
        const nextEdges = [...prevEdges, edge1, edge2];

        g.setRfNodes((prevNodes) => {
          const nextNodes = [...prevNodes, editNode, outClipNode];

          g.commit(nextNodes, nextEdges);

          onChange((prevProject) => ({
            ...prevProject,
            uiState: { ...(prevProject.uiState ?? {}), selectedNodeId: outClipId },
          }));

          if (rfInstance) {
            centerOnNode(rfInstance, outClipId, { onAfter: saveViewport });
          } else {
            requestAnimationFrame(saveViewport);
          }

          return nextNodes;
        });

        return nextEdges;
      });

      // 7) Cleanup
      setTimelineUploadOpen(false);
      setUploadedTimelineFile(null);
      setEditedVideoFile(null);
      setManualEditDraft(null);
    } catch (e: any) {
      console.error(e);
      setErrorDialog({
        title: "Upload error",
        message: "Timeline upload failed: " + (e?.message ?? String(e)),
      });
    }
  }

  return {
    finishManualTimelineImport,
  };
}

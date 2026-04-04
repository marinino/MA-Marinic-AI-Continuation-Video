import { Handle, NodeProps, Position } from "reactflow";
import { NodeCard } from "./Node";
import { Stack, Typography, Chip, Box } from "@mui/material";
import { parsedChangelogLines } from "../../utils/parseTimelineChangelog";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import { useContext } from "react";
import GraphUIContext from "../contexts/GraphUIContext";

export function EditNode(props: NodeProps<any>) {
  const ui = useContext(GraphUIContext);
  if (!ui) throw new Error("GraphUIContext missing");
  const summaryLines: string[] = props.data?.summaryLines ?? [];

  function checkInSummary(
    kind: "clip_added" | "clip_removed" | "effect_added",
    lines: string[]
  ): boolean {
    switch (kind) {
      case "clip_added":
        return lines.some((line) => line.startsWith("Added ") && line.endsWith("frames to video"));
      case "clip_removed":
        return lines.some((line) => line.startsWith("Cut ") && line.endsWith("frames from video"));
      case "effect_added":
        return lines.some((line) => line.startsWith("Added effect"));
      default:
        return false;
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        icon={<ContentCutIcon fontSize="small" />}
        title="Edit"
        type="edit"
        isRoot={false}
        selected={props.selected}
        metaSummary={props.data?.metaSummary}
        note={props.data?.note}
        onSaveNote={ui?.onSaveNote}
        onDelete={ui?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={ui?.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={ui?.highlightUnseenEnabled}
        notesEnabled={ui?.notesEnabled}
        onOpenDetails={ui?.onOpenDetails}
      >
        <Stack gap={1} mt={1}>
          {checkInSummary("clip_added", summaryLines) && <Chip label="Added clip" />}
          {checkInSummary("clip_removed", summaryLines) && <Chip label="Cut clip" />}
          {checkInSummary("effect_added", summaryLines) && <Chip label="Added effect" />}
        </Stack>
      </NodeCard>
    </div>
  );
}

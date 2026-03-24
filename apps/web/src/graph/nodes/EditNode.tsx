import { Handle, NodeProps, Position } from "reactflow";
import { NodeCard } from "./Node";
import { Stack, Typography, Chip, Box } from "@mui/material";
import { parsedChangelogLines } from "../../utils/parseTimelineChangelog";
import ContentCutIcon from "@mui/icons-material/ContentCut";

export function EditNode(props: NodeProps<any>) {
  const summaryLines: string[] = props.data?.summaryLines ?? [];

  function checkInSummary(
    kind: "clip_added" | "clip_removed" | "effect_added",
    lines: string[]
  ): boolean {
    switch (kind) {
      case "clip_added":
        return lines.some(
          (line) => line.startsWith("Added ") && line.endsWith("frames to video")
        );
      case "clip_removed":
        return lines.some(
          (line) => line.startsWith("Cut ") && line.endsWith("frames from video")
        );
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
        onSaveNote={props.data?.onSaveNote}
        onDelete={props.data?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={props.data?.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={props.data?.highlightUnseenEnabled}
        notesEnabled={props.data?.notesEnabled}
        onOpenDetails={props.data?.onOpenDetails}
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

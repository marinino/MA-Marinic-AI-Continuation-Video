import { useContext } from "react";
import { NodeProps, Handle, Position } from "reactflow";
import MovieIcon from "@mui/icons-material/Movie";
import { NodeCard } from "./Node";
import GraphUIContext from "../contexts/GraphUIContext";

export function ClipNode(props: NodeProps<any>) {
  const ui = useContext(GraphUIContext);
  if (!ui) throw new Error("GraphUIContext missing");

  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        onAdd={ui.onAdd}
        icon={<MovieIcon fontSize="small" />}
        title="Clip"
        type="clip"
        isRoot={Boolean(props.data?.isRoot)}
        selected={props.selected}
        videoUrl={props.data?.videoUrl}
        videoFile={props.data?.videoFile}
        videoStatus={props.data?.videoStatus}
        videoOpened={props.data?.videoOpened}
        onVideoOpened={ui.onVideoOpened}
        note={props.data?.note}
        onSaveNote={ui.onSaveNote}
        onDelete={ui.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={ui.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={ui.highlightUnseenEnabled}
        notesEnabled={ui.notesEnabled}
        onOpenDetails={ui.onOpenDetails}
      />
    </div>
  );
}

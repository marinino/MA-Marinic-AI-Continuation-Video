import { StoredMediaFile } from "@ma/shared";
import { Typography } from "@mui/material";
import { NodeProps, Handle, Position } from "reactflow";
import { comfyBuildVideoUrl } from "../../api";
import { NodeCard } from "./Node";
import MovieIcon from "@mui/icons-material/Movie";

export function ClipNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        onAdd={props.data?.onAdd}
        icon={<MovieIcon fontSize="small" />}
        title="Clip"
        type="clip"
        isRoot={Boolean(props.data?.isRoot)}
        selected={props.selected}
        videoUrl={props.data?.videoUrl}
        videoFile={props.data?.videoFile}
        videoStatus={props.data?.videoStatus}
        videoOpened={props.data?.videoOpened}
        onVideoOpened={props.data?.markVideoOpened}
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
        onDelete={props.data?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={props.data?.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={props.data?.highlightUnseenEnabled}
        notesEnabled={props.data?.notesEnabled}
        onOpenDetails={props.data?.onOpenDetails}
      />
    </div>
  );
}
import { NodeProps, Handle, Position } from "reactflow";
import MovieIcon from "@mui/icons-material/Movie";
import { NodeCard } from "./Node";
import React from "react";

const clipIcon = <MovieIcon fontSize="small" />;

export const ClipNode = React.memo(function ClipNode(props: NodeProps<any>) {
  const d = props.data;

  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        onAdd={d.onAdd}
        icon={clipIcon}
        title="Clip"
        type="clip"
        isRoot={Boolean(d?.isRoot)}
        selected={props.selected}
        videoUrl={d?.videoUrl}
        videoFile={d?.videoFile}
        videoStatus={d?.videoStatus}
        videoOpened={d?.videoOpened}
        onVideoOpened={d.onVideoOpened}
        note={d?.note}
        onSaveNote={d.onSaveNote}
        onDelete={d.onDelete}
        canDelete={!d?.isRoot}
        onHide={d.onHide}
        canHide={!d?.isRoot}
        highlightUnseenEnabled={d.highlightUnseenEnabled}
        notesEnabled={d.notesEnabled}
        onOpenDetails={d.onOpenDetails}
        onSelectNode={d.onSelectNode}
      />
    </div>
  );
});

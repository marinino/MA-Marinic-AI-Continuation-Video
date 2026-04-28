import { Handle, NodeProps, Position } from "reactflow";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { NodeCard } from "./Node";
import React from "react";

const importIcon = <UploadFileIcon fontSize="small" />;

export const ImportNode = React.memo(function ImportNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        icon={importIcon}
        title="Import"
        type="import"
        isRoot={false}
        selected={props.selected}
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
        onDelete={props.data?.onDelete}
        onHide={props.data?.onHide}
        canDelete={!props.data?.isRoot}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={props.data?.highlightUnseenEnabled}
        notesEnabled={props.data?.notesEnabled}
        showWeightSuggestionsEnabled={props.data?.showWeightSuggestionsEnabled}
        graphCardContentMode={props.data?.graphCardContentMode}
        onOpenDetails={props.data?.onOpenDetails}
        onSelectNode={props.data.onSelectNode}
      />
    </div>
  );
});

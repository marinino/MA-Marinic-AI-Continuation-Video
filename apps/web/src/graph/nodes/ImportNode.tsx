import { Handle, NodeProps, Position } from "reactflow";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { NodeCard } from "./Node";
import { useContext } from "react";
import GraphUIContext from "../contexts/GraphUIContext";
import React from "react";

export const ImportNode = React.memo(function ImportNode(props: NodeProps<any>) {
  const ui = useContext(GraphUIContext);
  if (!ui) throw new Error("GraphUIContext missing");

  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        icon={<UploadFileIcon fontSize="small" />}
        title="Import"
        type="import"
        isRoot={false}
        selected={props.selected}
        note={props.data?.note}
        onSaveNote={ui?.onSaveNote}
        onDelete={ui?.onDelete}
        onHide={ui?.onHide}
        canDelete={!props.data?.isRoot}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={ui?.highlightUnseenEnabled}
        notesEnabled={ui?.notesEnabled}
        showWeightSuggestionsEnabled={ui?.showWeightSuggestionsEnabled}
        graphCardContentMode={ui?.graphCardContentMode}
        onOpenDetails={ui?.onOpenDetails}
        onSelectNode={ui.onSelectNode}
      />
    </div>
  );
});

import { Handle, NodeProps, Position } from "reactflow";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { NodeCard } from "./Node";

export function ImportNode(props: NodeProps<any>) {
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
        onSaveNote={props.data?.onSaveNote}
        onDelete={props.data?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={props.data?.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={props.data?.highlightUnseenEnabled}
        notesEnabled={props.data?.notesEnabled}
        showWeightSuggestionsEnabled={props.data?.showWeightSuggestionsEnabled}
        graphCardContentMode={props.data?.graphCardContentMode}
        onOpenDetails={props.data?.onOpenDetails}
      />
    </div>
  );
}

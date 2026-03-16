import { StoredMediaFile } from "@ma/shared";
import { Typography } from "@mui/material";
import { NodeProps, Handle, Position } from "reactflow";
import { comfyBuildVideoUrl } from "../../api";
import { NodeCard } from "./Node";
import MovieIcon from "@mui/icons-material/Movie";

export function ClipNode(props: NodeProps<any>) {
  const videoFile = (props.data?.videoFile as StoredMediaFile | null) ?? null;
  const videoStatus = props.data?.videoStatus as string | undefined;

  const videoUrl = props.data?.videoUrl ?? (videoFile ? comfyBuildVideoUrl(videoFile) : null);

  const videoOpened = Boolean(props.data?.videoOpened);
  const markVideoOpened = props.data?.markVideoOpened as ((id: string) => void) | undefined;

  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        nodeId={props.id}
        onAdd={(props.data as any)?.onAdd}
        icon={<MovieIcon fontSize="small" />}
        title="Clip"
        type="clip"
        isRoot={Boolean(props.data?.isRoot)}
        selected={props.selected}
        // ✅ gib die infos in NodeCard rein, damit das Popup sie nutzen kann
        videoUrl={videoUrl}
        videoFile={videoFile}
        videoStatus={videoStatus}
        videoOpened={videoOpened}
        onVideoOpened={(id) => markVideoOpened?.(id)}
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
        onDelete={(props.data as any)?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={(props.data as any)?.onHide}
        canHide={!props.data?.isRoot}
        highlightUnseenEnabled={props.data.highlightUnseenEnabled}
        notesEnabled={props.data.notesEnabled}
      ></NodeCard>
    </div>
  );
}

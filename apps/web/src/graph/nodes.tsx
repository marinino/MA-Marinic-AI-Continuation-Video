import { Card, CardContent, Typography, Chip, Stack } from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";

function NodeCard(props: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ minWidth: 180 }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center">
          {props.icon}
          <Typography variant="subtitle2">{props.title}</Typography>
        </Stack>
        {props.children}
      </CardContent>
    </Card>
  );
}

export function ClipNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      {/* incoming */}
      <Handle id="in" type="target" position={Position.Left} />
      {/* outgoing */}
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard icon={<MovieIcon fontSize="small" />} title="Clip">
        <Typography variant="body2">{props.data.label}</Typography>
      </NodeCard>
    </div>
  );
}



export function ParamNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard icon={<TuneIcon fontSize="small" />} title="Params">
        <Typography variant="body2">{props.data.label}</Typography>
        <Chip size="small" label={props.data.mode ?? "ai"} sx={{ mt: 0.5 }} />
      </NodeCard>
    </div>
  );
}



export function EditNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard icon={<ContentCutIcon fontSize="small" />} title="Edit">
        <Typography variant="body2">{props.data.label}</Typography>
      </NodeCard>
    </div>
  );
}


export const nodeTypes = {
  clip: ClipNode,
  params: ParamNode,
  edit: EditNode
};
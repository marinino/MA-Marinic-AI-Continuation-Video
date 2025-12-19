import { Card, CardContent, Typography, Chip, Stack, useTheme } from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { NodeType } from "@ma/shared";

function getNodeColors(kind: NodeType, isRoot: boolean) {
  if (isRoot) return { border: "#FFB300", bg: "#FFF8E1" }; // Root Clip
  switch (kind) {
    case "params":
      return { border: "#42A5F5", bg: "#E3F2FD" };
    case "clip":
      return { border: "#66BB6A", bg: "#E8F5E9" };
    case "edit":
      return { border: "#AB47BC", bg: "#F3E5F5" };
  }
}

function NodeCard(props: {
  icon: React.ReactNode;
  title: string;
  type: NodeType;
  isRoot: boolean;
  selected?: boolean;
  children?: React.ReactNode;
}) {
  const theme = useTheme();

  const base = getNodeColors(props.type, props.isRoot);

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  return (
    <Card
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: "2px solid",
        borderColor,
        backgroundColor: bg,
        outline: "none",
        minWidth: 180,
        boxShadow: props.selected ? `0 0 0 2px ${borderColor}` : undefined,
      }}
    >
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
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        icon={<MovieIcon fontSize="small" />}
        title="Clip"
        type="clip"
        isRoot={Boolean(props.data?.isRoot)}   // <-- wichtig
        selected={props.selected}
      >
        <Typography variant="body2">{props.data?.label}</Typography>
      </NodeCard>
    </div>
  );
}

export function ParamNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        icon={<TuneIcon fontSize="small" />}
        title="Params"
        type="params"
        isRoot={false}
        selected={props.selected}
      >
        <Typography variant="body2">{props.data?.label}</Typography>
        <Chip size="small" label={props.data?.mode ?? "ai"} sx={{ mt: 0.5 }} />
      </NodeCard>
    </div>
  );
}

export function EditNode(props: NodeProps<any>) {
  return (
    <div style={{ position: "relative" }}>
      <Handle id="in" type="target" position={Position.Left} />
      <Handle id="out" type="source" position={Position.Right} />

      <NodeCard
        icon={<ContentCutIcon fontSize="small" />}
        title="Edit"
        type="edit"
        isRoot={false}
        selected={props.selected}
      >
        <Typography variant="body2">{props.data?.label}</Typography>
      </NodeCard>
    </div>
  );
}

export const nodeTypes = {
  clip: ClipNode,
  params: ParamNode,
  edit: EditNode,
};

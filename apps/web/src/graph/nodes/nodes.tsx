import { Card, CardContent, Typography, Chip, Stack, useTheme, Box, IconButton, DialogTitle, Dialog, Button, DialogContent, DialogActions } from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { NodeType } from "@ma/shared";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";

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
  nodeId: string;
  icon: React.ReactNode;
  title: string;
  type: NodeType;
  isRoot: boolean;
  selected?: boolean;
  onAdd?: (nodeId: string) => void;
  infoText?: string;
  children?: React.ReactNode;
}) {
  const theme = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);

  const base = getNodeColors(props.type, props.isRoot);

  const infoText = props.infoText ?? "Dummy Info: Hier kommt später eine Erklärung zu diesem Node-Typ rein.";

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  return (
    <>
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
              {/* Icon: öffnet Info */}
              <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setInfoOpen(true);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                {props.icon}
              </IconButton>
              <Typography variant="subtitle2">{props.title}</Typography>
              {props.type === "clip" && <IconButton
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  props.onAdd?.(props.nodeId);
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>}

            </Stack>
          <Box sx={{ mt: 0.5 }}>{props.children}</Box>
        </CardContent>
      </Card>

      {/* Info Popup */}
      <Dialog
        open={infoOpen}
        onClose={(e) => {
          // blockt das "close click" bubbling
          (e as any)?.stopPropagation?.();
          setInfoOpen(false);
        }}
        maxWidth="xs"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >

        <DialogTitle>{props.title} – Info</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {infoText}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setInfoOpen(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            Close
          </Button>

        </DialogActions>
      </Dialog>

    </>
  );
}

export function ClipNode(props: NodeProps<any>) {
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
        nodeId={props.id}
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
        nodeId={props.id}
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

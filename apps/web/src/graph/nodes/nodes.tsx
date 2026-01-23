import { Card, CardContent, Typography, Chip, Stack, useTheme, Box, IconButton, DialogTitle, Dialog, Button, DialogContent, DialogActions, LinearProgress } from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { NodeType, StoredMediaFile } from "@ma/shared";
import { useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import { comfyBuildVideoUrl } from "../../api";

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
  videoUrl?: string | null;
  videoFile?: StoredMediaFile | null;
  videoStatus?: string;
  prompt?: string
  metaSummary?: React.ReactNode;

  highNoiseCfg?: number,
  lowNoiseCfg?: number,
  highNoiseModelStrength?: number,
  lowNoiseModelStrength?: number,
  highNoiseShift?: number,
  lowNoiseShift?: number,
  highNoiseSteps?: number,
  lowNoiseSteps?: number,
  highNoiseStartStep?: number,
  lowNoiseStartStep?: number,
  highNoiseEndStep?: number,
  lowNoiseEndStep?: number
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
          <Stack spacing={1} sx={{ mt: 2 }}>
            {props.videoStatus === "generating" && (
              <>
                <Typography variant="body2" color="text.secondary">
                  Video is generating…
                </Typography>
                <LinearProgress />
              </>
            )}

            {props.type === "edit" ? (
              props.metaSummary ? (
                <Box sx={{ mt: 1 }}>{props.metaSummary}</Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No changes imported yet.
                </Typography>
              )
            ) : props.type === "params" ? (

              
                <>
                {/* Prompt */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Prompt:</strong>{" "}
                  {props.prompt?.trim()
                    ? `${props.prompt.slice(0, 300)}${props.prompt.length > 300 ? "…" : ""}`
                    : "No prompt set yet."}
                </Typography>

                {/* High Noise */}
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>High Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.highNoiseCfg} ·
                  Steps: {props.highNoiseSteps} ·
                  Start–End: {props.highNoiseStartStep}–{props.highNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.highNoiseShift} ·
                  Strength: {props.highNoiseModelStrength}
                </Typography>

                {/* Low Noise */}
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  <strong>Low Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.lowNoiseCfg} ·
                  Steps: {props.lowNoiseSteps} ·
                  Start–End: {props.lowNoiseStartStep}–{props.lowNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.lowNoiseShift} ·
                  Strength: {props.lowNoiseModelStrength}
                </Typography>
              </>
             
             
                
              
            )  : (
            props.videoUrl ? (
              <>
                <video
                  src={props.videoUrl}
                  controls
                  style={{ width: "100%", borderRadius: 8 }}
                />
                {props.videoFile?.filename && (
                  <Typography variant="caption" color="text.secondary">
                    {props.videoFile.filename}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No video attached to this clip yet.
              </Typography>
            ))}
          </Stack>

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

  const videoFile = (props.data?.videoFile as StoredMediaFile | null) ?? null;
  const videoStatus = props.data?.videoStatus as string | undefined;

  const videoUrl =
    props.data?.videoUrl ??
    (videoFile ? comfyBuildVideoUrl(videoFile) : null);

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
        prompt={props.data.prompt}
        highNoiseCfg={props.data?.highNoiseCfg}
        lowNoiseCfg={props.data?.lowNoiseCfg}
        highNoiseModelStrength={props.data?.highNoiseModelStrength}
        lowNoiseModelStrength={props.data?.lowNoiseModelStrength}
        highNoiseShift={props.data?.highNoiseShift}
        lowNoiseShift={props.data?.lowNoiseShift}
        highNoiseSteps={props.data?.highNoiseSteps}
        lowNoiseSteps={props.data?.lowNoiseSteps}
        highNoiseStartStep={props.data?.highNoiseStartStep}
        lowNoiseStartStep={props.data?.lowNoiseStartStep}
        highNoiseEndStep={props.data?.highNoiseEndStep}
        lowNoiseEndStep={props.data?.lowNoiseEndStep}
      >
        <Typography variant="body2">{props.data?.label}</Typography>
        <Chip size="small" label={props.data?.mode ?? "ai"} sx={{ mt: 0.5 }} />
      </NodeCard>
    </div>
  );
}

export function EditNode(props: NodeProps<any>) {
  const exportInfo = props.data?.export;
  const meta = props.data?.meta;
  const importedAt = meta?.importedAt;
  const timeline = meta?.resolveTimeline;

  const timelineName = timeline?.timeline?.name ?? timeline?.timeline?.Name ?? null;
  const summary = timeline?.summary ?? null;

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
        metaSummary={
          <Stack spacing={0.5}>
            <Typography variant="body2" color="text.secondary">
              Tool: {props.data?.tool ?? "resolve"}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                label={exportInfo?.status ?? "waiting"}
              />
              {importedAt && (
                <Typography variant="caption" color="text.secondary">
                  {new Date(importedAt).toLocaleString()}
                </Typography>
              )}
            </Stack>

            {timelineName && (
              <Typography variant="body2" color="text.secondary">
                Timeline: {timelineName}
              </Typography>
            )}

            {summary && (
              <Typography variant="body2" color="text.secondary">
                Items: {summary.videoItems ?? "?"} · Markers: {summary.timelineMarkers ?? "?"}
              </Typography>
            )}
          </Stack>
        }
      >
        <Typography variant="body2">{props.data?.label}</Typography>

        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
          <Chip size="small" label={`export: ${exportInfo?.expectedBasename ?? "-"}`} />
          <Chip size="small" label={exportInfo?.status ?? "waiting"} />
        </Stack>
      </NodeCard>
    </div>
  );
}

export const nodeTypes = {
  clip: ClipNode,
  params: ParamNode,
  edit: EditNode,
};

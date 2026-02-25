import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  useTheme,
  Box,
  IconButton,
  DialogTitle,
  Dialog,
  Button,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
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
import { parsedChangelogLines } from "../../utils/parseTimelineChangelog";

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
  prompt?: string;
  metaSummary?: React.ReactNode;

  highNoiseCfg?: number;
  lowNoiseCfg?: number;
  highNoiseModelStrength?: number;
  lowNoiseModelStrength?: number;
  highNoiseShift?: number;
  lowNoiseShift?: number;
  highNoiseSteps?: number;
  lowNoiseSteps?: number;
  highNoiseStartStep?: number;
  lowNoiseStartStep?: number;
  highNoiseEndStep?: number;
  lowNoiseEndStep?: number;

  videoOpened?: boolean;
  onVideoOpened?: (nodeId: string) => void;

  categoryScores?: {
    creativity: number;
    promptFaithfulness: number;
    motion: number;
    transitionSmoothness: number;
    videoFaithfulness: number;
  };
}) {
  const theme = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);

  const base = getNodeColors(props.type, props.isRoot);

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  const shouldHighlightUnseen = props.type === "clip" && !props.videoOpened && !props.selected;

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
          boxShadow: props.selected ? `0 0 0 5px ${borderColor}` : undefined,

          ...(shouldHighlightUnseen
            ? {
                boxShadow: `0 0 0 4px ${borderColor}55, 0 0 18px ${borderColor}55`,
                animation: "pulseGlow 1.6s ease-in-out infinite",
                "@keyframes pulseGlow": {
                  "0%": {
                    transform: "scale(1)",
                    boxShadow: `0 0 0 3px ${borderColor}44, 0 0 10px ${borderColor}44`,
                  },
                  "50%": {
                    transform: "scale(1.02)",
                    boxShadow: `0 0 0 5px ${borderColor}66, 0 0 22px ${borderColor}66`,
                  },
                  "100%": {
                    transform: "scale(1)",
                    boxShadow: `0 0 0 3px ${borderColor}44, 0 0 10px ${borderColor}44`,
                  },
                },
              }
            : null),
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

                if (props.type === "clip") {
                  props.onVideoOpened?.(props.nodeId);
                }

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
            {props.type === "clip" && (
              <IconButton
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
              </IconButton>
            )}
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
                    ? `${props.prompt.slice(0, 3000)}${props.prompt.length > 3000 ? "…" : ""}`
                    : "No prompt set yet."}
                </Typography>

                {/* High Noise */}
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>High Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.highNoiseCfg} · Steps: {props.highNoiseSteps} · Start–End:{" "}
                  {props.highNoiseStartStep}–{props.highNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.highNoiseShift} · Strength: {props.highNoiseModelStrength}
                </Typography>

                {/* Low Noise */}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5 }}
                >
                  <strong>Low Noise</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  CFG: {props.lowNoiseCfg} · Steps: {props.lowNoiseSteps} · Start–End:{" "}
                  {props.lowNoiseStartStep}–{props.lowNoiseEndStep}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Shift: {props.lowNoiseShift} · Strength: {props.lowNoiseModelStrength}
                </Typography>

                <Typography variant="subtitle2" sx={{ mt: 1 }}>
                  Category scores
                </Typography>

                <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                  <Chip size="small" label={`Creativity: ${props.categoryScores?.creativity}`} />
                  <Chip
                    size="small"
                    label={`Prompt: ${props.categoryScores?.promptFaithfulness}`}
                  />
                  <Chip size="small" label={`Motion: ${props.categoryScores?.motion}`} />
                  <Chip
                    size="small"
                    label={`Transition: ${props.categoryScores?.transitionSmoothness}`}
                  />
                  <Chip size="small" label={`Video: ${props.categoryScores?.videoFaithfulness}`} />
                </Stack>
              </>
            ) : props.videoUrl ? (
              <>
                <video src={props.videoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
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
            )}
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
        categoryScores={props.data?.categoryScores}
      >
        <Typography variant="body2">{props.data?.label}</Typography>
      </NodeCard>
    </div>
  );
}

export function EditNode(props: NodeProps<any>) {
  const exportInfo = props.data?.export;

  // ✅ NEU: timeline aus data.timeline
  const timeline = props.data?.timeline;
  const importedAt = timeline?.importedAt;
  const changelog = (timeline?.changelog as any[]) ?? [];
  const prevEffectKeys: string[] = props.data?.prevEffectKeys ?? [];
  console.log(changelog);
  const { summaryLines, detailLines } = parsedChangelogLines(changelog, prevEffectKeys);

  // kleines Summary
  const counts = changelog.reduce(
    (acc, c) => {
      acc[c.type] = (acc[c.type] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  function checkInSummary(
    kind: "clip_added" | "clip_removed" | "effect_added",
    summaryLines: string[]
  ): boolean {
    switch (kind) {
      case "clip_added":
        return summaryLines.some((line) => line.startsWith("Added ") && line.includes("frames"));

      case "clip_removed":
        return summaryLines.some((line) => line.startsWith("Cut "));

      case "effect_added":
        return summaryLines.some((line) => line.startsWith("Added effect"));

      default:
        return false;
    }
  }

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
          <Stack spacing={0.75}>
            <Typography variant="body2" color="text.secondary">
              Tool: {props.data?.tool ?? "resolve"}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center">
              <Chip size="small" label={exportInfo?.status ?? "waiting"} />
              {importedAt && (
                <Typography variant="caption" color="text.secondary">
                  {new Date(importedAt).toLocaleString()}
                </Typography>
              )}
            </Stack>

            {/* ✅ Timeline import status */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                size="small"
                color={changelog.length ? "success" : "default"}
                label={changelog.length ? `changes: ${changelog.length}` : "no timeline diff"}
              />
              {Object.keys(counts).length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {Object.entries(counts)
                    .map(([k, v]) => `${k}:${v}`)
                    .join(" · ")}
                </Typography>
              )}
            </Stack>

            {/* ✅ Optional: list first 5 */}
            {changelog.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                <Stack spacing={1}>
                  {summaryLines.map((line, i) => (
                    <Typography key={i} variant="body2">
                      {line}
                    </Typography>
                  ))}

                  {detailLines.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mt: 1 }}>
                        Details
                      </Typography>

                      <Stack spacing={0.5}>
                        {detailLines.map((line, i) => (
                          <Typography
                            key={i}
                            variant="caption"
                            sx={{ opacity: 0.85, overflowWrap: "anywhere" }}
                          >
                            {line}
                          </Typography>
                        ))}
                      </Stack>
                    </>
                  )}
                </Stack>
              </Box>
            )}
          </Stack>
        }
      >
        <Typography variant="body2">{props.data?.label}</Typography>
        <Stack gap={1} mt={1}>
          {checkInSummary("clip_added", summaryLines) && <Chip label="Added clip" />}

          {checkInSummary("clip_removed", summaryLines) && <Chip label="Cut clip" />}

          {checkInSummary("effect_added", summaryLines) && <Chip label="Added effect" />}
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

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
  TextField,
  Divider,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import TuneIcon from "@mui/icons-material/Tune";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";
import { NodeType, StoredMediaFile } from "@ma/shared";
import { useEffect, useState } from "react";
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

  prevParamsId?: string | null;
  paramDeltas?: Partial<
    Record<
      | "highNoiseCfg"
      | "lowNoiseCfg"
      | "highNoiseShift"
      | "lowNoiseShift"
      | "highNoiseModelStrength"
      | "lowNoiseModelStrength"
      | "highNoiseSteps"
      | "lowNoiseSteps"
      | "highNoiseStartStep"
      | "lowNoiseStartStep"
      | "highNoiseEndStep"
      | "lowNoiseEndStep",
      number | null
    >
  > | null;
  categoryScoreDeltas?: Partial<
    Record<
      "creativity" | "promptFaithfulness" | "motion" | "transitionSmoothness" | "videoFaithfulness",
      number | null
    >
  > | null;
  promptChanged?: boolean;
  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;
}) {
  const theme = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);
  const [localNote, setLocalNote] = useState(props.note ?? "");

  useEffect(() => {
    setLocalNote(props.note ?? "");
  }, [props.note, infoOpen]);

  const base = getNodeColors(props.type, props.isRoot);

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  const shouldHighlightUnseen = props.type === "clip" && !props.videoOpened && !props.selected;

  const d = props.paramDeltas;
  const sd = props.categoryScoreDeltas;

  function fmt(d: number | null | undefined, decimals = 2) {
    if (typeof d !== "number" || !Number.isFinite(d) || d === 0) return "";
    const sign = d > 0 ? "+" : "−";
    return `(${sign}${Math.abs(d).toFixed(decimals)})`;
  }

  function deltaChipSx(delta: number | null | undefined) {
    if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return undefined;

    return {
      border: "1px solid",
      borderColor: delta > 0 ? "#3333cc" : "#990000", // blau vs rot
      // optional: bisschen stärker sichtbar
      boxShadow: delta > 0 ? "0 0 0 1px rgba(2,136,209,0.15)" : "0 0 0 1px rgba(211,47,47,0.15)",
    } as const;
  }

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
          minWidth: props.type === "params" ? 420 : props.type === "edit" ? 300 : 220,
          boxShadow: props.selected ? `0 0 0 5px ${borderColor}` : undefined,

          ...(shouldHighlightUnseen
            ? {
                boxShadow: `0 0 0 4px #ffffff55, 0 0 18px #ffffff55`,
                animation: "pulseGlow 1.6s ease-in-out infinite",
                "@keyframes pulseGlow": {
                  "0%": {
                    transform: "scale(1)",
                    boxShadow: `0 0 0 3px #ffffff44, 0 0 10px #ffffff44`,
                  },
                  "50%": {
                    transform: "scale(1.02)",
                    boxShadow: `0 0 0 5px #ffffff66, 0 0 22px ${borderColor}66`,
                  },
                  "100%": {
                    transform: "scale(1)",
                    boxShadow: `0 0 0 3px #ffffff66, 0 0 10px #ffffff66`,
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
          {(() => {
            const summaryChips = [
              props.promptChanged
                ? {
                    key: "prompt-changed",
                    label: "Prompt changed",
                    sx: {
                      border: "1px solid",
                      borderColor: "#990000",
                      boxShadow: "0 0 0 1px rgba(211,47,47,0.15)",
                    },
                  }
                : null,
              d && fmt(d.highNoiseCfg, 2) !== ""
                ? {
                    key: "high-cfg",
                    label: `High CFG: ${props.highNoiseCfg} ${fmt(d.highNoiseCfg, 2)}`,
                    sx: deltaChipSx(d.highNoiseCfg),
                  }
                : null,

              d && fmt(d.lowNoiseCfg, 2) !== ""
                ? {
                    key: "low-cfg",
                    label: `Low CFG: ${props.lowNoiseCfg} ${fmt(d.lowNoiseCfg, 2)}`,
                    sx: deltaChipSx(d.lowNoiseCfg),
                  }
                : null,

              d && fmt(d.highNoiseShift, 2) !== ""
                ? {
                    key: "high-shift",
                    label: `High Shift: ${props.highNoiseShift} ${fmt(d.highNoiseShift, 2)}`,
                    sx: deltaChipSx(d.highNoiseShift),
                  }
                : null,

              d && fmt(d.lowNoiseShift, 2) !== ""
                ? {
                    key: "low-shift",
                    label: `Low Shift: ${props.lowNoiseShift} ${fmt(d.lowNoiseShift, 2)}`,
                    sx: deltaChipSx(d.lowNoiseShift),
                  }
                : null,

              d && fmt(d.highNoiseModelStrength, 2) !== ""
                ? {
                    key: "high-strength",
                    label: `High Strength: ${props.highNoiseModelStrength} ${fmt(d.highNoiseModelStrength, 2)}`,
                    sx: deltaChipSx(d.highNoiseModelStrength),
                  }
                : null,

              d && fmt(d.lowNoiseModelStrength, 2) !== ""
                ? {
                    key: "low-strength",
                    label: `Low Strength: ${props.lowNoiseModelStrength} ${fmt(d.lowNoiseModelStrength, 2)}`,
                    sx: deltaChipSx(d.lowNoiseModelStrength),
                  }
                : null,

              d && fmt(d.highNoiseEndStep! - d.highNoiseStartStep!, 0) !== ""
                ? {
                    key: "high-steps",
                    label: `High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep} ${fmt(
                      d.highNoiseEndStep! - d.highNoiseStartStep!,
                      0
                    )}`,
                    sx: deltaChipSx(d.highNoiseEndStep! - d.highNoiseStartStep!),
                  }
                : null,

              d && fmt(d.lowNoiseEndStep! - d.lowNoiseStartStep!, 0) !== ""
                ? {
                    key: "low-steps",
                    label: `Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep} ${fmt(
                      d.lowNoiseEndStep! - d.lowNoiseStartStep!,
                      0
                    )}`,
                    sx: deltaChipSx(d.lowNoiseEndStep! - d.lowNoiseStartStep!),
                  }
                : null,
            ].filter(Boolean) as Array<{
              key: string;
              label: string;
              sx?: any;
            }>;

            const hasNote = Boolean(props.note?.trim());

            if (summaryChips.length === 0 && !hasNote) return null;

            return (
              <>
                {summaryChips.length > 0 && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 0.75,
                    }}
                  >
                    {summaryChips.map((chip) => (
                      <Chip
                        key={chip.key}
                        size="small"
                        label={chip.label}
                        sx={{
                          ...chip.sx,
                          width: "100%",
                          justifyContent: "flex-start",
                          "& .MuiChip-label": {
                            display: "block",
                            width: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          },
                        }}
                      />
                    ))}
                  </Box>
                )}

                {hasNote && (
                  <Box sx={{ mt: summaryChips.length > 0 ? 0.75 : 1 }}>
                    <Chip
                      size="small"
                      label={`Note: ${
                        props.note!.trim().length > 20
                          ? `${props.note!.trim().slice(0, 20)}…`
                          : props.note!.trim()
                      }`}
                      sx={{
                        width: "100%",
                        justifyContent: "flex-start",
                        "& .MuiChip-label": {
                          display: "block",
                          width: "100%",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      }}
                    />
                  </Box>
                )}
              </>
            );
          })()}
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
                {props.prevParamsId && props.promptChanged && (
                  <Chip
                    size="small"
                    label="Prompt changed"
                    sx={{
                      mt: 1,
                      alignSelf: "flex-start",
                      border: "1px solid",
                      borderColor: "#990000", // blau vs rot
                      // optional: bisschen stärker sichtbar
                      boxShadow: "0 0 0 1px rgba(211,47,47,0.15)",
                    }}
                  />
                )}
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

                {props.prevParamsId && d && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      <strong>Parameters</strong>
                    </Typography>

                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 0.75,
                        mt: 0.25,
                      }}
                    >
                      <Chip
                        size="small"
                        label={`High CFG: ${props.highNoiseCfg} ${fmt(d.highNoiseCfg, 2)}`}
                        sx={deltaChipSx(d.highNoiseCfg)}
                      />

                      <Chip
                        size="small"
                        label={`Low CFG: ${props.lowNoiseCfg} ${fmt(d.lowNoiseCfg, 2)}`}
                        sx={deltaChipSx(d.lowNoiseCfg)}
                      />

                      <Chip
                        size="small"
                        label={`High Shift: ${props.highNoiseShift} ${fmt(d.highNoiseShift, 2)}`}
                        sx={deltaChipSx(d.highNoiseShift)}
                      />

                      <Chip
                        size="small"
                        label={`Low Shift: ${props.lowNoiseShift} ${fmt(d.lowNoiseShift, 2)}`}
                        sx={deltaChipSx(d.lowNoiseShift)}
                      />

                      <Chip
                        size="small"
                        label={`High Strength: ${props.highNoiseModelStrength} ${fmt(d.highNoiseModelStrength, 2)}`}
                        sx={deltaChipSx(d.highNoiseModelStrength)}
                      />

                      <Chip
                        size="small"
                        label={`Low Strength: ${props.lowNoiseModelStrength} ${fmt(d.lowNoiseModelStrength, 2)}`}
                        sx={deltaChipSx(d.lowNoiseModelStrength)}
                      />

                      <Chip
                        size="small"
                        label={`High Steps: ${props.highNoiseStartStep}→${props.highNoiseEndStep} ${fmt(d.highNoiseEndStep! - d.highNoiseStartStep!, 0)}`}
                        sx={deltaChipSx(d.highNoiseEndStep! - d.highNoiseStartStep!)}
                      />

                      <Chip
                        size="small"
                        label={`Low Steps: ${props.lowNoiseStartStep}→${props.lowNoiseEndStep} ${fmt(d.lowNoiseEndStep! - d.lowNoiseStartStep!, 0)}`}
                        sx={deltaChipSx(d.lowNoiseEndStep! - d.lowNoiseStartStep!)}
                      />
                    </Box>
                  </>
                )}

                {props.prevParamsId && sd && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 1 }}
                    >
                      <strong>Category scores</strong>
                    </Typography>

                    <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                      <Chip
                        size="small"
                        label={`Creativity: ${props.categoryScores?.creativity} ${fmt(sd.creativity, 2)}`}
                        sx={deltaChipSx(sd.creativity)}
                      />

                      <Chip
                        size="small"
                        label={`Prompt: ${props.categoryScores?.promptFaithfulness} ${fmt(sd.promptFaithfulness, 2)}`}
                        sx={deltaChipSx(sd.promptFaithfulness)}
                      />

                      <Chip
                        size="small"
                        label={`Motion: ${props.categoryScores?.motion} ${fmt(sd.motion, 2)}`}
                        sx={deltaChipSx(sd.motion)}
                      />

                      <Chip
                        size="small"
                        label={`Transition: ${props.categoryScores?.transitionSmoothness} ${fmt(sd.transitionSmoothness, 2)}`}
                        sx={deltaChipSx(sd.transitionSmoothness)}
                      />

                      <Chip
                        size="small"
                        label={`Video: ${props.categoryScores?.videoFaithfulness} ${fmt(sd.videoFaithfulness, 2)}`}
                        sx={deltaChipSx(sd.videoFaithfulness)}
                      />
                    </Stack>
                  </>
                )}
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

            <Divider />

            <TextField
              multiline
              minRows={3}
              fullWidth
              value={localNote}
              onChange={(e) => setLocalNote(e.target.value)}
              placeholder="Add notes for this node..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              props.onSaveNote?.(props.nodeId, localNote);

              setInfoOpen(false);
            }}
          >
            Save Notes and close
          </Button>
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
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
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
        prevParamsId={props.data?.prevParamsId}
        paramDeltas={props.data?.paramDeltas}
        categoryScoreDeltas={props.data?.categoryScoreDeltas}
        promptChanged={props.data?.promptChanged}
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
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
        note={props.data?.note}
        onSaveNote={props.data?.onSaveNote}
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

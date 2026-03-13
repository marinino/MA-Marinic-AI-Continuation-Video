import { useTheme } from "@mui/material";

import "reactflow/dist/style.css";
import { NodeType, StoredMediaFile } from "@ma/shared";
import { useState } from "react";

import { NodeDetailsDialog } from "../dialogs/NodeDetailsDialog";
import { GraphCard } from "../components/GraphCard";
import { ClipNode } from "./ClipNode";
import { ParamNode } from "./ParamNode";
import { EditNode } from "./EditNode";

function getNodeColors(kind: NodeType, isRoot: boolean) {
  if (isRoot) return { border: "#ff9800", bg: "#FFF8E1" }; // Root Clip
  switch (kind) {
    case "params":
      return { border: "#3f51b5", bg: "#E3F2FD" };
    case "clip":
      return { border: "#8bc34a", bg: "#E8F5E9" };
    case "edit":
      return { border: "#9c27b0", bg: "#F3E5F5" };
  }
}

export function fmt(d: number | null | undefined, decimals = 2) {
  if (typeof d !== "number" || !Number.isFinite(d) || d === 0) return "";
  const sign = d > 0 ? "+" : "−";
  return `(${sign}${Math.abs(d).toFixed(decimals)})`;
}

export function deltaChipSx(delta: number | null | undefined) {
  if (typeof delta !== "number" || !Number.isFinite(delta) || delta === 0) return undefined;

  return {
    border: "1px solid",
    borderColor: delta > 0 ? "#4dabf5" : "#f73378", // blau vs rot
    // optional: bisschen stärker sichtbar
    boxShadow: delta > 0 ? "0 0 0 1px rgba(2,136,209,0.15)" : "0 0 0 1px rgba(211,47,47,0.15)",
  } as const;
}

export function NodeCard(props: {
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
  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;
  onHide?: (nodeId: string) => void;
  canHide?: boolean;
  branchSuggestion?: {
    targetCategory:
      | "creativity"
      | "promptFaithfulness"
      | "motion"
      | "transitionSmoothness"
      | "videoFaithfulness";
    categoryDirection: "down" | "up";
    parameter:
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
      | "lowNoiseEndStep";
    parameterDirection: "up" | "down";
    hitCount: number;
    streakLength: number;
    avgCategoryDelta: number;
    avgParamDelta: number;
    confidence: number;
    suggestedWeightDeltaPct: number;
    suggestedAction: "increase_param_weight" | "decrease_param_weight";
    message: string;
  } | null;
}) {
  const theme = useTheme();
  const [infoOpen, setInfoOpen] = useState(false);

  const base = getNodeColors(props.type, props.isRoot);

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  const shouldHighlightUnseen = props.type === "clip" && !props.videoOpened && !props.selected;

  const d = props.paramDeltas;
  const sd = props.categoryScoreDeltas;

  const suggestion = props.branchSuggestion;

  return (
    <>
      <GraphCard
        nodeId={props.nodeId}
        type={props.type}
        title={props.title}
        icon={props.icon}
        selected={props.selected}
        borderColor={borderColor}
        bg={bg}
        shouldHighlightUnseen={shouldHighlightUnseen}
        note={props.note}
        promptChanged={props.promptChanged}
        highNoiseCfg={props.highNoiseCfg}
        lowNoiseCfg={props.lowNoiseCfg}
        highNoiseModelStrength={props.highNoiseModelStrength}
        lowNoiseModelStrength={props.lowNoiseModelStrength}
        highNoiseShift={props.highNoiseShift}
        lowNoiseShift={props.lowNoiseShift}
        highNoiseStartStep={props.highNoiseStartStep}
        lowNoiseStartStep={props.lowNoiseStartStep}
        highNoiseEndStep={props.highNoiseEndStep}
        lowNoiseEndStep={props.lowNoiseEndStep}
        paramDeltas={props.paramDeltas}
        branchSuggestion={props.branchSuggestion}
        onOpen={() => setInfoOpen(true)}
        onAdd={props.onAdd}
        onVideoOpened={props.onVideoOpened}
      >
        {props.children}
      </GraphCard>

      {/* Info Popup */}
      <NodeDetailsDialog
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        nodeId={props.nodeId}
        type={props.type}
        videoUrl={props.videoUrl}
        videoFile={props.videoFile}
        videoStatus={props.videoStatus}
        metaSummary={props.metaSummary}
        prompt={props.prompt}
        prevParamsId={props.prevParamsId}
        d={d}
        sd={sd}
        highNoiseCfg={props.highNoiseCfg}
        lowNoiseCfg={props.lowNoiseCfg}
        highNoiseModelStrength={props.highNoiseModelStrength}
        lowNoiseModelStrength={props.lowNoiseModelStrength}
        highNoiseShift={props.highNoiseShift}
        lowNoiseShift={props.lowNoiseShift}
        highNoiseSteps={props.highNoiseSteps}
        lowNoiseSteps={props.lowNoiseSteps}
        highNoiseStartStep={props.highNoiseStartStep}
        lowNoiseStartStep={props.lowNoiseStartStep}
        highNoiseEndStep={props.highNoiseEndStep}
        lowNoiseEndStep={props.lowNoiseEndStep}
        categoryScores={props.categoryScores}
        paramDeltas={props.paramDeltas}
        categoryScoreDeltas={props.categoryScoreDeltas}
        promptChanged={props.promptChanged}
        branchSuggestion={props.branchSuggestion}
        note={props.note}
        onSaveNote={props.onSaveNote}
        onDelete={props.onDelete}
        canDelete={props.canDelete}
        onHide={props.onHide}
        canHide={props.canHide}
      />
    </>
  );
}

export const nodeTypes = {
  clip: ClipNode,
  params: ParamNode,
  edit: EditNode,
};

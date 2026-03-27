import { useTheme } from "@mui/material";

import "reactflow/dist/style.css";
import { NodeType, StoredMediaFile } from "@ma/shared";
import { useState } from "react";

import { NodeDetailsDialog } from "../dialogs/NodeDetailsDialog";
import { GraphCard } from "../components/GraphCard";
import { ClipNode } from "./ClipNode";
import { ParamNode } from "./ParamNode";
import { EditNode } from "./EditNode";
import {
  BrachSuggestion,
  GraphCardContentMode,
  GraphCardDisplayMode,
  ParamDelats,
  ParameterHistoryMap,
} from "../types/ui";
import { deltaChipSx } from "../hooks/useV2VParams";
import { ImportNode } from "./ImportNode";

function getNodeColors(kind: NodeType, isRoot: boolean) {
  if (isRoot) return { border: "#ff9800", bg: "#FFF8E1" }; // Root Clip
  switch (kind) {
    case "params":
      return { border: "#3f51b5", bg: "#E3F2FD" };
    case "clip":
      return { border: "#8bc34a", bg: "#E8F5E9" };
    case "edit":
      return { border: "#9c27b0", bg: "#F3E5F5" };
    case "import":
      return { border: "#00897b", bg: "#E0F2F1" };
  }
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
  highlightUnseenEnabled?: boolean;
  notesEnabled: boolean;
  showOnlyChangedParameters: boolean;

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

  prevParamsId?: string | null;
  paramDeltas?: ParamDelats;

  promptChanged?: boolean;
  note?: string;
  onSaveNote?: (nodeId: string, note: string) => void;
  onDelete?: (nodeId: string) => void;
  canDelete?: boolean;
  onHide?: (nodeId: string) => void;
  canHide?: boolean;
  branchSuggestion?: BrachSuggestion;
  categoryScores?: Record<string, number | null>;
  categoryScoreDeltas?: Partial<Record<string, number | null>> | null;
  categoryLabels?: Record<string, string>;
  categoryVisibility?: Record<string, boolean>;
  onSetCategoryVisible?: (categoryId: string, visible: boolean) => void;
  onShowAllCategories?: () => void;
  showWeightSuggestionsEnabled?: boolean;
  graphCardContentMode?: GraphCardContentMode;
  graphCardDisplayMode?: GraphCardDisplayMode;
  displayTotalSteps?: number;
  displayLowStepPct?: number;
  parameterHistory?: ParameterHistoryMap;

  onOpenDetails?: (nodeId: string) => void;
  onStartCompare?: (nodeId: string) => void;
  isComparePicking?: boolean;
  compareSourceNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}) {
  const theme = useTheme();

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
        prevParamsId={props.prevParamsId}
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
        onOpen={() => props.onOpenDetails?.(props.nodeId)}
        onAdd={props.onAdd}
        onVideoOpened={props.onVideoOpened}
        highlightUnseenEnabled={props.highlightUnseenEnabled}
        notesEnabled={props.notesEnabled}
        showWeightSuggestionsEnabled={props.showWeightSuggestionsEnabled ?? true}
        categoryScores={props.categoryScores}
        categoryScoreDeltas={props.categoryScoreDeltas}
        categoryLabels={props.categoryLabels}
        categoryVisibility={props.categoryVisibility}
        graphCardContentMode={props.graphCardContentMode}
        graphCardDisplayMode={props.graphCardDisplayMode}
        onDelete={props.onDelete}
        canDelete={props.canDelete}
        onHide={props.onHide}
        canHide={props.canHide}
        displayTotalSteps={props.displayTotalSteps}
        displayLowStepPct={props.displayLowStepPct}
        onStartCompare={props.onStartCompare}
        isComparePicking={props.isComparePicking}
        compareSourceNodeId={props.compareSourceNodeId}
        showOnlyChangedParameters={props.showOnlyChangedParameters}
        onSelectNode={props.onSelectNode}
      >
        {props.children}
      </GraphCard>

      {/* Info Popup */}
    </>
  );
}

export const nodeTypes = {
  clip: ClipNode,
  params: ParamNode,
  edit: EditNode,
  import: ImportNode,
};

import { useTheme } from "@mui/material";

import "reactflow/dist/style.css";

import { GraphCard } from "../components/GraphCard";
import { ClipNode } from "./ClipNode";
import { ParamNode } from "./ParamNode";
import { EditNode } from "./EditNode";

import { ImportNode } from "./ImportNode";

import { getNodeColors } from "@ma/shared/src/nodeColors";
import React from "react";
import { NodeCardProps } from "../types/props";

export function NodeCardInner(props: NodeCardProps) {
  const theme = useTheme();

  const base = getNodeColors(props.type, props.isRoot);

  const bg = theme.palette.mode === "dark" ? theme.palette.background.paper : base.bg;
  const borderColor = base.border;

  const shouldHighlightUnseen = props.type === "clip" && !props.videoOpened && !props.selected;

  const handleOpen = React.useCallback(() => {
    if (props.activeClipPick && props.type === "clip") {
      props.onPickClipNode?.({
        id: props.nodeId,
        label: props.title ?? null,
        videoUrl: props.videoUrl ?? null,
      });
      return;
    }
  }, [
    props.activeClipPick,
    props.type,
    props.onPickClipNode,
    props.nodeId,
    props.title,
    props.videoUrl,
    props.onOpenDetails,
  ]);

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
        onOpen={handleOpen}
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
        showOnlyChangedParameters={props.showOnlyChangedParameters ?? true}
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

export const NodeCard = React.memo(NodeCardInner);

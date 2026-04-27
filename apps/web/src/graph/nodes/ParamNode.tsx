import { useContext } from "react";
import { Handle, NodeProps, Position } from "reactflow";
import TuneIcon from "@mui/icons-material/Tune";
import { NodeCard } from "./Node";
import GraphUIContext from "../contexts/GraphUIContext";
import React from "react";

export const ParamNode = React.memo(function ParamNode(props: NodeProps<any>) {
  const ui = useContext(GraphUIContext);
  if (!ui) throw new Error("GraphUIContext missing");

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
        prompt={props.data?.prompt}
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
        onSaveNote={ui.onSaveNote}
        onDelete={ui.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={ui.onHide}
        canHide={!props.data?.isRoot}
        branchSuggestion={props.data?.branchSuggestion}
        categoryLabels={props.data?.categoryLabels}
        categoryVisibility={ui.categoryVisibility}
        onSetCategoryVisible={ui.onSetCategoryVisible}
        onShowAllCategories={ui.onShowAllCategories}
        showWeightSuggestionsEnabled={ui.showWeightSuggestionsEnabled}
        graphCardContentMode={ui.graphCardContentMode}
        graphCardDisplayMode={ui.graphCardDisplayMode}
        displayTotalSteps={props.data?.displayTotalSteps}
        displayLowStepPct={props.data?.displayLowStepPct}
        parameterHistory={props.data?.parameterHistory}
        onOpenDetails={ui.onOpenDetails}
        onStartCompare={ui.onStartCompare}
        isComparePicking={ui.isComparePicking}
        compareSourceNodeId={ui.compareSourceNodeId}
        showOnlyChangedParameters={ui.showOnlyChangedParameters}
        onSelectNode={ui.onSelectNode}
        highlightUnseenEnabled={ui.highlightUnseenEnabled}
        notesEnabled={ui.notesEnabled}
      />
    </div>
  );
});

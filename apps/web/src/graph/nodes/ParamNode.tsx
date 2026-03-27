import { Handle, NodeProps, Position } from "reactflow";
import { NodeCard } from "./Node";
import TuneIcon from "@mui/icons-material/Tune";
import { Typography } from "@mui/material";

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
        highlightUnseenEnabled={props.data.highlightUnseenEnabled}
        notesEnabled={props.data.notesEnabled}
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
        onDelete={(props.data as any)?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={(props.data as any)?.onHide}
        canHide={!props.data?.isRoot}
        branchSuggestion={props.data?.branchSuggestion}
        categoryLabels={props.data.categoryLabels}
        categoryVisibility={props.data.categoryVisibility}
        onSetCategoryVisible={props.data.onSetCategoryVisible}
        onShowAllCategories={props.data.onShowAllCategories}
        showWeightSuggestionsEnabled={props.data.showWeightSuggestionsEnabled}
        graphCardContentMode={props.data.graphCardContentMode}
        graphCardDisplayMode={props.data.graphCardDisplayMode}
        displayTotalSteps={props.data.displayTotalSteps}
        displayLowStepPct={props.data.displayLowStepPct}
        parameterHistory={props.data.parameterHistory}
        onOpenDetails={props.data.onOpenDetails}
        onStartCompare={props.data.onStartCompare}
        isComparePicking={props.data.isComparePicking}
        compareSourceNodeId={props.data.compareSourceNodeId}
        showOnlyChangedParameters={props.data.showOnlyChangedParameters}
      />
    </div>
  );
}

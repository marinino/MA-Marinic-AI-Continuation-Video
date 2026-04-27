import { Box } from "@mui/material";
import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from "reactflow";
import { useTheme } from "@mui/material/styles";
import { EdgeKind } from "../types/ui";
import { scoreToEdgeColor, scoreToStrokeWidth } from "../graph_helpers/layout";

export const LabeledEdge = memo(function LabeledEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } =
    props;
  const theme = useTheme();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const text = (data as any)?.label ?? "";
  const kind: EdgeKind = (data as any)?.label ?? "";
  const showLabel: boolean = (data as any)?.showLabel ?? true;
  const isTimelineEdge: boolean = (data as any)?.isTimelineEdge ?? false;

  const transitionScore: number | undefined = (data as any)?.transitionScore;
  const transitionLabel: string | undefined = (data as any)?.transitionLabel;

  const fallbackColor = (() => {
    switch (kind) {
      case "input":
        return theme.palette.primary.main;
      case "output":
        return theme.palette.primary.dark;
      case "edit_in":
        return theme.palette.secondary.main;
      case "edit_out":
        return theme.palette.secondary.dark;
      default:
        return theme.palette.text.secondary;
    }
  })();

  const edgeColor = scoreToEdgeColor(transitionScore, fallbackColor);
  const strokeWidth = scoreToStrokeWidth(transitionScore);

  const highlightColor =
    theme.palette.mode === "dark" ? theme.palette.warning.light : theme.palette.warning.main;

  const labelText = typeof transitionScore === "number" ? `${text} · ${transitionScore}` : text;

  return (
    <>
      {isTimelineEdge && (
        <BaseEdge
          path={edgePath}
          markerEnd={undefined}
          style={{
            stroke: highlightColor,
            strokeWidth: strokeWidth + 6,
            opacity: 0.95,
            strokeLinecap: "round",
            strokeLinejoin: "round",
          }}
        />
      )}

      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth,
        }}
      />

      {showLabel && (
        <EdgeLabelRenderer>
          <Box
            sx={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "none",
              fontSize: 12,
              bgcolor: "background.paper",
              color: "text.primary",
              px: 0.75,
              py: 0.25,
              borderRadius: 1.5,
              border: 1,
              borderColor: isTimelineEdge ? highlightColor : edgeColor,
              boxShadow: isTimelineEdge ? 2 : 0,
              whiteSpace: "nowrap",
            }}
            title={
              typeof transitionScore === "number"
                ? `Transition ${transitionLabel ?? ""} (${transitionScore})`
                : undefined
            }
          >
            {labelText}
          </Box>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

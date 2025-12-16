import { Box } from "@mui/material";
import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "reactflow";
import { useTheme } from "@mui/material/styles";

type EdgeKind = "input" | "output" | "edit_in" | "edit_out";

export const LabeledEdge = memo(function LabeledEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } = props;
  const theme = useTheme();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  const text = (data as any)?.label ?? "";
  const kind: EdgeKind = (data as any)?.label ?? "";

  const edgeColor = (() => {
    // Nimm MUI Theme-Farben -> sehen in light/dark gut aus
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

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: edgeColor,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
  <Box
    
    sx={{
      position: "absolute",
      transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
      pointerEvents: "none",

      fontSize: 12,
      bgcolor: "background.paper",   // NICHT transparent
      color: "text.primary",
      px: 0.75,
      py: 0.25,
      borderRadius: 1.5,
      border: 1,
      borderColor: edgeColor,     // 👈 Label-Rahmen in Edge-Farbe
              
      whiteSpace: "nowrap",
    }}
  >
    {text}
  </Box>
</EdgeLabelRenderer>

    </>
  );
});

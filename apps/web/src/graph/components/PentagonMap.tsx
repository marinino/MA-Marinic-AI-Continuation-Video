import * as React from "react";
import { Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { RadarAxis } from "../types/ui";

export const PentagonMap = React.memo(function PentagonMap(props: {
  axes: RadarAxis[]; // ✅ MUSS 5 sein
  size?: number;
  showRadarPolygon?: boolean;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const size = props.size ?? 260;
  const showRadarPolygon = props.showRadarPolygon ?? true;

  const axes = props.axes.slice(0, 5);

  // --- theme-aware colors (tweak to taste) ---
  const gridStroke = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.14)";
  const outerStroke = isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.28)";

  // accent for polygon
  const radarFill = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0,0,0,0.08)";
  const radarStroke = isDark ? "rgba(255, 255, 255, 1)" : "rgba(0,0,0,0.45)";
  const radarPoint = isDark ? "rgba(255, 255, 255, 1)" : "rgba(0,0,0,0.65)";

  // center dot (you wanted dark in light mode)
  const dotFill = isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.85)";
  const dotGlow = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";

  const values = axes.map((a) => a.value);

  const pad = 22;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - pad;

  const verts = axes.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a), a };
  });

  const sum = values.reduce((acc, v) => acc + Math.max(0, v), 0);
  const weights = sum > 0 ? values.map((v) => Math.max(0, v) / sum) : values.map(() => 0.2);

  const dot = weights.reduce(
    (acc, w, i) => ({ x: acc.x + w * verts[i].x, y: acc.y + w * verts[i].y }),
    { x: 0, y: 0 }
  );

  const radarPts = values.map((v, i) => {
    const t = Math.max(0, Math.min(100, v)) / 100;
    return { x: cx + (verts[i].x - cx) * t, y: cy + (verts[i].y - cy) * t };
  });

  const poly = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const rings = [0.2, 0.4, 0.6, 0.8, 1.0];

  const labelPad = 34;
  const labelStyle = {
    position: "absolute" as const,
    fontSize: 12,
    opacity: 0.85,
    lineHeight: 1.1,
    whiteSpace: "pre-line" as const,
    pointerEvents: "none" as const,
  };

  function anchorFor(i: number) {
    if (i === 0) return { transform: "translate(-50%, -100%)", textAlign: "center" as const };
    if (i === 1) return { transform: "translate(0%, -50%)", textAlign: "left" as const };
    if (i === 2) return { transform: "translate(0%, -50%)", textAlign: "left" as const };
    if (i === 3) return { transform: "translate(-100%, -50%)", textAlign: "right" as const };
    return { transform: "translate(-100%, -50%)", textAlign: "right" as const };
  }

  const labelPos = verts.map((v) => ({
    x: cx + (v.x - cx) + labelPad * Math.cos(v.a),
    y: cy + (v.y - cy) + labelPad * Math.sin(v.a),
  }));

  return (
    <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <Box sx={{ position: "relative", width: size, height: size, mt: 3 }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ display: "block" }}
        >
          {/* Rings */}
          {rings.map((t, idx) => {
            const ringPts = verts.map((v) => ({
              x: cx + (v.x - cx) * t,
              y: cy + (v.y - cy) * t,
            }));
            return (
              <polygon
                key={idx}
                points={poly(ringPts)}
                fill="none"
                stroke={gridStroke}
                strokeWidth={1}
              />
            );
          })}

          {/* Axes */}
          {verts.map((v, i) => (
            <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y} stroke={gridStroke} strokeWidth={1} />
          ))}

          {/* Outer pentagon */}
          <polygon points={poly(verts)} fill="none" stroke={outerStroke} strokeWidth={2} />

          {/* Radar */}
          {showRadarPolygon && (
            <>
              <polygon
                points={poly(radarPts)}
                fill={radarFill}
                stroke={radarStroke}
                strokeWidth={2}
              />
              {radarPts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3.2} fill={radarPoint} />
              ))}
            </>
          )}

          {/* Dot */}
          <circle cx={dot.x} cy={dot.y} r={6} fill={dotFill} />
          <circle cx={dot.x} cy={dot.y} r={10} fill={dotGlow} />
        </svg>

        {/* Labels */}
        {axes.map((l, i) => {
          const pos = labelPos[i];
          const a = anchorFor(i);
          return (
            <Box
              key={axes[i].id}
              sx={{
                ...labelStyle,
                left: pos.x,
                top: pos.y,
                transform: a.transform,
                textAlign: a.textAlign,
              }}
            >
              {axes[i].label}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
});

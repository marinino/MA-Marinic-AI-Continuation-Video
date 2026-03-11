import { Handle, NodeProps, Position } from "reactflow";
import { NodeCard } from "./Node";
import { Stack, Typography, Chip, Box } from "@mui/material";
import { parsedChangelogLines } from "../../utils/parseTimelineChangelog";
import ContentCutIcon from "@mui/icons-material/ContentCut";

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
        onDelete={(props.data as any)?.onDelete}
        canDelete={!props.data?.isRoot}
        onHide={(props.data as any)?.onHide}
        canHide={!props.data?.isRoot}
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

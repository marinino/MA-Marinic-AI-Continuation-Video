type ParsedChangelog = {
  summaryLines: string[];
  detailLines: string[];
  nextEffectKeys: string[];
};

export function parsedChangelogLines(
  changelog: any[],
  prevEffectKeys: string[] = []
): ParsedChangelog {
  const prevSet = new Set(prevEffectKeys);
  const nextSet = new Set(prevEffectKeys);

  const summaryLines: string[] = [];
  const detailLines: string[] = [];

  let addedFrames = 0;
  let removedFrames = 0;
  const newEffectsByName = new Map<string, number>();

  changelog.forEach((e) => {
    if (e.type === "clip_added") {
      if (e.clip.kind === "clip") {
        addedFrames += e.clip.duration ?? 0;
        detailLines.push(`+ Clip "${e.clip.name ?? "Unnamed"}" (${e.clip.duration ?? 0} frames)`);
      }

      if (e.clip.kind === "effect") {
        const key = effectKey(e);
        const name = e.clip.name ?? "Unnamed effect";
        const frames = e.clip.duration ?? 0;

        const isNew = !prevSet.has(key);
        nextSet.add(key);

        if (isNew) {
          newEffectsByName.set(name, (newEffectsByName.get(name) ?? 0) + frames);
          detailLines.push(`+ Effect "${name}" (${frames} frames)`);
        }
      }
    }

    if (e.type === "clip_removed" && e.clip.kind === "clip") {
      removedFrames += e.clip.duration ?? 0;
      detailLines.push(`- Clip "${e.clip.name ?? "Unnamed"}" (${e.clip.duration ?? 0} frames)`);
    }
  });

  if (removedFrames > 0) {
    summaryLines.push(`Cut ${removedFrames - addedFrames} frames from video`);
  } else if (addedFrames > 0) {
    summaryLines.push(`Added ${addedFrames} frames to video`);
  }

  newEffectsByName.forEach((frames, name) => {
    summaryLines.push(`Added effect "${name}" for ${frames} frames`);
  });

  return {
    summaryLines,
    detailLines,
    nextEffectKeys: Array.from(nextSet),
  };
}

function effectKey(e: any): string {
  // passe die Felder an deine Daten an (lane/offset/start/ref)
  const name = e.clip?.name ?? "Unnamed effect";
  const lane = e.clip?.lane ?? "";
  const offset = e.clip?.offset ?? "";
  const start = e.clip?.start ?? "";
  // duration NICHT unbedingt reinnehmen, weil sich die beim Trim ändert
  return `${name}::lane=${lane}::offset=${offset}::start=${start}`;
}

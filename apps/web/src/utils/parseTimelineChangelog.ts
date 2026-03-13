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

  const normalized = cancelOutClipReadds(changelog);

  normalized.forEach((e) => {
    if (e.type === "clip_added") {
      if (e.clip?.kind === "clip") {
        addedFrames += e.clip.duration ?? 0;
        detailLines.push(`+ Clip "${e.clip.name ?? "Unnamed"}" (${e.clip.duration ?? 0} frames)`);
      }

      if (e.clip?.kind === "effect") {
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

    if (e.type === "clip_removed" && e.clip?.kind === "clip") {
      removedFrames += e.clip.duration ?? 0;
      detailLines.push(`- Clip "${e.clip.name ?? "Unnamed"}" (${e.clip.duration ?? 0} frames)`);
    }
  });

  const netFrames = addedFrames - removedFrames;

  if (netFrames < 0) {
    summaryLines.push(`Cut ${Math.abs(netFrames)} frames from video`);
  } else if (netFrames > 0) {
    summaryLines.push(`Added ${netFrames} frames to video`);
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
  const name = e.clip?.name ?? "Unnamed effect";
  const lane = e.clip?.lane ?? "";
  const offset = e.clip?.offset ?? "";
  const start = e.clip?.start ?? "";
  return `${name}::lane=${lane}::offset=${offset}::start=${start}`;
}

function clipKey(e: any): string | null {
  if (e?.clip?.kind !== "clip") return null;

  const name = e.clip?.name ?? "";
  const frames = e.clip?.duration ?? "";
  return `${name}__${frames}`;
}

function cancelOutClipReadds(entries: any[]) {
  const added = new Map<string, number>();
  const removed = new Map<string, number>();

  for (const e of entries) {
    const key = clipKey(e);
    if (!key) continue;

    if (e.type === "clip_added") {
      added.set(key, (added.get(key) ?? 0) + 1);
    }

    if (e.type === "clip_removed") {
      removed.set(key, (removed.get(key) ?? 0) + 1);
    }
  }

  const cancelCounts = new Map<string, number>();
  for (const [key, addCount] of added.entries()) {
    const remCount = removed.get(key) ?? 0;
    cancelCounts.set(key, Math.min(addCount, remCount));
  }

  const usedAdded = new Map<string, number>();
  const usedRemoved = new Map<string, number>();

  return entries.filter((e) => {
    const key = clipKey(e);
    if (!key) return true;

    const maxCancel = cancelCounts.get(key) ?? 0;
    if (maxCancel === 0) return true;

    if (e.type === "clip_added") {
      const current = usedAdded.get(key) ?? 0;
      if (current < maxCancel) {
        usedAdded.set(key, current + 1);
        return false;
      }
      return true;
    }

    if (e.type === "clip_removed") {
      const current = usedRemoved.get(key) ?? 0;
      if (current < maxCancel) {
        usedRemoved.set(key, current + 1);
        return false;
      }
      return true;
    }

    return true;
  });
}

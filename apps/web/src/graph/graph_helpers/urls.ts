export function timelineUrl(projectId: string, filename: string) {
  return `/api/projects/${encodeURIComponent(projectId)}/timelines/${encodeURIComponent(filename)}`;
}

export function buildTimelineDownloadUrl(projectId: string, storedTimelineFilename: string) {
  return `${window.location.origin}${timelineUrl(projectId, storedTimelineFilename)}`;
}

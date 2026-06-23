// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeWorker(raw = {}) {
  return {
    id: String(raw.id ?? raw.workerId ?? ''),
    title: String(raw.title ?? raw.caption ?? 'Worker sem título'),
    author: raw.author ?? raw.owner ?? null,
    videoUrl: String(raw.videoUrl ?? raw.src ?? ''),
    thumbnailUrl: String(raw.thumbnailUrl ?? raw.poster ?? raw.imageUrl ?? ''),
    duration: raw.duration ?? null,
    stats: raw.stats ?? {},
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeWorkers(items = []) {
  return Array.isArray(items) ? items.map(normalizeWorker) : [];
}

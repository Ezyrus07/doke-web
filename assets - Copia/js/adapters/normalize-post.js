// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizePost(raw = {}) {
  return {
    id: String(raw.id ?? raw.postId ?? ''),
    author: raw.author ?? raw.owner ?? null,
    caption: String(raw.caption ?? raw.body ?? raw.text ?? ''),
    media: Array.isArray(raw.media) ? raw.media : [],
    stats: raw.stats ?? {},
    createdAt: raw.createdAt ?? null,
    visibility: raw.visibility ?? 'public',
  };
}

export function normalizePosts(items = []) {
  return Array.isArray(items) ? items.map(normalizePost) : [];
}

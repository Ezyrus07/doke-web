// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeCommunity(raw = {}) {
  return {
    id: String(raw.id ?? raw.communityId ?? ''),
    name: String(raw.name ?? 'Comunidade'),
    slug: String(raw.slug ?? ''),
    description: String(raw.description ?? ''),
    avatarUrl: String(raw.avatarUrl ?? raw.imageUrl ?? ''),
    coverUrl: String(raw.coverUrl ?? ''),
    metrics: raw.metrics ?? {},
    membership: raw.membership ?? null,
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeCommunities(items = []) {
  return Array.isArray(items) ? items.map(normalizeCommunity) : [];
}

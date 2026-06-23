// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeProfile(raw = {}) {
  return {
    id: String(raw.id ?? raw.profileId ?? ''),
    name: String(raw.name ?? raw.displayName ?? 'Perfil'),
    handle: String(raw.handle ?? raw.username ?? ''),
    avatarUrl: String(raw.avatarUrl ?? raw.photoURL ?? ''),
    coverUrl: String(raw.coverUrl ?? ''),
    bio: String(raw.bio ?? raw.description ?? ''),
    metrics: raw.metrics ?? {},
    location: raw.location ?? null,
    roles: Array.isArray(raw.roles) ? raw.roles : [],
  };
}

export function normalizeProfiles(items = []) {
  return Array.isArray(items) ? items.map(normalizeProfile) : [];
}

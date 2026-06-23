// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeListing(raw = {}) {
  return {
    id: String(raw.id ?? raw.listingId ?? ''),
    title: String(raw.title ?? raw.name ?? 'Serviço sem título'),
    description: String(raw.description ?? raw.summary ?? ''),
    price: raw.price ?? raw.amount ?? null,
    location: String(raw.location ?? raw.city ?? ''),
    imageUrl: String(raw.imageUrl ?? raw.image ?? raw.thumbnailUrl ?? ''),
    rating: Number(raw.rating ?? raw.score ?? 0),
    owner: raw.owner ?? raw.professional ?? null,
    category: String(raw.category ?? ''),
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeListings(items = []) {
  return Array.isArray(items) ? items.map(normalizeListing) : [];
}

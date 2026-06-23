// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeOrder(raw = {}) {
  return {
    id: String(raw.id ?? raw.orderId ?? ''),
    title: String(raw.title ?? raw.serviceTitle ?? 'Pedido'),
    status: String(raw.status ?? 'pending'),
    customer: raw.customer ?? null,
    professional: raw.professional ?? null,
    schedule: raw.schedule ?? null,
    amount: raw.amount ?? raw.price ?? null,
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeOrders(items = []) {
  return Array.isArray(items) ? items.map(normalizeOrder) : [];
}

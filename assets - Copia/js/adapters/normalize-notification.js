// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeNotification(raw = {}) {
  return {
    id: String(raw.id ?? raw.notificationId ?? ''),
    type: String(raw.type ?? 'info'),
    title: String(raw.title ?? 'Notificação'),
    body: String(raw.body ?? raw.message ?? ''),
    href: raw.href ?? raw.url ?? null,
    readAt: raw.readAt ?? null,
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeNotifications(items = []) {
  return Array.isArray(items) ? items.map(normalizeNotification) : [];
}

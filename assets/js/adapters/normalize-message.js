// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeMessage(raw = {}) {
  return {
    id: String(raw.id ?? raw.messageId ?? ''),
    conversationId: String(raw.conversationId ?? raw.threadId ?? ''),
    sender: raw.sender ?? raw.from ?? null,
    body: String(raw.body ?? raw.text ?? ''),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    readAt: raw.readAt ?? null,
    createdAt: raw.createdAt ?? null,
  };
}

export function normalizeMessages(items = []) {
  return Array.isArray(items) ? items.map(normalizeMessage) : [];
}

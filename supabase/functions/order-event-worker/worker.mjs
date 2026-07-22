export const MAX_BATCH_SIZE = 100;
export const DEFAULT_BATCH_SIZE = 25;
export const WEBHOOK_TIMEOUT_MS = 10_000;

export function normalizeLimit(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_BATCH_SIZE;
  return Math.min(MAX_BATCH_SIZE, Math.max(1, Math.trunc(number)));
}

export function retryDelaySeconds(attempt) {
  const normalized = Math.max(1, Math.trunc(Number(attempt) || 1));
  return Math.min(3600, 30 * (2 ** Math.min(normalized - 1, 7)));
}

export function normalizeWorkerError(error) {
  const code = typeof error?.code === 'string' ? error.code.trim() : '';
  if (/^DOKE_ORDER_EVENT_[A-Z0-9_]+$/.test(code)) return code;

  const name = String(error?.name || '').toLowerCase();
  const message = String(error?.message || error || '').toLowerCase();
  if (name === 'aborterror' || name === 'timeouterror' || /timeout|timed out/.test(message)) {
    return 'DOKE_ORDER_EVENT_WEBHOOK_TIMEOUT';
  }
  if (/completion|complete_order_domain_event/.test(message)) {
    return 'DOKE_ORDER_EVENT_COMPLETION_FAILED';
  }
  if (/claim|claim_order_domain_events/.test(message)) {
    return 'DOKE_ORDER_EVENT_CLAIM_FAILED';
  }
  if (/auth|token|unauthor/.test(message)) {
    return 'DOKE_ORDER_EVENT_WORKER_AUTH_FAILED';
  }
  return 'DOKE_ORDER_EVENT_DELIVERY_FAILED';
}

export function buildWebhookEnvelope(event, invocationId) {
  return {
    id: event.event_key,
    type: event.event_type,
    source: 'doke.orders',
    invocationId,
    occurredAt: event.created_at,
    sequence: Number(event.sequence_no),
    attempt: Number(event.delivery_attempts),
    orderId: event.order_id,
    payload: event.payload || {},
    cacheTags: Array.isArray(event.cache_tags) ? event.cache_tags : []
  };
}

export async function hmacSha256Hex(secret, payload) {
  if (!secret) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function deliverOptionalWebhook(event, options = {}) {
  const url = String(options.url || '').trim();
  if (!url) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const envelope = buildWebhookEnvelope(event, options.invocationId || '');
  const payload = JSON.stringify(envelope);
  const signature = await hmacSha256Hex(String(options.secret || ''), payload);
  const response = await (options.fetchImpl || fetch)(url, {
    method: 'POST',
    signal: AbortSignal.timeout(options.timeoutMs || WEBHOOK_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Doke-Order-Event-Worker/1.0',
      'X-Doke-Event-Id': event.event_key,
      'X-Doke-Event-Type': event.event_type,
      ...(signature ? { 'X-Doke-Signature': `sha256=${signature}` } : {})
    },
    body: payload
  });

  if (!response.ok) {
    const error = new Error(`Webhook returned HTTP ${response.status}`);
    error.code = response.status >= 500
      ? 'DOKE_ORDER_EVENT_WEBHOOK_5XX'
      : 'DOKE_ORDER_EVENT_WEBHOOK_4XX';
    error.status = response.status;
    throw error;
  }

  return { status: 'delivered', httpStatus: response.status };
}

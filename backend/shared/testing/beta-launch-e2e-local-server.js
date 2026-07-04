'use strict';

const http = require('http');
const { URL } = require('url');

function createBetaLaunchE2ELocalServer() {
  const state = createState();
  const calls = [];
  let server;

  async function start() {
    server = http.createServer(async (request, response) => {
      try {
        const parsed = new URL(request.url, 'http://127.0.0.1');
        const body = await readJson(request);
        const actor = actorFromRequest(request, state);
        const normalizedPath = normalizePath(request.method, parsed.pathname);
        calls.push({
          method: request.method,
          path: normalizedPath,
          rawPath: parsed.pathname,
          hasIdempotencyKey: Boolean(request.headers['x-idempotency-key']),
          actorRole: actor.role || 'anonymous'
        });
        const result = route({ request, parsed, body, state, actor });
        respond(response, result.status || 200, result.body || result);
      } catch (error) {
        respond(response, 500, { error: { code: 'DOKE_LOCAL_RUNTIME_ERROR', message: error.message } });
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    return { origin: `http://127.0.0.1:${address.port}` };
  }

  async function stop() {
    if (!server) return;
    await new Promise((resolve) => server.close(resolve));
    server = null;
  }

  function getReport() {
    return {
      calls: calls.slice(),
      payments: state.payments.length,
      escrowHolds: state.escrowHolds.length,
      kycDocuments: state.kycDocuments.length,
      supportTickets: state.supportTickets.length,
      abuseEvents: state.abuseEvents.length,
      idempotencyKeys: state.idempotency.size
    };
  }

  return { start, stop, getReport };
}

function createState() {
  const users = {
    client: { id: 'user_client_beta_launch', role: 'client', name: 'Cliente Beta' },
    professional: { id: 'user_professional_beta_launch', role: 'professional', name: 'Profissional Beta' },
    admin: { id: 'user_admin_beta_launch', role: 'admin', name: 'Admin Beta' }
  };
  return {
    users,
    tokens: new Map(),
    idempotency: new Map(),
    payments: [],
    checkoutSessions: [],
    escrowHolds: [],
    kycDocuments: [],
    verification: { userId: users.professional.id, status: 'not_submitted', level: 'professional_basic' },
    supportTickets: [],
    supportMessages: [],
    abuseEvents: [],
    rateLimits: new Map(),
    plans: [{ id: 'plan_professional', name: 'Profissional', priceCents: 2990 }]
  };
}

function route(context) {
  const { request, parsed, state, actor, body } = context;
  const method = request.method;
  const pathname = parsed.pathname;

  if (method === 'POST' && pathname === '/auth/login') return login(context);
  if (method === 'GET' && pathname === '/auth/session') return { body: { session: actor.user ? { user: actor.user } : null } };
  if (method === 'GET' && pathname === '/users/me') return requireUser(actor) || { body: { user: actor.user } };
  if (method === 'GET' && pathname === '/profiles/me') return requireUser(actor) || { body: { profile: { userId: actor.user.id, role: actor.role, name: actor.user.name } } };

  if (method === 'GET' && pathname === '/payments/methods') return requireUser(actor) || { body: { methods: [{ id: 'pix', type: 'pix' }, { id: 'card', type: 'card' }] } };
  if (method === 'POST' && pathname === '/checkout/sessions') return withIdempotency(context, () => createCheckoutSession(context));
  if (method === 'POST' && /^\/payments\/[^/]+\/confirm$/.test(pathname)) return withIdempotency(context, () => confirmPayment(context, segment(pathname, 1)));
  if (method === 'POST' && pathname === '/escrow/holds') return withIdempotency(context, () => createEscrowHold(context));
  if (method === 'POST' && /^\/escrow\/[^/]+\/release$/.test(pathname)) return withIdempotency(context, () => releaseEscrow(context, segment(pathname, 1)));
  if (method === 'POST' && /^\/escrow\/[^/]+\/refund$/.test(pathname)) return withIdempotency(context, () => refundEscrow(context, segment(pathname, 1)));

  if (method === 'GET' && pathname === '/professionals/verification') return requireProfessional(actor) || { body: { verification: state.verification } };
  if (method === 'PATCH' && pathname === '/professionals/verification') return withIdempotency(context, () => updateProfessionalVerification(context));
  if (method === 'POST' && pathname === '/kyc/documents') return withIdempotency(context, () => createKycDocument(context));
  if (method === 'POST' && /^\/kyc\/documents\/[^/]+\/submit$/.test(pathname)) return withIdempotency(context, () => submitKycDocument(context, segment(pathname, 2)));
  if (method === 'GET' && pathname === '/admin/kyc/reviews') return listKycReviews(context);
  if (method === 'POST' && /^\/admin\/kyc\/reviews\/[^/]+\/approve$/.test(pathname)) return withIdempotency(context, () => reviewKyc(context, segment(pathname, 3), 'approved'));
  if (method === 'POST' && /^\/admin\/kyc\/reviews\/[^/]+\/reject$/.test(pathname)) return withIdempotency(context, () => reviewKyc(context, segment(pathname, 3), 'rejected'));

  if (method === 'GET' && pathname === '/support/tickets') return listOwnTickets(context);
  if (method === 'POST' && pathname === '/support/tickets') return withIdempotency(context, () => createSupportTicket(context));
  if (method === 'POST' && /^\/support\/tickets\/[^/]+\/messages$/.test(pathname)) return withIdempotency(context, () => createSupportMessage(context, segment(pathname, 2)));
  if (method === 'GET' && pathname === '/admin/support/tickets') return adminListTickets(context);
  if (method === 'POST' && /^\/admin\/support\/tickets\/[^/]+\/assign$/.test(pathname)) return withIdempotency(context, () => adminMutateTicket(context, segment(pathname, 3), 'assigned'));
  if (method === 'POST' && /^\/admin\/support\/tickets\/[^/]+\/resolve$/.test(pathname)) return withIdempotency(context, () => adminMutateTicket(context, segment(pathname, 3), 'resolved'));

  if (method === 'POST' && pathname === '/security/rate-limit/check') return withIdempotency(context, () => rateLimitCheck(context));
  if (method === 'POST' && pathname === '/security/abuse-events') return withIdempotency(context, () => createAbuseEvent(context));
  if (method === 'GET' && pathname === '/admin/security/abuse-events') return adminListAbuseEvents(context);
  if (method === 'POST' && pathname === '/security/sessions/risk-score') return withIdempotency(context, () => sessionRiskScore(context));

  return { status: 404, body: { error: { code: 'DOKE_LOCAL_ROUTE_NOT_FOUND', message: `${method} ${pathname} is not implemented.` } } };
}

function withIdempotency(context, handler) {
  const key = context.request.headers['x-idempotency-key'];
  if (!key) return { status: 400, body: { error: { code: 'DOKE_IDEMPOTENCY_KEY_REQUIRED', message: 'x-idempotency-key is required.' } } };
  const fingerprint = JSON.stringify({ method: context.request.method, path: context.parsed.pathname, body: context.body || {} });
  const existing = context.state.idempotency.get(key);
  if (existing) {
    if (existing.fingerprint !== fingerprint) return { status: 409, body: { error: { code: 'DOKE_IDEMPOTENCY_CONFLICT', message: 'Same idempotency key used with different payload.' } } };
    return { status: existing.status, body: { ...existing.body, idempotency: { replay: true } } };
  }
  const result = handler();
  const status = result.status || 200;
  const body = result.body || result;
  if (status < 400) context.state.idempotency.set(key, { fingerprint, status, body });
  return { status, body };
}

function createCheckoutSession({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_CHECKOUT_AUTH_REQUIRED');
  if (!body.orderId || !body.amountCents) return { status: 422, body: { error: { code: 'DOKE_CHECKOUT_PAYLOAD_INVALID', message: 'orderId and amountCents are required.' } } };
  const payment = { id: `payment_${state.payments.length + 1}`, orderId: body.orderId, amountCents: body.amountCents, payerId: actor.user.id, status: 'requires_confirmation' };
  const session = { id: `checkout_${state.checkoutSessions.length + 1}`, paymentId: payment.id, status: 'created', provider: body.provider || 'mock_gateway' };
  state.payments.push(payment); state.checkoutSessions.push(session);
  return { status: 201, body: { checkoutSession: session, payment } };
}

function confirmPayment({ state, actor }, paymentId) {
  if (!actor.user) return forbidden('DOKE_PAYMENT_CONFIRM_AUTH_REQUIRED');
  const payment = state.payments.find((item) => item.id === paymentId);
  if (!payment) return notFound('DOKE_PAYMENT_NOT_FOUND');
  if (actor.role !== 'admin' && payment.payerId !== actor.user.id) return forbidden('DOKE_PAYMENT_CONFIRM_FORBIDDEN');
  payment.status = 'confirmed';
  return { body: { payment } };
}

function createEscrowHold({ state, actor, body }) {
  if (actor.role !== 'admin') return forbidden('DOKE_ESCROW_CREATE_FORBIDDEN');
  const payment = state.payments.find((item) => item.id === body.paymentId);
  if (!payment || payment.status !== 'confirmed') return { status: 422, body: { error: { code: 'DOKE_ESCROW_PAYMENT_NOT_CONFIRMED', message: 'Payment must be confirmed before escrow hold.' } } };
  const hold = { id: `escrow_${state.escrowHolds.length + 1}`, paymentId: payment.id, status: 'held', amountCents: payment.amountCents };
  state.escrowHolds.push(hold);
  return { status: 201, body: { escrowHold: hold } };
}

function releaseEscrow({ state, actor }, escrowId) {
  if (actor.role !== 'admin') return forbidden('DOKE_ESCROW_RELEASE_FORBIDDEN');
  const hold = state.escrowHolds.find((item) => item.id === escrowId);
  if (!hold) return notFound('DOKE_ESCROW_NOT_FOUND');
  hold.status = 'released';
  return { body: { escrowHold: hold } };
}
function refundEscrow({ state, actor }, escrowId) {
  if (actor.role !== 'admin') return forbidden('DOKE_ESCROW_REFUND_FORBIDDEN');
  const hold = state.escrowHolds.find((item) => item.id === escrowId);
  if (!hold) return notFound('DOKE_ESCROW_NOT_FOUND');
  hold.status = 'refunded';
  return { body: { escrowHold: hold } };
}

function updateProfessionalVerification({ state, actor, body }) {
  const permission = requireProfessional(actor); if (permission) return permission;
  state.verification.status = body.status || 'draft';
  state.verification.businessType = body.businessType || 'individual';
  return { body: { verification: state.verification } };
}
function createKycDocument({ state, actor, body }) {
  const permission = requireProfessional(actor); if (permission) return permission;
  if (!['identity', 'address', 'professional_license'].includes(body.documentType)) return { status: 422, body: { error: { code: 'DOKE_KYC_DOCUMENT_TYPE_INVALID', message: 'Unsupported document type.' } } };
  const document = { id: `kyc_doc_${state.kycDocuments.length + 1}`, userId: actor.user.id, documentType: body.documentType, uploadId: body.uploadId || 'upload_seed', status: 'created' };
  state.kycDocuments.push(document);
  return { status: 201, body: { document } };
}
function submitKycDocument({ state, actor }, documentId) {
  const document = state.kycDocuments.find((item) => item.id === documentId);
  if (!document) return notFound('DOKE_KYC_DOCUMENT_NOT_FOUND');
  if (actor.role !== 'admin' && (!actor.user || document.userId !== actor.user.id)) return forbidden('DOKE_KYC_SUBMIT_FORBIDDEN');
  document.status = 'submitted';
  state.verification.status = 'submitted';
  return { body: { document, verification: state.verification } };
}
function listKycReviews({ state, actor }) {
  if (actor.role !== 'admin') return forbidden('DOKE_ADMIN_REQUIRED');
  return { body: { reviews: state.kycDocuments.filter((item) => item.status === 'submitted') } };
}
function reviewKyc({ state, actor, body }, documentId, status) {
  if (actor.role !== 'admin') return forbidden('DOKE_KYC_REVIEW_FORBIDDEN');
  const document = state.kycDocuments.find((item) => item.id === documentId);
  if (!document) return notFound('DOKE_KYC_DOCUMENT_NOT_FOUND');
  document.status = status;
  document.reviewNote = body.note || '';
  state.verification.status = status;
  return { body: { document, verification: state.verification } };
}

function listOwnTickets({ state, actor }) {
  if (!actor.user) return forbidden('DOKE_SUPPORT_AUTH_REQUIRED');
  return { body: { tickets: state.supportTickets.filter((ticket) => ticket.requesterId === actor.user.id) } };
}
function createSupportTicket({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_SUPPORT_CREATE_FORBIDDEN');
  const ticket = { id: `support_ticket_${state.supportTickets.length + 1}`, requesterId: actor.user.id, subject: body.subject || 'Ajuda', status: 'open', priority: body.priority || 'normal' };
  state.supportTickets.push(ticket);
  return { status: 201, body: { ticket } };
}
function createSupportMessage({ state, actor, body }, ticketId) {
  if (!actor.user) return forbidden('DOKE_SUPPORT_MESSAGE_FORBIDDEN');
  const ticket = state.supportTickets.find((item) => item.id === ticketId);
  if (!ticket) return notFound('DOKE_SUPPORT_TICKET_NOT_FOUND');
  if (actor.role !== 'admin' && ticket.requesterId !== actor.user.id) return forbidden('DOKE_SUPPORT_MESSAGE_FORBIDDEN');
  const message = { id: `support_message_${state.supportMessages.length + 1}`, ticketId, authorId: actor.user.id, body: body.body || '' };
  state.supportMessages.push(message);
  return { status: 201, body: { message } };
}
function adminListTickets({ state, actor }) {
  if (actor.role !== 'admin') return forbidden('DOKE_ADMIN_REQUIRED');
  return { body: { tickets: state.supportTickets } };
}
function adminMutateTicket({ state, actor, body }, ticketId, status) {
  if (actor.role !== 'admin') return forbidden('DOKE_SUPPORT_ADMIN_FORBIDDEN');
  const ticket = state.supportTickets.find((item) => item.id === ticketId);
  if (!ticket) return notFound('DOKE_SUPPORT_TICKET_NOT_FOUND');
  ticket.status = status;
  if (body.assigneeId) ticket.assigneeId = body.assigneeId;
  return { body: { ticket } };
}

function rateLimitCheck({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_SECURITY_AUTH_REQUIRED');
  const key = `${actor.user.id}:${body.bucket || 'default'}`;
  const count = (state.rateLimits.get(key) || 0) + 1;
  state.rateLimits.set(key, count);
  return { body: { decision: count > 3 ? 'limited' : 'allowed', remaining: Math.max(0, 3 - count) } };
}
function createAbuseEvent({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_ABUSE_EVENT_AUTH_REQUIRED');
  const event = { id: `abuse_event_${state.abuseEvents.length + 1}`, actorId: actor.user.id, type: body.type || 'spam_signal', severity: body.severity || 'low', status: 'open' };
  state.abuseEvents.push(event);
  return { status: 201, body: { abuseEvent: event } };
}
function adminListAbuseEvents({ state, actor }) {
  if (actor.role !== 'admin') return forbidden('DOKE_ADMIN_REQUIRED');
  return { body: { abuseEvents: state.abuseEvents } };
}
function sessionRiskScore({ actor, body }) {
  if (!actor.user) return forbidden('DOKE_SECURITY_AUTH_REQUIRED');
  const riskScore = body.ipAddress === '127.0.0.1' ? 5 : 45;
  return { body: { riskScore, decision: riskScore >= 60 ? 'challenge' : 'allow' } };
}

function login({ state, body }) {
  const role = body.role || 'client';
  const user = state.users[role];
  if (!user) return { status: 401, body: { error: { code: 'DOKE_AUTH_INVALID_ROLE', message: 'Invalid role.' } } };
  const token = `token_${role}_${state.tokens.size + 1}`;
  state.tokens.set(token, user);
  return { status: 200, body: { token, user } };
}
function actorFromRequest(request, state) {
  const value = request.headers.authorization || '';
  const token = value.startsWith('Bearer ') ? value.slice(7) : '';
  const user = token ? state.tokens.get(token) : null;
  return { user, role: user ? user.role : null };
}
function requireUser(actor) { return actor.user ? null : forbidden('DOKE_AUTH_REQUIRED'); }
function requireProfessional(actor) { return actor.role === 'professional' || actor.role === 'admin' ? null : forbidden('DOKE_PROFESSIONAL_REQUIRED'); }
function forbidden(code) { return { status: 403, body: { error: { code, message: code } } }; }
function notFound(code) { return { status: 404, body: { error: { code, message: code } } }; }
function segment(pathname, index) { return pathname.split('/').filter(Boolean)[index]; }
function normalizePath(method, pathname) {
  if (method === 'POST' && /^\/payments\/[^/]+\/confirm$/.test(pathname)) return '/payments/:id/confirm';
  if (method === 'POST' && /^\/escrow\/[^/]+\/(release|refund)$/.test(pathname)) return pathname.replace(/\/escrow\/[^/]+\//, '/escrow/:id/');
  if (/^\/kyc\/documents\/[^/]+\/submit$/.test(pathname)) return '/kyc/documents/:id/submit';
  if (/^\/admin\/kyc\/reviews\/[^/]+\/(approve|reject)$/.test(pathname)) return pathname.replace(/\/admin\/kyc\/reviews\/[^/]+\//, '/admin/kyc/reviews/:id/');
  if (/^\/support\/tickets\/[^/]+\/messages$/.test(pathname)) return '/support/tickets/:id/messages';
  if (/^\/admin\/support\/tickets\/[^/]+\/(assign|resolve)$/.test(pathname)) return pathname.replace(/\/admin\/support\/tickets\/[^/]+\//, '/admin/support/tickets/:id/');
  return pathname;
}
async function readJson(request) {
  if (!['POST', 'PATCH', 'PUT'].includes(request.method)) return {};
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}
function respond(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(`${JSON.stringify(body)}\n`);
}

module.exports = { createBetaLaunchE2ELocalServer };

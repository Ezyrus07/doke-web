'use strict';

const http = require('http');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(stableStringify(value || {})).digest('hex');
}

function createProductBetaE2ELocalServer(options = {}) {
  const state = createState();
  const idempotency = new Map();
  const calls = [];
  let server = null;
  let origin = '';

  async function start() {
    if (server) return { origin };
    server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url || '/', `http://${req.headers.host || HOST}`);
        const method = String(req.method || 'GET').toUpperCase();
        const pathName = normalize(url.pathname);
        const body = method === 'GET' ? {} : await readBody(req);
        const actor = actorFromAuth(req.headers.authorization, state);
        const idempotencyKey = readHeader(req.headers, IDEMPOTENCY_HEADER);
        calls.push({
          method,
          path: shape(pathName),
          rawPath: pathName,
          actorRole: actor.role,
          hasIdempotencyKey: Boolean(idempotencyKey),
          query: Object.fromEntries(url.searchParams.entries())
        });
        const response = route({ method, pathName, url, body, actor, req, state, idempotency });
        send(res, response.status || 200, response.body || {}, response.headers || {});
      } catch (error) {
        send(res, error.statusCode || 500, { error: { code: error.code || 'DOKE_PRODUCT_BETA_LOCAL_SERVER_ERROR', message: error.message } });
      }
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(options.port || 0, HOST, resolve);
    });
    origin = `http://${HOST}:${server.address().port}`;
    return { origin };
  }

  async function stop() {
    if (!server) return;
    const active = server;
    server = null;
    origin = '';
    if (typeof active.closeIdleConnections === 'function') active.closeIdleConnections();
    if (typeof active.closeAllConnections === 'function') active.closeAllConnections();
    await new Promise((resolve, reject) => active.close((error) => error ? reject(error) : resolve()));
  }

  function getReport() {
    return {
      name: 'product-beta-e2e-local-server',
      origin: origin ? 'http://127.0.0.1:<redacted>' : '',
      calls: calls.slice(),
      idempotencyEntryCount: idempotency.size,
      mediaUploadCount: state.mediaUploads.length,
      attachmentCount: state.attachments.length,
      reportCount: state.reports.length,
      blockCount: state.blocks.length,
      searchIndexCount: state.searchIndex.length,
      subscriptionCount: state.subscriptions.length,
      boostCount: state.boosts.length
    };
  }

  return Object.freeze({ start, stop, getReport });
}

function createState() {
  const users = {
    client: { id: 'user_client_product_beta', role: 'client', email: 'client@doke.local', name: 'Cliente Product Beta' },
    professional: { id: 'user_professional_product_beta', role: 'professional', email: 'professional@doke.local', name: 'Profissional Product Beta' },
    admin: { id: 'user_admin_product_beta', role: 'admin', email: 'admin@doke.local', name: 'Admin Product Beta' }
  };
  return {
    users,
    profiles: {
      client: { id: 'profile_client_product_beta', userId: users.client.id, role: 'client', displayName: 'Cliente Product Beta' },
      professional: { id: 'profile_professional_product_beta', userId: users.professional.id, role: 'professional', displayName: 'Profissional Product Beta' },
      admin: { id: 'profile_admin_product_beta', userId: users.admin.id, role: 'admin', displayName: 'Admin Product Beta' }
    },
    serviceListings: [
      { id: 'service_listing_seed_1', ownerId: users.professional.id, title: 'Instalação elétrica', category: 'eletrica', status: 'published', boostStatus: 'none' }
    ],
    publications: [
      { id: 'publication_seed_1', authorId: users.professional.id, title: 'Antes e depois', body: 'Publicação seed', status: 'published', boostStatus: 'none' }
    ],
    communityPosts: [
      { id: 'community_post_seed_1', authorId: users.client.id, title: 'Dúvida da comunidade', body: 'Post seed', comments: [], reactions: [] }
    ],
    mediaUploads: [],
    attachments: [],
    reports: [],
    blocks: [],
    searchIndex: [],
    plans: [
      { id: 'plan_free', name: 'Free', priceCents: 0, interval: 'month', features: ['basic_profile'] },
      { id: 'plan_professional', name: 'Professional', priceCents: 3900, interval: 'month', features: ['boost_discount', 'priority_support'] }
    ],
    subscriptions: [],
    boosts: []
  };
}

function route(context) {
  const { method, pathName } = context;
  if (method === 'POST' && pathName === '/auth/login') return login(context);
  if (method === 'GET' && pathName === '/auth/session') return { body: { active: true, user: context.actor.user } };
  if (method === 'GET' && pathName === '/users/me') return { body: { user: context.actor.user } };
  if (method === 'GET' && pathName === '/profiles/me') return { body: { profile: context.actor.profile } };

  if (method === 'GET' && pathName === '/media/uploads') return { body: { uploads: context.state.mediaUploads, items: context.state.mediaUploads } };
  if (method === 'POST' && pathName === '/media/uploads') return idempotent(context, () => createMediaUpload(context));
  const uploadComplete = pathName.match(/^\/media\/uploads\/([^/]+)\/complete$/);
  if (method === 'POST' && uploadComplete) return idempotent(context, () => completeMediaUpload(context, uploadComplete[1]));
  if (method === 'POST' && pathName === '/attachments') return idempotent(context, () => createAttachment(context));

  if (method === 'POST' && pathName === '/reports') return idempotent(context, () => createReport(context));
  if (method === 'POST' && pathName === '/blocks') return idempotent(context, () => createBlock(context));
  if (method === 'GET' && pathName === '/moderation/reports') return requireAdmin(context, () => ({ body: { reports: context.state.reports, items: context.state.reports } }));
  const moderationResolve = pathName.match(/^\/moderation\/reports\/([^/]+)\/resolve$/);
  if (method === 'POST' && moderationResolve) return idempotent(context, () => resolveReport(context, moderationResolve[1]));

  if (method === 'GET' && pathName === '/search') return search(context);
  if (method === 'POST' && pathName === '/search/index/rebuild') return idempotent(context, () => rebuildSearchIndex(context));

  if (method === 'GET' && pathName === '/plans') return { body: { plans: context.state.plans, items: context.state.plans } };
  if (method === 'POST' && pathName === '/subscriptions') return idempotent(context, () => createSubscription(context));
  const serviceBoost = pathName.match(/^\/service-listings\/([^/]+)\/boost$/);
  if (method === 'POST' && serviceBoost) return idempotent(context, () => boostServiceListing(context, serviceBoost[1]));
  const publicationBoost = pathName.match(/^\/publications\/([^/]+)\/boost$/);
  if (method === 'POST' && publicationBoost) return idempotent(context, () => boostPublication(context, publicationBoost[1]));

  return { status: 404, body: { error: { code: 'DOKE_PRODUCT_BETA_ENDPOINT_NOT_FOUND', message: `${method} ${pathName}` } } };
}

function login({ body, state }) {
  const email = String(body.email || body.login || '').toLowerCase();
  const role = email.includes('admin') ? 'admin' : email.includes('professional') || email.includes('profissional') ? 'professional' : 'client';
  return { body: { token: `token-${role}`, session: { token: `token-${role}` }, user: state.users[role] } };
}

function actorFromAuth(authorization, state) {
  const token = String(authorization || '').replace(/^Bearer\s+/i, '').trim();
  const role = token.includes('admin') ? 'admin' : token.includes('professional') || token.includes('profissional') ? 'professional' : 'client';
  return { role, user: state.users[role], profile: state.profiles[role] };
}

function idempotent(context, factory) {
  const key = readHeader(context.req.headers, IDEMPOTENCY_HEADER);
  if (!key) return { status: 409, body: { error: { code: 'DOKE_IDEMPOTENCY_REQUIRED', message: 'x-idempotency-key is required.' } } };
  const signature = `${context.actor.user.id}:${context.method}:${context.pathName}:${hash(context.body)}`;
  const existing = context.idempotency.get(key);
  if (existing) {
    if (existing.signature !== signature) return { status: 409, body: { error: { code: 'DOKE_IDEMPOTENCY_CONFLICT', message: 'Same key cannot be reused with a different payload.' } } };
    return { status: existing.status, body: Object.assign({}, existing.body, { idempotency: { replay: true, key } }), headers: { 'x-doke-idempotency-replay': 'true' } };
  }
  const response = factory();
  context.idempotency.set(key, { signature, status: response.status || 200, body: response.body || {} });
  return { status: response.status || 200, body: Object.assign({}, response.body || {}, { idempotency: { replay: false, key } }) };
}

function requireAdmin(context, factory) {
  if (context.actor.role !== 'admin') return forbidden('DOKE_ADMIN_REQUIRED');
  return factory();
}

function createMediaUpload({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_MEDIA_UPLOAD_FORBIDDEN');
  const mimeType = String(body.mimeType || 'application/octet-stream');
  if (!/^image\/(png|jpeg|webp)$|^application\/pdf$/.test(mimeType)) {
    return { status: 415, body: { error: { code: 'DOKE_MEDIA_MIME_TYPE_UNSUPPORTED', message: 'Unsupported media mime type.' } } };
  }
  const upload = {
    id: `media_upload_${state.mediaUploads.length + 1}`,
    ownerId: actor.user.id,
    filename: body.filename || 'arquivo.png',
    mimeType,
    sizeBytes: Number(body.sizeBytes || 0),
    status: 'pending',
    uploadUrl: 'http://127.0.0.1:<redacted>/signed-upload'
  };
  state.mediaUploads.push(upload);
  return { status: 201, body: { upload } };
}

function completeMediaUpload({ state, actor }, id) {
  const upload = state.mediaUploads.find((item) => item.id === id);
  if (!upload) return notFound('DOKE_MEDIA_UPLOAD_NOT_FOUND');
  if (upload.ownerId !== actor.user.id && actor.role !== 'admin') return forbidden('DOKE_MEDIA_UPLOAD_COMPLETE_FORBIDDEN');
  upload.status = 'completed';
  upload.assetUrl = `https://cdn.doke.local/${upload.id}`;
  return { body: { upload } };
}

function createAttachment({ state, actor, body }) {
  const upload = state.mediaUploads.find((item) => item.id === body.uploadId);
  if (!upload || upload.status !== 'completed') return { status: 409, body: { error: { code: 'DOKE_ATTACHMENT_UPLOAD_NOT_COMPLETED', message: 'Upload must be completed before attachment.' } } };
  if (upload.ownerId !== actor.user.id && actor.role !== 'admin') return forbidden('DOKE_ATTACHMENT_CREATE_FORBIDDEN');
  const attachment = {
    id: `attachment_${state.attachments.length + 1}`,
    ownerId: actor.user.id,
    uploadId: upload.id,
    targetType: body.targetType || 'publication',
    targetId: body.targetId || 'publication_seed_1',
    status: 'attached'
  };
  state.attachments.push(attachment);
  return { status: 201, body: { attachment } };
}

function createReport({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_REPORT_CREATE_FORBIDDEN');
  const report = {
    id: `report_${state.reports.length + 1}`,
    reporterId: actor.user.id,
    targetType: body.targetType || 'publication',
    targetId: body.targetId || 'publication_seed_1',
    reason: body.reason || 'spam',
    status: 'open'
  };
  state.reports.push(report);
  return { status: 201, body: { report } };
}

function createBlock({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_BLOCK_CREATE_FORBIDDEN');
  if (!body.blockedUserId || body.blockedUserId === actor.user.id) return { status: 422, body: { error: { code: 'DOKE_BLOCK_TARGET_INVALID', message: 'Blocked user target is invalid.' } } };
  const block = { id: `block_${state.blocks.length + 1}`, blockerId: actor.user.id, blockedUserId: body.blockedUserId, status: 'active' };
  state.blocks.push(block);
  return { status: 201, body: { block } };
}

function resolveReport(context, id) {
  if (context.actor.role !== 'admin') return forbidden('DOKE_MODERATION_RESOLVE_FORBIDDEN');
  const report = context.state.reports.find((item) => item.id === id);
  if (!report) return notFound('DOKE_REPORT_NOT_FOUND');
  report.status = 'resolved';
  report.resolution = context.body.resolution || 'reviewed';
  return { body: { report } };
}

function search({ state, url }) {
  const q = String(url.searchParams.get('q') || '').toLowerCase();
  const scope = String(url.searchParams.get('scope') || 'all');
  const sources = [];
  if (scope === 'all' || scope === 'services') sources.push(...state.serviceListings.map((item) => ({ type: 'service-listing', id: item.id, title: item.title, text: item.category })));
  if (scope === 'all' || scope === 'publications') sources.push(...state.publications.map((item) => ({ type: 'publication', id: item.id, title: item.title, text: item.body })));
  if (scope === 'all' || scope === 'community') sources.push(...state.communityPosts.map((item) => ({ type: 'community-post', id: item.id, title: item.title, text: item.body })));
  const items = sources.filter((item) => !q || `${item.title} ${item.text}`.toLowerCase().includes(q));
  return { body: { q, scope, items, results: items } };
}

function rebuildSearchIndex(context) {
  if (context.actor.role !== 'admin') return forbidden('DOKE_SEARCH_INDEX_REBUILD_FORBIDDEN');
  context.state.searchIndex = [
    ...context.state.serviceListings.map((item) => ({ type: 'service-listing', id: item.id, title: item.title })),
    ...context.state.publications.map((item) => ({ type: 'publication', id: item.id, title: item.title })),
    ...context.state.communityPosts.map((item) => ({ type: 'community-post', id: item.id, title: item.title }))
  ];
  return { body: { indexedCount: context.state.searchIndex.length, status: 'rebuilt' } };
}

function createSubscription({ state, actor, body }) {
  if (actor.role !== 'professional' && actor.role !== 'admin') return forbidden('DOKE_SUBSCRIPTION_CREATE_FORBIDDEN');
  const plan = state.plans.find((item) => item.id === body.planId);
  if (!plan) return notFound('DOKE_PLAN_NOT_FOUND');
  const subscription = { id: `subscription_${state.subscriptions.length + 1}`, userId: actor.user.id, planId: plan.id, status: 'active' };
  state.subscriptions.push(subscription);
  return { status: 201, body: { subscription } };
}

function boostServiceListing(context, id) {
  if (context.actor.role !== 'professional' && context.actor.role !== 'admin') return forbidden('DOKE_BOOST_CREATE_FORBIDDEN');
  const serviceListing = context.state.serviceListings.find((item) => item.id === id);
  if (!serviceListing) return notFound('DOKE_SERVICE_LISTING_NOT_FOUND');
  if (serviceListing.ownerId !== context.actor.user.id && context.actor.role !== 'admin') return forbidden('DOKE_BOOST_OWNER_REQUIRED');
  serviceListing.boostStatus = 'active';
  const boost = { id: `boost_${context.state.boosts.length + 1}`, targetType: 'service-listing', targetId: id, ownerId: context.actor.user.id, status: 'active' };
  context.state.boosts.push(boost);
  return { status: 201, body: { boost, serviceListing } };
}

function boostPublication(context, id) {
  if (context.actor.role !== 'professional' && context.actor.role !== 'admin') return forbidden('DOKE_BOOST_CREATE_FORBIDDEN');
  const publication = context.state.publications.find((item) => item.id === id);
  if (!publication) return notFound('DOKE_PUBLICATION_NOT_FOUND');
  if (publication.authorId !== context.actor.user.id && context.actor.role !== 'admin') return forbidden('DOKE_BOOST_OWNER_REQUIRED');
  publication.boostStatus = 'active';
  const boost = { id: `boost_${context.state.boosts.length + 1}`, targetType: 'publication', targetId: id, ownerId: context.actor.user.id, status: 'active' };
  context.state.boosts.push(boost);
  return { status: 201, body: { boost, publication } };
}

function forbidden(code) { return { status: 403, body: { error: { code, message: code } } }; }
function notFound(code) { return { status: 404, body: { error: { code, message: code } } }; }
function normalize(value) { return String(value || '/').replace(/\/+$/, '') || '/'; }
function shape(pathName) {
  return pathName
    .replace(/^\/media\/uploads\/[^/]+\/complete$/, '/media/uploads/:id/complete')
    .replace(/^\/moderation\/reports\/[^/]+\/resolve$/, '/moderation/reports/:id/resolve')
    .replace(/^\/service-listings\/[^/]+\/boost$/, '/service-listings/:id/boost')
    .replace(/^\/publications\/[^/]+\/boost$/, '/publications/:id/boost');
}
function readHeader(headers, name) {
  const direct = headers[name];
  if (direct) return Array.isArray(direct) ? direct[0] : direct;
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}
async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw);
}
function send(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, Object.assign({ 'content-type': 'application/json', 'content-length': Buffer.byteLength(payload) }, headers));
  res.end(payload);
}

module.exports = { createProductBetaE2ELocalServer };

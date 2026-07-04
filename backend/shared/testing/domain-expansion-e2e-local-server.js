'use strict';

const http = require('http');
const crypto = require('crypto');

const HOST = '127.0.0.1';
const IDEMPOTENCY_HEADER = 'x-idempotency-key';

function stableStringify(value) {
  if (!value || typeof value !== 'object') return JSON.stringify(value || null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
}

function hash(value) {
  return crypto.createHash('sha256').update(stableStringify(value || {})).digest('hex');
}

function createDomainExpansionE2ELocalServer(options = {}) {
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
        calls.push({ method, path: shape(pathName), rawPath: pathName, actorRole: actor.role, hasIdempotencyKey: Boolean(idempotencyKey) });
        const response = route({ method, pathName, body, actor, req, state, idempotency });
        send(res, response.status || 200, response.body || {}, response.headers || {});
      } catch (error) {
        send(res, error.statusCode || 500, { error: { code: error.code || 'DOKE_DOMAIN_EXPANSION_LOCAL_SERVER_ERROR', message: error.message } });
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
      name: 'domain-expansion-e2e-local-server',
      origin: origin ? 'http://127.0.0.1:<redacted>' : '',
      calls: calls.slice(),
      idempotencyEntryCount: idempotency.size,
      serviceListingCount: state.serviceListings.length,
      publicationCount: state.publications.length,
      communityPostCount: state.communityPosts.length,
      communityCommentCount: state.communityPosts.reduce((total, post) => total + post.comments.length, 0),
      communityReactionCount: state.communityPosts.reduce((total, post) => total + post.reactions.length, 0)
    };
  }

  return Object.freeze({ start, stop, getReport });
}

function createState() {
  const users = {
    client: { id: 'user_client_domain', role: 'client', email: 'client@doke.local', name: 'Cliente Domain' },
    professional: { id: 'user_professional_domain', role: 'professional', email: 'professional@doke.local', name: 'Profissional Domain' },
    admin: { id: 'user_admin_domain', role: 'admin', email: 'admin@doke.local', name: 'Admin Domain' }
  };
  return {
    users,
    profiles: {
      client: { id: 'profile_client_domain', userId: users.client.id, role: 'client', displayName: 'Cliente Domain' },
      professional: { id: 'profile_professional_domain', userId: users.professional.id, role: 'professional', displayName: 'Profissional Domain' },
      admin: { id: 'profile_admin_domain', userId: users.admin.id, role: 'admin', displayName: 'Admin Domain' }
    },
    serviceListings: [],
    publications: [],
    communityPosts: []
  };
}

function route(context) {
  const { method, pathName } = context;
  if (method === 'POST' && pathName === '/auth/login') return login(context);
  if (method === 'GET' && pathName === '/auth/session') return { body: { active: true, user: context.actor.user } };
  if (method === 'GET' && pathName === '/users/me') return { body: { user: context.actor.user } };
  if (method === 'GET' && pathName === '/profiles/me') return { body: { profile: context.actor.profile } };

  if (method === 'GET' && pathName === '/service-listings') return { body: { serviceListings: context.state.serviceListings, items: context.state.serviceListings } };
  if (method === 'POST' && pathName === '/service-listings') return idempotent(context, () => createServiceListing(context));
  const servicePatch = pathName.match(/^\/service-listings\/([^/]+)$/);
  if (method === 'PATCH' && servicePatch) return idempotent(context, () => patchServiceListing(context, servicePatch[1]));
  const servicePublish = pathName.match(/^\/service-listings\/([^/]+)\/publish$/);
  if (method === 'POST' && servicePublish) return idempotent(context, () => publishServiceListing(context, servicePublish[1]));

  if (method === 'GET' && pathName === '/publications') return { body: { publications: context.state.publications, items: context.state.publications } };
  if (method === 'POST' && pathName === '/publications') return idempotent(context, () => createPublication(context));
  const publicationPatch = pathName.match(/^\/publications\/([^/]+)$/);
  if (method === 'PATCH' && publicationPatch) return idempotent(context, () => patchPublication(context, publicationPatch[1]));
  const publicationPublish = pathName.match(/^\/publications\/([^/]+)\/publish$/);
  if (method === 'POST' && publicationPublish) return idempotent(context, () => publishPublication(context, publicationPublish[1]));

  if (method === 'GET' && pathName === '/community/posts') return { body: { posts: context.state.communityPosts, items: context.state.communityPosts } };
  if (method === 'POST' && pathName === '/community/posts') return idempotent(context, () => createCommunityPost(context));
  const communityComment = pathName.match(/^\/community\/posts\/([^/]+)\/comments$/);
  if (method === 'POST' && communityComment) return idempotent(context, () => createCommunityComment(context, communityComment[1]));
  const communityReaction = pathName.match(/^\/community\/posts\/([^/]+)\/reactions$/);
  if (method === 'POST' && communityReaction) return idempotent(context, () => createCommunityReaction(context, communityReaction[1]));

  return { status: 404, body: { error: { code: 'DOKE_DOMAIN_EXPANSION_ENDPOINT_NOT_FOUND', message: `${method} ${pathName}` } } };
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

function canOwn(actor, resource) {
  return actor.role === 'admin' || resource.ownerId === actor.user.id || resource.authorId === actor.user.id;
}

function createServiceListing({ state, actor, body }) {
  if (actor.role !== 'professional' && actor.role !== 'admin') return forbidden('DOKE_SERVICE_LISTING_CREATE_FORBIDDEN');
  const serviceListing = {
    id: `service_listing_${state.serviceListings.length + 1}`,
    ownerId: actor.user.id,
    title: body.title || 'Serviço local',
    category: body.category || 'assistencia-tecnica',
    priceCents: Number(body.priceCents || 0),
    status: 'draft'
  };
  state.serviceListings.push(serviceListing);
  return { status: 201, body: { serviceListing } };
}

function patchServiceListing({ state, actor, body }, id) {
  const serviceListing = state.serviceListings.find((item) => item.id === id);
  if (!serviceListing) return notFound('DOKE_SERVICE_LISTING_NOT_FOUND');
  if (!canOwn(actor, serviceListing)) return forbidden('DOKE_SERVICE_LISTING_UPDATE_FORBIDDEN');
  Object.assign(serviceListing, pick(body, ['title', 'category', 'priceCents']));
  return { body: { serviceListing } };
}

function publishServiceListing({ state, actor }, id) {
  const serviceListing = state.serviceListings.find((item) => item.id === id);
  if (!serviceListing) return notFound('DOKE_SERVICE_LISTING_NOT_FOUND');
  if (!canOwn(actor, serviceListing)) return forbidden('DOKE_SERVICE_LISTING_PUBLISH_FORBIDDEN');
  serviceListing.status = 'published';
  return { body: { serviceListing } };
}

function createPublication({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_PUBLICATION_CREATE_FORBIDDEN');
  const publication = {
    id: `publication_${state.publications.length + 1}`,
    authorId: actor.user.id,
    title: body.title || 'Publicação local',
    body: body.body || body.text || 'Conteúdo da publicação',
    status: 'draft'
  };
  state.publications.push(publication);
  return { status: 201, body: { publication } };
}

function patchPublication({ state, actor, body }, id) {
  const publication = state.publications.find((item) => item.id === id);
  if (!publication) return notFound('DOKE_PUBLICATION_NOT_FOUND');
  if (!canOwn(actor, publication)) return forbidden('DOKE_PUBLICATION_UPDATE_FORBIDDEN');
  Object.assign(publication, pick(body, ['title', 'body']));
  return { body: { publication } };
}

function publishPublication({ state, actor }, id) {
  const publication = state.publications.find((item) => item.id === id);
  if (!publication) return notFound('DOKE_PUBLICATION_NOT_FOUND');
  if (!canOwn(actor, publication)) return forbidden('DOKE_PUBLICATION_PUBLISH_FORBIDDEN');
  publication.status = 'published';
  return { body: { publication } };
}

function createCommunityPost({ state, actor, body }) {
  if (!actor.user) return forbidden('DOKE_COMMUNITY_POST_CREATE_FORBIDDEN');
  const post = {
    id: `community_post_${state.communityPosts.length + 1}`,
    authorId: actor.user.id,
    title: body.title || 'Post comunidade local',
    body: body.body || body.text || 'Conteúdo do post',
    comments: [],
    reactions: []
  };
  state.communityPosts.push(post);
  return { status: 201, body: { post } };
}

function createCommunityComment({ state, actor, body }, postId) {
  const post = state.communityPosts.find((item) => item.id === postId);
  if (!post) return notFound('DOKE_COMMUNITY_POST_NOT_FOUND');
  const comment = { id: `community_comment_${post.comments.length + 1}`, postId, authorId: actor.user.id, body: body.body || body.text || 'Comentário local' };
  post.comments.push(comment);
  return { status: 201, body: { comment } };
}

function createCommunityReaction({ state, actor, body }, postId) {
  const post = state.communityPosts.find((item) => item.id === postId);
  if (!post) return notFound('DOKE_COMMUNITY_POST_NOT_FOUND');
  const type = body.type || 'like';
  const existing = post.reactions.find((item) => item.actorId === actor.user.id && item.type === type);
  if (existing) return { body: { reaction: existing } };
  const reaction = { id: `community_reaction_${post.reactions.length + 1}`, postId, actorId: actor.user.id, type };
  post.reactions.push(reaction);
  return { status: 201, body: { reaction } };
}

function forbidden(code) { return { status: 403, body: { error: { code } } }; }
function notFound(code) { return { status: 404, body: { error: { code } } }; }
function pick(source, keys) { const out = {}; keys.forEach((key) => { if (Object.prototype.hasOwnProperty.call(source || {}, key)) out[key] = source[key]; }); return out; }
function normalize(pathName) { return (`/${String(pathName || '').replace(/^\/+/, '')}`).replace(/\/+$/, '') || '/'; }
function shape(pathName) {
  return pathName
    .replace(/^\/service-listings\/[^/]+\/publish$/, '/service-listings/:id/publish')
    .replace(/^\/service-listings\/[^/]+$/, '/service-listings/:id')
    .replace(/^\/publications\/[^/]+\/publish$/, '/publications/:id/publish')
    .replace(/^\/publications\/[^/]+$/, '/publications/:id')
    .replace(/^\/community\/posts\/[^/]+\/(comments|reactions)$/, '/community/posts/:id/$1');
}
function readHeader(headers, name) { return headers[String(name).toLowerCase()] || headers[name] || ''; }
function readBody(req) { return new Promise((resolve, reject) => { const chunks = []; req.on('data', (chunk) => chunks.push(chunk)); req.on('end', () => { const raw = Buffer.concat(chunks).toString('utf8'); if (!raw) return resolve({}); try { resolve(JSON.parse(raw)); } catch (error) { reject(Object.assign(error, { statusCode: 400 })); } }); req.on('error', reject); }); }
function send(res, status, payload, headers) { const body = JSON.stringify(payload || {}); res.writeHead(status, Object.assign({ 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) }, headers || {})); res.end(body); }

module.exports = { createDomainExpansionE2ELocalServer };

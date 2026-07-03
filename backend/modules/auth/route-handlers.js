'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const {
  readIdentityByUserId,
  readCurrentIdentity,
  updateCurrentUser,
  updateCurrentProfile,
  buildSessionPayload
} = require('./identity-service');

const routes = listRoutesByModule('auth');
const routeByName = (name) => findRouteByName(name);

const handlers = routes.reduce((index, route) => {
  index[route.handler] = notImplementedHandler(route);
  return index;
}, {});

handlers.login = createActionHandler(routeByName('auth.login'), {
  async execute({ context }) {
    const supabase = requireSupabase(context);
    const body = context.body || {};
    const email = String(body.email || body.login || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) throw badRequest('Email and password are required.');
    if (!supabase.auth || typeof supabase.auth.signInWithPassword !== 'function') {
      throw unavailable('Supabase auth signInWithPassword is not configured for this runtime.');
    }

    const response = await supabase.auth.signInWithPassword({ email, password });
    if (response && response.error) throw unauthorized(response.error.message || 'Invalid credentials.');
    const session = response && response.data && response.data.session || response && response.session || null;
    const authUser = response && response.data && response.data.user || response && response.user || null;
    let identityClient = supabase;
    const token = session && (session.access_token || session.accessToken);
    if (token && typeof context.createUserSupabaseClient === 'function') {
      identityClient = context.createUserSupabaseClient(`Bearer ${token}`);
    }
    const identity = await readIdentityByUserId(identityClient, authUser && authUser.id, authUser);
    return buildSessionPayload(session, identity);
  }
});

handlers.session = createActionHandler(routeByName('auth.session'), {
  async execute({ context, actor }) {
    const identity = await readCurrentIdentity(requireSupabase(context), actor);
    return buildSessionPayload({ access_token: readBearer(context.headers) }, identity);
  }
});

handlers.logout = createActionHandler(routeByName('auth.logout'), {
  async execute({ context }) {
    const supabase = requireSupabase(context);
    if (supabase.auth && typeof supabase.auth.signOut === 'function') {
      const response = await supabase.auth.signOut();
      if (response && response.error) throw response.error;
    }
    return { status: 'signed_out' };
  }
});

handlers.currentUser = createActionHandler(routeByName('users.current'), {
  async execute({ context, actor }) {
    const identity = await readCurrentIdentity(requireSupabase(context), actor);
    return { user: identity && identity.user || null };
  }
});

handlers.currentProfile = createActionHandler(routeByName('profiles.current'), {
  async execute({ context, actor }) {
    const identity = await readCurrentIdentity(requireSupabase(context), actor);
    return { profile: identity && identity.profile || null };
  }
});

handlers.updateCurrentUser = createActionHandler(routeByName('users.updateCurrent'), {
  async execute({ context, actor }) {
    const identity = await updateCurrentUser(requireSupabase(context), actor, context.body || {});
    return { user: identity && identity.user || null, profile: identity && identity.profile || null };
  }
});

handlers.updateCurrentProfile = createActionHandler(routeByName('profiles.updateCurrent'), {
  async execute({ context, actor }) {
    const identity = await updateCurrentProfile(requireSupabase(context), actor, context.body || {});
    return { user: identity && identity.user || null, profile: identity && identity.profile || null };
  }
});

function listRouteDefinitions() {
  return routes.slice();
}

function requireSupabase(context) {
  if (!context || !context.supabase) throw unavailable('Supabase user client is required for auth runtime handlers.');
  return context.supabase;
}

function readBearer(headers) {
  const key = Object.keys(headers || {}).find((candidate) => candidate.toLowerCase() === 'authorization');
  const value = key ? String(headers[key] || '') : '';
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
}

function badRequest(message) {
  const error = new Error(message || 'Invalid request.');
  error.code = 'DOKE_BAD_REQUEST';
  error.status = 400;
  return error;
}

function unauthorized(message) {
  const error = new Error(message || 'Unauthorized.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

function unavailable(message) {
  const error = new Error(message || 'Runtime dependency unavailable.');
  error.code = 'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  routes,
  handlers,
  listRouteDefinitions
});

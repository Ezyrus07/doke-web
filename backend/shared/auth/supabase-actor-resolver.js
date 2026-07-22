'use strict';

const { normalizeRole } = require('../security/backend-permission-contract');

function readHeader(headers, name) {
  const normalized = String(name || '').toLowerCase();
  const source = headers || {};
  const key = Object.keys(source).find((candidate) => candidate.toLowerCase() === normalized);
  return key ? source[key] : '';
}

function readBearerToken(headers) {
  const authorization = String(readHeader(headers, 'authorization') || '').trim();
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

function toGuestActor() {
  return Object.freeze({ id: null, role: 'guest', authenticated: false });
}

function toActor(authUser, appUser) {
  if (!authUser || !authUser.id) return toGuestActor();
  const role = normalizeRole(appUser && appUser.role || authUser.app_metadata && authUser.app_metadata.role || 'client');
  return Object.freeze({
    id: authUser.id,
    email: authUser.email || appUser && appUser.email || '',
    role,
    status: appUser && appUser.status || 'active',
    authenticated: true
  });
}

async function readAuthUser(supabase, token) {
  if (!supabase || !supabase.auth || typeof supabase.auth.getUser !== 'function') return null;
  const response = token ? await supabase.auth.getUser(token) : await supabase.auth.getUser();
  if (response && response.error) throw unauthorized(response.error.message || 'Invalid authentication token.');
  return response && response.data && response.data.user || response && response.user || null;
}

async function readAppUser(supabase, userId) {
  if (!supabase || !userId || typeof supabase.from !== 'function') return null;
  const response = await supabase
    .from('users')
    .select('id,email,role,status,created_at,updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

async function resolveSupabaseActor(options) {
  const headers = options && options.headers || {};
  const supabase = options && options.supabase || null;
  const token = readBearerToken(headers);
  if (!token && (!supabase || !supabase.auth)) return toGuestActor();
  const authUser = await readAuthUser(supabase, token);
  if (!authUser) return toGuestActor();
  const appUser = await readAppUser(supabase, authUser.id);
  return toActor(authUser, appUser);
}

function unauthorized(message) {
  const error = new Error(message || 'Authentication required.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

module.exports = Object.freeze({
  readHeader,
  readBearerToken,
  resolveSupabaseActor,
  toGuestActor,
  toActor
});

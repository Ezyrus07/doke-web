'use strict';

function normalizeRole(role) {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'provider') return 'professional';
  if (['client', 'professional', 'moderator', 'support', 'admin'].includes(value)) return value;
  return 'client';
}

function normalizeUser(row, authUser) {
  const source = row || {};
  const metadata = authUser && authUser.user_metadata || {};
  const id = source.id || authUser && authUser.id || '';
  return Object.freeze({
    id,
    email: source.email || authUser && authUser.email || '',
    role: normalizeRole(source.role || metadata.role),
    status: source.status || 'active',
    accountStatus: source.status || 'active',
    onboardingStatus: source.onboarding_status || 'not_started',
    onboardingCompletedAt: source.onboarding_completed_at || '',
    settings: source.settings && typeof source.settings === 'object' ? source.settings : {},
    createdAt: source.created_at || authUser && authUser.created_at || '',
    updatedAt: source.updated_at || ''
  });
}

function normalizeProfile(profileRow, user, professionalRow, clientRow) {
  const source = profileRow || {};
  const userId = source.user_id || user && user.id || '';
  const role = normalizeRole(user && user.role || source.role);
  const professional = professionalRow || {};
  const client = clientRow || {};
  const displayName = source.display_name || source.name || user && user.email || 'Doke';
  const publicUrl = role === 'professional' ? 'perfil.html' : 'perfil-cliente.html';
  const ownerUrl = role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html';

  return Object.freeze({
    id: source.id || userId,
    userId,
    role,
    type: role,
    name: displayName,
    displayName,
    handle: source.username || source.handle || '',
    username: source.username || '',
    avatarUrl: source.avatar_url || source.avatarUrl || '',
    avatar: source.avatar_url || source.avatar || '',
    coverUrl: source.cover_url || source.coverUrl || '',
    city: source.city || '',
    state: source.state || '',
    country: source.country || 'BR',
    location: [source.city, source.state].filter(Boolean).join(', '),
    bio: source.bio || '',
    interests: Array.isArray(source.interests) ? source.interests : [],
    profession: professional.headline || source.profession || '',
    headline: professional.headline || source.headline || '',
    documentStatus: professional.document_status || '',
    serviceRadiusKm: professional.service_radius_km || null,
    rating: Number(professional.average_rating || client.average_rating || 0),
    reviewsCount: Number(professional.reviews_count || 0),
    completedOrdersCount: Number(professional.completed_orders_count || 0),
    ordersCount: Number(client.orders_count || 0),
    publicUrl,
    ownerUrl,
    createdAt: source.created_at || '',
    updatedAt: source.updated_at || ''
  });
}

async function maybeSingle(query) {
  const response = await query.maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data || null;
}

async function readUserRow(supabase, userId) {
  if (!supabase || !userId || typeof supabase.from !== 'function') return null;
  return maybeSingle(supabase
    .from('users')
    .select('id,email,role,status,onboarding_status,onboarding_completed_at,settings,created_at,updated_at')
    .eq('id', userId));
}

async function readProfileRow(supabase, userId) {
  if (!supabase || !userId || typeof supabase.from !== 'function') return null;
  return maybeSingle(supabase
    .from('user_profiles')
    .select('user_id,display_name,username,avatar_url,city,state,country,bio,interests,created_at,updated_at')
    .eq('user_id', userId));
}

async function readProfessionalRow(supabase, userId) {
  if (!supabase || !userId || typeof supabase.from !== 'function') return null;
  return maybeSingle(supabase
    .from('professional_profiles')
    .select('user_id,headline,document_status,service_radius_km,average_rating,reviews_count,completed_orders_count,updated_at')
    .eq('user_id', userId));
}

async function readClientRow(supabase, userId) {
  if (!supabase || !userId || typeof supabase.from !== 'function') return null;
  return maybeSingle(supabase
    .from('client_profiles')
    .select('user_id,orders_count,average_rating,updated_at')
    .eq('user_id', userId));
}

async function readCurrentAuthUser(supabase) {
  if (!supabase || !supabase.auth || typeof supabase.auth.getUser !== 'function') return null;
  const response = await supabase.auth.getUser();
  if (response && response.error) throw response.error;
  return response && response.data && response.data.user || response && response.user || null;
}

async function readIdentityByUserId(supabase, userId, authUser) {
  if (!userId) return null;
  const [userRow, profileRow, professionalRow, clientRow] = await Promise.all([
    readUserRow(supabase, userId),
    readProfileRow(supabase, userId),
    readProfessionalRow(supabase, userId).catch(() => null),
    readClientRow(supabase, userId).catch(() => null)
  ]);
  const user = normalizeUser(userRow, authUser || { id: userId });
  const profile = normalizeProfile(profileRow, user, professionalRow, clientRow);
  return Object.freeze({ user, profile });
}

async function readCurrentIdentity(supabase, actor) {
  const authUser = await readCurrentAuthUser(supabase).catch(() => null);
  const userId = actor && actor.id || authUser && authUser.id || '';
  return readIdentityByUserId(supabase, userId, authUser);
}

async function updateCurrentUser(supabase, actor, patch) {
  if (!actor || !actor.id) throw unauthorized();
  const payload = normalizeUserPatch(patch);
  if (!Object.keys(payload).length) return readCurrentIdentity(supabase, actor);
  const response = await supabase
    .from('users')
    .update(payload)
    .eq('id', actor.id)
    .select('id,email,role,status,onboarding_status,onboarding_completed_at,settings,created_at,updated_at')
    .maybeSingle();
  if (response && response.error) throw response.error;
  return readCurrentIdentity(supabase, actor);
}

async function updateCurrentProfile(supabase, actor, patch) {
  if (!actor || !actor.id) throw unauthorized();
  const payload = normalizeProfilePatch(patch);
  if (!Object.keys(payload).length) return readCurrentIdentity(supabase, actor);
  const response = await supabase
    .from('user_profiles')
    .update(payload)
    .eq('user_id', actor.id)
    .select('user_id,display_name,username,avatar_url,city,state,country,bio,interests,created_at,updated_at')
    .maybeSingle();
  if (response && response.error) throw response.error;
  return readCurrentIdentity(supabase, actor);
}

function normalizeUserPatch(patch) {
  const source = patch || {};
  const payload = {};
  if (typeof source.email === 'string') payload.email = source.email.trim().toLowerCase();
  if (typeof source.status === 'string') payload.status = source.status.trim().toLowerCase();
  if (typeof source.onboardingStatus === 'string') payload.onboarding_status = source.onboardingStatus.trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(source, 'onboardingCompletedAt')) payload.onboarding_completed_at = source.onboardingCompletedAt || null;
  if (source.settings && typeof source.settings === 'object' && !Array.isArray(source.settings)) payload.settings = source.settings;
  return payload;
}

function normalizeProfilePatch(patch) {
  const source = patch || {};
  const map = {
    displayName: 'display_name',
    name: 'display_name',
    username: 'username',
    handle: 'username',
    avatarUrl: 'avatar_url',
    avatar: 'avatar_url',
    city: 'city',
    state: 'state',
    country: 'country',
    bio: 'bio'
  };
  const payload = Object.keys(map).reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[map[key]] = source[key] == null ? null : String(source[key]).trim();
    }
    return result;
  }, {});
  if (Object.prototype.hasOwnProperty.call(source, 'interests')) {
    const interests = Array.isArray(source.interests) ? source.interests : String(source.interests || '').split(',');
    payload.interests = interests.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 8);
  }
  return payload;
}

function buildSessionPayload(session, identity) {
  const user = identity && identity.user || null;
  const profile = identity && identity.profile || null;
  return Object.freeze({
    session: Object.freeze({
      provider: 'api',
      token: session && (session.access_token || session.accessToken) || '',
      accessToken: session && (session.access_token || session.accessToken) || '',
      refreshToken: session && (session.refresh_token || session.refreshToken) || '',
      expiresAt: session && (session.expires_at || session.expiresAt) || '',
      sessionStatus: user ? 'active' : 'anonymous',
      user,
      profile
    }),
    user,
    profile
  });
}

function unauthorized() {
  const error = new Error('Authentication required.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

module.exports = Object.freeze({
  normalizeUser,
  normalizeProfile,
  readIdentityByUserId,
  readCurrentIdentity,
  updateCurrentUser,
  updateCurrentProfile,
  buildSessionPayload
});

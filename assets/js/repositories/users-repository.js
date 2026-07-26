/* Doke Users Repository
   Responsibility: read and normalize legacy local profile fixtures that remain required by UI transitions.
   Authentication, registration and password authority belong exclusively to Supabase Auth. */
(function () {
  'use strict';

  const ns = window.DokeAuth || (window.DokeAuth = {});
  const repositories = ns.repositories || (ns.repositories = {});

  const STORAGE_KEY = 'doke.auth.users.v1';
  const LEGACY_PROFILE_STORAGE_KEY = 'doke.auth.userProfiles.v1';

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const withoutCredentials = (user) => {
    if (!user || typeof user !== 'object') return user;
    const {
      password,
      passwordHash,
      ...safeUser
    } = user;
    return safeUser;
  };

  const DEMO_IDENTIFIERS = new Set(['user_cliente_demo', 'user_profissional_demo', 'user_suporte_demo']);
  const isDemoUser = (user) => {
    const email = String(user?.email || '').trim().toLowerCase();
    return DEMO_IDENTIFIERS.has(String(user?.id || '')) || email.endsWith('@doke.local') || email === 'client@doke' || email === 'pro@doke';
  };

  const readLocalUsers = () => {
    const items = safeParse(window.localStorage.getItem(STORAGE_KEY), []);
    const clean = Array.isArray(items)
      ? items.filter((user) => !isDemoUser(user)).map(withoutCredentials)
      : [];
    if (JSON.stringify(items) !== JSON.stringify(clean)) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    }
    return clean;
  };

  const readLegacyProfiles = () => safeParse(window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY), {});

  const writeLocalUsers = (users) => {
    const safeUsers = Array.isArray(users) ? users.map(withoutCredentials) : [];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUsers));
  };

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');
  const RESERVED_HANDLES = Object.freeze(['admin', 'administrador', 'doke', 'suporte', 'support', 'moderador', 'moderator', 'root', 'sistema', 'system']);

  const normalizeHandle = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]+/g, '')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 30);

  const isValidHandle = (value) => {
    const handle = normalizeHandle(value);
    return /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/.test(handle) && !RESERVED_HANDLES.includes(handle);
  };

  const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

  const getInitials = (name) => {
    const parts = normalizeText(name).split(' ').filter(Boolean).slice(0, 2);
    if (!parts.length) return 'DK';
    return parts.map((part) => part.charAt(0).toUpperCase()).join('');
  };

  const slugify = (value) => normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 28);

  const normalizeRole = (role) => {
    const value = String(role || '').trim().toLowerCase();
    if (value === 'professional' || value === 'pro' || value === 'worker') return 'professional';
    if (value === 'support' || value === 'admin' || value === 'moderator') return value;
    return 'client';
  };

  const generateId = (prefix = 'user') => {
    if (window.crypto?.randomUUID) return `${prefix}_${window.crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  };

  const normalizeProfile = (profile, user) => {
    if (!profile || typeof profile !== 'object') return null;
    const role = normalizeRole(profile.role || profile.type || user?.role || user?.type);
    const name = normalizeText(profile.name || profile.displayName || user?.name || 'Perfil Doke');
    const initials = profile.initials || profile.avatarInitials || user?.initials || user?.avatarInitials || getInitials(name);

    return {
      id: profile.id || profile.profileId || profile.providerProfileId || user?.providerProfileId || user?.id || generateId('profile'),
      userId: profile.userId || profile.ownerId || user?.id || '',
      role,
      type: profile.type || role,
      name,
      handle: normalizeHandle(profile.handle || user?.handle || slugify(name) || 'perfil-doke'),
      initials,
      avatarInitials: initials,
      avatar: profile.avatar || profile.avatarUrl || user?.avatar || user?.avatarUrl || '',
      avatarUrl: profile.avatarUrl || profile.avatar || user?.avatarUrl || user?.avatar || '',
      coverUrl: profile.coverUrl || profile.cover || user?.coverUrl || '',
      headline: profile.headline || profile.profession || user?.profession || '',
      profession: profile.profession || profile.headline || user?.profession || '',
      bio: profile.bio || user?.bio || '',
      interests: Array.isArray(profile.interests || user?.interests) ? (profile.interests || user.interests).map((item) => normalizeText(item)).filter(Boolean).slice(0, 8) : [],
      city: profile.city || user?.city || '',
      state: profile.state || user?.state || '',
      rating: Number.isFinite(Number(profile.rating)) ? Number(profile.rating) : Number.isFinite(Number(user?.rating)) ? Number(user.rating) : 0,
      verified: profile.verified === true || user?.verified === true,
      metrics: profile.metrics && typeof profile.metrics === 'object' ? profile.metrics : {},
      publicUrl: profile.publicUrl || profile.publicProfileUrl || '',
      ownerUrl: profile.ownerUrl || profile.ownerProfileUrl || '',
      createdAt: profile.createdAt || user?.createdAt || '',
      updatedAt: profile.updatedAt || ''
    };
  };

  const normalizeUser = (rawUser) => {
    if (!rawUser || typeof rawUser !== 'object') return null;
    const user = withoutCredentials(rawUser);
    const role = normalizeRole(user.role || user.type);
    const name = normalizeText(user.name || user.displayName || user.email || 'Usuário Doke');
    const initials = user.initials || user.avatarInitials || getInitials(name);

    const profileSource = user.profile || user.activeProfile || (user.id && (user.handle || user.city || user.state || user.bio || user.interests || user.avatarUrl || user.coverUrl)
      ? {
          id: user.providerProfileId || user.id,
          userId: user.id,
          name,
          handle: user.handle,
          city: user.city,
          state: user.state,
          bio: user.bio,
          interests: user.interests,
          avatarUrl: user.avatarUrl || user.avatar,
          coverUrl: user.coverUrl,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      : null);
    const profile = normalizeProfile(profileSource, { ...user, name, role, initials });

    return {
      ...user,
      id: user.id || generateId(role === 'professional' ? 'pro' : 'user'),
      name,
      displayName: name,
      email: normalizeEmail(user.email),
      phone: normalizePhone(user.phone),
      role,
      type: role,
      handle: normalizeHandle(user.handle || user.username || profile?.handle || slugify(name) || 'usuario-doke'),
      username: normalizeHandle(user.handle || user.username || profile?.handle || slugify(name) || 'usuario-doke'),
      initials,
      avatarInitials: initials,
      avatar: profile?.avatarUrl || user.avatarUrl || user.avatar || '',
      avatarUrl: profile?.avatarUrl || user.avatarUrl || user.avatar || '',
      city: user.city || profile?.city || '',
      state: user.state || profile?.state || '',
      bio: user.bio || profile?.bio || '',
      coverUrl: profile?.coverUrl || user.coverUrl || '',
      profession: user.profession || profile?.profession || profile?.headline || '',
      onboardingStatus: ['not_started', 'in_progress', 'completed'].includes(user.onboardingStatus) ? user.onboardingStatus : '',
      onboardingCompletedAt: user.onboardingCompletedAt || '',
      profile,
      profiles: Array.isArray(user.profiles) ? user.profiles.map((item) => normalizeProfile(item, user)).filter(Boolean) : profile ? [profile] : [],
      providerProfileId: user.providerProfileId || profile?.id || '',
      publicProfileUrl: user.publicProfileUrl || profile?.publicUrl || (role === 'professional' ? 'perfil.html' : 'perfil-cliente.html'),
      ownerProfileUrl: user.ownerProfileUrl || profile?.ownerUrl || (role === 'professional' ? 'perfil-profissional.html' : 'meu-perfil.html'),
      points: Number.isFinite(Number(user.points)) ? Number(user.points) : 0,
      createdAt: user.createdAt || user.creatédAt || new Date().toISOString()
    };
  };

  const toPublicUser = (user) => withoutCredentials(normalizeUser(user));

  const loadSeededUsers = async () => [];

  const list = async () => {
    const seeded = await loadSeededUsers();
    let local = readLocalUsers().map(normalizeUser).filter(Boolean);
    const legacyProfiles = readLegacyProfiles();

    if (legacyProfiles && Object.keys(legacyProfiles).length) {
      const localById = new Map(local.map((user) => [String(user.id), user]));
      Object.keys(legacyProfiles).forEach((userId) => {
        const base = localById.get(String(userId)) || seeded.find((user) => String(user.id) === String(userId));
        if (!base) return;
        localById.set(String(userId), normalizeUser({
          ...base,
          profile: { ...(base.profile || {}), ...legacyProfiles[userId], userId: String(userId) }
        }));
      });
      local = Array.from(localById.values()).filter(Boolean);
      writeLocalUsers(local);
      window.localStorage.removeItem(LEGACY_PROFILE_STORAGE_KEY);
    }

    const byEmail = new Map();
    seeded.concat(local).forEach((user) => {
      const key = user.email || user.id;
      if (!key) return;
      byEmail.set(key, user);
    });

    return Array.from(byEmail.values());
  };

  const findByLogin = async (login) => {
    const normalizedEmail = normalizeEmail(login);
    const normalizedPhone = normalizePhone(login);
    const normalizedHandle = normalizeHandle(login);
    const users = await list();

    return users.find((user) => {
      if (normalizedEmail && user.email === normalizedEmail) return true;
      if (normalizedPhone && user.phone === normalizedPhone) return true;
      if (normalizedHandle && normalizeHandle(user.handle || user.profile?.handle) === normalizedHandle) return true;
      return false;
    }) || null;
  };

  const findById = async (id) => {
    const users = await list();
    return users.find((user) => user.id === id) || null;
  };

  const findByHandle = async (value) => {
    const handle = normalizeHandle(value);
    if (!handle) return null;
    const users = await list();
    return users.find((user) => normalizeHandle(user.handle || user.profile?.handle) === handle) || null;
  };

  const isHandleAvailable = async (value, exceptUserId) => {
    const handle = normalizeHandle(value);
    if (!isValidHandle(handle)) return false;
    const existing = await findByHandle(handle);
    return !existing || String(existing.id) === String(exceptUserId || '');
  };

  const getCurrentSettings = async (userId) => {
    const user = await findById(String(userId || '').trim());
    return user && user.settings && typeof user.settings === 'object' ? user.settings : {};
  };

  repositories.users = Object.freeze({
    STORAGE_KEY,
    LEGACY_PROFILE_STORAGE_KEY,
    list,
    findByLogin,
    findById,
    findByHandle,
    isHandleAvailable,
    getCurrentSettings,
    isEmail,
    normalizeEmail,
    normalizePhone,
    normalizeHandle,
    isValidHandle,
    normalizeProfile,
    toPublicUser
  });
})();

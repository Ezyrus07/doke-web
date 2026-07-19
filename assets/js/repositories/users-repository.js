/* Doke Users Repository
   Responsibility: read seeded mock users and locally-created users.
   This is the only data access layer for mock authentication. */
(function () {
  'use strict';

  const ns = window.DokeAuth || (window.DokeAuth = {});
  const repositories = ns.repositories || (ns.repositories = {});

  const STORAGE_KEY = 'doke.auth.users.v1';
  const LEGACY_PROFILE_STORAGE_KEY = 'doke.auth.userProfiles.v1';
  const MOCK_USERS_URL = 'assets/data/mock-users.json';
  const MOCK_USERS_URL_FROM_AUTH = '../assets/data/mock-users.json';

  const DEMO_PASSWORD_HASH = 'ef797c8118f02dfb649607dd5d3f8c7623048c9cfc7b91e5a14ee9c9b49e95ac';
  const FALLBACK_USERS = Object.freeze([]);

  let seededUsersPromise = null;

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const PROFESSIONAL_PROFILES_STORAGE_KEY = 'doke.professionalProfiles.v1';
  const PROFESSIONAL_VERIFICATIONS_STORAGE_KEY = 'doke.professionalIdentityVerifications.v1';

  const DEMO_IDENTIFIERS = new Set(['user_cliente_demo', 'user_profissional_demo', 'user_suporte_demo']);
  const isDemoUser = (user) => {
    const email = String(user?.email || '').trim().toLowerCase();
    return DEMO_IDENTIFIERS.has(String(user?.id || '')) || email.endsWith('@doke.local') || email === 'client@doke' || email === 'pro@doke';
  };
  const readLocalUsers = () => {
    const items = safeParse(window.localStorage.getItem(STORAGE_KEY), []);
    const clean = Array.isArray(items) ? items.filter((user) => !isDemoUser(user)) : [];
    if (JSON.stringify(items) !== JSON.stringify(clean)) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    return clean;
  };
  const readLegacyProfiles = () => safeParse(window.localStorage.getItem(LEGACY_PROFILE_STORAGE_KEY), {});

  const newestByTimestamp = (items) => items.slice().sort((a, b) => {
    const aTime = String(a?.updatedAt || a?.submittedAt || a?.createdAt || '');
    const bTime = String(b?.updatedAt || b?.submittedAt || b?.createdAt || '');
    return bTime.localeCompare(aTime);
  })[0] || null;

  const reconcileProfessionalUser = (user) => {
    if (!user || !user.id || user.role === 'support' || user.role === 'admin') return user;
    const profiles = safeParse(window.localStorage.getItem(PROFESSIONAL_PROFILES_STORAGE_KEY), []);
    const verifications = safeParse(window.localStorage.getItem(PROFESSIONAL_VERIFICATIONS_STORAGE_KEY), []);
    if (!Array.isArray(profiles) || !Array.isArray(verifications)) return user;

    const profileCandidates = profiles.filter((item) => String(item?.userId || item?.ownerId || '') === String(user.id));
    const verificationCandidates = verifications.filter((item) => String(item?.userId || '') === String(user.id));
    const profile = newestByTimestamp(profileCandidates);
    const verification = newestByTimestamp(verificationCandidates);
    const verificationStatus = String(verification?.status || '').toLowerCase();
    if (!profile || verificationStatus !== 'verified') return user;

    const profileStatus = String(profile.status || '').toLowerCase();
    if (profileStatus === 'draft' || profileStatus === 'suspended') return user;

    let repairedProfile = profile;
    if (profileStatus === 'pending_verification' || String(profile.verificationStatus || '').toLowerCase() !== 'verified') {
      const now = new Date().toISOString();
      repairedProfile = {
        ...profile,
        status: profileStatus === 'pending_verification' ? 'active' : profile.status,
        verificationStatus: 'verified',
        updatedAt: now,
        completedAt: profile.completedAt || now
      };
      const profileIndex = profiles.findIndex((item) => String(item?.id || '') === String(profile.id || ''));
      if (profileIndex >= 0) {
        profiles[profileIndex] = repairedProfile;
        window.localStorage.setItem(PROFESSIONAL_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
      }
    }

    if (String(repairedProfile.status || '').toLowerCase() !== 'active') return user;
    return normalizeUser({
      ...user,
      role: 'professional',
      type: 'professional',
      professionalProfileId: repairedProfile.id,
      publicProfileUrl: 'perfil.html',
      ownerProfileUrl: 'perfil-profissional.html'
    });
  };

  const writeLocalUsers = (users) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(users) ? users : []));
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

  const hashPassword = async (password) => {
    const value = String(password || '');
    if (window.crypto?.subtle && window.TextEncoder) {
      const payload = new TextEncoder().encode(value);
      const buffer = await window.crypto.subtle.digest('SHA-256', payload);
      return Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
    }

    // Fallback is intentionally only for local mock auth in older browsers/file mode.
    return `plain:${value}`;
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

  const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
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

  const toPublicUser = (user) => {
    const normalized = normalizeUser(user);
    if (!normalized) return null;

    const {
      password,
      passwordHash,
      ...publicUser
    } = normalized;

    return publicUser;
  };

  const getMockUrl = () => window.location.pathname.includes('/auth/')
    ? MOCK_USERS_URL_FROM_AUTH
    : MOCK_USERS_URL;

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

    const reconciled = Array.from(byEmail.values()).map(reconcileProfessionalUser);
    const localById = new Map(local.map((user) => [String(user.id), user]));
    let localChanged = false;
    reconciled.forEach((user) => {
      const previous = localById.get(String(user.id));
      if (!previous || previous.role !== user.role || previous.professionalProfileId !== user.professionalProfileId) {
        if (previous || user.role === 'professional') {
          localById.set(String(user.id), user);
          localChanged = true;
        }
      }
    });
    if (localChanged) writeLocalUsers(Array.from(localById.values()));
    return reconciled;
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

  const create = async (payload) => {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const role = 'client';
    const handle = normalizeHandle(payload.handle);
    const password = String(payload.password || '');

    if (name.length < 3) throw new Error('Informe um nome mais completo.');
    if (!isValidHandle(handle)) throw new Error('Escolha um usuário válido com 3 a 30 caracteres.');
    if (!isEmail(email)) throw new Error('Digite um e-mail válido.');
    if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');

    const users = await list();
    if (users.some((user) => user.email === email)) {
      throw new Error('Já existe uma conta com esse e-mail.');
    }

    if (users.some((user) => normalizeHandle(user.handle || user.profile?.handle) === handle)) {
      throw new Error('Esse usuário já está em uso. Escolha outro.');
    }

    if (phone && users.some((user) => user.phone === phone)) {
      throw new Error('Já existe uma conta com esse telefone.');
    }

    const user = normalizeUser({
      id: generateId(role === 'professional' ? 'pro' : 'user'),
      name,
      email,
      phone,
      role,
      type: role,
      handle,
      onboardingStatus: 'in_progress',
      passwordHash: await hashPassword(password),
      createdAt: new Date().toISOString()
    });

    const localUsers = readLocalUsers().map(normalizeUser).filter(Boolean);
    localUsers.push(user);
    writeLocalUsers(localUsers);

    return user;
  };


  const updateCurrentUser = async (userId, patch) => {
    const id = String(userId || '').trim();
    if (!id) throw new Error('Usuário atual não encontrado para atualização.');
    const current = await findById(id);
    if (!current) throw new Error('Conta não encontrada para atualização.');

    const localUsers = readLocalUsers().map(normalizeUser).filter(Boolean);
    const index = localUsers.findIndex((user) => user.id === id);
    const nextUser = normalizeUser({
      ...current,
      ...(patch || {}),
      id,
      updatedAt: new Date().toISOString()
    });

    if (index >= 0) localUsers[index] = nextUser;
    else localUsers.push(nextUser);
    writeLocalUsers(localUsers);
    return nextUser;
  };

  const updateCurrentProfile = async (userId, patch, sessionUser) => {
    const id = String(userId || '').trim();
    if (!id) throw new Error('Usuário atual não encontrado para atualizar perfil.');
    const current = await findById(id) || normalizeUser({ ...(sessionUser || {}), id });
    if (!current) throw new Error('Conta não encontrada para atualizar perfil.');

    const nextHandle = normalizeHandle(patch?.handle || current.handle || current.profile?.handle);
    if (!isValidHandle(nextHandle)) throw new Error('Escolha um usuário válido com 3 a 30 caracteres.');
    if (!await isHandleAvailable(nextHandle, id)) throw new Error('Esse usuário já está em uso. Escolha outro.');

    const nextName = normalizeText(patch?.name || current.name);
    const nextProfile = normalizeProfile({
      ...(current.profile || {}),
      ...(patch || {}),
      userId: id,
      name: nextName,
      handle: nextHandle,
      updatedAt: new Date().toISOString()
    }, current);

    return updateCurrentUser(id, {
      name: nextName,
      handle: nextHandle,
      profile: nextProfile
    });
  };

  const getCurrentSettings = async (userId) => {
    const user = await findById(String(userId || '').trim());
    return user && user.settings && typeof user.settings === 'object' ? user.settings : {};
  };

  const updateCurrentSettings = async (userId, settings) => updateCurrentUser(userId, {
    settings: settings && typeof settings === 'object' ? settings : {}
  });

  const updatePassword = async (userId, password) => {
    const localUsers = readLocalUsers().map(normalizeUser).filter(Boolean);
    const index = localUsers.findIndex((user) => user.id === userId);

    if (index === -1) {
      const seeded = await findById(userId);
      if (!seeded) throw new Error('Conta não encontrada para redefinição.');

      localUsers.push({
        ...seeded,
        passwordHash: await hashPassword(password),
        updatedAt: new Date().toISOString()
      });
      writeLocalUsers(localUsers);
      return localUsers[localUsers.length - 1];
    }

    localUsers[index].passwordHash = await hashPassword(password);
    localUsers[index].updatedAt = new Date().toISOString();
    writeLocalUsers(localUsers);
    return localUsers[index];
  };

  repositories.users = Object.freeze({
    STORAGE_KEY,
    LEGACY_PROFILE_STORAGE_KEY,
    list,
    findByLogin,
    findById,
    findByHandle,
    isHandleAvailable,
    create,
    updateCurrentUser,
    updateCurrentProfile,
    getCurrentSettings,
    updateCurrentSettings,
    updatePassword,
    hashPassword,
    isEmail,
    normalizeEmail,
    normalizePhone,
    normalizeHandle,
    isValidHandle,
    normalizeProfile,
    toPublicUser
  });
})();

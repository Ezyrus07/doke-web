/* Doke Users Repository
   Responsibility: read seeded mock users and locally-created users.
   This is the only data access layer for mock authentication. */
(function () {
  'use strict';

  const ns = window.DokeAuth || (window.DokeAuth = {});
  const repositories = ns.repositories || (ns.repositories = {});

  const STORAGE_KEY = 'doke.auth.users.v1';
  const PROFILE_STORAGE_KEY = 'doke.auth.userProfiles.v1';
  const MOCK_USERS_URL = 'assets/data/mock-users.json';
  const MOCK_USERS_URL_FROM_AUTH = '../assets/data/mock-users.json';

  const DEMO_PASSWORD_HASH = 'ef797c8118f02dfb649607dd5d3f8c7623048c9cfc7b91e5a14ee9c9b49e95ac';
  const FALLBACK_USERS = Object.freeze([
    {
      id: 'user_cliente_demo',
      name: 'Cliente Doke',
      email: 'cliente@doke.local',
      role: 'client',
      type: 'client',
      avatarInitials: 'CD',
      initials: 'CD',
      handle: 'cliente-demo',
      city: 'Salvador',
      state: 'BA',
      points: 230,
      verified: true,
      passwordHash: DEMO_PASSWORD_HASH
    },
    {
      id: 'user_profissional_demo',
      name: 'Profissional Doke',
      email: 'pro@doke.local',
      role: 'professional',
      type: 'professional',
      avatarInitials: 'PD',
      initials: 'PD',
      handle: 'pro-demo',
      city: 'Salvador',
      state: 'BA',
      points: 420,
      verified: true,
      profession: 'Pintor residencial',
      passwordHash: DEMO_PASSWORD_HASH
    }
    ,
    {
      id: 'user_suporte_demo',
      name: 'Suporte Doke',
      email: 'suporte@doke.local',
      role: 'support',
      type: 'support',
      avatarInitials: 'SD',
      initials: 'SD',
      handle: 'suporte-demo',
      city: 'Salvador',
      state: 'BA',
      points: 0,
      verified: true,
      isMockSupport: true,
      mockSupport: true,
      passwordHash: DEMO_PASSWORD_HASH
    }
  ]);

  let seededUsersPromise = null;

  const safeParse = (value, fallback) => {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const readLocalUsers = () => safeParse(window.localStorage.getItem(STORAGE_KEY), []);
  const readLocalProfiles = () => safeParse(window.localStorage.getItem(PROFILE_STORAGE_KEY), {});

  const writeLocalUsers = (users) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(users) ? users : []));
  };

  const writeLocalProfiles = (profiles) => {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles && typeof profiles === 'object' ? profiles : {}));
  };

  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '');
  const normalizeText = (value) => String(value || '').trim().replace(/\s+/g, ' ');

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
      handle: profile.handle || user?.handle || slugify(name) || 'perfil-doke',
      initials,
      avatarInitials: initials,
      avatar: profile.avatar || profile.avatarUrl || user?.avatar || user?.avatarUrl || '',
      avatarUrl: profile.avatarUrl || profile.avatar || user?.avatarUrl || user?.avatar || '',
      coverUrl: profile.coverUrl || profile.cover || user?.coverUrl || '',
      headline: profile.headline || profile.profession || user?.profession || '',
      profession: profile.profession || profile.headline || user?.profession || '',
      bio: profile.bio || user?.bio || '',
      city: profile.city || user?.city || '',
      state: profile.state || user?.state || '',
      rating: Number.isFinite(Number(profile.rating)) ? Number(profile.rating) : Number.isFinite(Number(user?.rating)) ? Number(user.rating) : 0,
      verified: profile.verified === true || user?.verified === true,
      metrics: profile.metrics && typeof profile.metrics === 'object' ? profile.metrics : {},
      publicUrl: profile.publicUrl || profile.publicProfileUrl || '',
      ownerUrl: profile.ownerUrl || profile.ownerProfileUrl || '',
      updatedAt: profile.updatedAt || ''
    };
  };

  const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
    const role = normalizeRole(user.role || user.type);
    const name = normalizeText(user.name || user.displayName || user.email || 'Usuário Doke');
    const initials = user.initials || user.avatarInitials || getInitials(name);

    const localProfiles = readLocalProfiles();
    const savedProfile = user.id ? localProfiles[user.id] : null;
    const profile = normalizeProfile(user.profile || user.activeProfile || savedProfile, { ...user, name, role, initials });

    return {
      ...user,
      id: user.id || generateId(role === 'professional' ? 'pro' : 'user'),
      name,
      email: normalizeEmail(user.email),
      phone: normalizePhone(user.phone),
      role,
      type: role,
      handle: user.handle || profile?.handle || slugify(name) || 'usuario-doke',
      initials,
      avatarInitials: initials,
      avatar: user.avatar || user.avatarUrl || profile?.avatarUrl || '',
      avatarUrl: user.avatarUrl || user.avatar || profile?.avatarUrl || '',
      city: user.city || profile?.city || '',
      state: user.state || profile?.state || '',
      bio: user.bio || profile?.bio || '',
      coverUrl: user.coverUrl || profile?.coverUrl || '',
      profession: user.profession || profile?.profession || profile?.headline || '',
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

  const loadSeededUsers = async () => {
    if (seededUsersPromise) return seededUsersPromise;

    seededUsersPromise = fetch(getMockUrl(), { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((users) => Array.isArray(users) ? users.map(normalizeUser).filter(Boolean) : [])
      .catch(() => FALLBACK_USERS.map(normalizeUser).filter(Boolean));

    return seededUsersPromise;
  };

  const list = async () => {
    const seeded = await loadSeededUsers();
    const local = readLocalUsers().map(normalizeUser).filter(Boolean);
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
    const users = await list();

    return users.find((user) => {
      if (normalizedEmail && user.email === normalizedEmail) return true;
      if (normalizedPhone && user.phone === normalizedPhone) return true;
      return false;
    }) || null;
  };

  const findById = async (id) => {
    const users = await list();
    return users.find((user) => user.id === id) || null;
  };

  const create = async (payload) => {
    const name = normalizeText(payload.name);
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const role = normalizeRole(payload.role);
    const password = String(payload.password || '');

    if (name.length < 3) throw new Error('Informe um nome mais completo.');
    if (!isEmail(email)) throw new Error('Digite um e-mail válido.');
    if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');

    const users = await list();
    if (users.some((user) => user.email === email)) {
      throw new Error('Já existe uma conta com esse e-mail.');
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
      handle: `${slugify(name) || 'usuario'}-${Math.floor(Math.random() * 900 + 100)}`,
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

  const updateCurrentProfile = async (userId, patch) => {
    const id = String(userId || '').trim();
    if (!id) throw new Error('Usuário atual não encontrado para atualizar perfil.');
    const current = await findById(id);
    if (!current) throw new Error('Conta não encontrada para atualizar perfil.');

    const profiles = readLocalProfiles();
    const nextProfile = normalizeProfile({
      ...(current.profile || {}),
      ...(profiles[id] || {}),
      ...(patch || {}),
      userId: id,
      updatedAt: new Date().toISOString()
    }, current);
    profiles[id] = nextProfile;
    writeLocalProfiles(profiles);

    return updateCurrentUser(id, { profile: nextProfile });
  };

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
    PROFILE_STORAGE_KEY,
    list,
    findByLogin,
    findById,
    create,
    updateCurrentUser,
    updateCurrentProfile,
    updatePassword,
    hashPassword,
    isEmail,
    normalizeEmail,
    normalizePhone,
    normalizeProfile,
    toPublicUser
  });
})();

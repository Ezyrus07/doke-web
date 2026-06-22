/* Doke Users Repository
   Responsibility: read seeded mock users and locally-created users.
   This is the only data access layer for mock authentication. */
(function () {
  'use strict';

  const ns = window.DokeAuth || (window.DokeAuth = {});
  const repositories = ns.repositories || (ns.repositories = {});

  const STORAGE_KEY = 'doke.auth.users.v1';
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

  const writeLocalUsers = (users) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(users) ? users : []));
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

  const normalizeRole = (role) => role === 'professional' ? 'professional' : 'client';

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

  const normalizeUser = (user) => {
    if (!user || typeof user !== 'object') return null;
    const role = normalizeRole(user.role || user.type);
    const name = normalizeText(user.name || user.displayName || user.email || 'Usuário Doke');
    const initials = user.initials || user.avatarInitials || getInitials(name);

    return {
      ...user,
      id: user.id || generateId(role === 'professional' ? 'pro' : 'user'),
      name,
      email: normalizeEmail(user.email),
      phone: normalizePhone(user.phone),
      role,
      type: role,
      handle: user.handle || slugify(name) || 'usuario-doke',
      initials,
      avatarInitials: initials,
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
    list,
    findByLogin,
    findById,
    create,
    updatePassword,
    hashPassword,
    isEmail,
    normalizeEmail,
    normalizePhone,
    toPublicUser
  });
})();

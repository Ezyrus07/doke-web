/* Doke AUTH-A04 Registration Authority
   Responsibility: bind signup username checks to the real Supabase authority.
   This module extends the canonical window.DokeAuth surface without persisting
   credentials, users or reservations in the browser. */
(function () {
  'use strict';

  const root = window;
  const ns = root.DokeAuth || (root.DokeAuth = {});

  if (ns.registrationAuthority?.version === 'AUTH-A04') return;

  const baseRegister = typeof ns.register === 'function' ? ns.register.bind(ns) : null;
  const baseCheckUsernameAvailability = typeof ns.checkUsernameAvailability === 'function'
    ? ns.checkUsernameAvailability.bind(ns)
    : null;

  const RESERVED_USERNAMES = Object.freeze([
    'admin', 'administrador', 'doke', 'suporte', 'support',
    'moderador', 'moderator', 'root', 'sistema', 'system'
  ]);

  const normalizeUsername = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]+/g, '')
    .replace(/^[._]+|[._]+$/g, '')
    .slice(0, 30);

  const isReservedUsername = (value) => RESERVED_USERNAMES.includes(normalizeUsername(value));
  const isValidUsername = (value) => {
    const username = normalizeUsername(value);
    return /^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$/.test(username)
      && !isReservedUsername(username);
  };

  const reasonMessage = (reason) => {
    if (reason === 'reserved') return 'Esse usuário é reservado pela Doke. Escolha outro.';
    if (reason === 'taken') return 'Esse usuário já está em uso. Escolha outro.';
    if (reason === 'authority_unavailable') return 'Não foi possível verificar o usuário agora. Aguarde um instante e tente novamente.';
    return 'Use de 3 a 30 caracteres: letras, números, ponto ou underline.';
  };

  const getSupabaseConfig = () => root.DOKE_SUPABASE_CONFIG || {};
  const isSupabaseConfigured = () => {
    const config = getSupabaseConfig();
    return config.enabled !== false && Boolean(config.url) && Boolean(config.anonKey);
  };
  const getSupabaseClient = () => root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
    ? root.DokeSupabase.getClient()
    : null;

  const normalizeRpcResult = (data, fallbackUsername) => {
    const row = Array.isArray(data) ? data[0] : data;
    const username = normalizeUsername(row?.username || fallbackUsername);
    const reasonCode = String(row?.reason || (row?.available ? 'available' : 'taken'));
    return {
      handle: username,
      username,
      valid: row?.valid === true,
      available: row?.available === true,
      reasonCode,
      reason: row?.available === true ? '' : reasonMessage(reasonCode),
      authority: 'supabase'
    };
  };

  const localValidationResult = (value) => {
    const username = normalizeUsername(value);
    const reasonCode = isReservedUsername(username)
      ? 'reserved'
      : isValidUsername(username) ? 'available' : 'invalid_format';
    return {
      handle: username,
      username,
      valid: reasonCode === 'available',
      available: false,
      reasonCode,
      reason: reasonCode === 'available' ? '' : reasonMessage(reasonCode),
      authority: 'client_validation'
    };
  };

  const checkUsernameAvailability = async (value) => {
    const local = localValidationResult(value);
    if (!local.valid) return local;

    if (!isSupabaseConfigured()) {
      if (baseCheckUsernameAvailability) return baseCheckUsernameAvailability(local.username);
      return { ...local, reasonCode: 'authority_unavailable', reason: reasonMessage('authority_unavailable') };
    }

    const client = getSupabaseClient();
    if (!client || typeof client.rpc !== 'function') {
      return { ...local, reasonCode: 'authority_unavailable', reason: reasonMessage('authority_unavailable') };
    }

    try {
      const { data, error } = await client.rpc('check_username_availability', {
        p_username: local.username
      });
      if (error) throw error;
      return normalizeRpcResult(data, local.username);
    } catch (error) {
      console.warn?.('[DokeAuth] Username authority unavailable.', error);
      return {
        ...local,
        available: false,
        reasonCode: 'authority_unavailable',
        reason: reasonMessage('authority_unavailable'),
        authority: 'supabase'
      };
    }
  };

  const register = async (payload = {}) => {
    if (!baseRegister) throw new Error('Autoridade canônica de cadastro não foi carregada.');

    const usernameCheck = await checkUsernameAvailability(payload.handle || payload.username);
    if (!usernameCheck.available) {
      throw new Error(usernameCheck.reason || 'Escolha outro usuário.');
    }

    try {
      return await baseRegister({
        ...payload,
        handle: usernameCheck.username,
        role: 'client'
      });
    } catch (error) {
      const raceCheck = await checkUsernameAvailability(usernameCheck.username);
      if (raceCheck.reasonCode === 'taken') {
        throw new Error('Esse usuário acabou de ser escolhido por outra pessoa. Escolha outro.');
      }
      if (raceCheck.reasonCode === 'reserved' || raceCheck.reasonCode === 'invalid_format') {
        throw new Error(raceCheck.reason);
      }
      throw error;
    }
  };

  const api = Object.freeze({
    version: 'AUTH-A04',
    normalizeUsername,
    isReservedUsername,
    isValidUsername,
    checkUsernameAvailability,
    register
  });

  ns.registrationAuthority = api;
  ns.checkUsernameAvailability = checkUsernameAvailability;
  ns.register = register;

  document.dispatchEvent(new CustomEvent('doke:auth-registration-authority-ready', {
    detail: { version: api.version, provider: isSupabaseConfigured() ? 'supabase' : 'fallback' }
  }));
})();

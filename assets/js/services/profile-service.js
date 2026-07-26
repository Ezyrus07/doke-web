(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var canonicalProfileCache = null;
  var canonicalProfileUserId = '';
  var canonicalSettingsCache = null;
  var canonicalSettingsUserId = '';

  function usersRepository() {
    return window.DokeAuth && window.DokeAuth.repositories
      ? window.DokeAuth.repositories.users || null
      : null;
  }

  function currentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      return Doke.session.getCurrentUser() || null;
    }
    return null;
  }


  function getSupabaseClient() {
    return window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
      ? window.DokeSupabase.getClient()
      : null;
  }

  function invokeSelfService(action, params) {
    if (!window.DokeSupabase || typeof window.DokeSupabase.invokeSelfService !== 'function') {
      var unavailable = new Error('Autoridade de perfil do Supabase indisponível.');
      unavailable.code = 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE';
      return Promise.reject(unavailable);
    }
    return window.DokeSupabase.invokeSelfService(action, params || {});
  }

  function usesSupabaseProvider() {
    var session = Doke.session && typeof Doke.session.getSession === 'function'
      ? Doke.session.getSession()
      : null;
    if (session && session.provider === 'supabase') return true;
    var config = window.DOKE_SUPABASE_CONFIG || {};
    return config.enabled !== false && Boolean(config.url) && Boolean(config.anonKey || config.publishableKey);
  }

  function normalizeText(value, maxLength) {
    var text = String(value || '').trim().replace(/\s+/g, ' ');
    return maxLength ? text.slice(0, maxLength) : text;
  }

  function normalizeHandle(value) {
    return normalizeText(value, 30)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/^@+/, '')
      .replace(/[^a-z0-9._]+/g, '')
      .replace(/^[._]+|[._]+$/g, '');
  }

  function normalizeInterests(value) {
    var input = Array.isArray(value) ? value : String(value || '').split(',');
    var seen = Object.create(null);
    return input.map(function (item) { return normalizeText(item, 40); }).filter(function (item) {
      var key = item.toLowerCase();
      if (!item || seen[key]) return false;
      seen[key] = true;
      return true;
    }).slice(0, 8);
  }

  function normalizeMediaUrl(value) {
    var url = String(value || '').trim();
    if (!url) return '';
    if (url.length > 180000) throw new Error('A imagem excede o limite local permitido.');
    if (!/^(data:image\/(?:png|jpeg|webp|gif);base64,|https?:\/\/|\.\.\/|\.\/|\/|assets\/)/i.test(url)) {
      throw new Error('Formato de imagem não suportado.');
    }
    return url;
  }

  function sanitizeFileName(value) {
    return String(value || 'imagem')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(-80) || 'imagem';
  }

  function readLocalImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.addEventListener('load', function () {
        try { resolve(normalizeMediaUrl(reader.result)); }
        catch (error) { reject(error); }
      }, { once: true });
      reader.addEventListener('error', function () {
        reject(new Error('Não foi possível ler a imagem.'));
      }, { once: true });
      reader.readAsDataURL(file);
    });
  }

  function uploadProfileImage(file) {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase indisponível para enviar a imagem.'));

    return client.auth.getUser().then(function (response) {
      if (response.error) throw response.error;
      var authUser = response.data && response.data.user;
      if (!authUser || !authUser.id) throw new Error('Sua sessão expirou. Entre novamente.');

      var extension = String(file.name || '').split('.').pop().toLowerCase();
      if (!/^(png|jpe?g|webp|gif)$/.test(extension)) {
        extension = String(file.type || '').split('/').pop().replace('jpeg', 'jpg') || 'jpg';
      }
      var fileName = Date.now() + '-' + Math.random().toString(36).slice(2, 10) + '-' + sanitizeFileName(file.name || ('perfil.' + extension));
      var objectPath = authUser.id + '/' + fileName;

      return client.storage.from('profile-media').upload(objectPath, file, {
        cacheControl: '3600',
        contentType: file.type || 'image/jpeg',
        upsert: false
      }).then(function (uploadResponse) {
        if (uploadResponse.error) {
          var uploadMessage = String(uploadResponse.error.message || '');
          if (/bucket.*not found|not found/i.test(uploadMessage)) {
            throw new Error('O bucket profile-media ainda não foi criado. Execute a migration 017.');
          }
          throw new Error(uploadMessage || 'Não foi possível enviar a imagem.');
        }
        var publicResponse = client.storage.from('profile-media').getPublicUrl(objectPath);
        var publicUrl = publicResponse && publicResponse.data ? publicResponse.data.publicUrl : '';
        if (!publicUrl) throw new Error('Não foi possível gerar a URL pública da imagem.');
        document.documentElement.setAttribute('data-doke-profile-media-provider', 'supabase');
        return normalizeMediaUrl(publicUrl);
      });
    });
  }

  function prepareLocalImage(file) {
    if (!file) return Promise.reject(new Error('Selecione uma imagem.'));
    if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(String(file.type || ''))) {
      return Promise.reject(new Error('Use uma imagem PNG, JPG, WEBP ou GIF.'));
    }
    if (Number(file.size || 0) > 5 * 1024 * 1024) {
      return Promise.reject(new Error('A imagem deve ter no máximo 5 MB.'));
    }
    if (usesSupabaseProvider()) return uploadProfileImage(file);
    if (Number(file.size || 0) > 120 * 1024) {
      return Promise.reject(new Error('A imagem deve ter no máximo 120 KB no modo local.'));
    }
    document.documentElement.setAttribute('data-doke-profile-media-provider', 'local');
    return readLocalImage(file);
  }

  function normalizePatch(payload) {
    payload = payload || {};
    var name = normalizeText(payload.name, 80);
    var handle = normalizeHandle(payload.handle || name);
    var city = normalizeText(payload.city, 60);
    var state = normalizeText(payload.state, 2).toUpperCase();
    var bio = normalizeText(payload.bio, 500);

    if (name.length < 3) throw new Error('Informe um nome com pelo menos 3 caracteres.');
    if (!/^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/.test(handle)) throw new Error('Informe um usuário válido com 3 a 30 caracteres.');
    if (state && !/^[A-Z]{2}$/.test(state)) throw new Error('Use a sigla do estado com 2 letras.');

    return {
      name: name,
      handle: handle,
      bio: bio,
      city: city,
      state: state,
      interests: normalizeInterests(payload.interests),
      avatarUrl: normalizeMediaUrl(payload.avatarUrl),
      coverUrl: normalizeMediaUrl(payload.coverUrl)
    };
  }

  function reconciliationError(message, code) {
    var error = new Error(message);
    error.code = code;
    return error;
  }

  function normalizeCanonicalProfile(identityState, user) {
    var state = identityState && typeof identityState === 'object' ? identityState : {};
    var profile = state.profile && typeof state.profile === 'object' ? state.profile : null;
    var expectedUserId = String(user && user.id || '');
    var stateUserId = String(state.userId || '');
    var profileUserId = String(profile && (profile.userId || profile.profileId) || '');

    if (!expectedUserId || !profile) {
      throw reconciliationError('O servidor não devolveu um perfil canônico válido.', 'DOKE_PROFILE_RECONCILIATION_INVALID');
    }
    if ((stateUserId && stateUserId !== expectedUserId) || (profileUserId && profileUserId !== expectedUserId)) {
      throw reconciliationError('O perfil devolvido não pertence à sessão atual.', 'DOKE_PROFILE_RECONCILIATION_SUBJECT_MISMATCH');
    }

    var name = normalizeText(profile.displayName || profile.name || user.name, 80);
    var handle = normalizeHandle(profile.username || profile.handle || user.handle);
    if (name.length < 3 || !/^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$/.test(handle)) {
      throw reconciliationError('O servidor devolveu uma identidade pública inválida.', 'DOKE_PROFILE_RECONCILIATION_INVALID');
    }

    return Object.freeze({
      id: profile.profileId || profile.userId || expectedUserId,
      userId: profile.userId || expectedUserId,
      role: user.role || user.type || 'client',
      type: user.type || user.role || 'client',
      name: name,
      displayName: name,
      handle: handle,
      username: handle,
      city: normalizeText(profile.city, 60),
      state: normalizeText(profile.state, 2).toUpperCase(),
      bio: normalizeText(profile.bio, 500),
      interests: normalizeInterests(profile.interests),
      avatarUrl: normalizeMediaUrl(profile.avatarUrl),
      coverUrl: normalizeMediaUrl(profile.coverUrl),
      updatedAt: profile.updatedAt || ''
    });
  }

  function cacheCanonicalProfile(profile, userId) {
    canonicalProfileCache = profile || null;
    canonicalProfileUserId = profile ? String(userId || profile.userId || '') : '';
    return canonicalProfileCache;
  }

  function getCachedProfile(user) {
    if (!user || String(user.id || '') !== canonicalProfileUserId) return null;
    return canonicalProfileCache;
  }

  function dispatchProfileEvent(type, user, profile) {
    window.dispatchEvent(new CustomEvent(type, {
      detail: {
        userId: user.id,
        profileId: profile && profile.id,
        profile: profile || null,
        source: 'server',
        reconciled: true
      }
    }));
  }

  function normalizeCanonicalSettings(identityState, user) {
    var state = identityState && typeof identityState === 'object' ? identityState : {};
    var expectedUserId = String(user && user.id || '');
    var stateUserId = String(state.userId || '');
    var settings = state.settings;

    if (!expectedUserId || !settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw reconciliationError('O servidor não devolveu configurações canônicas válidas.', 'DOKE_SETTINGS_RECONCILIATION_INVALID');
    }
    if (stateUserId && stateUserId !== expectedUserId) {
      throw reconciliationError('As configurações devolvidas não pertencem à sessão atual.', 'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH');
    }

    return Object.freeze(Object.assign({}, settings));
  }

  function cacheCanonicalSettings(settings, userId) {
    canonicalSettingsCache = settings || null;
    canonicalSettingsUserId = settings ? String(userId || '') : '';
    return canonicalSettingsCache;
  }

  function getCachedSettings(user) {
    if (!user || String(user.id || '') !== canonicalSettingsUserId) return null;
    return canonicalSettingsCache;
  }

  function dispatchSettingsEvent(type, user, settings) {
    window.dispatchEvent(new CustomEvent(type, {
      detail: {
        userId: user.id,
        settings: settings || {},
        source: 'server',
        reconciled: true
      }
    }));
  }

  function list(filters) {
    filters = filters || {};
    var repository = usersRepository();
    if (!repository || typeof repository.list !== 'function') return Promise.resolve([]);
    return Promise.resolve(repository.list()).then(function (users) {
      return (users || []).filter(function (user) {
        if (filters.type && String(user.role || user.type) !== String(filters.type)) return false;
        if (filters.city && String(user.city || '').toLowerCase() !== String(filters.city).toLowerCase()) return false;
        return true;
      }).map(function (user) { return user.profile || user; });
    });
  }

  function getById(userId) {
    var id = String(userId || '').trim();
    var sessionUser = currentUser();
    var cachedProfile = sessionUser && String(sessionUser.id) === id ? getCachedProfile(sessionUser) : null;
    var sessionFallback = cachedProfile || (sessionUser && String(sessionUser.id) === id
      ? (sessionUser.profile || sessionUser)
      : null);
    var repository = usersRepository();

    if (!id) return Promise.resolve(null);
    if (cachedProfile) return Promise.resolve(cachedProfile);
    if (!repository || typeof repository.findById !== 'function') {
      return Promise.resolve(sessionFallback);
    }

    return Promise.resolve(repository.findById(id)).then(function (user) {
      return user ? (user.profile || user) : sessionFallback;
    }).catch(function () {
      return sessionFallback;
    });
  }

  function getCurrentProfile() {
    var user = currentUser();
    if (!user || !user.id) return Promise.resolve(null);
    var cachedProfile = getCachedProfile(user);
    if (cachedProfile) return Promise.resolve(cachedProfile);
    return getById(user.id).then(function (profile) {
      return profile || user.profile || user;
    });
  }

  function refreshCurrentProfile() {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para atualizar o perfil.'));
    if (!usesSupabaseProvider()) return getCurrentProfile();

    return invokeSelfService('get_account_identity_state', {}).then(function (identityState) {
      var profile = normalizeCanonicalProfile(identityState, user);
      cacheCanonicalProfile(profile, user.id);
      dispatchProfileEvent('doke:profile-reconciled', user, profile);
      return profile;
    });
  }

  function updateCurrentProfile(payload) {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));
    if (!usesSupabaseProvider()) {
      return Promise.reject(reconciliationError('Autoridade server-side de perfil indisponível.', 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE'));
    }

    return getCurrentProfile().then(function (currentProfile) {
      var patch = normalizePatch(Object.assign({}, currentProfile || {}, {
        name: user.name,
        handle: user.handle
      }, payload || {}));

      return invokeSelfService('update_account_profile_reconciled', {
        p_display_name: patch.name,
        p_username: patch.handle,
        p_city: patch.city,
        p_state: patch.state,
        p_bio: patch.bio,
        p_interests: patch.interests,
        p_avatar_url: patch.avatarUrl || '',
        p_cover_url: patch.coverUrl || ''
      }).then(function (identityState) {
        var nextProfile = normalizeCanonicalProfile(identityState, user);
        cacheCanonicalProfile(nextProfile, user.id);
        dispatchProfileEvent('doke:profile-updated', user, nextProfile);
        return nextProfile;
      });
    });
  }

  function getCurrentSettings() {
    var user = currentUser();
    if (!user || !user.id) return Promise.resolve({});
    var cachedSettings = getCachedSettings(user);
    if (cachedSettings) return Promise.resolve(cachedSettings);
    if (usesSupabaseProvider()) return Promise.resolve(user.settings || {});
    var repository = usersRepository();
    if (!repository || typeof repository.getCurrentSettings !== 'function') return Promise.resolve(user.settings || {});
    return Promise.resolve(repository.getCurrentSettings(user.id));
  }

  function refreshCurrentSettings() {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para atualizar as preferências.'));
    if (!usesSupabaseProvider()) return getCurrentSettings();

    return invokeSelfService('get_account_identity_state', {}).then(function (identityState) {
      var settings = normalizeCanonicalSettings(identityState, user);
      cacheCanonicalSettings(settings, user.id);
      dispatchSettingsEvent('doke:settings-reconciled', user, settings);
      return settings;
    });
  }

  function updateCurrentSettings(settings) {
    var user = currentUser();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));
    if (!usesSupabaseProvider()) {
      return Promise.reject(reconciliationError('Autoridade server-side de configurações indisponível.', 'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'));
    }
    return invokeSelfService('update_account_settings', { p_settings: settings || {} }).then(function (identityState) {
      var nextSettings = normalizeCanonicalSettings(identityState, user);
      cacheCanonicalSettings(nextSettings, user.id);
      dispatchSettingsEvent('doke:settings-updated', user, nextSettings);
      return nextSettings;
    });
  }

  services.profile = Object.freeze({
    list: list,
    getById: getById,
    getCurrentProfile: getCurrentProfile,
    refreshCurrentProfile: refreshCurrentProfile,
    updateCurrentProfile: updateCurrentProfile,
    getCurrentSettings: getCurrentSettings,
    refreshCurrentSettings: refreshCurrentSettings,
    updateCurrentSettings: updateCurrentSettings,
    prepareLocalImage: prepareLocalImage,
    normalizePatch: normalizePatch
  });
})();

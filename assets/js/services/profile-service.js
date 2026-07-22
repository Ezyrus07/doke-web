(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var services = Doke.services || (Doke.services = {});

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

  function authService() {
    return window.DokeAuth && window.DokeAuth.service ? window.DokeAuth.service : null;
  }

  function getSupabaseClient() {
    return window.DokeSupabase && typeof window.DokeSupabase.getClient === 'function'
      ? window.DokeSupabase.getClient()
      : null;
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
    var sessionFallback = sessionUser && String(sessionUser.id) === id
      ? (sessionUser.profile || sessionUser)
      : null;
    var repository = usersRepository();

    if (!id) return Promise.resolve(null);
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
    return getById(user.id).then(function (profile) {
      return profile || user.profile || user;
    });
  }

  function updateCurrentProfile(payload) {
    var user = currentUser();
    var repository = usersRepository();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para editar o perfil.'));

    return getCurrentProfile().then(function (currentProfile) {
      var patch = normalizePatch(Object.assign({}, currentProfile || {}, {
        name: user.name,
        handle: user.handle
      }, payload || {}));

      if (usesSupabaseProvider()) {
        var client = getSupabaseClient();
        if (!client) throw new Error('Supabase indisponível para salvar o perfil.');

        return window.DokeSupabase.invokeSelfService('update_account_profile', {
          p_display_name: patch.name,
          p_username: patch.handle,
          p_city: patch.city,
          p_state: patch.state,
          p_bio: patch.bio,
          p_interests: patch.interests,
          p_avatar_url: patch.avatarUrl || '',
          p_cover_url: patch.coverUrl || ''
        }).then(function (result) {
          result = result || {};
          var nextProfile = {
            id: result.profileId || (currentProfile && currentProfile.id) || user.id,
            userId: user.id,
            name: result.displayName || patch.name,
            displayName: result.displayName || patch.name,
            handle: result.username || patch.handle,
            username: result.username || patch.handle,
            city: result.city || patch.city,
            state: result.state || patch.state,
            bio: result.bio != null ? result.bio : patch.bio,
            interests: Array.isArray(result.interests) ? result.interests : patch.interests,
            avatarUrl: result.avatarUrl || patch.avatarUrl || (currentProfile && currentProfile.avatarUrl) || '',
            coverUrl: result.coverUrl || patch.coverUrl || (currentProfile && currentProfile.coverUrl) || ''
          };

          return client.auth.updateUser({
            data: {
              name: nextProfile.name,
              full_name: nextProfile.name,
              handle: nextProfile.handle,
              city: nextProfile.city,
              state: nextProfile.state,
              bio: nextProfile.bio,
              interests: nextProfile.interests,
              avatar_url: nextProfile.avatarUrl,
              cover_url: nextProfile.coverUrl
            }
          }).catch(function () { return null; }).then(function () {
            var nextUser = Object.assign({}, user, {
              name: nextProfile.name,
              displayName: nextProfile.name,
              handle: nextProfile.handle,
              avatarUrl: nextProfile.avatarUrl,
              avatar: nextProfile.avatarUrl,
              profile: nextProfile
            });
            if (Doke.session && typeof Doke.session.setCurrentUser === 'function') {
              Doke.session.setCurrentUser(nextUser, { provider: 'supabase', remember: true });
            }
            return nextUser;
          });
        });
      }

      if (!repository || typeof repository.updateCurrentProfile !== 'function') {
        throw new Error('Persistência do perfil indisponível.');
      }
      return Promise.resolve(repository.isHandleAvailable ? repository.isHandleAvailable(patch.handle, user.id) : true)
        .then(function (available) {
          if (!available) throw new Error('Esse usuário já está em uso. Escolha outro.');
          return repository.updateCurrentProfile(user.id, patch, user);
        });
    }).then(function (updatedUser) {
      var nextUser = updatedUser || user;
      if (!usesSupabaseProvider() && Doke.session && typeof Doke.session.setCurrentUser === 'function') {
        Doke.session.setCurrentUser(nextUser);
      }
      window.dispatchEvent(new CustomEvent('doke:profile-updated', {
        detail: { userId: user.id, profileId: nextUser.profile && nextUser.profile.id, profile: nextUser.profile || null }
      }));
      return nextUser.profile || nextUser;
    });
  }

  function getCurrentSettings() {
    var user = currentUser();
    if (!user || !user.id) return Promise.resolve({});
    if (usesSupabaseProvider()) return Promise.resolve(user.settings || {});
    var repository = usersRepository();
    if (!repository || typeof repository.getCurrentSettings !== 'function') return Promise.resolve(user.settings || {});
    return Promise.resolve(repository.getCurrentSettings(user.id));
  }

  function updateCurrentSettings(settings) {
    var user = currentUser();
    var auth = authService();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));
    if (usesSupabaseProvider()) {
      if (!auth || typeof auth.updateCurrentUser !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));
      return auth.updateCurrentUser({ settings: settings || {} }).then(function (updatedUser) { return updatedUser.settings || {}; });
    }
    var repository = usersRepository();
    if (!repository || typeof repository.updateCurrentSettings !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));
    return repository.updateCurrentSettings(user.id, settings || {}).then(function (updatedUser) {
      if (Doke.session && typeof Doke.session.setCurrentUser === 'function') Doke.session.setCurrentUser(updatedUser);
      return updatedUser.settings || {};
    });
  }

  services.profile = Object.freeze({
    list: list,
    getById: getById,
    getCurrentProfile: getCurrentProfile,
    updateCurrentProfile: updateCurrentProfile,
    getCurrentSettings: getCurrentSettings,
    updateCurrentSettings: updateCurrentSettings,
    prepareLocalImage: prepareLocalImage,
    normalizePatch: normalizePatch
  });
})();

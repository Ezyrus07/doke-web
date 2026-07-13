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

  function usesApiProvider() {
    var auth = authService();
    return auth && typeof auth.getActiveAuthProvider === 'function' && auth.getActiveAuthProvider() === 'api';
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

  function prepareLocalImage(file) {
    if (!file) return Promise.reject(new Error('Selecione uma imagem.'));
    if (!/^image\/(?:png|jpeg|webp|gif)$/i.test(String(file.type || ''))) {
      return Promise.reject(new Error('Use uma imagem PNG, JPG, WEBP ou GIF.'));
    }
    if (Number(file.size || 0) > 120 * 1024) {
      return Promise.reject(new Error('A imagem deve ter no máximo 120 KB no modo local.'));
    }
    if (usesApiProvider()) {
      return Promise.reject(new Error('Upload de imagem ainda não está habilitado no provider API.'));
    }
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
    if (usesApiProvider() && sessionUser && String(sessionUser.id) === id) {
      return Promise.resolve(sessionUser.profile || sessionUser);
    }
    var repository = usersRepository();
    if (!id || !repository || typeof repository.findById !== 'function') return Promise.resolve(null);
    return Promise.resolve(repository.findById(id)).then(function (user) {
      return user ? (user.profile || user) : null;
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
    var auth = authService();
    if (!usesApiProvider() && (!repository || typeof repository.updateCurrentProfile !== 'function')) {
      return Promise.reject(new Error('Persistência do perfil indisponível.'));
    }

    return getCurrentProfile().then(function (currentProfile) {
      var patch = normalizePatch(Object.assign({}, currentProfile || {}, {
        name: user.name,
        handle: user.handle
      }, payload || {}));
      var availability = !usesApiProvider() && typeof repository.isHandleAvailable === 'function'
        ? Promise.resolve(repository.isHandleAvailable(patch.handle, user.id))
        : Promise.resolve(true);

      return availability.then(function (available) {
      if (!available) throw new Error('Esse usuário já está em uso. Escolha outro.');
        if (usesApiProvider()) {
          if (!auth || typeof auth.updateCurrentProfile !== 'function') throw new Error('Persistência do perfil indisponível.');
          return auth.updateCurrentProfile(patch).then(function (profile) {
            var apiUser = currentUser() || user;
            return Object.assign({}, apiUser, { profile: profile || apiUser.profile || null });
          });
        }
        return repository.updateCurrentProfile(user.id, patch, user);
      });
    }).then(function (updatedUser) {
      var nextUser = updatedUser || user;
      if (!usesApiProvider() && Doke.session && typeof Doke.session.setCurrentUser === 'function') {
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
    if (usesApiProvider()) return Promise.resolve(user.settings || {});
    var repository = usersRepository();
    if (!repository || typeof repository.getCurrentSettings !== 'function') return Promise.resolve(user.settings || {});
    return Promise.resolve(repository.getCurrentSettings(user.id));
  }

  function updateCurrentSettings(settings) {
    var user = currentUser();
    var auth = authService();
    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));
    if (usesApiProvider()) {
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

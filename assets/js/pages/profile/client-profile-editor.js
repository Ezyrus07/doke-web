/* Doke Client Profile Editor
 * Shared authority for editing the base/client profile from owner surfaces.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var context = null;
  var bound = false;
  var submitting = false;

  function service() {
    return Doke.services && Doke.services.profile ? Doke.services.profile : null;
  }

  function refs() {
    return {
      dialog: document.querySelector('[data-client-profile-editor]'),
      form: document.querySelector('[data-client-profile-editor-form]'),
      status: document.querySelector('[data-client-profile-editor-status]'),
      save: document.querySelector('[data-client-profile-editor-save]'),
      closeButtons: document.querySelectorAll('[data-client-profile-editor-close]')
    };
  }

  function field(name) {
    return document.querySelector('[data-client-editor-field="' + name + '"]');
  }

  function fileField(name) {
    return document.querySelector('[data-client-editor-file="' + name + '"]');
  }

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function setStatus(message, state) {
    var node = refs().status;
    if (!node) return;
    node.textContent = message || '';
    if (state) node.dataset.state = state;
    else delete node.dataset.state;
  }

  function currentProfile() {
    return context && typeof context.getProfile === 'function'
      ? context.getProfile() || null
      : null;
  }

  function canEdit() {
    return Boolean(context && (!context.canEdit || context.canEdit(currentProfile())));
  }

  function populate(profile) {
    profile = profile || {};
    var values = {
      name: clean(profile.name),
      handle: clean(profile.handle),
      city: clean(profile.city),
      state: clean(profile.state),
      interests: Array.isArray(profile.interests) ? profile.interests.filter(Boolean).join(', ') : '',
      bio: clean(profile.bio)
    };

    Object.keys(values).forEach(function (name) {
      var input = field(name);
      if (input) input.value = values[name];
    });

    ['avatar', 'cover'].forEach(function (name) {
      var input = fileField(name);
      if (input) input.value = '';
    });
  }

  function open(focusName) {
    if (!canEdit()) return;
    var dialog = refs().dialog;
    if (!dialog) return;

    populate(currentProfile());
    setStatus('', '');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', 'open');

    var target = field(focusName || 'name');
    if (target && typeof target.focus === 'function') {
      window.setTimeout(function () { target.focus(); }, 0);
    }
  }

  function close() {
    var dialog = refs().dialog;
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    setStatus('', '');
  }

  function payload() {
    return {
      name: field('name') ? field('name').value : '',
      handle: field('handle') ? field('handle').value : '',
      city: field('city') ? field('city').value : '',
      state: field('state') ? field('state').value : '',
      interests: field('interests') ? field('interests').value : '',
      bio: field('bio') ? field('bio').value : ''
    };
  }

  function prepareMedia(nextPayload) {
    var profileService = service();
    if (!profileService || typeof profileService.prepareLocalImage !== 'function') {
      return Promise.resolve(nextPayload);
    }

    var tasks = [];
    var avatar = fileField('avatar');
    var cover = fileField('cover');
    var avatarFile = avatar && avatar.files ? avatar.files[0] : null;
    var coverFile = cover && cover.files ? cover.files[0] : null;

    if (avatarFile) {
      tasks.push(Promise.resolve(profileService.prepareLocalImage(avatarFile)).then(function (url) {
        nextPayload.avatarUrl = url;
      }));
    }
    if (coverFile) {
      tasks.push(Promise.resolve(profileService.prepareLocalImage(coverFile)).then(function (url) {
        nextPayload.coverUrl = url;
      }));
    }

    return Promise.all(tasks).then(function () { return nextPayload; });
  }

  function submit(event) {
    event.preventDefault();
    if (submitting || !canEdit()) return;

    var profileService = service();
    if (!profileService || typeof profileService.updateCurrentProfile !== 'function') {
      setStatus('Persistência do perfil indisponível.', 'error');
      return;
    }

    submitting = true;
    var save = refs().save;
    if (save) {
      save.disabled = true;
      save.textContent = 'Salvando...';
    }
    setStatus('Preparando alterações...', '');

    Promise.resolve()
      .then(function () { return prepareMedia(payload()); })
      .then(function (nextPayload) {
        setStatus('Salvando alterações...', '');
        return profileService.updateCurrentProfile(nextPayload);
      })
      .then(function (profile) {
        if (context && typeof context.setProfile === 'function') context.setProfile(profile || currentProfile());
        if (context && typeof context.render === 'function') context.render(profile || currentProfile() || {});
        close();
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : 'Não foi possível salvar o perfil.', 'error');
      })
      .finally(function () {
        submitting = false;
        if (save) {
          save.disabled = false;
          save.textContent = 'Salvar alterações';
        }
      });
  }

  function bind() {
    if (bound) return;
    var editor = refs();
    if (!editor.dialog || !editor.form) return;
    bound = true;

    document.querySelectorAll('[data-client-edit-action]').forEach(function (button) {
      button.addEventListener('click', function (event) {
        event.preventDefault();
        var focus = button.dataset.clientEditFocus;
        open(focus === 'cover' || focus === 'avatar' ? 'name' : (focus || 'bio'));
      });
    });

    editor.closeButtons.forEach(function (button) {
      button.addEventListener('click', close);
    });
    editor.dialog.addEventListener('cancel', function (event) {
      event.preventDefault();
      close();
    });
    editor.dialog.addEventListener('click', function (event) {
      if (event.target === editor.dialog) close();
    });
    editor.form.addEventListener('submit', submit);
  }

  function register(options) {
    context = options || null;
    bind();
    return api;
  }

  var api = Object.freeze({
    register: register,
    open: open,
    close: close
  });

  Doke.clientProfileEditor = api;
})();

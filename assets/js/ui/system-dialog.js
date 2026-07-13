(function () {
  'use strict';
  var queue = Promise.resolve();
  var active = null;

  function ensureRoot() {
    var existing = document.querySelector('[data-doke-system-dialog]');
    if (existing) return existing;
    var root = document.createElement('div');
    root.className = 'doke-system-dialog';
    root.hidden = true;
    root.dataset.dokeSystemDialog = '';
    root.innerHTML = [
      '<button class="doke-system-dialog__backdrop" type="button" data-doke-dialog-cancel tabindex="-1" aria-label="Fechar"></button>',
      '<section class="doke-system-dialog__surface" role="dialog" aria-modal="true" aria-labelledby="doke-system-dialog-title" aria-describedby="doke-system-dialog-message" tabindex="-1">',
      '<header class="doke-system-dialog__header"><div class="doke-system-dialog__heading"><span class="doke-system-dialog__eyebrow" data-doke-dialog-eyebrow>Atenção</span><h2 class="doke-system-dialog__title" id="doke-system-dialog-title" data-doke-dialog-title></h2></div><button class="doke-system-dialog__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-doke-dialog-cancel aria-label="Fechar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button></header>',
      '<div class="doke-system-dialog__body"><p class="doke-system-dialog__message" id="doke-system-dialog-message" data-doke-dialog-message></p><label class="doke-system-dialog__field" data-doke-dialog-field hidden><span class="doke-system-dialog__label" data-doke-dialog-label>Resposta</span><textarea class="doke-system-dialog__textarea" data-doke-dialog-input></textarea></label></div>',
      '<footer class="doke-system-dialog__actions"><button class="doke-system-dialog__button" type="button" data-doke-dialog-cancel>Cancelar</button><button class="doke-system-dialog__button doke-system-dialog__button--primary" type="button" data-doke-dialog-confirm>Confirmar</button></footer>',
      '</section>'
    ].join('');
    document.body.appendChild(root);
    return root;
  }

  function open(options) {
    return new Promise(function (resolve) {
      var root = ensureRoot();
      var surface = root.querySelector('.doke-system-dialog__surface');
      var title = root.querySelector('[data-doke-dialog-title]');
      var eyebrow = root.querySelector('[data-doke-dialog-eyebrow]');
      var message = root.querySelector('[data-doke-dialog-message]');
      var field = root.querySelector('[data-doke-dialog-field]');
      var label = root.querySelector('[data-doke-dialog-label]');
      var input = root.querySelector('[data-doke-dialog-input]');
      var confirm = root.querySelector('[data-doke-dialog-confirm]');
      var cancelButtons = Array.prototype.slice.call(root.querySelectorAll('[data-doke-dialog-cancel]'));
      var previousFocus = document.activeElement;
      var type = options.type || 'alert';
      var settled = false;

      title.textContent = options.title || (type === 'confirm' ? 'Confirmar ação' : type === 'prompt' ? 'Preencha a informação' : 'Aviso');
      eyebrow.textContent = options.eyebrow || (type === 'confirm' ? 'Confirmação' : type === 'prompt' ? 'Informação necessária' : 'Doke');
      message.textContent = String(options.message || '');
      field.hidden = type !== 'prompt';
      label.textContent = options.label || 'Resposta';
      input.value = options.defaultValue == null ? '' : String(options.defaultValue);
      input.placeholder = options.placeholder || '';
      input.maxLength = Number(options.maxLength || 1000);
      confirm.textContent = options.confirmText || (type === 'alert' ? 'Entendi' : 'Confirmar');
      confirm.classList.toggle('doke-system-dialog__button--danger', Boolean(options.danger));
      confirm.classList.toggle('doke-system-dialog__button--primary', !options.danger);
      cancelButtons.forEach(function (button) { button.hidden = type === 'alert' && !button.classList.contains('doke-system-dialog__close'); });

      function finish(value) {
        if (settled) return;
        settled = true;
        root.hidden = true;
        document.body.classList.remove('doke-system-dialog-open');
        document.removeEventListener('keydown', onKeydown, true);
        confirm.removeEventListener('click', onConfirm);
        cancelButtons.forEach(function (button) { button.removeEventListener('click', onCancel); });
        active = null;
        if (previousFocus && previousFocus.focus) previousFocus.focus({ preventScroll: true });
        resolve(value);
      }
      function onConfirm() { finish(type === 'prompt' ? input.value : true); }
      function onCancel() { finish(type === 'prompt' ? null : false); }
      function onKeydown(event) {
        if (event.key === 'Escape') { event.preventDefault(); onCancel(); return; }
        if (event.key === 'Enter' && type !== 'prompt') { event.preventDefault(); onConfirm(); }
      }

      confirm.addEventListener('click', onConfirm);
      cancelButtons.forEach(function (button) { button.addEventListener('click', onCancel); });
      document.addEventListener('keydown', onKeydown, true);
      root.hidden = false;
      document.body.classList.add('doke-system-dialog-open');
      active = { close: onCancel };
      window.requestAnimationFrame(function () { (type === 'prompt' ? input : confirm).focus(); });
      if (surface) surface.scrollTop = 0;
    });
  }

  function schedule(options) {
    queue = queue.then(function () { return open(options); }, function () { return open(options); });
    return queue;
  }

  window.DokeDialog = {
    alert: function (message, options) { return schedule(Object.assign({}, options || {}, { type: 'alert', message: message })); },
    confirm: function (message, options) { return schedule(Object.assign({}, options || {}, { type: 'confirm', message: message })); },
    prompt: function (message, defaultValue, options) { return schedule(Object.assign({}, options || {}, { type: 'prompt', message: message, defaultValue: defaultValue })); },
    close: function () { if (active) active.close(); }
  };
})();

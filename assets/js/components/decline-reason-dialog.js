/* Doke decline reason dialog
   Responsibility: shared modal prompt for mandatory order refusal justification. */
(function () {
  'use strict';

  var DIALOG_ID = 'doke-decline-reason-dialog';
  var activeResolver = null;
  var activeTrigger = null;

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function ensureDialog() {
    var existing = document.getElementById(DIALOG_ID);
    if (existing) return existing;

    var layer = document.createElement('section');
    layer.id = DIALOG_ID;
    layer.className = 'doke-action-modal';
    layer.dataset.declineReasonDialog = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = [
      '<button class="doke-action-modal__scrim" type="button" data-decline-reason-cancel aria-label="Cancelar recusa"></button>',
      '<section class="doke-action-modal__surface" role="dialog" aria-modal="true" aria-labelledby="decline-reason-title" aria-describedby="decline-reason-text">',
      '  <header class="doke-action-modal__header">',
      '    <div class="doke-action-modal__intro">',
      '      <span class="doke-action-modal__eyebrow doke-action-modal__eyebrow--blue">Pedido</span>',
      '      <h2 class="doke-action-modal__title" id="decline-reason-title" data-decline-reason-title>Recusar pedido</h2>',
      '      <p class="doke-action-modal__text" id="decline-reason-text" data-decline-reason-text>Informe uma justificativa clara para o cliente entender o motivo da recusa.</p>',
      '    </div>',
      '    <button class="doke-action-modal__close" type="button" data-decline-reason-cancel aria-label="Fechar">',
      '      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>',
      '    </button>',
      '  </header>',
      '  <form class="doke-action-modal__form" data-decline-reason-form>',
      '    <div class="doke-action-modal__body">',
      '      <label class="doke-action-modal__field doke-action-modal__field--wide">',
      '        <span>Justificativa obrigatória</span>',
      '        <textarea data-decline-reason-input rows="4" maxlength="280" required placeholder="Ex.: não consigo atender esse prazo, mas posso ajudar em outra data."></textarea>',
      '      </label>',
      '      <article class="doke-action-modal__summary-card doke-action-modal__summary-card--wide" data-decline-reason-summary hidden></article>',
      '    </div>',
      '    <footer class="doke-action-modal__footer">',
      '      <button class="doke-action-modal__button doke-btn doke-btn--ghost" type="button" data-decline-reason-cancel>Cancelar</button>',
      '      <button class="doke-action-modal__button doke-action-modal__button--primary doke-btn doke-btn--primary" type="submit">Confirmar recusa</button>',
      '    </footer>',
      '  </form>',
      '</section>'
    ].join('');

    document.body.appendChild(layer);

    layer.addEventListener('click', function (event) {
      if (event.target && event.target.closest('[data-decline-reason-cancel]')) {
        event.preventDefault();
        closeDialog(null);
      }
    });

    layer.querySelector('[data-decline-reason-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      var input = layer.querySelector('[data-decline-reason-input]');
      var reason = String(input && input.value || '').trim();
      if (!reason) {
        input && input.focus();
        return;
      }
      closeDialog(reason);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !layer.hidden) closeDialog(null);
    });

    return layer;
  }

  function closeDialog(value) {
    var layer = document.getElementById(DIALOG_ID);
    if (layer) {
      layer.hidden = true;
      layer.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('doke-action-modal-open');
    if (activeTrigger && typeof activeTrigger.focus === 'function') activeTrigger.focus();
    var resolver = activeResolver;
    activeResolver = null;
    activeTrigger = null;
    if (resolver) resolver(value);
  }

  function request(options) {
    options = options || {};
    var layer = ensureDialog();
    var title = layer.querySelector('[data-decline-reason-title]');
    var text = layer.querySelector('[data-decline-reason-text]');
    var input = layer.querySelector('[data-decline-reason-input]');
    var summary = layer.querySelector('[data-decline-reason-summary]');

    if (title) title.textContent = options.title || 'Recusar pedido';
    if (text) text.textContent = options.text || 'Informe uma justificativa clara para o cliente entender o motivo da recusa.';
    if (input) input.value = '';
    if (summary) {
      var orderTitle = String(options.orderTitle || '').trim();
      summary.hidden = !orderTitle;
      summary.innerHTML = orderTitle ? '<strong>Pedido selecionado</strong><span>' + escapeHtml(orderTitle) + '</span>' : '';
    }

    activeTrigger = options.trigger || document.activeElement;
    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('doke-action-modal-open');
    window.requestAnimationFrame(function () { input && input.focus(); });

    return new Promise(function (resolve) {
      activeResolver = resolve;
    });
  }

  window.DokeDeclineReasonDialog = Object.freeze({ request: request });
})();

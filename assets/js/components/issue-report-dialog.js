/* Doke issue report dialog
   Responsibility: shared modal prompt for client-side service problem reports. */
(function () {
  'use strict';

  var DIALOG_ID = 'doke-issue-report-dialog';
  var activeResolver = null;
  var activeTrigger = null;

  var REASONS = [
    { value: 'service_not_completed', label: 'Serviço não foi concluído' },
    { value: 'different_result', label: 'Resultado diferente do combinado' },
    { value: 'professional_unresponsive', label: 'Profissional não respondeu' },
    { value: 'other', label: 'Outro motivo' }
  ];

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getReasonLabel(value) {
    var match = REASONS.find(function (reason) { return reason.value === value; });
    return match ? match.label : 'Relato do cliente';
  }

  function ensureDialog() {
    var existing = document.getElementById(DIALOG_ID);
    if (existing) return existing;

    var layer = document.createElement('section');
    layer.id = DIALOG_ID;
    layer.className = 'doke-action-modal doke-overlay doke-overlay--action';
    layer.dataset.issueReportDialog = 'true';
    layer.hidden = true;
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = [
      '<button class="doke-action-modal__scrim doke-overlay__backdrop" type="button" data-issue-report-cancel aria-label="Cancelar relato"></button>',
      '<section class="doke-action-modal__surface doke-overlay__surface doke-modal-surface doke-modal-surface--compact" role="dialog" aria-modal="true" aria-labelledby="issue-report-title" aria-describedby="issue-report-text">',
      '  <header class="doke-action-modal__header doke-overlay__header doke-modal-header">',
      '    <div class="doke-action-modal__intro">',
      '      <span class="doke-action-modal__eyebrow doke-action-modal__eyebrow--blue doke-modal-eyebrow doke-modal-eyebrow--blue">Pedido</span>',
      '      <h2 class="doke-action-modal__title doke-modal-title" id="issue-report-title" data-issue-report-title>Relatar problema</h2>',
      '      <p class="doke-action-modal__text doke-modal-description" id="issue-report-text" data-issue-report-text>Conte o que aconteceu. O repasse ficará pausado enquanto o pedido é analisado.</p>',
      '    </div>',
      '    <button class="doke-action-modal__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" data-issue-report-cancel aria-label="Fechar">',
      '      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>',
      '    </button>',
      '  </header>',
      '  <form class="doke-action-modal__form" data-issue-report-form>',
      '    <div class="doke-action-modal__body doke-overlay__body doke-modal-body">',
      '      <label class="doke-action-modal__field doke-action-modal__field--wide doke-field doke-modal-field">',
      '        <span>O que aconteceu?</span>',
      '        <select data-doke-select data-issue-report-reason required>',
      '          <option value="">Selecione um motivo</option>',
      REASONS.map(function (reason) { return '          <option value="' + escapeHtml(reason.value) + '">' + escapeHtml(reason.label) + '</option>'; }).join(''),
      '        </select>',
      '      </label>',
      '      <label class="doke-action-modal__field doke-action-modal__field--wide doke-field doke-modal-field">',
      '        <span>Descrição curta</span>',
      '        <textarea class="doke-textarea" data-issue-report-input rows="4" maxlength="360" required placeholder="Ex.: o serviço foi pago, mas ainda não foi concluído conforme combinado."></textarea>',
      '      </label>',
      '      <article class="doke-action-modal__summary-card doke-action-modal__summary-card--wide doke-modal-summary-card doke-modal-summary-card--wide" data-issue-report-summary hidden></article>',
      '    </div>',
      '    <footer class="doke-action-modal__footer doke-overlay__actions doke-modal-actions">',
      '      <button class="doke-action-modal__button doke-btn doke-btn--ghost" type="button" data-issue-report-cancel>Cancelar</button>',
      '      <button class="doke-action-modal__button doke-action-modal__button--primary doke-btn doke-btn--primary" type="submit" data-issue-report-submit>Enviar relato</button>',
      '    </footer>',
      '  </form>',
      '</section>'
    ].join('');

    document.body.appendChild(layer);

    layer.addEventListener('click', function (event) {
      if (event.target && event.target.closest('[data-issue-report-cancel]')) {
        event.preventDefault();
        closeDialog(null);
      }
    });

    layer.querySelector('[data-issue-report-form]').addEventListener('submit', function (event) {
      event.preventDefault();
      var reasonSelect = layer.querySelector('[data-issue-report-reason]');
      var input = layer.querySelector('[data-issue-report-input]');
      var reasonCode = String(reasonSelect && reasonSelect.value || '').trim();
      var details = String(input && input.value || '').trim();
      if (!reasonCode) {
        var reasonTrigger = reasonSelect && reasonSelect.closest('[data-doke-select-root]') && reasonSelect.closest('[data-doke-select-root]').querySelector('.doke-select__trigger');
        if (reasonTrigger && typeof reasonTrigger.focus === 'function') {
          reasonTrigger.focus();
        } else if (reasonSelect && typeof reasonSelect.focus === 'function') {
          reasonSelect.focus();
        }
        return;
      }
      if (!details) {
        input && input.focus();
        return;
      }
      closeDialog({
        reasonCode: reasonCode,
        reasonLabel: getReasonLabel(reasonCode),
        details: details,
        reason: getReasonLabel(reasonCode) + '. ' + details
      });
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
    var title = layer.querySelector('[data-issue-report-title]');
    var text = layer.querySelector('[data-issue-report-text]');
    var reasonSelect = layer.querySelector('[data-issue-report-reason]');
    var input = layer.querySelector('[data-issue-report-input]');
    var summary = layer.querySelector('[data-issue-report-summary]');
    var submit = layer.querySelector('[data-issue-report-submit]');

    if (title) title.textContent = options.title || 'Relatar problema';
    if (text) text.textContent = options.text || 'Conte o que aconteceu. O repasse ficará pausado enquanto o pedido é analisado.';
    if (reasonSelect) {
      reasonSelect.value = '';
      if (window.DokeLiteSelect && typeof window.DokeLiteSelect.enhance === 'function') {
        window.DokeLiteSelect.enhance(reasonSelect);
      }
      reasonSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (input) input.value = '';
    if (submit) submit.textContent = options.submitLabel || 'Enviar relato';
    if (summary) {
      var orderTitle = String(options.orderTitle || '').trim();
      summary.hidden = !orderTitle;
      summary.innerHTML = orderTitle ? '<strong>Pedido selecionado</strong><span>' + escapeHtml(orderTitle) + '</span>' : '';
    }

    activeTrigger = options.trigger || document.activeElement;
    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('doke-action-modal-open');
    window.requestAnimationFrame(function () {
      var reasonTrigger = reasonSelect && reasonSelect.closest('[data-doke-select-root]') && reasonSelect.closest('[data-doke-select-root]').querySelector('.doke-select__trigger');
      if (reasonTrigger && typeof reasonTrigger.focus === 'function') {
        reasonTrigger.focus();
        return;
      }
      reasonSelect && reasonSelect.focus();
    });

    return new Promise(function (resolve) {
      activeResolver = resolve;
    });
  }

  window.DokeIssueReportDialog = Object.freeze({ request: request });
})();

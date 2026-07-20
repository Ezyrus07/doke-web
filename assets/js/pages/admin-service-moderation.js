(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var root = null;
  var list = null;
  var countNodes = [];
  var dialog = null;
  var dialogTitle = null;
  var dialogDescription = null;
  var reasonInput = null;
  var submitButton = null;
  var activeVersionId = '';
  var activeAction = '';
  var loadPromise = null;
  var observer = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function repository() {
    return Doke.repositories && Doke.repositories.serviceModeration || null;
  }

  function showToast(message) {
    var toast = document.querySelector('[data-admin-toast]');
    if (!toast) return;
    toast.textContent = clean(message);
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 3600);
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Agora';
    return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  function quoteModeLabel(snapshot) {
    var mode = clean(snapshot && snapshot.quoteMode).toLowerCase();
    if (mode === 'custom') return 'Formulário personalizado';
    if (mode === 'disabled') return 'Somente conversa';
    return 'Modelo Doke';
  }

  function changeClassLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'critical') return 'Alteração crítica';
    if (key === 'minor') return 'Alteração menor';
    return 'Alteração relevante';
  }

  function sourceLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'create') return 'Novo anúncio';
    if (key === 'resubmit') return 'Reenvio após ajustes';
    return 'Nova versão';
  }

  function appendText(parent, tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = clean(value);
    parent.appendChild(node);
    return node;
  }

  function createMeta(label, value) {
    var item = document.createElement('div');
    item.className = 'admin-service-review__meta-item';
    appendText(item, 'span', '', label);
    appendText(item, 'strong', '', value || 'Não informado');
    return item;
  }

  function createButton(label, action, modifier) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'doke-btn ' + modifier;
    button.dataset.adminServiceReviewAction = action;
    button.textContent = label;
    return button;
  }

  function createCard(item) {
    var snapshot = item && item.snapshot || {};
    var card = document.createElement('article');
    card.className = 'admin-service-review';
    card.dataset.adminServiceReviewCard = '';
    card.dataset.versionId = clean(item.versionId);

    var header = document.createElement('header');
    header.className = 'admin-service-review__header';
    var heading = document.createElement('div');
    appendText(heading, 'span', 'admin-service-review__eyebrow', sourceLabel(item.source) + ' · versão ' + clean(item.versionNumber));
    appendText(heading, 'h3', 'admin-service-review__title', snapshot.title || item.currentTitle || 'Anúncio sem título');
    appendText(heading, 'p', 'admin-service-review__professional', (item.professionalName || 'Profissional Doke') + (item.professionalEmail ? ' · ' + item.professionalEmail : ''));
    var badge = appendText(header, 'span', 'admin-service-review__badge', changeClassLabel(item.changeClass));
    badge.dataset.tone = clean(item.changeClass) || 'major';
    header.insertBefore(heading, badge);

    var meta = document.createElement('div');
    meta.className = 'admin-service-review__meta';
    meta.appendChild(createMeta('Categoria', snapshot.category));
    meta.appendChild(createMeta('Preço', snapshot.priceLabel || snapshot.priceValue || 'Sob orçamento'));
    meta.appendChild(createMeta('Orçamento', quoteModeLabel(snapshot)));
    meta.appendChild(createMeta('Imagens', Array.isArray(snapshot.images) ? String(snapshot.images.length) : '0'));
    meta.appendChild(createMeta('Enviado', formatDate(item.submittedAt)));

    var description = appendText(card, 'p', 'admin-service-review__description', snapshot.shortDescription || snapshot.description || 'Sem descrição resumida.');
    description.title = description.textContent;

    if (clean(item.currentTitle) && clean(item.currentTitle) !== clean(snapshot.title)) {
      var comparison = document.createElement('div');
      comparison.className = 'admin-service-review__comparison';
      appendText(comparison, 'span', '', 'Versão pública atual');
      appendText(comparison, 'strong', '', item.currentTitle);
      card.appendChild(comparison);
    }

    var actions = document.createElement('div');
    actions.className = 'admin-service-review__actions';
    actions.appendChild(createButton('Solicitar ajustes', 'changes', 'doke-btn--ghost'));
    actions.appendChild(createButton('Rejeitar', 'reject', 'doke-btn--danger'));
    actions.appendChild(createButton('Aprovar', 'approve', 'doke-btn--primary'));

    card.appendChild(header);
    card.appendChild(meta);
    card.appendChild(description);
    card.appendChild(actions);
    return card;
  }

  function render(items) {
    if (!list) return;
    list.replaceChildren();
    countNodes.forEach(function (node) { node.textContent = String(items.length); });
    if (!items.length) {
      var empty = document.createElement('div');
      empty.className = 'admin-service-review__empty';
      appendText(empty, 'strong', '', 'Nenhum anúncio aguardando análise');
      appendText(empty, 'span', '', 'Novos anúncios e alterações relevantes aparecerão aqui.');
      list.appendChild(empty);
      return;
    }
    items.forEach(function (item) { list.appendChild(createCard(item)); });
  }

  function renderLoading() {
    if (!list) return;
    list.replaceChildren();
    var loading = document.createElement('div');
    loading.className = 'admin-service-review__empty';
    loading.setAttribute('role', 'status');
    appendText(loading, 'strong', '', 'Carregando anúncios em análise');
    appendText(loading, 'span', '', 'Consultando a fila de moderação segura.');
    list.appendChild(loading);
  }

  function load(force) {
    if (loadPromise && !force) return loadPromise;
    var repo = repository();
    if (!repo || typeof repo.listQueue !== 'function') {
      render([]);
      return Promise.reject(new Error('A autoridade de moderação de anúncios não está disponível.'));
    }
    renderLoading();
    loadPromise = Promise.resolve(repo.listQueue()).then(function (items) {
      render(Array.isArray(items) ? items : []);
      return items;
    }).catch(function (error) {
      render([]);
      showToast(error && error.message || 'Não foi possível carregar os anúncios em análise.');
      throw error;
    }).finally(function () { loadPromise = null; });
    return loadPromise;
  }

  function closeDialog() {
    if (dialog && dialog.open) dialog.close();
    activeVersionId = '';
    activeAction = '';
    if (reasonInput) reasonInput.value = '';
  }

  function openReasonDialog(action, versionId) {
    activeAction = action;
    activeVersionId = versionId;
    var requestingChanges = action === 'changes';
    if (dialogTitle) dialogTitle.textContent = requestingChanges ? 'Solicitar ajustes no anúncio' : 'Rejeitar anúncio';
    if (dialogDescription) dialogDescription.textContent = requestingChanges
      ? 'Explique o que o profissional precisa corrigir antes de reenviar.'
      : 'Informe claramente por que esta versão não pode ser aprovada.';
    if (submitButton) {
      submitButton.textContent = requestingChanges ? 'Enviar solicitação' : 'Confirmar rejeição';
      submitButton.className = 'doke-btn ' + (requestingChanges ? 'doke-btn--primary' : 'doke-btn--danger');
    }
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    if (reasonInput) window.requestAnimationFrame(function () { reasonInput.focus(); });
  }

  function setCardBusy(versionId, busy) {
    var card = list && list.querySelector('[data-version-id="' + CSS.escape(versionId) + '"]');
    if (!card) return;
    card.querySelectorAll('button').forEach(function (button) {
      button.disabled = busy;
      if (busy) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    });
  }

  function resolve(action, versionId, reason) {
    var repo = repository();
    if (!repo) return Promise.reject(new Error('A autoridade de moderação não está disponível.'));
    var operation;
    if (action === 'approve') operation = repo.approve(versionId);
    else if (action === 'changes') operation = repo.requestChanges(versionId, reason);
    else operation = repo.reject(versionId, reason);

    setCardBusy(versionId, true);
    return Promise.resolve(operation).then(function () {
      closeDialog();
      showToast(action === 'approve' ? 'Anúncio aprovado e publicado.' : action === 'changes' ? 'Ajustes solicitados ao profissional.' : 'Versão rejeitada.');
      document.dispatchEvent(new CustomEvent('doke:service-review-resolved', { detail: { versionId: versionId, action: action } }));
      return load(true);
    }).finally(function () { setCardBusy(versionId, false); });
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var actionButton = event.target.closest('[data-admin-service-review-action]');
      if (actionButton) {
        event.preventDefault();
        var card = actionButton.closest('[data-version-id]');
        var versionId = clean(card && card.dataset.versionId);
        var action = clean(actionButton.dataset.adminServiceReviewAction);
        if (!versionId) return;
        if (action === 'approve') {
          resolve(action, versionId).catch(function (error) { showToast(error && error.message || 'Não foi possível aprovar o anúncio.'); });
        } else {
          openReasonDialog(action, versionId);
        }
        return;
      }

      if (event.target.closest('[data-admin-service-review-dialog-close]')) {
        event.preventDefault();
        closeDialog();
        return;
      }

      if (event.target.closest('[data-admin-service-review-submit]')) {
        event.preventDefault();
        var reason = clean(reasonInput && reasonInput.value);
        if (reason.length < 10) {
          showToast('Informe um motivo com pelo menos 10 caracteres.');
          if (reasonInput) reasonInput.focus();
          return;
        }
        resolve(activeAction, activeVersionId, reason).catch(function (error) {
          showToast(error && error.message || 'Não foi possível concluir a análise.');
        });
      }
    });

    document.addEventListener('doke:service-review-submitted', function () { load(true).catch(function () {}); });
  }

  function observeDashboard() {
    var dashboard = document.querySelector('[data-admin-dashboard]');
    if (!dashboard) return;
    function sync() {
      if (!dashboard.hidden) load().catch(function () {});
    }
    observer = new MutationObserver(sync);
    observer.observe(dashboard, { attributes: true, attributeFilter: ['hidden'] });
    sync();
  }

  function init() {
    root = document.querySelector('[data-admin-service-reviews]');
    list = root;
    countNodes = Array.prototype.slice.call(document.querySelectorAll('[data-admin-stat="service-reviews"]'));
    dialog = document.querySelector('[data-admin-service-review-dialog]');
    dialogTitle = document.querySelector('[data-admin-service-review-dialog-title]');
    dialogDescription = document.querySelector('[data-admin-service-review-dialog-description]');
    reasonInput = document.querySelector('[data-admin-service-review-reason]');
    submitButton = document.querySelector('[data-admin-service-review-submit]');
    if (!root) return;
    bind();
    observeDashboard();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

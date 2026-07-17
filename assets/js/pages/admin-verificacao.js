/* Doke administrative identity review controller
 * Responsibility: guard administrative access, hydrate one verification review,
 * coordinate operational decisions and publish canonical lifecycle states.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var root = document.querySelector('[data-admin-review-root]');
  if (!root) return;

  var objectUrls = [];
  var current = null;
  var loadRun = 0;
  var eventsBound = false;
  var decisionInFlight = false;

  function q(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[character];
    });
  }

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function accessService() {
    return Doke.services && Doke.services.adminAccess || null;
  }

  function verificationService() {
    return Doke.services && Doke.services.professionalIdentityVerification || null;
  }

  function setSurface(state, message) {
    var next = String(state || 'guard-pending');
    var busy = ['guard-pending', 'loading', 'redirecting'].indexOf(next) >= 0;
    var pending = q('[data-admin-review-pending]');
    var pendingTitle = q('[data-admin-review-pending-title]');
    var pendingMessage = q('[data-admin-review-pending-message]');
    var content = q('[data-admin-review-content]');
    var error = q('[data-admin-review-error]');
    var errorMessage = q('[data-admin-review-error-message]');
    var pendingCopy = {
      'guard-pending': ['Validando acesso à análise', 'Confirmando sua sessão e permissões administrativas.'],
      loading: ['Preparando a análise de identidade', 'Carregando os dados e documentos enviados pelo profissional.'],
      redirecting: ['Redirecionando com segurança', 'Você será direcionado para uma área disponível para sua conta.']
    }[next];

    root.dataset.viewState = next;
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (pending) pending.hidden = !busy;
    if (pendingTitle && pendingCopy) pendingTitle.textContent = pendingCopy[0];
    if (pendingMessage && pendingCopy) pendingMessage.textContent = pendingCopy[1];
    if (content) content.hidden = next !== 'ready';
    if (error) error.hidden = next !== 'error';
    if (errorMessage && message) errorMessage.textContent = message;
    if (document.body) document.body.dataset.adminReviewLifecycleState = next;

    if (next === 'error' && error) {
      window.requestAnimationFrame(function () { error.focus(); });
    }
  }

  function beginPage(source) {
    var api = lifecycle();
    if (api && api.page) {
      api.page.begin({
        page: 'admin-verificacao',
        source: source || 'admin-review-controller'
      });
    }
  }

  function readyPage() {
    var api = lifecycle();
    if (api && api.page) {
      api.page.ready({
        page: 'admin-verificacao',
        source: 'admin-review-controller',
        hasItems: true
      });
    }
  }

  function failPage(error) {
    var api = lifecycle();
    if (api && api.page) {
      api.page.fail(error, {
        page: 'admin-verificacao',
        source: 'admin-review-controller'
      });
    }
  }

  function navigate(url, options) {
    var api = lifecycle();
    var go = api && api.navigation && api.navigation.go || Doke.navigation && Doke.navigation.go;
    if (typeof go !== 'function') return Promise.reject(new Error('A navegação canônica não está disponível.'));
    return Promise.resolve(go(url, Object.assign({
      source: 'admin-review-controller',
      forceDocument: true
    }, options || {})));
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR');
  }

  function formatTaxId(value) {
    var digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    return value || 'Não informado';
  }

  function field(label, value) {
    return '<div class="admin-review-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value || 'Não informado') + '</strong></div>';
  }

  function showToast(message) {
    var toast = q('[data-admin-review-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 3200);
  }

  function statusLabel(status) {
    return {
      submitted: 'Enviada',
      under_review: 'Em análise',
      verified: 'Verificada',
      rejected: 'Rejeitada'
    }[status] || status;
  }

  function releaseObjectUrls() {
    objectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
    objectUrls = [];
  }

  function fileCard(file, label) {
    if (!file) {
      return '<article class="admin-review-evidence"><strong>' + escapeHtml(label) + '</strong><span class="admin-review-evidence__meta">Não enviado</span></article>';
    }

    var blob = file.blob;
    var metadata = [
      file.fileName || file.name,
      file.type,
      file.size ? Math.round(file.size / 1024) + ' KB' : ''
    ].filter(Boolean).join(' · ');

    if (!(blob instanceof Blob)) {
      return '<article class="admin-review-evidence"><strong>' + escapeHtml(label) + '</strong><span class="admin-review-evidence__meta">' + escapeHtml(metadata || 'Arquivo legado indisponível') + '</span></article>';
    }

    var url = URL.createObjectURL(blob);
    objectUrls.push(url);
    var image = String(file.type || '').indexOf('image/') === 0;
    return [
      '<article class="admin-review-evidence">',
      '<strong>', escapeHtml(label), '</strong>',
      '<span class="admin-review-evidence__meta">', escapeHtml(metadata), '</span>',
      '<button class="admin-review-evidence__preview" type="button" data-review-file-url="', escapeHtml(url), '" data-review-file-type="', escapeHtml(file.type || ''), '" data-review-file-title="', escapeHtml(label), '">',
      image ? '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(label) + '">' : '<span>Visualizar PDF</span>',
      '</button>',
      '<a class="doke-btn doke-btn--ghost" href="', escapeHtml(url), '" target="_blank" rel="noopener">Abrir arquivo</a>',
      '</article>'
    ].join('');
  }

  function render(verification) {
    releaseObjectUrls();
    current = verification;
    var payload = verification.payload || {};
    var business = payload.verificationType === 'business';

    q('[data-admin-review-identity]').innerHTML = [
      field(business ? 'Razão social' : 'Nome legal', payload.legalName),
      field(business ? 'CNPJ' : 'CPF', formatTaxId(payload.taxId || payload.taxIdLast4)),
      business ? field('Responsável legal', payload.representativeName) : field('Nascimento', payload.birthDate),
      field('Tipo de documento', payload.documentType)
    ].join('');

    var address = [payload.street, payload.number, payload.complement, payload.district, payload.city, payload.state]
      .filter(Boolean)
      .join(', ');
    q('[data-admin-review-address]').innerHTML = field('CEP', payload.postalCode)
      + field('Endereço completo', address || [payload.city, payload.state].filter(Boolean).join(', '));

    var files = [payload.documentFront, payload.documentBack, payload.selfieDocument, payload.proofOfAddress]
      .concat(business ? [payload.businessDocument] : []);
    var fullEvidence = files.every(function (file) { return file && file.blob instanceof Blob; });
    var notice = q('[data-admin-review-notice]');
    notice.hidden = fullEvidence;
    notice.className = 'admin-review-notice';
    notice.textContent = fullEvidence ? '' : 'Este envio é anterior à persistência documental completa. Não aprove sem revisar os arquivos originais.';

    q('[data-admin-review-evidence]').innerHTML = fileCard(payload.documentFront, 'Frente do documento')
      + fileCard(payload.documentBack, 'Verso do documento')
      + fileCard(payload.selfieDocument, 'Selfie de verificação')
      + fileCard(payload.proofOfAddress, 'Comprovante de endereço')
      + (business ? fileCard(payload.businessDocument, 'Documento empresarial') : '');

    q('[data-admin-review-summary]').innerHTML = [
      '<div><dt>Status</dt><dd>', escapeHtml(statusLabel(verification.status)), '</dd></div>',
      '<div><dt>Usuário</dt><dd>', escapeHtml(verification.userId), '</dd></div>',
      '<div><dt>Arquivos</dt><dd>', String(files.filter(Boolean).length), '</dd></div>',
      '<div><dt>Última atualização</dt><dd>', escapeHtml(formatDate(verification.updatedAt)), '</dd></div>'
    ].join('');

    q('[data-admin-review-approve]').hidden = verification.status !== 'under_review' || !fullEvidence;
    q('[data-admin-review-reject]').hidden = verification.status !== 'under_review';
    setSurface('ready');
    readyPage();
  }

  function fail(error) {
    var normalized = error instanceof Error ? error : new Error(String(error || 'Não foi possível carregar a análise.'));
    setSurface('error', normalized.message);
    failPage(normalized);
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function setDecisionBusy(busy, kind) {
    var actions = q('[data-admin-review-actions]');
    if (actions) actions.setAttribute('aria-busy', busy ? 'true' : 'false');
    var approveButton = q('[data-admin-review-approve]');
    var rejectConfirmButton = q('[data-admin-review-reject-confirm]');
    if (approveButton) {
      if (!approveButton.dataset.idleLabel) approveButton.dataset.idleLabel = approveButton.textContent.trim();
      approveButton.textContent = busy && kind === 'approved' ? 'Aprovando…' : approveButton.dataset.idleLabel;
    }
    if (rejectConfirmButton) {
      if (!rejectConfirmButton.dataset.idleLabel) rejectConfirmButton.dataset.idleLabel = rejectConfirmButton.textContent.trim();
      rejectConfirmButton.textContent = busy && kind === 'rejected' ? 'Rejeitando…' : rejectConfirmButton.dataset.idleLabel;
    }
    [
      '[data-admin-review-approve]',
      '[data-admin-review-reject]',
      '[data-admin-review-reject-confirm]',
      '[data-admin-review-reject-close]'
    ].forEach(function (selector) {
      document.querySelectorAll(selector).forEach(function (button) { button.disabled = Boolean(busy); });
    });
  }

  function showDecisionSuccess(kind) {
    var dialog = q('[data-admin-decision-success]');
    if (!dialog) return Promise.resolve();
    var approved = kind === 'approved';
    q('[data-admin-decision-success-eyebrow]').textContent = approved ? 'Perfil profissional ativado' : 'Verificação rejeitada';
    q('[data-admin-decision-success-title]').textContent = approved ? 'Aprovação concluída' : 'Rejeição concluída';
    q('[data-admin-decision-success-message]').textContent = approved
      ? 'O perfil foi ativado. Retornando ao painel administrativo.'
      : 'O motivo foi registrado. Retornando ao painel administrativo.';
    dialog.hidden = false;
    document.body.classList.add('admin-decision-success-open');
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
    else dialog.setAttribute('open', '');
    return new Promise(function (resolve) { window.setTimeout(resolve, 280); });
  }

  function closeDecisionSuccess() {
    var dialog = q('[data-admin-decision-success]');
    if (!dialog) return;
    closeDialog(dialog);
    dialog.hidden = true;
    document.body.classList.remove('admin-decision-success-open');
  }

  function goToAdmin(replace) {
    return navigate('admin.html', {
      replace: replace === true,
      source: replace ? 'admin-review-decision-complete' : 'admin-review-back'
    }).catch(function () {
      if (replace === true) window.location.replace('admin.html');
      else window.location.assign('admin.html');
    });
  }

  function handleDecision(operation, kind, errorMessage) {
    if (decisionInFlight) return Promise.resolve(null);
    decisionInFlight = true;
    setDecisionBusy(true, kind);
    showToast(kind === 'approved' ? 'Aprovando e ativando o perfil…' : 'Registrando a rejeição…');
    return Promise.resolve()
      .then(function () { return operation(); })
      .then(function () { return showDecisionSuccess(kind); })
      .then(function () { return goToAdmin(true); })
      .catch(function (error) {
        decisionInFlight = false;
        closeDecisionSuccess();
        setDecisionBusy(false, kind);
        showToast(error && error.message ? error.message : errorMessage);
        throw error;
      })
      .catch(function () { return null; });
  }

  function loadReview() {
    var runId = ++loadRun;
    current = null;
    releaseObjectUrls();
    setSurface('guard-pending');
    beginPage('admin-review-access-guard');

    var access = accessService();
    if (!access || typeof access.guardPage !== 'function') {
      fail(new Error('O serviço de acesso administrativo não está disponível.'));
      return Promise.resolve(null);
    }

    return access.guardPage({
      name: 'admin-verification-access',
      source: 'admin-verificacao.html',
      deniedRedirect: 'pedidos.html',
      loginRedirect: 'auth/login.html'
    }).then(function (result) {
      if (runId !== loadRun) return null;
      if (!result || result.allowed !== true) {
        setSurface(result && result.redirecting ? 'redirecting' : 'error', 'Acesso restrito ao suporte Doke.');
        return null;
      }

      setSurface('loading');
      var id = new URLSearchParams(window.location.search).get('id');
      var service = verificationService();
      if (!id) throw new Error('A verificação solicitada não foi informada.');
      if (!service || typeof service.getReviewDetail !== 'function') {
        throw new Error('O serviço de verificação não está disponível.');
      }

      return service.getReviewDetail(id).then(function (verification) {
        if (runId !== loadRun) return null;
        if (!verification) throw new Error('Verificação não encontrada.');
        render(verification);
        return verification;
      });
    }).catch(function (error) {
      if (runId === loadRun) fail(error);
      return null;
    });
  }

  function bind() {
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener('click', function (event) {
      var back = event.target.closest('[data-admin-review-back]');
      if (back) {
        event.preventDefault();
        goToAdmin(false).catch(function (error) { fail(error); });
        return;
      }

      if (event.target.closest('[data-admin-review-retry]')) {
        event.preventDefault();
        loadReview();
        return;
      }

      var fileButton = event.target.closest('[data-review-file-url]');
      if (fileButton) {
        var viewer = q('[data-admin-review-viewer]');
        var viewerBody = q('[data-admin-review-viewer-body]');
        q('[data-admin-review-viewer-title]').textContent = fileButton.dataset.reviewFileTitle || 'Documento';
        viewerBody.innerHTML = String(fileButton.dataset.reviewFileType || '').indexOf('application/pdf') === 0
          ? '<iframe src="' + escapeHtml(fileButton.dataset.reviewFileUrl) + '" title="Documento"></iframe>'
          : '<img src="' + escapeHtml(fileButton.dataset.reviewFileUrl) + '" alt="Documento">';
        if (typeof viewer.showModal === 'function') viewer.showModal();
        else viewer.setAttribute('open', '');
        return;
      }

      if (event.target.closest('[data-admin-review-viewer-close]')) {
        closeDialog(q('[data-admin-review-viewer]'));
        return;
      }

      if (event.target.closest('[data-admin-review-reject]')) {
        var rejectDialog = q('[data-admin-review-reject-dialog]');
        if (typeof rejectDialog.showModal === 'function') rejectDialog.showModal();
        else rejectDialog.setAttribute('open', '');
        return;
      }

      if (event.target.closest('[data-admin-review-reject-close]')) {
        closeDialog(q('[data-admin-review-reject-dialog]'));
        return;
      }

      if (event.target.closest('[data-admin-review-approve]')) {
        if (!current || !window.confirm('Aprovar esta identidade e ativar o perfil profissional?')) return;
        var approveService = verificationService();
        if (!approveService || typeof approveService.approve !== 'function') {
          showToast('O serviço de aprovação não está disponível.');
          return;
        }
        handleDecision(function () { return approveService.approve(current.id); }, 'approved', 'Falha ao aprovar.');
        return;
      }

      if (event.target.closest('[data-admin-review-reject-confirm]')) {
        var reasonInput = q('[data-admin-review-reason]');
        var reason = String(reasonInput && reasonInput.value || '').trim();
        if (reason.length < 10) {
          showToast('Informe um motivo com pelo menos 10 caracteres.');
          if (reasonInput) reasonInput.focus();
          return;
        }
        var rejectService = verificationService();
        if (!current || !rejectService || typeof rejectService.reject !== 'function') {
          showToast('O serviço de rejeição não está disponível.');
          return;
        }
        closeDialog(q('[data-admin-review-reject-dialog]'));
        handleDecision(function () { return rejectService.reject(current.id, reason); }, 'rejected', 'Falha ao rejeitar.');
      }
    });

    window.addEventListener('beforeunload', releaseObjectUrls);
  }

  function init() {
    root = document.querySelector('[data-admin-review-root]');
    if (!root) return;
    bind();
    loadReview();
  }

  window.DokeInitAdminVerification = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());

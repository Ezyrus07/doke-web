/* Doke Help Support Experience
   Responsibility: support ticket draft, verified submission, state and service discovery.
   It does not provide a fake ticket repository or claim success without a persisted ticket id. */
(function () {
  'use strict';

  var root = window;
  var documentRef = root.document;
  var Doke = root.Doke || (root.Doke = {});
  var DRAFT_PREFIX = 'doke.support-ticket-draft.v1:';
  var DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
  var inFlight = null;

  function text(value) { return String(value == null ? '' : value).trim(); }
  function currentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.user ? parsed.user : null;
    } catch (error) { return null; }
  }
  function userId() { var user = currentUser(); return text(user && user.id) || 'guest'; }
  function key() { return DRAFT_PREFIX + userId(); }

  function setState(state, detail) {
    var boundary = documentRef.querySelector('[data-state-boundary="ajuda"]');
    if (boundary) {
      boundary.dataset.viewState = state;
      boundary.setAttribute('aria-busy', state === 'loading' || state === 'submitting' ? 'true' : 'false');
    }
    if (documentRef.body) documentRef.body.dataset.helpExperienceState = state;
    if (Doke.experience && Doke.experience.states && typeof Doke.experience.states.set === 'function') {
      Doke.experience.states.set(boundary || documentRef.body, state, detail || {});
    }
  }

  function saveDraft(payload) {
    var record = { payload: payload || {}, savedAt: Date.now() };
    root.localStorage.setItem(key(), JSON.stringify(record));
    var confirmed = JSON.parse(root.localStorage.getItem(key()) || 'null');
    if (!confirmed || !confirmed.savedAt) throw new Error('Não foi possível preservar o rascunho do chamado.');
    return record.payload;
  }

  function readDraft() {
    try {
      var record = JSON.parse(root.localStorage.getItem(key()) || 'null');
      if (!record || !record.savedAt || Date.now() - Number(record.savedAt) > DRAFT_TTL_MS) {
        root.localStorage.removeItem(key());
        return null;
      }
      return record.payload || null;
    } catch (error) { return null; }
  }

  function clearDraft() { try { root.localStorage.removeItem(key()); } catch (error) {} }

  function resolveSupportService() {
    var candidates = [
      Doke.services && Doke.services.support,
      Doke.services && Doke.services.supportTickets,
      Doke.supportService,
      Doke.supportTickets
    ].filter(Boolean);
    return candidates.find(function (service) {
      return typeof service.createTicket === 'function' || typeof service.create === 'function' || typeof service.submit === 'function';
    }) || null;
  }

  function createTicket(service, payload) {
    if (typeof service.createTicket === 'function') return service.createTicket(payload);
    if (typeof service.create === 'function') return service.create(payload);
    if (typeof service.submit === 'function') return service.submit(payload);
    return Promise.reject(Object.assign(new Error('O envio de chamados ainda não está disponível.'), { code: 'support_unavailable' }));
  }

  function listTickets() {
    var service = resolveSupportService();
    if (!service) return Promise.reject(Object.assign(new Error('O histórico de chamados ainda não está conectado a uma fonte de dados.'), { code: 'support_unavailable' }));
    var fn = service.listTickets || service.list || service.getAll;
    if (typeof fn !== 'function') return Promise.reject(Object.assign(new Error('O histórico de chamados ainda não está disponível.'), { code: 'support_unavailable' }));
    return Promise.resolve(fn.call(service, { userId: userId() }));
  }

  function submit(payload) {
    if (inFlight) return inFlight;
    var normalized = {
      subject: text(payload && payload.subject),
      category: text(payload && payload.category),
      message: text(payload && payload.message),
      userId: userId(),
      source: 'help-center',
      status: 'open',
      createdAt: new Date().toISOString()
    };
    if (!normalized.subject || !normalized.category || !normalized.message) {
      return Promise.reject(Object.assign(new Error('Preencha assunto, categoria e descrição.'), { code: 'validation_error' }));
    }

    saveDraft(normalized);
    var service = resolveSupportService();
    if (!service) {
      return Promise.reject(Object.assign(new Error('O canal de abertura de chamados ainda não está conectado. Seu rascunho foi preservado.'), { code: 'support_unavailable' }));
    }

    setState('submitting');
    inFlight = Promise.resolve(createTicket(service, normalized)).then(function (ticket) {
      if (!ticket || !text(ticket.id || ticket.ticketId)) throw new Error('O suporte não confirmou o protocolo do chamado.');
      clearDraft();
      setState('success', { ticketId: ticket.id || ticket.ticketId });
      documentRef.dispatchEvent(new CustomEvent('doke:support-ticket-created', { detail: { ticket: ticket } }));
      return ticket;
    }).catch(function (error) {
      setState(root.navigator && root.navigator.onLine === false ? 'offline' : 'error', { error: error });
      throw error;
    }).finally(function () { inFlight = null; });
    return inFlight;
  }

  Doke.supportHelpExperience = Object.freeze({
    init: function () { setState('ready'); return readDraft(); },
    readDraft: readDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft,
    submit: submit,
    listTickets: listTickets,
    setState: setState,
    isSubmitting: function () { return Boolean(inFlight); }
  });
})();

(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  var core = Doke.formExperienceCore;
  if (!core) return;
  var boundary = document.querySelector('[data-state-boundary="ajuda"]');
  var setState = core.createStateController({ boundary: boundary, bodyDatasetKey: 'helpExperienceState' });
  var store = core.createDraftStore({ prefix: 'doke.support-ticket-draft.v1' });
  var mutations = core.createMutationGuard();

  function resolveService() {
    return [Doke.services?.support, Doke.services?.supportTickets, Doke.supportService, Doke.supportTickets]
      .filter(Boolean)
      .find((service) => typeof service.createTicket === 'function' || typeof service.create === 'function' || typeof service.submit === 'function') || null;
  }
  function createTicket(service, payload) {
    if (typeof service.createTicket === 'function') return service.createTicket(payload);
    if (typeof service.create === 'function') return service.create(payload);
    if (typeof service.submit === 'function') return service.submit(payload);
    throw new Error('O envio de chamados ainda não está disponível.');
  }
  function submit(payload) {
    return mutations.run('support-ticket', async function () {
      var normalized = {
        subject: core.normalize(payload?.subject), category: core.normalize(payload?.category), message: core.normalize(payload?.message),
        userId: core.currentUserId(), source: 'help-center', status: 'open', createdAt: new Date().toISOString()
      };
      if (!normalized.subject || !normalized.category || !normalized.message) throw new Error('Preencha assunto, categoria e descrição.');
      store.write(normalized);
      var service = resolveService();
      if (!service) throw new Error('O canal de abertura de chamados ainda não está conectado. Seu rascunho foi preservado.');
      setState('submitting');
      try {
        var ticket = await createTicket(service, normalized);
        if (!core.normalize(ticket?.id || ticket?.ticketId)) throw new Error('O suporte não confirmou o protocolo do chamado.');
        store.clear(); setState('success', { ticketId: ticket.id || ticket.ticketId });
        document.dispatchEvent(new CustomEvent('doke:support-ticket-created', { detail: { ticket } }));
        return ticket;
      } catch (error) { setState(navigator.onLine === false ? 'offline' : 'error', { error }); throw error; }
    });
  }
  function listTickets() {
    var service = resolveService();
    var fn = service && (service.listTickets || service.list || service.getAll);
    if (typeof fn !== 'function') return Promise.reject(new Error('O histórico de chamados ainda não está disponível.'));
    return Promise.resolve(fn.call(service, { userId: core.currentUserId() }));
  }
  Doke.supportHelpExperience = Object.freeze({
    init: function () { setState('ready'); return store.read(); },
    readDraft: store.read, saveDraft: store.write, clearDraft: store.clear, submit, listTickets, setState,
    isSubmitting: function () { return mutations.isRunning('support-ticket'); }
  });
})();

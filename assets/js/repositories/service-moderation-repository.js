(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};

  var FUNCTION_NAME = 'service-moderation-operations';

  function getClient() {
    var client = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
    if (!client) throw new Error('A conexão segura com o Supabase não está disponível.');
    return client;
  }

  function unwrap(result, fallbackMessage) {
    if (result && result.error) {
      var message = result.error.message || fallbackMessage;
      throw new Error(message || 'A operação administrativa não pôde ser concluída.');
    }
    return result ? result.data : null;
  }

  function invoke(action, payload, fallbackMessage) {
    var client = getClient();
    if (!client.functions || typeof client.functions.invoke !== 'function') {
      return Promise.reject(new Error('A operação segura de moderação não está disponível.'));
    }
    var body = Object.assign({ action: action }, payload || {});
    return client.functions.invoke(FUNCTION_NAME, { body: body }).then(function (result) {
      return unwrap(result, fallbackMessage);
    });
  }

  function listQueue() {
    return invoke('list', null, 'Não foi possível carregar a fila de anúncios.').then(function (data) {
      return data && Array.isArray(data.items) ? data.items : [];
    });
  }

  function getReviewDetail(versionId) {
    var target = String(versionId || '').trim();
    if (!target) return Promise.reject(new Error('A versão para análise não foi informada.'));
    return invoke('detail', { versionId: target }, 'Não foi possível carregar o histórico desta versão.').then(function (data) {
      return data ? data.item : null;
    });
  }

  function listAuditEvents(limit) {
    var requested = Number(limit || 20);
    if (!Number.isFinite(requested)) requested = 20;
    requested = Math.max(1, Math.min(100, Math.round(requested)));
    return invoke('audit', { limit: requested }, 'Não foi possível carregar a auditoria de anúncios.').then(function (data) {
      return data && Array.isArray(data.items) ? data.items : [];
    });
  }

  function approve(versionId) {
    return invoke('approve', { versionId: versionId }, 'Não foi possível aprovar o anúncio.');
  }

  function requestChanges(versionId, reason) {
    return invoke('request_changes', {
      versionId: versionId,
      reason: reason
    }, 'Não foi possível solicitar ajustes.');
  }

  function reject(versionId, reason) {
    return invoke('reject', {
      versionId: versionId,
      reason: reason
    }, 'Não foi possível rejeitar o anúncio.');
  }

  Doke.repositories.serviceModeration = Object.freeze({
    listQueue: listQueue,
    getReviewDetail: getReviewDetail,
    listAuditEvents: listAuditEvents,
    approve: approve,
    requestChanges: requestChanges,
    reject: reject
  });
})(window);

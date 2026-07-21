(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};

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

  function listQueue() {
    return getClient().rpc('list_service_review_queue').then(function (result) {
      var data = unwrap(result, 'Não foi possível carregar a fila de anúncios.');
      return Array.isArray(data) ? data : [];
    });
  }

  function getReviewDetail(versionId) {
    var target = String(versionId || '').trim();
    if (!target) return Promise.reject(new Error('A versão para análise não foi informada.'));
    return getClient().rpc('get_service_review_detail', { p_version_id: target }).then(function (result) {
      return unwrap(result, 'Não foi possível carregar o histórico desta versão.');
    });
  }

  function listAuditEvents(limit) {
    var requested = Number(limit || 20);
    if (!Number.isFinite(requested)) requested = 20;
    requested = Math.max(1, Math.min(100, Math.round(requested)));
    return getClient().rpc('list_service_moderation_audit', { p_limit: requested }).then(function (result) {
      var data = unwrap(result, 'Não foi possível carregar a auditoria de anúncios.');
      return Array.isArray(data) ? data : [];
    });
  }

  function approve(versionId) {
    return getClient().rpc('approve_service_version', { p_version_id: versionId }).then(function (result) {
      return unwrap(result, 'Não foi possível aprovar o anúncio.');
    });
  }

  function requestChanges(versionId, reason) {
    return getClient().rpc('request_service_version_changes', {
      p_version_id: versionId,
      p_reason: reason
    }).then(function (result) {
      return unwrap(result, 'Não foi possível solicitar ajustes.');
    });
  }

  function reject(versionId, reason) {
    return getClient().rpc('reject_service_version', {
      p_version_id: versionId,
      p_reason: reason
    }).then(function (result) {
      return unwrap(result, 'Não foi possível rejeitar o anúncio.');
    });
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

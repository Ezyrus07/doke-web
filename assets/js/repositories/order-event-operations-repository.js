(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};
  if (Doke.repositories.orderEventOperations) return;

  var FUNCTION_NAME = 'order-event-operations';

  function getClient() {
    var client = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      throw new Error('A conexão segura com as operações de pedidos não está disponível.');
    }
    return client;
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function userMessage(code) {
    var messages = {
      DOKE_ORDER_OPS_AUTH_REQUIRED: 'Sua sessão expirou. Entre novamente para acessar a operação de pedidos.',
      DOKE_ORDER_OPS_ROLE_REQUIRED: 'Somente suporte ou administração pode acessar esta operação.',
      DOKE_ORDER_EVENT_KEY_REQUIRED: 'O evento para reprocessamento não foi informado.',
      DOKE_ORDER_EVENT_REQUEUE_NOTE_REQUIRED: 'Informe um motivo com pelo menos 10 caracteres.',
      DOKE_ORDER_EVENT_NOT_FOUND: 'Este evento não foi encontrado.',
      DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED: 'Somente eventos em retry ou dead-letter podem ser reprocessados.',
      DOKE_ORDER_EVENT_ATTEMPT_LIMIT_REACHED: 'O limite operacional de tentativas deste evento foi atingido.',
      DOKE_ORDER_INCIDENT_ID_REQUIRED: 'O incidente não foi informado.',
      DOKE_ORDER_INCIDENT_ACTION_INVALID: 'A ação solicitada para o incidente é inválida.',
      DOKE_ORDER_INCIDENT_NOTE_REQUIRED: 'Registre uma observação com pelo menos 5 caracteres.',
      DOKE_ORDER_INCIDENT_NOT_FOUND: 'Este incidente não foi encontrado.',
      DOKE_ORDER_INCIDENT_CLOSED: 'Este incidente já foi resolvido automaticamente.',
      DOKE_ORDER_INCIDENT_ALREADY_OWNED: 'Este incidente já possui outro responsável.',
      DOKE_ORDER_INCIDENT_ASSIGN_ADMIN_REQUIRED: 'Somente administradores podem atribuir incidentes a outro operador.',
      DOKE_ORDER_INCIDENT_ASSIGNEE_REQUIRED: 'Selecione um responsável para o incidente.',
      DOKE_ORDER_INCIDENT_ASSIGNEE_INVALID: 'O responsável selecionado não está ativo em suporte ou administração.',
      DOKE_ORDER_RUNBOOK_ALERT_REQUIRED: 'O incidente do runbook não foi informado.',
      DOKE_ORDER_RUNBOOK_ALERT_NOT_FOUND: 'O incidente do runbook não foi encontrado.',
      DOKE_ORDER_RUNBOOK_ALERT_CLOSED: 'O incidente já foi resolvido ou mudou de ciclo. Gere uma nova prévia.',
      DOKE_ORDER_RUNBOOK_NOT_AVAILABLE: 'Não há runbook seguro disponível para este incidente.',
      DOKE_ORDER_RUNBOOK_PREVIEW_NOT_FOUND: 'A prévia do runbook não foi encontrada.',
      DOKE_ORDER_RUNBOOK_PREVIEW_EXPIRED: 'A prévia expirou. Gere uma nova antes de executar.',
      DOKE_ORDER_RUNBOOK_PREVIEW_USED: 'Esta prévia já foi utilizada.',
      DOKE_ORDER_RUNBOOK_TOKEN_INVALID: 'A autorização efêmera do runbook é inválida.',
      DOKE_ORDER_RUNBOOK_ADMIN_REQUIRED: 'Esta remediação exige uma conta administrativa.',
      DOKE_ORDER_RUNBOOK_CONFIRMATION_INVALID: 'Digite exatamente a frase de confirmação exibida.',
      DOKE_ORDER_RUNBOOK_NOTE_REQUIRED: 'Informe uma justificativa com pelo menos 10 caracteres.',
      DOKE_ORDER_RUNBOOK_PREVIEW_STALE: 'O impacto mudou desde a prévia. Revise os dados novamente.',
      DOKE_ORDER_RUNBOOK_EVENT_REQUIRED: 'Selecione o evento que será reprocessado.',
      DOKE_ORDER_RUNBOOK_EVENT_INVALID: 'O evento selecionado não está mais elegível.',
      DOKE_ORDER_RUNBOOK_EXECUTION_FAILED: 'A remediação falhou e foi registrada para análise.',
      DOKE_ORDER_POST_INCIDENT_REVIEW_REQUIRED: 'A análise pós-incidente não foi informada.',
      DOKE_ORDER_POST_INCIDENT_ACTION_INVALID: 'A ação da análise pós-incidente é inválida.',
      DOKE_ORDER_POST_INCIDENT_CATEGORY_INVALID: 'Selecione uma categoria válida para a causa raiz.',
      DOKE_ORDER_POST_INCIDENT_FACTORS_INVALID: 'Os fatores contribuintes enviados são inválidos.',
      DOKE_ORDER_POST_INCIDENT_NOT_FOUND: 'A análise pós-incidente não foi encontrada.',
      DOKE_ORDER_POST_INCIDENT_ADMIN_REQUIRED: 'Somente administradores podem concluir ou reabrir a análise.',
      DOKE_ORDER_POST_INCIDENT_ALREADY_DRAFT: 'A análise já está em rascunho.',
      DOKE_ORDER_POST_INCIDENT_COMPLETED: 'A análise já foi concluída. Reabra antes de editar.',
      DOKE_ORDER_POST_INCIDENT_COMPLETION_INCOMPLETE: 'Preencha categoria, causa, impacto, detecção, prevenção, aprendizado e ao menos uma ação preventiva com prazo.',
      DOKE_ORDER_PREVENTION_ACTION_INVALID: 'A ação preventiva solicitada é inválida.',
      DOKE_ORDER_PREVENTION_TITLE_REQUIRED: 'Descreva a ação preventiva com pelo menos 10 caracteres.',
      DOKE_ORDER_PREVENTION_DUE_REQUIRED: 'Defina um prazo para a ação preventiva.',
      DOKE_ORDER_PREVENTION_OWNER_INVALID: 'Selecione um responsável ativo de suporte ou administração.',
      DOKE_ORDER_PREVENTION_ASSIGN_ADMIN_REQUIRED: 'Somente administradores podem atribuir a ação a outra pessoa.',
      DOKE_ORDER_PREVENTION_ACTION_REQUIRED: 'A ação preventiva não foi informada.',
      DOKE_ORDER_PREVENTION_NOT_FOUND: 'A ação preventiva não foi encontrada.',
      DOKE_ORDER_PREVENTION_OWNER_REQUIRED: 'Somente o responsável ou um administrador pode alterar esta ação.',
      DOKE_ORDER_PREVENTION_ADMIN_REQUIRED: 'Somente administradores podem cancelar esta ação.',
      DOKE_ORDER_CHANGE_ID_REQUIRED: 'A mudança operacional não foi informada.',
      DOKE_ORDER_CHANGE_NOT_FOUND: 'Esta mudança operacional não foi encontrada.',
      DOKE_ORDER_CHANGE_KEY_INVALID: 'Use uma chave de mudança válida com pelo menos 6 caracteres.',
      DOKE_ORDER_CHANGE_TYPE_INVALID: 'Selecione um tipo de mudança válido.',
      DOKE_ORDER_CHANGE_RISK_INVALID: 'Selecione um nível de risco válido.',
      DOKE_ORDER_CHANGE_TITLE_REQUIRED: 'Informe um título com pelo menos 5 caracteres.',
      DOKE_ORDER_CHANGE_KEY_FINALIZED: 'Esta chave já pertence a uma mudança finalizada.',
      DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED: 'Somente administradores podem aprovar uma exceção temporária.',
      DOKE_ORDER_CHANGE_OVERRIDE_REASON_REQUIRED: 'Explique a exceção com pelo menos 20 caracteres.',
      DOKE_ORDER_CHANGE_HARD_BLOCKED: 'A mudança está bloqueada pelo estado atual de confiabilidade.',
      DOKE_ORDER_CHANGE_OVERRIDE_NOT_REQUIRED: 'Esta mudança não precisa de aprovação excepcional.',
      DOKE_ORDER_CHANGE_APPROVAL_REQUIRED: 'A mudança exige aprovação administrativa antes da execução.',
      DOKE_ORDER_CHANGE_BLOCKED: 'A mudança não pode ser executada enquanto a proteção estiver degradada.',
      DOKE_ORDER_CHANGE_CONFIRMATION_INVALID: 'Digite exatamente a frase de liberação exibida.',
      DOKE_ORDER_CHANGE_OUTCOME_INVALID: 'Selecione um resultado válido para a mudança.',
      DOKE_ORDER_CHANGE_COMPLETION_NOTE_REQUIRED: 'Registre o resultado com pelo menos 10 caracteres.',
      DOKE_ORDER_CHANGE_NOT_STARTED: 'A mudança ainda não foi iniciada.',
      DOKE_ORDER_OPS_FAILED: 'A operação do worker não pôde ser concluída.'
    };
    return messages[code] || messages.DOKE_ORDER_OPS_FAILED;
  }

  function parseInvokeError(result, fallback) {
    if (!result || !result.error) return Promise.resolve(result ? result.data : null);
    var error = result.error;
    var context = error && error.context;
    if (context && typeof context.json === 'function') {
      return Promise.resolve(context.json()).catch(function () { return null; }).then(function (payload) {
        var code = clean(payload && payload.error);
        throw new Error(code ? userMessage(code) : clean(error.message) || fallback);
      });
    }
    throw new Error(clean(error && error.message) || fallback);
  }

  function invoke(action, payload, fallback) {
    var body = Object.assign({ action: action }, payload || {});
    return Promise.resolve(getClient().functions.invoke(FUNCTION_NAME, { body: body })).then(function (result) {
      return parseInvokeError(result, fallback || 'Não foi possível concluir a operação.');
    });
  }

  function getDashboard(options) {
    options = options || {};
    return invoke('dashboard', {
      eventLimit: Number(options.eventLimit || 50),
      runLimit: Number(options.runLimit || 20),
      alertLimit: Number(options.alertLimit || 20),
      runbookLimit: Number(options.runbookLimit || 20),
      postIncidentLimit: Number(options.postIncidentLimit || 20),
      changeLimit: Number(options.changeLimit || 30)
    }, 'Não foi possível carregar a saúde do worker.');
  }

  function requeue(eventKey, note) {
    return invoke('requeue', {
      eventKey: clean(eventKey),
      note: clean(note)
    }, 'Não foi possível reprocessar o evento.');
  }

  function runNow(note) {
    return invoke('run_now', { note: clean(note) }, 'Não foi possível solicitar a execução do worker.');
  }

  function updateIncident(alertId, incidentAction, note, assigneeId) {
    return invoke('incident_update', {
      alertId: clean(alertId),
      incidentAction: clean(incidentAction),
      note: clean(note),
      assigneeId: clean(assigneeId) || null
    }, 'Não foi possível atualizar o incidente.');
  }

  function previewRunbook(alertId) {
    return invoke('runbook_preview', {
      alertId: clean(alertId)
    }, 'Não foi possível preparar a remediação.');
  }

  function executeRunbook(payload) {
    payload = payload || {};
    return invoke('runbook_execute', {
      previewId: clean(payload.previewId),
      approvalToken: clean(payload.approvalToken),
      confirmationText: clean(payload.confirmationText),
      note: clean(payload.note),
      selectedEventKey: clean(payload.selectedEventKey) || null
    }, 'Não foi possível executar a remediação.');
  }

  function updatePostIncident(reviewId, reviewAction, payload) {
    return invoke('post_incident_update', {
      reviewId: clean(reviewId),
      reviewAction: clean(reviewAction),
      payload: payload && typeof payload === 'object' ? payload : {}
    }, 'Não foi possível atualizar a análise pós-incidente.');
  }

  function updatePreventionAction(reviewId, preventionActionId, preventionAction, payload) {
    return invoke('prevention_action_update', {
      reviewId: clean(reviewId),
      preventionActionId: clean(preventionActionId) || null,
      preventionAction: clean(preventionAction),
      payload: payload && typeof payload === 'object' ? payload : {}
    }, 'Não foi possível atualizar a ação preventiva.');
  }

  function registerChange(payload) {
    payload = payload || {};
    return invoke('change_register', {
      externalKey: clean(payload.externalKey),
      changeType: clean(payload.changeType),
      riskLevel: clean(payload.riskLevel),
      title: clean(payload.title),
      description: clean(payload.description),
      changeReference: clean(payload.changeReference),
      metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
    }, 'Não foi possível registrar a mudança operacional.');
  }

  function approveChange(changeId, reason, validMinutes) {
    return invoke('change_approve', {
      changeId: clean(changeId),
      reason: clean(reason),
      validMinutes: Number(validMinutes || 60)
    }, 'Não foi possível aprovar a exceção temporária.');
  }

  function startChange(changeId, confirmationText, executionReference) {
    return invoke('change_start', {
      changeId: clean(changeId),
      confirmationText: clean(confirmationText),
      executionReference: clean(executionReference)
    }, 'Não foi possível liberar a execução da mudança.');
  }

  function completeChange(changeId, outcome, note) {
    return invoke('change_complete', {
      changeId: clean(changeId),
      outcome: clean(outcome),
      note: clean(note)
    }, 'Não foi possível concluir o registro da mudança.');
  }

  Doke.repositories.orderEventOperations = Object.freeze({
    getDashboard: getDashboard,
    requeue: requeue,
    runNow: runNow,
    updateIncident: updateIncident,
    previewRunbook: previewRunbook,
    executeRunbook: executeRunbook,
    updatePostIncident: updatePostIncident,
    updatePreventionAction: updatePreventionAction,
    registerChange: registerChange,
    approveChange: approveChange,
    startChange: startChange,
    completeChange: completeChange
  });
})(window);

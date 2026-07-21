(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};

  var FUNCTION_NAME = 'quote-template-ai';
  var MAX_SUGGESTIONS = 8;

  function text(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength || 200);
  }

  function getClient() {
    var client = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
    if (!client) throw new Error('Conecte-se à internet para usar a otimização assistida.');
    return client;
  }

  function errorMessage(code, fallback) {
    var messages = {
      AUTH_REQUIRED: 'Faça login novamente para usar a otimização assistida.',
      PROFESSIONAL_VERIFICATION_REQUIRED: 'A otimização está disponível somente para profissionais ativos e verificados.',
      SERVICE_OWNERSHIP_REQUIRED: 'Este anúncio não pertence à sua conta profissional.',
      SERVICE_NOT_FOUND: 'O anúncio informado não foi encontrado. Reabra a edição e tente novamente.',
      QUESTIONS_REQUIRED: 'Adicione pelo menos uma pergunta antes de gerar sugestões.',
      RATE_LIMIT_SHORT: 'Você fez várias análises em poucos minutos. Aguarde um pouco e tente novamente.',
      RATE_LIMIT_DAILY: 'O limite diário de otimizações foi atingido.',
      AI_RUN_NOT_FOUND: 'Esta análise não está mais disponível. Gere novas sugestões.',
      AI_RUN_ALREADY_APPLIED: 'Esta análise já foi aplicada com outra seleção.',
      UNKNOWN_SUGGESTION_SELECTED: 'Uma das sugestões selecionadas não pertence a esta análise.',
      APPLICATION_AUDIT_FAILED: 'Não foi possível registrar a aplicação das sugestões.',
      SERVER_CONFIGURATION_MISSING: 'A otimização assistida ainda não está configurada no servidor.',
      AI_RUN_PERSISTENCE_FAILED: 'Não foi possível salvar a análise. Tente novamente.'
    };
    return messages[code] || fallback || 'Não foi possível concluir a otimização assistida.';
  }

  async function readFunctionError(error) {
    var code = '';
    var fallback = error && error.message;
    var context = error && error.context;
    if (context && typeof context.clone === 'function') {
      try {
        var payload = await context.clone().json();
        code = text(payload && payload.error, 80);
      } catch (_) {}
    }
    var wrapped = new Error(errorMessage(code, fallback));
    wrapped.code = code || 'FUNCTION_ERROR';
    throw wrapped;
  }

  async function invoke(body) {
    var client = getClient();
    var result = await client.functions.invoke(FUNCTION_NAME, { body: body });
    if (result && result.error) return readFunctionError(result.error);
    var data = result && result.data;
    if (!data || typeof data !== 'object') throw new Error('A resposta da otimização assistida é inválida.');
    if (data.error) {
      var error = new Error(errorMessage(text(data.error, 80)));
      error.code = text(data.error, 80);
      throw error;
    }
    return data;
  }

  function normalizeQuestion(raw, index) {
    raw = raw || {};
    return {
      id: text(raw.id, 80) || ('question_' + (index + 1)),
      type: text(raw.type, 40) || 'short_text',
      label: text(raw.label, 120),
      helpText: text(raw.helpText, 180),
      required: raw.required === true,
      options: (Array.isArray(raw.options) ? raw.options : []).map(function (option) {
        return text(typeof option === 'object' ? option.label || option.value : option, 80);
      }).filter(Boolean).slice(0, 5),
      position: index,
      maxLength: Math.min(1000, Math.max(1, Number(raw.maxLength) || (raw.type === 'long_text' ? 1000 : 180)))
    };
  }

  function normalizeSuggestion(raw) {
    raw = raw || {};
    return {
      id: text(raw.id, 80),
      action: text(raw.action, 30),
      targetQuestionId: text(raw.targetQuestionId, 80),
      relatedQuestionIds: (Array.isArray(raw.relatedQuestionIds) ? raw.relatedQuestionIds : []).map(function (item) { return text(item, 80); }).filter(Boolean).slice(0, 9),
      title: text(raw.title, 100) || 'Melhoria sugerida',
      reason: text(raw.reason, 240),
      evidence: text(raw.evidence, 240),
      confidence: text(raw.confidence, 20) || 'medium',
      proposedQuestion: normalizeQuestion(raw.proposedQuestion || {}, Number(raw.proposedQuestion && raw.proposedQuestion.position) || 0)
    };
  }

  async function generate(input) {
    input = input || {};
    var questions = (Array.isArray(input.questions) ? input.questions : []).slice(0, 10).map(normalizeQuestion).filter(function (question) {
      return Boolean(question.label);
    });
    var data = await invoke({
      action: 'generate',
      serviceExternalId: text(input.serviceExternalId, 180),
      category: text(input.category, 100),
      templateIdentity: text(input.templateIdentity, 240) || 'custom',
      templateSource: text(input.templateSource, 50) || 'custom',
      questions: questions
    });
    return {
      runId: text(data.runId, 80),
      createdAt: data.createdAt || '',
      engine: text(data.engine, 30) || 'rules',
      model: text(data.model, 80),
      summary: text(data.summary, 360),
      fallbackReason: text(data.fallbackReason, 180),
      supervisionRequired: data.supervisionRequired !== false,
      suggestions: (Array.isArray(data.suggestions) ? data.suggestions : []).slice(0, MAX_SUGGESTIONS).map(normalizeSuggestion).filter(function (item) {
        return Boolean(item.id);
      })
    };
  }

  async function markApplied(runId, selectedSuggestionIds, appliedTemplateSignature) {
    var selected = (Array.isArray(selectedSuggestionIds) ? selectedSuggestionIds : [])
      .map(function (item) { return text(item, 80); })
      .filter(Boolean)
      .slice(0, MAX_SUGGESTIONS);
    return invoke({
      action: 'apply',
      runId: text(runId, 80),
      selectedSuggestionIds: selected,
      appliedTemplateSignature: text(appliedTemplateSignature, 180)
    });
  }

  Doke.repositories.quoteTemplateAi = Object.freeze({
    generate: generate,
    markApplied: markApplied,
    maxSuggestions: MAX_SUGGESTIONS
  });
})(window);

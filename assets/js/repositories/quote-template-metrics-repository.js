(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.repositories = Doke.repositories || {};

  var APPLICATIONS_TABLE = 'quote_template_application_events';
  var FUNNEL_EVENTS_TABLE = 'quote_template_funnel_events';
  var METRICS_VIEW = 'quote_template_conversion_metrics';
  var DROPOFF_VIEW = 'quote_template_question_dropoff';
  var RECOMMENDATIONS_VIEW = 'quote_template_smart_recommendations';
  var BENCHMARKS_VIEW = 'quote_template_category_benchmarks';

  function text(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength || 200);
  }

  function integer(value, min, max) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function makeKey(prefix) {
    var token = '';
    try {
      token = root.crypto && typeof root.crypto.randomUUID === 'function'
        ? root.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
            var random = Math.floor(Math.random() * 16);
            var value = character === 'x' ? random : (random & 3) | 8;
            return value.toString(16);
          });
    } catch (_) {
      token = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    return text((prefix || 'metric') + ':' + token, 180);
  }

  function getClient() {
    return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
  }

  function getRequiredUser(client) {
    if (!client) return Promise.reject(new Error('As métricas estão disponíveis quando a conexão com o Supabase estiver ativa.'));
    return Promise.resolve(client.auth.getUser()).then(function (result) {
      if (result.error) throw result.error;
      var user = result.data && result.data.user;
      if (!user || !user.id) throw new Error('Faça login para acessar as métricas dos formulários.');
      return user;
    });
  }

  function getOptionalUser(client) {
    if (!client) return Promise.resolve(null);
    return Promise.resolve(client.auth.getUser()).then(function (result) {
      return result && result.data ? result.data.user || null : null;
    }).catch(function () { return null; });
  }

  function unwrap(result, message) {
    if (result && result.error) {
      if (result.error.code === '23505') return null;
      throw new Error(result.error.message || message || 'Não foi possível registrar a métrica.');
    }
    return result ? result.data : null;
  }

  function resolveRemoteService(client, serviceRef) {
    var raw = text(serviceRef, 180);
    if (!client || !raw) return Promise.resolve(null);
    var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    var query = client.from('services')
      .select('id,external_id,professional_id,status,moderation_status')
      .limit(1);
    query = uuidPattern.test(raw)
      ? query.or('id.eq.' + raw + ',external_id.eq.' + raw)
      : query.eq('external_id', raw);
    return Promise.resolve(query.maybeSingle()).then(function (result) {
      if (result.error) throw result.error;
      return result.data || null;
    });
  }

  function normalizeApplication(input, user) {
    input = input || {};
    var kind = text(input.templateKind, 20).toLowerCase();
    var source = kind === 'personal' ? 'personal_template' : 'preset';
    var templateId = text(input.templateId, 160);
    if (!templateId || ['doke', 'personal'].indexOf(kind) === -1) {
      throw new Error('Modelo inválido para registro de aplicação.');
    }
    return {
      professional_id: user.id,
      service_external_id: text(input.serviceExternalId, 180) || null,
      template_identity: text(kind + ':' + templateId + ':' + source, 220),
      template_id: templateId,
      personal_template_id: kind === 'personal' ? templateId : null,
      template_kind: kind,
      template_source: source,
      template_label: text(input.templateLabel, 120) || 'Modelo de formulário',
      template_category: text(input.templateCategory, 100) || null,
      question_count: integer(input.questionCount, 0, 10),
      event_key: text(input.eventKey, 180) || makeKey('template-application')
    };
  }

  function recordApplication(input) {
    var client = getClient();
    if (!client) return Promise.resolve({ recorded: false, reason: 'supabase-unavailable' });
    return getRequiredUser(client).then(function (user) {
      var payload = normalizeApplication(input, user);
      return Promise.resolve(client.from(APPLICATIONS_TABLE).upsert(payload, {
        onConflict: 'event_key',
        ignoreDuplicates: true
      }));
    }).then(function (result) {
      unwrap(result, 'Não foi possível registrar o uso do modelo.');
      return { recorded: true };
    });
  }

  function recordFunnelEvent(input) {
    input = input || {};
    var client = getClient();
    if (!client) return Promise.resolve({ recorded: false, reason: 'supabase-unavailable' });
    var type = text(input.eventType, 30).toLowerCase();
    if (['started', 'progress', 'completed', 'submitted'].indexOf(type) === -1) {
      return Promise.reject(new Error('Evento de funil inválido.'));
    }
    var serviceRef = text(input.serviceId || input.serviceExternalId, 180);
    if (!serviceRef) return Promise.resolve({ recorded: false, reason: 'service-missing' });

    return Promise.all([resolveRemoteService(client, serviceRef), getOptionalUser(client)]).then(function (values) {
      var service = values[0];
      var user = values[1];
      if (!service) return { recorded: false, reason: 'service-not-synced' };
      if (user && text(user.id) === text(service.professional_id)) {
        return { recorded: false, reason: 'owner-excluded' };
      }
      var sessionKey = text(input.sessionKey, 180);
      var visitorKey = text(input.visitorKey, 180);
      if (!sessionKey || !visitorKey) return { recorded: false, reason: 'session-missing' };
      var eventKey = text(input.eventKey, 220) || makeKey('quote-' + type);
      var payload = {
        service_id: service.id,
        professional_id: service.professional_id,
        actor_id: user && user.id ? user.id : null,
        visitor_key: visitorKey,
        session_key: sessionKey,
        event_key: eventKey,
        event_type: type,
        template_identity: 'pending:canonical',
        template_id: 'pending',
        template_kind: 'default',
        template_source: 'default',
        template_label: 'Formulário do anúncio',
        question_count: 0,
        step_index: integer(input.stepIndex, 0, 10),
        answered_question_count: integer(input.answeredQuestionCount, 0, 10),
        last_question_id: text(input.lastQuestionId, 100) || null,
        last_question_label: text(input.lastQuestionLabel, 140) || null,
        order_id: text(input.orderId, 80) || null,
        order_external_id: text(input.orderExternalId, 180) || null
      };
      return Promise.resolve(client.from(FUNNEL_EVENTS_TABLE).upsert(payload, {
        onConflict: 'event_key',
        ignoreDuplicates: true
      })).then(function (result) {
        unwrap(result, 'Não foi possível registrar o andamento do formulário.');
        return { recorded: true, eventType: type, serviceId: service.id };
      });
    });
  }

  function mapMetric(row) {
    row = row || {};
    return {
      professionalId: text(row.professional_id, 80),
      templateIdentity: text(row.template_identity, 240),
      templateId: text(row.template_id, 180),
      templateKind: text(row.template_kind, 30),
      templateSource: text(row.template_source, 50),
      templateLabel: text(row.template_label, 140) || 'Formulário',
      templateCategory: text(row.template_category, 100),
      applicationsCount: Number(row.applications_count || 0) || 0,
      formsStarted: Number(row.forms_started || 0) || 0,
      formsCompleted: Number(row.forms_completed || 0) || 0,
      requestsSubmitted: Number(row.requests_submitted || 0) || 0,
      abandonedCount: Number(row.abandoned_count || 0) || 0,
      avgCompletionSeconds: Number(row.avg_completion_seconds || 0) || 0,
      avgSubmissionSeconds: Number(row.avg_submission_seconds || 0) || 0,
      completionRate: Number(row.completion_rate || 0) || 0,
      submissionRate: Number(row.submission_rate || 0) || 0,
      completedToSubmissionRate: Number(row.completed_to_submission_rate || 0) || 0,
      questionCount: Number(row.question_count || 0) || 0,
      sampleServiceExternalId: text(row.sample_service_external_id, 180),
      lastActivityAt: row.last_activity_at || ''
    };
  }

  function mapDropoff(row) {
    row = row || {};
    return {
      professionalId: text(row.professional_id, 80),
      templateIdentity: text(row.template_identity, 240),
      templateId: text(row.template_id, 180),
      templateLabel: text(row.template_label, 140) || 'Formulário',
      templateCategory: text(row.template_category, 100),
      lastQuestionId: text(row.last_question_id, 100),
      lastQuestionLabel: text(row.last_question_label, 140) || 'Pergunta não identificada',
      abandonmentCount: Number(row.abandonment_count || 0) || 0
    };
  }


  function mapRecommendation(row) {
    row = row || {};
    return {
      professionalId: text(row.professional_id, 80),
      templateIdentity: text(row.template_identity, 240),
      templateId: text(row.template_id, 180),
      templateKind: text(row.template_kind, 30),
      templateSource: text(row.template_source, 50),
      templateLabel: text(row.template_label, 140) || 'Formulário',
      templateCategory: text(row.template_category, 100),
      sampleServiceExternalId: text(row.sample_service_external_id, 180),
      questionCount: Number(row.question_count || 0) || 0,
      applicationsCount: Number(row.applications_count || 0) || 0,
      formsStarted: Number(row.forms_started || 0) || 0,
      formsCompleted: Number(row.forms_completed || 0) || 0,
      requestsSubmitted: Number(row.requests_submitted || 0) || 0,
      abandonedCount: Number(row.abandoned_count || 0) || 0,
      completionRate: Number(row.completion_rate || 0) || 0,
      submissionRate: Number(row.submission_rate || 0) || 0,
      completedToSubmissionRate: Number(row.completed_to_submission_rate || 0) || 0,
      abandonmentRate: Number(row.abandonment_rate || 0) || 0,
      benchmarkCompletionRate: Number(row.benchmark_completion_rate || 0) || 0,
      benchmarkSubmissionRate: Number(row.benchmark_submission_rate || 0) || 0,
      recommendedQuestionCount: Number(row.recommended_question_count || 0) || 0,
      topDropoffQuestionId: text(row.top_dropoff_question_id, 100),
      topDropoffQuestionLabel: text(row.top_dropoff_question_label, 140),
      topDropoffCount: Number(row.top_dropoff_count || 0) || 0,
      topDropoffShare: Number(row.top_dropoff_share || 0) || 0,
      confidence: text(row.confidence, 20) || 'low',
      code: text(row.recommendation_code, 80),
      priority: Number(row.priority || 5) || 5,
      tone: text(row.tone, 20) || 'neutral',
      lastActivityAt: row.last_activity_at || ''
    };
  }

  function mapBenchmark(row) {
    row = row || {};
    return {
      professionalId: text(row.professional_id, 80),
      templateCategory: text(row.template_category, 100),
      formsStarted: Number(row.forms_started || 0) || 0,
      formsCompleted: Number(row.forms_completed || 0) || 0,
      requestsSubmitted: Number(row.requests_submitted || 0) || 0,
      templateCount: Number(row.template_count || 0) || 0,
      qualifiedTemplateCount: Number(row.qualified_template_count || 0) || 0,
      completionRate: Number(row.completion_rate || 0) || 0,
      submissionRate: Number(row.submission_rate || 0) || 0,
      avgQuestionCount: Number(row.avg_question_count || 0) || 0,
      recommendedQuestionCount: Number(row.recommended_question_count || 0) || 0
    };
  }

  function listOwnerMetrics() {
    var client = getClient();
    return getRequiredUser(client).then(function (user) {
      return Promise.resolve(client.from(METRICS_VIEW)
        .select('*')
        .eq('professional_id', user.id)
        .order('requests_submitted', { ascending: false })
        .order('forms_started', { ascending: false })
        .limit(50));
    }).then(function (result) {
      return (unwrap(result, 'Não foi possível carregar as métricas dos formulários.') || []).map(mapMetric);
    });
  }

  function listOwnerDropoff() {
    var client = getClient();
    return getRequiredUser(client).then(function (user) {
      return Promise.resolve(client.from(DROPOFF_VIEW)
        .select('*')
        .eq('professional_id', user.id)
        .order('abandonment_count', { ascending: false })
        .limit(50));
    }).then(function (result) {
      return (unwrap(result, 'Não foi possível carregar os pontos de abandono.') || []).map(mapDropoff);
    });
  }


  function listOwnerRecommendations() {
    var client = getClient();
    return getRequiredUser(client).then(function (user) {
      return Promise.resolve(client.from(RECOMMENDATIONS_VIEW)
        .select('*')
        .eq('professional_id', user.id)
        .order('priority', { ascending: true })
        .order('forms_started', { ascending: false })
        .limit(100));
    }).then(function (result) {
      return (unwrap(result, 'Não foi possível carregar as sugestões dos formulários.') || []).map(mapRecommendation);
    });
  }

  function listOwnerBenchmarks() {
    var client = getClient();
    return getRequiredUser(client).then(function (user) {
      return Promise.resolve(client.from(BENCHMARKS_VIEW)
        .select('*')
        .eq('professional_id', user.id)
        .order('forms_started', { ascending: false })
        .limit(50));
    }).then(function (result) {
      return (unwrap(result, 'Não foi possível carregar as referências de conversão.') || []).map(mapBenchmark);
    });
  }

  Doke.repositories.quoteTemplateMetrics = Object.freeze({
    recordApplication: recordApplication,
    recordFunnelEvent: recordFunnelEvent,
    listOwnerMetrics: listOwnerMetrics,
    listOwnerDropoff: listOwnerDropoff,
    listOwnerRecommendations: listOwnerRecommendations,
    listOwnerBenchmarks: listOwnerBenchmarks,
    makeKey: makeKey
  });
})(window);

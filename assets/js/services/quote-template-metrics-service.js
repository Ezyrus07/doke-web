(function (root) {
  'use strict';

  var Doke = root.Doke || (root.Doke = {});
  Doke.services = Doke.services || {};

  var CACHE_TTL_MS = 60000;
  var dashboardCache = null;
  var dashboardCacheAt = 0;
  var dashboardRequest = null;

  function repository() {
    var value = Doke.repositories && Doke.repositories.quoteTemplateMetrics;
    if (!value) throw new Error('O repositório de métricas dos formulários não foi carregado.');
    return value;
  }

  function assertProfessionalAccess() {
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') {
      return Promise.reject(new Error('A autoridade profissional não foi carregada.'));
    }
    return access.assert(action);
  }

  function invalidateDashboard() {
    dashboardCache = null;
    dashboardCacheAt = 0;
    dashboardRequest = null;
  }

  function recordApplication(input) {
    return assertProfessionalAccess().then(function () {
      return repository().recordApplication(input);
    }).then(function (result) {
      invalidateDashboard();
      return result;
    });
  }

  function recordFunnelEvent(input) {
    return repository().recordFunnelEvent(input);
  }

  function loadDashboard() {
    return Promise.all([
      repository().listOwnerMetrics(),
      repository().listOwnerDropoff(),
      repository().listOwnerRecommendations(),
      repository().listOwnerBenchmarks()
    ]).then(function (values) {
      return {
        metrics: values[0] || [],
        dropoff: values[1] || [],
        recommendations: values[2] || [],
        benchmarks: values[3] || []
      };
    });
  }

  function getOwnerDashboard(options) {
    options = options || {};
    var fresh = dashboardCache && (Date.now() - dashboardCacheAt) < CACHE_TTL_MS;
    if (!options.force && fresh) return Promise.resolve(dashboardCache);
    if (!options.force && dashboardRequest) return dashboardRequest;

    dashboardRequest = assertProfessionalAccess().then(loadDashboard).then(function (data) {
      dashboardCache = data;
      dashboardCacheAt = Date.now();
      return data;
    }).finally(function () {
      dashboardRequest = null;
    });
    return dashboardRequest;
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function identityForContext(context) {
    context = context || {};
    var kind = normalize(context.templateKind);
    var id = String(context.templateId || '').trim();
    var source = normalize(context.source);
    if (source === 'preset_customized') source = 'preset';
    if (source === 'personal_template_customized') source = 'personal_template';
    if (!kind || !id || !source) return '';
    return kind + ':' + id + ':' + source;
  }

  function getBuilderGuidance(context) {
    context = context || {};
    return getOwnerDashboard().then(function (data) {
      var identity = identityForContext(context);
      var category = normalize(context.category);
      var exact = (data.recommendations || []).filter(function (item) {
        return identity && item.templateIdentity === identity;
      });
      var benchmark = (data.benchmarks || []).find(function (item) {
        return normalize(item.templateCategory) === category;
      }) || null;
      var metric = (data.metrics || []).find(function (item) {
        return identity && item.templateIdentity === identity;
      }) || null;
      return {
        identity: identity,
        recommendations: exact,
        benchmark: benchmark,
        metric: metric,
        questionCount: Number(context.questionCount || 0) || 0
      };
    });
  }

  Doke.services.quoteTemplateMetrics = Object.freeze({
    recordApplication: recordApplication,
    recordFunnelEvent: recordFunnelEvent,
    getOwnerDashboard: getOwnerDashboard,
    getBuilderGuidance: getBuilderGuidance,
    invalidateDashboard: invalidateDashboard
  });
})(window);

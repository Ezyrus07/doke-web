/* Doke ANA-A03 Analytics Repository
   Browser boundary for the server-owned analytics Edge Function.
   Disabled by default until controlled staging activation. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var EDGE_FUNCTION = 'analytics-behavior-v1';
  var SESSION_KEY = 'doke.analytics.session.v1';
  var QUOTE_KEY_PREFIX = 'doke.analytics.quote.v1:';
  var EXPOSURE_KEY_PREFIX = 'doke.analytics.exposure.v1:';

  function getConfig() {
    return root.DOKE_SUPABASE_CONFIG || {};
  }

  function enabled() {
    var config = getConfig();
    return config.analyticsEnabled === true && String(config.analyticsTransport || '') === 'edge-v1';
  }

  function getClient() {
    if (!enabled()) return null;
    return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
  }

  function readError(error) {
    var context = error && error.context;
    if (!context || typeof context.json !== 'function') return Promise.resolve(error || new Error('DOKE_ANALYTICS_UNAVAILABLE'));
    if (typeof context.clone === 'function') context = context.clone();
    return Promise.resolve(context.json()).catch(function () { return null; }).then(function (payload) {
      var normalized = new Error(String(payload && payload.error || 'DOKE_ANALYTICS_UNAVAILABLE'));
      normalized.code = String(payload && payload.error || 'DOKE_ANALYTICS_UNAVAILABLE');
      return normalized;
    });
  }

  function invoke(body) {
    if (!enabled()) return Promise.resolve({ skipped: true, reason: 'analytics-disabled' });
    var client = getClient();
    if (!client || !client.functions || typeof client.functions.invoke !== 'function') {
      return Promise.reject(new Error('DOKE_ANALYTICS_UNAVAILABLE'));
    }
    var functionName = String(getConfig().analyticsEdgeFunction || EDGE_FUNCTION);
    var invokeEdge = root.DokeSupabase && typeof root.DokeSupabase.invokeEdgeFunction === 'function'
      ? root.DokeSupabase.invokeEdgeFunction
      : function (name, options) { return client.functions.invoke(name, options); };
    return Promise.resolve(invokeEdge(functionName, { body: body })).then(function (result) {
      if (result && result.error) return readError(result.error).then(function (error) { throw error; });
      return result && result.data || {};
    });
  }

  function safeSessionRead(key) {
    try {
      var value = JSON.parse(root.sessionStorage.getItem(key) || 'null');
      if (!value || !value.expiresAt || Date.parse(value.expiresAt) <= Date.now() + 5000) return null;
      return value;
    } catch (_error) {
      return null;
    }
  }

  function safeSessionWrite(key, value) {
    try { root.sessionStorage.setItem(key, JSON.stringify(value)); } catch (_error) {}
  }

  function safeSessionRemove(key) {
    try { root.sessionStorage.removeItem(key); } catch (_error) {}
  }

  function serviceIdFromItem(item) {
    return String(item && (item.serviceId || item.remoteId || item.id) || '').trim();
  }

  function rememberExposure(item) {
    var serviceId = serviceIdFromItem(item);
    var proof = String(item && item.analyticsExposureProof || '').trim();
    if (!serviceId || !proof) return;
    safeSessionWrite(EXPOSURE_KEY_PREFIX + serviceId, { exposureProof: proof });
  }

  function takeExposure(serviceId) {
    var key = EXPOSURE_KEY_PREFIX + String(serviceId || '').trim();
    var value = null;
    try { value = JSON.parse(root.sessionStorage.getItem(key) || 'null'); } catch (_error) {}
    safeSessionRemove(key);
    return value && String(value.exposureProof || '').trim() || '';
  }

  function session() {
    if (!enabled()) return Promise.resolve(null);
    var cached = safeSessionRead(SESSION_KEY);
    if (cached && cached.sessionToken && cached.analyticsSessionId) return Promise.resolve(cached);
    return invoke({ action: 'session' }).then(function (data) {
      if (!data || !data.sessionToken || !data.analyticsSessionId) throw new Error('DOKE_ANALYTICS_SESSION_INVALID');
      safeSessionWrite(SESSION_KEY, data);
      return data;
    });
  }

  function uuid() {
    return root.crypto && typeof root.crypto.randomUUID === 'function' ? root.crypto.randomUUID() : '';
  }

  function withSession(body, retry) {
    retry = retry !== false;
    return session().then(function (current) {
      if (!current) return { skipped: true, reason: 'analytics-disabled' };
      return invoke(Object.assign({}, body, { sessionToken: current.sessionToken }));
    }).catch(function (error) {
      var code = String(error && (error.code || error.message) || '');
      if (retry && /^DOKE_ANALYTICS_SESSION_(EXPIRED|ACTOR_MISMATCH|CLASS_MISMATCH|INVALID)$/.test(code)) {
        safeSessionRemove(SESSION_KEY);
        return withSession(body, false);
      }
      throw error;
    });
  }

  function track(eventName, detail) {
    if (!enabled()) return Promise.resolve({ skipped: true, reason: 'analytics-disabled' });
    var clientEventId = uuid();
    if (!clientEventId) return Promise.resolve({ skipped: true, reason: 'uuid-unavailable' });
    return withSession(Object.assign({
      action: 'track',
      eventName: eventName,
      clientEventId: clientEventId,
      sourceSurface: 'unknown'
    }, detail || {}));
  }

  function quoteSession(serviceId) {
    serviceId = String(serviceId || '').trim();
    if (!enabled() || !serviceId) return Promise.resolve(null);
    var key = QUOTE_KEY_PREFIX + serviceId;
    var cached = safeSessionRead(key);
    if (cached && cached.quoteSessionToken && cached.quoteSessionId) return Promise.resolve(cached);
    return withSession({ action: 'quote_session', serviceId: serviceId }).then(function (data) {
      if (!data || !data.quoteSessionToken || !data.quoteSessionId) throw new Error('DOKE_ANALYTICS_QUOTE_SESSION_INVALID');
      safeSessionWrite(key, data);
      return data;
    });
  }

  function trackQuote(eventName, serviceId, detail, retry, clientEventId) {
    serviceId = String(serviceId || '').trim();
    retry = retry !== false;
    if (!enabled() || !serviceId) return Promise.resolve({ skipped: true, reason: 'analytics-disabled' });
    clientEventId = clientEventId || uuid();
    if (!clientEventId) return Promise.resolve({ skipped: true, reason: 'uuid-unavailable' });
    return quoteSession(serviceId).then(function (quote) {
      if (!quote) return { skipped: true, reason: 'analytics-disabled' };
      return withSession(Object.assign({
        action: 'track',
        eventName: eventName,
        clientEventId: clientEventId,
        sourceSurface: 'quote',
        quoteSessionToken: quote.quoteSessionToken
      }, detail || {}));
    }).catch(function (error) {
      var code = String(error && (error.code || error.message) || '');
      if (retry && /^DOKE_ANALYTICS_QUOTE_SESSION_(EXPIRED|MISMATCH|ACTOR_MISMATCH|INVALID)$/.test(code)) {
        safeSessionRemove(QUOTE_KEY_PREFIX + serviceId);
        return trackQuote(eventName, serviceId, detail, false, clientEventId);
      }
      throw error;
    });
  }

  repositories.analytics = Object.freeze({
    enabled: enabled,
    getSession: session,
    trackSearchImpression: function (item) {
      var proof = item && item.analyticsExposureProof;
      return proof ? track('search.result_impression', { sourceSurface: 'search', exposureProof: proof })
        : Promise.resolve({ skipped: true, reason: 'exposure-proof-unavailable' });
    },
    trackSearchClick: function (item) {
      var proof = item && item.analyticsExposureProof;
      if (proof) rememberExposure(item);
      return proof ? track('search.result_clicked', { sourceSurface: 'search', exposureProof: proof })
        : Promise.resolve({ skipped: true, reason: 'exposure-proof-unavailable' });
    },
    trackServiceDetail: function (serviceId, sourceSurface) {
      serviceId = String(serviceId || '').trim();
      var exposureProof = takeExposure(serviceId);
      var detail = {
        serviceId: serviceId,
        sourceSurface: exposureProof ? 'search' : (sourceSurface || 'direct')
      };
      if (exposureProof) detail.exposureProof = exposureProof;
      return track('service.detail_viewed', detail);
    },
    trackBudgetCta: function (serviceId) {
      return track('service.budget_cta_clicked', { serviceId: String(serviceId || ''), sourceSurface: 'service_detail' });
    },
    trackMessageCta: function (serviceId) {
      return track('service.message_cta_clicked', { serviceId: String(serviceId || ''), sourceSurface: 'service_detail' });
    },
    trackQuoteStarted: function (serviceId, detail) {
      return trackQuote('quote.started', serviceId, detail);
    },
    trackQuoteProgressed: function (serviceId, detail) {
      return trackQuote('quote.progressed', serviceId, detail);
    },
    trackQuoteCompleted: function (serviceId, detail) {
      return trackQuote('quote.completed', serviceId, detail);
    },
    trackQuoteSubmitted: function (serviceId, orderId) {
      return trackQuote('quote.submitted', serviceId, { orderId: String(orderId || '') });
    },
    resetSession: function () { safeSessionRemove(SESSION_KEY); }
  });
})();

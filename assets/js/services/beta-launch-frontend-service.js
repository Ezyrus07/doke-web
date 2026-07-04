/* Doke Beta Launch Frontend Service
   Responsibility: controlled manual frontend activation contract for private beta launch domains. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});

  var STORAGE_KEYS = Object.freeze({
    enabled: 'doke.canary.betaLaunch.enabled',
    backup: 'doke.canary.betaLaunch.backup.v1',
    apiBaseUrl: 'doke.canary.betaLaunch.apiBaseUrl',
    marker: 'doke.canary.betaLaunch.targetMarker',
    domains: 'doke.canary.betaLaunch.domains',
    network: 'doke.flag.enableNetworkRequests',
    dataProvider: 'doke.dataProvider',
    launchProvider: 'doke.betaLaunchProvider'
  });

  var PROVIDER = 'api-beta-launch-frontend-activation';
  var ALLOWED_DOMAINS = Object.freeze({
    media: ['/media/uploads', '/attachments'],
    moderation: ['/reports', '/blocks', '/moderation/reports'],
    search: ['/search', '/search/index/rebuild'],
    pricing: ['/plans', '/subscriptions', '/service-listings/:id/boost', '/publications/:id/boost'],
    payments: ['/payments/methods', '/checkout/sessions', '/payments/:id/confirm', '/escrow/holds', '/escrow/:id/release', '/escrow/:id/refund'],
    kyc: ['/professionals/verification', '/kyc/documents', '/kyc/documents/:id/submit', '/admin/kyc/reviews', '/admin/kyc/reviews/:id/approve', '/admin/kyc/reviews/:id/reject'],
    support: ['/support/tickets', '/support/tickets/:id/messages', '/admin/support/tickets', '/admin/support/tickets/:id/assign', '/admin/support/tickets/:id/resolve'],
    security: ['/security/rate-limit/check', '/security/abuse-events', '/admin/security/abuse-events', '/security/sessions/risk-score']
  });

  function readStorage(key) {
    try { return root.localStorage.getItem(key); }
    catch (error) { return null; }
  }

  function writeStorageValue(key, value) {
    try {
      if (value === null || value === undefined) root.localStorage.removeItem(key);
      else root.localStorage.setItem(key, String(value));
    } catch (error) {
      // Storage can be unavailable; activation will remain blocked by status.
    }
  }

  function readQueryParam(key) {
    try { return new URLSearchParams(root.location.search || '').get(key); }
    catch (error) { return null; }
  }

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/$/, '');
  }

  function normalizeMarker(value) {
    var marker = String(value || '').trim().toLowerCase();
    return ['local', 'staging'].indexOf(marker) !== -1 ? marker : '';
  }

  function normalizeBoolean(value) {
    if (value === true || value === 'true' || value === '1' || value === 'on') return true;
    if (value === false || value === 'false' || value === '0' || value === 'off') return false;
    return undefined;
  }

  function normalizeDomain(value) {
    var domain = String(value || '').trim().toLowerCase();
    return ALLOWED_DOMAINS[domain] ? domain : '';
  }

  function normalizeDomains(value) {
    var raw = Array.isArray(value) ? value : String(value || '').split(',');
    var normalized = raw.map(normalizeDomain).filter(Boolean);
    var unique = [];
    normalized.forEach(function (domain) {
      if (unique.indexOf(domain) === -1) unique.push(domain);
    });
    return unique;
  }

  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object' ? Doke.runtimeConfig : {};
  }

  function getRuntimeFlags() {
    var config = getRuntimeConfig();
    return config.flags && typeof config.flags === 'object' ? config.flags : {};
  }

  function readEnabled(config) {
    var query = readQueryParam('dokeBetaLaunchCanary');
    if (query !== null) return normalizeBoolean(query) === true;
    if (config.betaLaunchCanary === true || config.canary && config.canary.betaLaunch === true) return true;
    return normalizeBoolean(readStorage(STORAGE_KEYS.enabled)) === true;
  }

  function readApiBaseUrl(config) {
    return normalizeBaseUrl(
      readQueryParam('dokeBetaLaunchApiBaseUrl') ||
      readStorage(STORAGE_KEYS.apiBaseUrl) ||
      config.apiBaseUrl ||
      readStorage('doke.apiBaseUrl') ||
      ''
    );
  }

  function readNetworkEnabled(config) {
    var query = readQueryParam('dokeEnableNetwork');
    if (query !== null) return normalizeBoolean(query) === true;
    var flags = config.flags && typeof config.flags === 'object' ? config.flags : {};
    if (flags.enableNetworkRequests === true) return true;
    return normalizeBoolean(readStorage(STORAGE_KEYS.network)) === true;
  }

  function readDomains(config) {
    var query = readQueryParam('dokeBetaLaunchDomains');
    if (query) return normalizeDomains(query);
    if (Array.isArray(config.betaLaunchDomains) && config.betaLaunchDomains.length) return normalizeDomains(config.betaLaunchDomains);
    if (config.canary && Array.isArray(config.canary.betaLaunchDomains) && config.canary.betaLaunchDomains.length) return normalizeDomains(config.canary.betaLaunchDomains);
    return normalizeDomains(readStorage(STORAGE_KEYS.domains));
  }

  function describeTarget(value) {
    try {
      var url = new URL(value);
      return { protocol: url.protocol, host: url.host, pathname: url.pathname };
    } catch (error) {
      return { protocol: '', host: '', pathname: '' };
    }
  }

  function isSafeTarget(value, marker) {
    var target = describeTarget(value);
    var host = String(target.host || '').toLowerCase();
    var path = String(target.pathname || '').toLowerCase();
    var explicitMarker = normalizeMarker(marker);
    var safeByHost = /localhost|127\.0\.0\.1|staging|stage|stg|preview|local/.test(host);
    var safeByPath = /staging|stage|stg|preview|local/.test(path);
    if (!target.host || target.protocol !== 'https:' && !/^localhost|127\.0\.0\.1/.test(host)) return false;
    if (safeByHost || safeByPath) return true;
    return explicitMarker === 'local' || explicitMarker === 'staging';
  }

  function createBackup() {
    return {
      createdAt: new Date().toISOString(),
      values: {
        'doke.canary.betaLaunch.enabled': readStorage(STORAGE_KEYS.enabled),
        'doke.canary.betaLaunch.apiBaseUrl': readStorage(STORAGE_KEYS.apiBaseUrl),
        'doke.canary.betaLaunch.targetMarker': readStorage(STORAGE_KEYS.marker),
        'doke.canary.betaLaunch.domains': readStorage(STORAGE_KEYS.domains),
        'doke.flag.enableNetworkRequests': readStorage(STORAGE_KEYS.network),
        'doke.dataProvider': readStorage(STORAGE_KEYS.dataProvider),
        'doke.betaLaunchProvider': readStorage(STORAGE_KEYS.launchProvider)
      }
    };
  }

  function readBackup() {
    try {
      var raw = readStorage(STORAGE_KEYS.backup);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function refreshRuntime(enabled) {
    var config = getRuntimeConfig();
    var domains = readDomains(config);
    var flags = Object.assign({}, getRuntimeFlags(), { enableNetworkRequests: readNetworkEnabled(config) });
    Doke.runtimeConfig = Object.freeze(Object.assign({}, config, {
      flags: flags,
      dataProvider: enabled ? 'mock' : config.dataProvider || 'mock',
      betaLaunchProvider: enabled ? PROVIDER : 'mock',
      betaLaunchCanary: enabled,
      betaLaunchDomains: enabled ? domains : [],
      apiBaseUrl: enabled ? readApiBaseUrl(config) : config.apiBaseUrl || '',
      canary: Object.freeze(Object.assign({}, config.canary || {}, {
        betaLaunch: enabled,
        betaLaunchProvider: enabled ? PROVIDER : 'mock',
        betaLaunchDomains: enabled ? domains : [],
        forcedDataProvider: enabled ? 'mock' : config.canary && config.canary.forcedDataProvider || ''
      }))
    }));
  }

  function getBetaLaunchCanaryStatus() {
    var config = getRuntimeConfig();
    var enabled = readEnabled(config);
    var domains = readDomains(config);
    var apiBaseUrl = readApiBaseUrl(config);
    var networkEnabled = readNetworkEnabled(config);
    var dataProvider = String(config.dataProvider || readStorage(STORAGE_KEYS.dataProvider) || 'mock').trim().toLowerCase();
    var marker = normalizeMarker(readQueryParam('dokeBetaLaunchCanaryMarker') || readStorage(STORAGE_KEYS.marker));
    var targetSafe = Boolean(apiBaseUrl) && isSafeTarget(apiBaseUrl, marker);
    var blockers = [];

    if (!enabled) blockers.push('betaLaunchCanary is not enabled.');
    if (!domains.length) blockers.push('At least one beta launch domain must be enabled.');
    if (dataProvider !== 'mock') blockers.push('dataProvider must remain mock during beta launch frontend canary.');
    if (!apiBaseUrl) blockers.push('betaLaunch apiBaseUrl is not configured.');
    if (!networkEnabled) blockers.push('enableNetworkRequests flag is disabled.');
    if (apiBaseUrl && !targetSafe) blockers.push('betaLaunch target is not marked as local/staging.');
    if (typeof root.fetch !== 'function') blockers.push('window.fetch is not available.');

    return Object.freeze({
      active: blockers.length === 0,
      provider: enabled ? PROVIDER : 'mock',
      dataProvider: dataProvider,
      domains: domains,
      apiBaseUrlConfigured: Boolean(apiBaseUrl),
      networkEnabled: networkEnabled,
      targetSafe: targetSafe,
      blockers: blockers
    });
  }

  function configureBetaLaunchCanary(options) {
    options = options || {};
    var apiBaseUrl = normalizeBaseUrl(options.apiBaseUrl || options.baseUrl || readApiBaseUrl(getRuntimeConfig()));
    var marker = normalizeMarker(options.targetMarker || options.marker || readStorage(STORAGE_KEYS.marker));
    var domains = normalizeDomains(options.domains || readDomains(getRuntimeConfig()));

    if (!apiBaseUrl) throw new Error('Beta launch canary requires apiBaseUrl.');
    if (!isSafeTarget(apiBaseUrl, marker)) throw new Error('Beta launch canary target is production-like or not marked as local/staging.');
    if (!domains.length) throw new Error('Beta launch canary requires at least one allowed domain.');

    if (!readBackup()) writeStorageValue(STORAGE_KEYS.backup, JSON.stringify(createBackup()));
    writeStorageValue(STORAGE_KEYS.enabled, 'true');
    writeStorageValue(STORAGE_KEYS.apiBaseUrl, apiBaseUrl);
    writeStorageValue(STORAGE_KEYS.domains, domains.join(','));
    writeStorageValue(STORAGE_KEYS.network, 'true');
    writeStorageValue(STORAGE_KEYS.dataProvider, 'mock');
    writeStorageValue(STORAGE_KEYS.launchProvider, PROVIDER);
    if (marker) writeStorageValue(STORAGE_KEYS.marker, marker);
    refreshRuntime(true);

    var status = getBetaLaunchCanaryStatus();
    if (!status.active) throw new Error('Beta launch canary activation blocked: ' + status.blockers.join(' '));
    return status;
  }

  function rollbackBetaLaunchCanary() {
    var backup = readBackup();
    if (backup && backup.values) {
      Object.keys(backup.values).forEach(function (key) { writeStorageValue(key, backup.values[key]); });
      writeStorageValue(STORAGE_KEYS.backup, null);
    } else {
      writeStorageValue(STORAGE_KEYS.enabled, null);
      writeStorageValue(STORAGE_KEYS.apiBaseUrl, null);
      writeStorageValue(STORAGE_KEYS.marker, null);
      writeStorageValue(STORAGE_KEYS.domains, null);
      writeStorageValue(STORAGE_KEYS.launchProvider, 'mock');
    }
    refreshRuntime(false);
    return getBetaLaunchCanaryStatus();
  }

  function pathMatchesTemplate(path, template) {
    var pattern = '^' + String(template).replace(/:[^/]+/g, '[^/]+') + '$';
    return new RegExp(pattern).test(path);
  }

  function inferDomainForPath(path) {
    var domains = getBetaLaunchCanaryStatus().domains;
    for (var index = 0; index < domains.length; index += 1) {
      var domain = domains[index];
      var templates = ALLOWED_DOMAINS[domain] || [];
      for (var item = 0; item < templates.length; item += 1) {
        if (pathMatchesTemplate(path, templates[item])) return domain;
      }
    }
    return '';
  }

  function request(path, options) {
    options = options || {};
    var method = String(options.method || 'GET').toUpperCase();
    var status = getBetaLaunchCanaryStatus();
    if (!status.active) return Promise.reject(new Error('Beta launch canary is not active: ' + status.blockers.join(' ')));
    var domain = inferDomainForPath(path);
    if (!domain) return Promise.reject(new Error('Beta launch canary blocked non-enabled endpoint: ' + path));
    if (method !== 'GET' && !options.idempotencyKey) return Promise.reject(new Error('Beta launch canary requires idempotencyKey for every mutation.'));

    var headers = Object.assign({ Accept: 'application/json' }, options.headers || {});
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json';
      headers['x-idempotency-key'] = options.idempotencyKey;
    }

    return root.fetch(readApiBaseUrl(getRuntimeConfig()) + path, {
      method: method,
      credentials: 'same-origin',
      headers: headers,
      body: method === 'GET' ? undefined : JSON.stringify(options.body || {})
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (body) {
        if (!response.ok) {
          var error = new Error(body && (body.code || body.error || body.message) || 'Beta launch canary request failed.');
          error.status = response.status;
          throw error;
        }
        return body;
      });
    });
  }

  services.betaLaunch = Object.freeze({
    provider: PROVIDER,
    allowedDomains: ALLOWED_DOMAINS,
    configureBetaLaunchCanary: configureBetaLaunchCanary,
    rollbackBetaLaunchCanary: rollbackBetaLaunchCanary,
    getBetaLaunchCanaryStatus: getBetaLaunchCanaryStatus,
    request: request
  });
})();

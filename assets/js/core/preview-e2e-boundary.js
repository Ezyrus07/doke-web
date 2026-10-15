/* Configuration and transport authority for the explicit Preview E2E profile. */
(function (root) {
  'use strict';
  if (root.DokePreviewE2E) return;
  var PROFILE = 'preview-e2e', REF = 'bqmmbopwfgwffkbtheab';
  var doc = root.document, supplied = root.DOKE_PREVIEW_E2E_CONFIG;
  var active = root.DOKE_DEPLOYMENT_PROFILE === PROFILE
    || Boolean(doc && doc.documentElement && doc.documentElement.getAttribute('data-doke-deployment-profile') === PROFILE)
    || supplied !== undefined;
  var config = {}, reason = '', sdk = root.supabase, facade = null, client = null, capabilities = {};
  var names = ['auth', 'api', 'search', 'catalog', 'moderation', 'orders', 'messages', 'notifications', 'upload', 'functions', 'realtime', 'callbacks'];
  function error(code) { var e = new Error('Preview E2E indisponível: ' + code); e.code = 'DOKE_E2E_' + code; return e; }
  function freeze(value) {
    if (value && typeof value === 'object') { Object.keys(value).forEach(function (key) { freeze(value[key]); }); Object.freeze(value); }
    return value;
  }
  function url(value) {
    var parsed = new URL(String(value || ''));
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash) throw error('URL_INVALID');
    return parsed;
  }
  function origin() { return root.location.origin || new URL(root.location.href).origin; }
  function list(value) {
    if (!Array.isArray(value)) return [];
    if (value.some(function (x) { return typeof x !== 'string'; })) throw error('ALLOWLIST_INVALID');
    return value.slice();
  }
  function jwt(token) {
    try { return JSON.parse(root.atob(String(token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); }
    catch (_) { throw error('TOKEN_INVALID'); }
  }
  function money(value) { return /payment|wallet|finance|withdraw|charge/i.test(value); }
  if (active) {
    try {
      if (!supplied || supplied.profile !== PROFILE) throw error('CONFIG_REQUIRED');
      config = JSON.parse(JSON.stringify(supplied));
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(config.configurationId || '')) throw error('CONFIG_ID_REQUIRED');
      var frontend = url(config.frontendOrigin);
      if (frontend.origin !== config.frontendOrigin || origin() !== frontend.origin) throw error('FRONTEND_ORIGIN');
      var supabase = url(config.supabaseUrl);
      if (supabase.origin !== 'https://' + REF + '.supabase.co' || supabase.pathname !== '/' || supabase.search || config.projectRef !== REF) throw error('PROJECT_REF');
      var api = url(config.apiBaseUrl), approved = url(config.approvedApiOrigin);
      if (approved.origin !== config.approvedApiOrigin || api.origin !== approved.origin || api.hostname.endsWith('.supabase.co') || api.search) throw error('API_ORIGIN');
      if (!config.publishableKey || /^sb_secret_/.test(config.publishableKey)) throw error('PUBLIC_KEY_REQUIRED');
      if (!/^sb_publishable_/.test(config.publishableKey)) {
        var claims = jwt(config.publishableKey);
        if (claims.role !== 'anon' || claims.ref !== REF) throw error('PUBLIC_KEY_REQUIRED');
      }
      if (config.capabilities && (config.capabilities.payments || config.capabilities.wallet || config.capabilities.finance)) throw error('FINANCE_FORBIDDEN');
      names.forEach(function (name) { capabilities[name] = Boolean(config.capabilities && config.capabilities[name] === true); });
      ['approvedFunctions', 'approvedActions', 'approvedRpc', 'approvedBuckets', 'callbackPaths', 'approvedApiRoutes'].forEach(function (key) { config[key] = list(config[key]); });
      if (config.approvedFunctions.concat(config.approvedActions, config.approvedRpc).some(money)) throw error('FINANCE_FORBIDDEN');
      config.apiBaseUrl = api.href.replace(/\/$/, '');
    } catch (e) { reason = e.code || 'DOKE_E2E_CONFIG_INVALID'; }
    freeze(config); freeze(capabilities);
    Object.defineProperty(root, 'DOKE_PREVIEW_E2E_CONFIG', { value: config, writable: false, configurable: false });
  }
  function ensure() { if (active) { if (reason) throw error('CONFIG_BLOCKED'); if (origin() !== config.frontendOrigin) throw error('FRONTEND_ORIGIN'); } }
  function assertCapability(name) {
    if (!active) return;
    ensure();
    if (money(name) || capabilities[name] !== true) throw error('CAPABILITY_DENIED');
  }
  function allowed(name) { try { assertCapability(name); return !active || capabilities[name] === true; } catch (_) { return false; } }
  function namespace(key) { return 'doke.preview-e2e.' + REF + '.' + (config.configurationId || 'blocked') + ':' + key; }
  function assertSession(session) {
    if (active && session && session.access_token && jwt(session.access_token).iss !== 'https://' + REF + '.supabase.co/auth/v1') throw error('SESSION_ISSUER');
    return session;
  }
  function assertCallback() {
    var params = new URLSearchParams(String(root.location.search || '') + '&' + String(root.location.hash || '').replace(/^#/, ''));
    if (['code', 'access_token', 'refresh_token', 'token_hash'].some(function (key) { return params.has(key); })
      && (!allowed('callbacks') || config.callbackPaths.indexOf(root.location.pathname) < 0)) throw error('CALLBACK_DENIED');
  }
  function assertApiUrl(value, method) {
    if (!active) return;
    assertCapability('api');
    var request = url(value), base = url(config.apiBaseUrl);
    if (request.origin !== base.origin || (request.pathname !== base.pathname && request.pathname.indexOf(base.pathname.replace(/\/$/, '') + '/') !== 0)) throw error('API_ORIGIN');
    var route = request.pathname.slice(base.pathname === '/' ? 0 : base.pathname.length);
    if (!route.startsWith('/')) route = '/' + route;
    if (/\/(payments|wallet|withdrawals|charge|receivables)(\/|$)/.test(route)) throw error('FINANCE_FORBIDDEN');
    assertCapability(tableCapability(route.split('/')[1]));
    var approved = config.approvedApiRoutes.some(function (rule) {
      var parts = rule.split(' ');
      if (parts.length !== 2 || parts[0] !== String(method || 'GET').toUpperCase()) return false;
      var pattern = parts[1].split('/').map(function (part) {
        return /^:[a-zA-Z]+$/.test(part) ? '[^/]+' : part.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
      }).join('/');
      return new RegExp('^' + pattern + '$').test(route);
    });
    if (!approved) throw error('API_ROUTE_DENIED');
  }
  function tableCapability(table) {
    if (/^(services|service_media|service_versions)$/.test(table)) return 'catalog';
    if (table === 'orders') return 'orders';
    if (table === 'messages' || table === 'conversations') return 'messages';
    if (table === 'notifications') return 'notifications';
    if (/^(users|user_profiles|client_profiles|profiles|professionals)$/.test(table)) return 'auth';
    if (table === 'search') return 'search';
    if (table === 'admin') return 'moderation';
    return 'unapproved-table';
  }
  function transport(input, options) {
    ensure();
    var request = url(typeof input === 'string' ? input : input.url);
    if (request.origin !== 'https://' + REF + '.supabase.co') throw error('TRANSPORT_ORIGIN');
    var pathname = request.pathname;
    if (pathname.startsWith('/auth/v1/')) assertCapability('auth');
    else if (pathname.startsWith('/functions/v1/')) {
      assertCapability('functions');
      if (config.approvedFunctions.indexOf(decodeURIComponent(pathname.slice('/functions/v1/'.length))) < 0) throw error('FUNCTION_DENIED');
    } else if (pathname.startsWith('/storage/v1/')) assertCapability('upload');
    else if (pathname.startsWith('/rest/v1/')) {
      var resource = decodeURIComponent(pathname.slice('/rest/v1/'.length).split('/')[0]);
      if (resource === 'rpc') {
        assertCapability('search');
        if (config.approvedRpc.indexOf(decodeURIComponent(pathname.split('/').pop())) < 0) throw error('RPC_DENIED');
      } else assertCapability(tableCapability(resource));
    } else throw error('TRANSPORT_PATH_DENIED');
    return root.fetch(input, Object.assign({}, options, { redirect: 'error' })).then(function (response) {
      if (response.redirected || response.url && new URL(response.url).origin !== request.origin) throw error('REDIRECT_DENIED');
      return response;
    });
  }
  function wrapClient(raw) {
    var auth = new Proxy(raw.auth, { get: function (target, key) {
      if (typeof target[key] !== 'function') return target[key];
      return function () {
        assertCapability('auth'); assertCallback();
        var args = Array.prototype.slice.call(arguments);
        if (key === 'setSession') assertSession(args[0]);
        if (key === 'onAuthStateChange') {
          var callback = args[0];
          args[0] = function (event, session) { assertCapability('auth'); assertSession(session); return callback(event, session); };
          return target[key].apply(target, args);
        }
        return Promise.resolve(target[key].apply(target, args)).then(function (result) {
          assertCapability('auth'); assertSession(result && result.data && result.data.session); return result;
        });
      };
    } });
    return new Proxy(raw, { get: function (target, key) {
      if (key === 'auth') return auth;
      if (key === 'from') return function (table) { assertCapability(tableCapability(table)); return target.from(table); };
      if (key === 'rpc') return function (name, params) {
        assertCapability('search');
        if (config.approvedRpc.indexOf(name) < 0) throw error('RPC_DENIED');
        return target.rpc(name, params);
      };
      if (key === 'functions') return Object.freeze({ invoke: function (name, params) {
        assertCapability('functions');
        if (config.approvedFunctions.indexOf(name) < 0) throw error('FUNCTION_DENIED');
        var action = params && params.body && params.body.action;
        if (action && (config.approvedActions.indexOf(action) < 0 || money(action))) throw error('ACTION_DENIED');
        return target.functions.invoke(name, params);
      } });
      if (key === 'storage') return Object.freeze({ from: function (bucket) {
        assertCapability('upload');
        if (config.approvedBuckets.indexOf(bucket) < 0) throw error('BUCKET_DENIED');
        return target.storage.from(bucket);
      } });
      if (key === 'channel') return function () { assertCapability('realtime'); return target.channel.apply(target, arguments); };
      if (key === 'realtime') return new Proxy(target.realtime, { get: function (rt, name) {
        if (typeof rt[name] !== 'function') return rt[name];
        return function () { assertCapability('realtime'); return rt[name].apply(rt, arguments); };
      } });
      if (typeof target[key] === 'function') return target[key].bind(target);
      return target[key];
    } });
  }
  function getClient() {
    ensure(); assertCapability('auth');
    if (!active) return null;
    if (client) return client;
    if (!sdk || typeof sdk.createClient !== 'function') return null;
    assertCallback();
    var storage = {
      getItem: function (key) { assertCapability('auth'); return root.localStorage.getItem(namespace(key)); },
      setItem: function (key, value) { assertCapability('auth'); root.localStorage.setItem(namespace(key), value); },
      removeItem: function (key) { assertCapability('auth'); root.localStorage.removeItem(namespace(key)); }
    };
    client = wrapClient(sdk.createClient(config.supabaseUrl, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: allowed('callbacks') && config.callbackPaths.indexOf(root.location.pathname) >= 0, storageKey: 'supabase.auth', storage: storage },
      global: { fetch: transport }
    }));
    return client;
  }
  function sdkView() {
    if (!sdk) return sdk;
    if (!facade) facade = new Proxy(sdk, { get: function (target, key) {
      if (key === 'createClient' || key === 'SupabaseClient') return function () { throw error('CLIENT_BYPASS'); };
      return target[key];
    } });
    return facade;
  }
  if (active) Object.defineProperty(root, 'supabase', { configurable: false, enumerable: true, get: sdkView, set: function (value) { sdk = value; facade = null; } });
  var api = Object.freeze({
    isActive: function () { return active; }, assertCapability: assertCapability, allowed: allowed,
    assertApiUrl: assertApiUrl, assertSession: assertSession, getClient: getClient, storageKey: namespace,
    getSupabaseConfig: function () {
      return freeze({ enabled: allowed('auth'), url: config.supabaseUrl || '', anonKey: config.publishableKey || '',
        servicesEnabled: allowed('catalog') || allowed('search'), ordersEnabled: allowed('orders'), messagesEnabled: allowed('messages'),
        messagesRealtimeEnabled: allowed('realtime'), messagesPresenceEnabled: false, attachmentsEnabled: allowed('upload'),
        notificationsEnabled: allowed('notifications'), walletEnabled: false, paymentsEnabled: false, financeSandboxEnabled: false,
        attachmentLifecycleEnabled: false, searchTransport: 'edge-v2', searchRollbackTransport: 'rpc-v1', searchEdgeFunction: 'search-public-services-v2' });
    },
    runtime: function () { return { environment: 'staging', apiBaseUrl: config.apiBaseUrl || '', dataProvider: 'api', enableNetworkRequests: allowed('api') }; },
    diagnostic: function () { return freeze({ profile: active ? PROFILE : 'inactive', valid: active && !reason, reason: reason,
      projectRef: active ? REF : '', configurationId: !reason ? config.configurationId || '' : '',
      frontendOrigin: !reason ? config.frontendOrigin || '' : '',
      apiOrigin: !reason ? config.approvedApiOrigin || '' : '', capabilities: Object.assign({}, capabilities) }); }
  });
  Object.defineProperty(root, 'DokePreviewE2E', { value: api, writable: false, configurable: false });
})(window);

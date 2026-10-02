window.DOKE_SUPABASE_CONFIG = {
  enabled: true,
  servicesEnabled: true,
  searchTransport: "edge-v2",
  searchRollbackTransport: "rpc-v1",
  searchEdgeFunction: "search-public-services-v2",
  analyticsEnabled: false,
  analyticsTransport: "edge-v1",
  analyticsEdgeFunction: "analytics-behavior-v1",
  ordersEnabled: true,
  messagesEnabled: true,
  messagesRealtimeEnabled: false,
  messagesPresenceEnabled: false,
  messagesPresenceChannelPrefix: "doke:conversation:",
  messagesPresenceTypingTtlMs: 6000,
  messagesPresenceTypingThrottleMs: 1000,
  attachmentsEnabled: true,
  attachmentLifecycleEnabled: false,
  attachmentSignedUrlTtlSeconds: 300,
  notificationsEnabled: true,
  walletEnabled: true,
  paymentsEnabled: true,
  financeSandboxEnabled: true,
  financeSandboxFunction: "staging-finance-sandbox",
  url: "https://zwkczgewzbsorbrjuzpb.supabase.co",
  publishableKey: "sb_publishable_3euoX0-7iq89zeBdaE8G_g_XWnqX2lV",
  anonKey:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3a2N6Z2V3emJzb3Jicmp1enBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNzgyNzgsImV4cCI6MjA5ODc1NDI3OH0.oeT4BrezoxBJbGLet_6_JI49UyTuFUVSkYaI34DrbaA",
};

(function () {
  "use strict";

  var root = window;
  var sharedClient = null;
  var sharedSignature = "";
  var SELF_SERVICE_FUNCTION = "self-service-operations";

  function getConfig() {
    return root.DOKE_SUPABASE_CONFIG || {};
  }

  function getSignature(config) {
    return String(config.url || "") + "|" + String(config.anonKey || "");
  }

  function canCreate(config) {
    return Boolean(
      config.enabled !== false &&
      config.url &&
      config.anonKey &&
      root.supabase &&
      typeof root.supabase.createClient === "function",
    );
  }

  function getClient() {
    var config = getConfig();
    var signature = getSignature(config);
    if (sharedClient && sharedSignature === signature) return sharedClient;
    if (!canCreate(config)) return null;

    sharedClient = root.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "doke.supabase.auth",
      },
    });
    sharedSignature = signature;
    root.DOKE_SUPABASE_CLIENT = sharedClient;
    document.dispatchEvent(
      new CustomEvent("doke:supabase-client-ready", {
        detail: { client: sharedClient },
      }),
    );
    return sharedClient;
  }

  function resetClient() {
    sharedClient = null;
    sharedSignature = "";
    root.DOKE_SUPABASE_CLIENT = null;
  }

  function edgeApiKey(config) {
    return String(config.publishableKey || config.anonKey || "");
  }

  function edgeAuthToken(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== "function") {
      return Promise.resolve("");
    }
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return String(result && result.data && result.data.session && result.data.session.access_token || "");
    }).catch(function () {
      return "";
    });
  }

  function invokeEdgeFunction(functionName, options) {
    var config = getConfig();
    var apiKey = edgeApiKey(config);
    var name = String(functionName || "").trim();
    if (!config.url || !apiKey || !name || typeof root.fetch !== "function") {
      return Promise.reject(new Error("Autoridade Edge do Supabase indisponível."));
    }
    var client = getClient();
    return edgeAuthToken(client).then(function (authorizationToken) {
      var headers = Object.assign({}, options && options.headers || {});
      headers.apikey = apiKey;
      if (authorizationToken) headers.Authorization = "Bearer " + authorizationToken;
      headers["Content-Type"] = "application/json";
      return root.fetch(
        String(config.url).replace(/\/$/, "") + "/functions/v1/" + encodeURIComponent(name),
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify(options && options.body || {}),
          credentials: "omit",
        },
      );
    }).then(function (response) {
      return Promise.resolve(response.text()).then(function (text) {
        var payload = {};
        if (text) {
          try { payload = JSON.parse(text); } catch (_error) { payload = { raw: text }; }
        }
        if (response.ok) return { data: payload, error: null };
        var context = {
          clone: function () { return this; },
          json: function () { return Promise.resolve(payload); },
        };
        return {
          data: null,
          error: {
            message: String(payload && payload.error || "DOKE_EDGE_FUNCTION_FAILED"),
            status: response.status,
            context: context,
          },
        };
      });
    });
  }

  function invokeSelfService(action, params) {
    var client = getClient();
    if (!client || !client.functions || typeof client.functions.invoke !== "function") {
      return Promise.reject(new Error("Autoridade self-service do Supabase indisponível."));
    }
    return Promise.resolve(client.functions.invoke(SELF_SERVICE_FUNCTION, {
      body: { action: String(action || ""), params: params || {} },
    })).then(function (result) {
      if (result && result.error) throw result.error;
      var data = result && result.data;
      if (data && data.error) {
        var error = new Error(data.error);
        error.code = data.error;
        throw error;
      }
      return data == null ? {} : data;
    });
  }

  root.DokeSupabase = Object.freeze({
    getClient: getClient,
    resetClient: resetClient,
    getConfig: getConfig,
    invokeSelfService: invokeSelfService,
    invokeEdgeFunction: invokeEdgeFunction,
  });

  document.addEventListener("doke:supabase-sdk-ready", getClient);
  getClient();
})();

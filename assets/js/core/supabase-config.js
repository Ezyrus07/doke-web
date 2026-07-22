window.DOKE_SUPABASE_CONFIG = {
  enabled: true,
  servicesEnabled: true,
  ordersEnabled: true,
  messagesEnabled: true,
  attachmentsEnabled: true,
  notificationsEnabled: true,
  walletEnabled: true,
  paymentsEnabled: true,
  financeSandboxEnabled: true,
  financeSandboxFunction: "staging-finance-sandbox",
  url: "https://zwkczgewzbsorbrjuzpb.supabase.co",
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
  });

  document.addEventListener("doke:supabase-sdk-ready", getClient);
  getClient();
})();

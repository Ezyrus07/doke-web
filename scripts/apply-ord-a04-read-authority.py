from pathlib import Path
import json
import re
import subprocess

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


def regex_once(text, pattern, replacement, label, flags=0):
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one regex match, found {count}')
    return next_text


# ---------------------------------------------------------------------------
# Runtime provider policy
# ---------------------------------------------------------------------------
path = 'assets/js/core/runtime-config.js'
text = read(path)
text = replace_once(
    text,
    "  var ORDERS_PROVIDER_VALUES = Object.freeze({\n    MOCK: 'mock',\n    API_WRITE_CANARY: 'api-write-canary-frontend-activation'\n  });",
    "  var ORDERS_PROVIDER_VALUES = Object.freeze({\n    MOCK: 'mock',\n    SUPABASE_READ: 'supabase-read',\n    API_WRITE_CANARY: 'api-write-canary-frontend-activation'\n  });",
    'runtime orders provider values'
)
text = replace_once(
    text,
    "  function normalizeOrdersProvider(value) {\n    var provider = String(value || '').trim().toLowerCase();\n    return provider === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY ? ORDERS_PROVIDER_VALUES.API_WRITE_CANARY : ORDERS_PROVIDER_VALUES.MOCK;\n  }",
    "  function normalizeOrdersProvider(value) {\n    var provider = String(value || '').trim().toLowerCase();\n    if (provider === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY) return ORDERS_PROVIDER_VALUES.API_WRITE_CANARY;\n    if (provider === ORDERS_PROVIDER_VALUES.SUPABASE_READ) return ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n    return ORDERS_PROVIDER_VALUES.MOCK;\n  }",
    'runtime normalize orders provider'
)
text = regex_once(
    text,
    r"  function resolveOrdersProvider\(windowConfig, ordersWriteCanary\) \{.*?\n  \}",
    "  function resolveOrdersProvider(windowConfig, ordersWriteCanary, environment) {\n    var params = queryParams();\n    var defaultProvider = environment === 'local'\n      ? ORDERS_PROVIDER_VALUES.MOCK\n      : ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n    var provider = windowConfig.ordersProvider || readStorage('doke.ordersProvider') || defaultProvider;\n    if (params.has('dokeOrdersProvider')) provider = params.get('dokeOrdersProvider');\n    if (ordersWriteCanary) return ORDERS_PROVIDER_VALUES.API_WRITE_CANARY;\n    var normalized = normalizeOrdersProvider(provider);\n    // Mock authority is valid only on an explicit local development host.\n    if (normalized === ORDERS_PROVIDER_VALUES.MOCK && environment !== 'local') {\n      return ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n    }\n    return normalized;\n  }",
    'runtime resolve orders provider',
    re.S
)
text = replace_once(
    text,
    "  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary);",
    "  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary, environment);\n  var ordersReadActivation = ordersProvider === ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n  var ordersMockDevelopment = environment === 'local' && ordersProvider === ORDERS_PROVIDER_VALUES.MOCK;",
    'runtime resolved order provider variables'
)
text = text.replace("version: '20260725-auth-provider-authority-v1'", "version: '20260729-ord-a04-read-authority-v1'")
text = replace_once(
    text,
    "    ordersProvider: ordersProvider,\n    defaultOrdersProvider: ORDERS_PROVIDER_VALUES.MOCK,\n    orderWriteActivation: orderWriteActivation,",
    "    ordersProvider: ordersProvider,\n    requestedOrdersProvider: ordersProvider,\n    defaultOrdersProvider: environment === 'local' ? ORDERS_PROVIDER_VALUES.MOCK : ORDERS_PROVIDER_VALUES.SUPABASE_READ,\n    ordersReadActivation: ordersReadActivation,\n    ordersMockDevelopment: ordersMockDevelopment,\n    orderWriteActivation: orderWriteActivation,",
    'runtime order provider fields'
)
text = replace_once(
    text,
    "      ordersProvider: ordersProvider,\n      orderWriteActivation: orderWriteActivation,",
    "      ordersProvider: ordersProvider,\n      ordersRead: ordersReadActivation,\n      ordersMockDevelopment: ordersMockDevelopment,\n      orderWriteActivation: orderWriteActivation,",
    'runtime canary fields'
)
write(path, text)


# ---------------------------------------------------------------------------
# Canonical orders service read routing
# ---------------------------------------------------------------------------
path = 'assets/js/services/orders-service.js'
text = read(path)
provider_pattern = r"  function getOrdersProviderStatus\(\) \{.*?\n  \}\n\n  function shouldUseOrdersApi\(\) \{.*?\n  \}"
provider_replacement = """  function getOrdersProviderStatus() {
    var boundary = getRepositoryBoundary();
    var boundaryStatus = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var config = getRuntimeConfig();
    var environment = String(config.environment || '').toLowerCase();
    var configuredProvider = String(config.ordersProvider || 'mock').trim().toLowerCase();
    var activeBoundaryProvider = boundaryStatus && boundaryStatus.activeProvider || 'mock';
    var apiReady = boundaryStatus ? boundaryStatus.apiReady === true : false;
    var ordersApiActive = activeBoundaryProvider === 'api' && apiReady;
    var ordersRemoteReadActive = configuredProvider === 'supabase-read';
    var mockDevelopmentActive = config.ordersMockDevelopment === true
      || (environment === 'local' && configuredProvider === 'mock');
    var writeCanaryStatus = getOrdersWriteCanaryStatus();
    var activeProvider = writeCanaryStatus.active
      ? writeCanaryStatus.ordersProvider
      : ordersApiActive
        ? 'api'
        : ordersRemoteReadActive
          ? 'supabase-read'
          : mockDevelopmentActive
            ? 'mock-development'
            : 'blocked';

    return Object.freeze({
      domain: 'orders',
      activeProvider: activeProvider,
      requestedProvider: String(config.requestedOrdersProvider || configuredProvider),
      apiReady: apiReady || writeCanaryStatus.active,
      ordersApiActive: ordersApiActive,
      ordersRemoteReadActive: ordersRemoteReadActive,
      mockDevelopmentActive: mockDevelopmentActive,
      ordersWriteCanaryActive: writeCanaryStatus.active,
      ordersWriteCanary: writeCanaryStatus,
      fallbackProvider: mockDevelopmentActive ? 'mock-development' : 'none'
    });
  }

  function shouldUseOrdersApi() {
    return getOrdersProviderStatus().ordersApiActive === true;
  }

  function shouldUseOrdersRemoteRead() {
    return getOrdersProviderStatus().ordersRemoteReadActive === true;
  }

  function shouldUseOrdersMockDevelopment() {
    return getOrdersProviderStatus().mockDevelopmentActive === true;
  }"""
text = regex_once(text, provider_pattern, provider_replacement, 'orders service provider status', re.S)
text = regex_once(
    text,
    r"  function assertOrderCommandProviderAvailable\(command\) \{.*?\n  \}",
    """  function assertOrderCommandProviderAvailable(command) {
    var status = getOrdersProviderStatus();
    if (status.ordersApiActive || status.ordersWriteCanaryActive || status.mockDevelopmentActive) return status;
    var error = new Error('O servidor de pedidos está indisponível para alterações. Nenhuma mudança foi salva localmente.');
    error.code = 'DOKE_ORDER_COMMAND_BOUNDARY_UNAVAILABLE';
    error.command = command || 'order-command';
    document.dispatchEvent(new CustomEvent('doke:order-command-failed', {
      detail: { command: error.command, code: error.code, message: error.message }
    }));
    throw error;
  }""",
    'orders service command availability',
    re.S
)
text = regex_once(
    text,
    r"  function list\(filters\) \{.*?\n  \}\n\n  function listLocal",
    """  function list(filters) {
    filters = filters || {};
    var actor = getCurrentUser() || {};
    var security = getSecurity();
    var providerStatus = getOrdersProviderStatus();
    if (providerStatus.ordersApiActive) return ordersBoundaryList(filters);
    if (!providerStatus.ordersRemoteReadActive && !providerStatus.mockDevelopmentActive) {
      var unavailable = new Error('A autoridade de leitura de pedidos não está disponível.');
      unavailable.code = 'DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE';
      return Promise.reject(unavailable);
    }
    if (filters.currentUser === false && !(security && typeof security.canAccessAdmin === 'function' && security.canAccessAdmin(actor))) {
      auditSecurity('list_all_denied', 'denied', { actor: actor, reason: 'currentUser_false_requires_admin' });
      return Promise.resolve([]);
    }
    return assertRepository().list(filters).then(function (orders) {
      if (filters.currentUser === false) return orders;
      if (!security || typeof security.canAccessOrder !== 'function') return orders;
      return (orders || []).filter(function (order) { return security.canAccessOrder(actor, order, 'read_order'); });
    });
  }

  function listLocal""",
    'orders service list',
    re.S
)
text = regex_once(
    text,
    r"  function getById\(orderId\) \{.*?\n  \}\n\n  function updateLinkedConversation",
    """  function getById(orderId) {
    var actor = getCurrentUser() || {};
    var providerStatus = getOrdersProviderStatus();
    if (providerStatus.ordersApiActive) {
      return ordersBoundaryGetById(orderId).then(function (order) {
        if (order) assertOrderAccess(order, 'read_order', actor);
        return order;
      });
    }
    if (!providerStatus.ordersRemoteReadActive && !providerStatus.mockDevelopmentActive) {
      var unavailable = new Error('A autoridade de leitura de pedidos não está disponível.');
      unavailable.code = 'DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE';
      return Promise.reject(unavailable);
    }
    return assertRepository().getById(orderId).then(function (order) {
      if (order) assertOrderAccess(order, 'read_order', actor);
      return order;
    });
  }

  function updateLinkedConversation""",
    'orders service get by id',
    re.S
)
text = replace_once(
    text,
    "  function listForCurrentUser(filters) {\n    return list(Object.assign({}, filters || {}, { currentUser: true }));\n  }",
    "  function listForCurrentUser(filters) {\n    return list(Object.assign({}, filters || {}, { currentUser: true }));\n  }\n\n  function summary(filters) {\n    return list(filters || {}).then(function (orders) {\n      return (orders || []).reduce(function (result, order) {\n        var status = normalizeStatusToken(order && order.status || 'pending');\n        result.total += 1;\n        result.byStatus[status] = (result.byStatus[status] || 0) + 1;\n        return result;\n      }, { total: 0, byStatus: {} });\n    });\n  }",
    'orders service summary'
)
text = replace_once(
    text,
    "  services.orders = Object.freeze({\n    provider: 'local-mock',",
    "  services.orders = Object.freeze({\n    provider: 'canonical-orders-service',\n    isCanonicalOrderService: true,",
    'orders service export identity'
)
text = replace_once(
    text,
    "    listForCurrentUser: listForCurrentUser,\n    getById: getById,",
    "    listForCurrentUser: listForCurrentUser,\n    summary: summary,\n    getById: getById,",
    'orders service export summary'
)
text = replace_once(
    text,
    "  });\n})();",
    "  });\n\n  document.dispatchEvent(new CustomEvent('doke:orders-service-ready', {\n    detail: { provider: getOrdersProviderStatus() }\n  }));\n})();",
    'orders service ready event'
)
write(path, text)


# ---------------------------------------------------------------------------
# Orders repository: remote read authority, no silent fallback
# ---------------------------------------------------------------------------
path = 'assets/js/repositories/orders-repository.js'
text = read(path)
insert_after = """  function getSessionUser() {
    var user = Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;

    if (user) return user;

    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }
"""
provider_helpers = insert_after + """
  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object' ? Doke.runtimeConfig : {};
  }

  function getProviderPolicy() {
    var config = getRuntimeConfig();
    var environment = String(config.environment || '').toLowerCase();
    var provider = String(config.ordersProvider || 'mock').trim().toLowerCase();
    var remoteReadActive = provider === 'supabase-read';
    var mockDevelopmentActive = config.ordersMockDevelopment === true
      || (environment === 'local' && provider === 'mock');
    return Object.freeze({
      provider: provider,
      environment: environment,
      remoteReadActive: remoteReadActive,
      mockDevelopmentActive: mockDevelopmentActive,
      fallbackAllowed: false
    });
  }

  function readAuthorityError(message) {
    var error = new Error(message || 'A autoridade remota de leitura de pedidos está indisponível.');
    error.code = 'DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function assertMockDevelopment(operation) {
    var policy = getProviderPolicy();
    if (policy.mockDevelopmentActive) return policy;
    var error = new Error('Fixtures de pedidos só podem ser alteradas no modo local de desenvolvimento.');
    error.code = 'DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED';
    error.operation = operation || 'mock';
    throw error;
  }
"""
text = replace_once(text, insert_after, provider_helpers, 'orders repository provider helpers')
text = regex_once(
    text,
    r"  function warnRemote\(error, context\) \{.*?\n  \}",
    """  function warnRemote(error, context) {
    lastRemoteError = error || readAuthorityError();
    setProviderState('remote-error');
    if (root.console && typeof root.console.error === 'function') {
      root.console.error('[Doke orders repository] Falha na autoridade remota em ' + context + '.', error);
    }
  }""",
    'orders repository remote error',
    re.S
)
text = regex_once(
    text,
    r"  function getSupabaseClient\(\) \{.*?\n  \}",
    """  function getSupabaseClient() {
    var policy = getProviderPolicy();
    if (!policy.remoteReadActive) {
      setProviderState(policy.mockDevelopmentActive ? 'mock-development' : 'blocked');
      return null;
    }
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.ordersEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState('remote-unavailable');
      return null;
    }
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase-read');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }""",
    'orders repository supabase client',
    re.S
)
text = replace_once(
    text,
    "  function mapRemoteRow(row) {\n    row = row || {};\n    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};",
    "  function mapRemoteRow(row, budgetRow) {\n    row = row || {};\n    budgetRow = budgetRow || null;\n    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};\n    var budgetAmount = budgetRow && Number.isFinite(Number(budgetRow.amount_cents))\n      ? Number(budgetRow.amount_cents) / 100\n      : Number(metadata.budgetAmount || 0);",
    'orders repository map remote signature'
)
text = replace_once(
    text,
    "      syncedAt: new Date().toISOString()\n    }));",
    "      budgetAmount: budgetAmount || null,\n      budget: budgetAmount > 0 ? toCurrencyLabel(budgetAmount) : (metadata.budget || 'A definir'),\n      budgetRecord: budgetRow ? clone(budgetRow) : null,\n      syncedAt: new Date().toISOString()\n    }));",
    'orders repository remote budget mapping'
)
text = regex_once(
    text,
    r"  function fetchRemoteOrders\(\) \{.*?\n  \}\n\n  function resolveRemoteServiceId",
    """  function fetchRemoteBudgetMap(client, orderIds) {
    var ids = (orderIds || []).filter(Boolean);
    if (!ids.length) return Promise.resolve(Object.create(null));
    return client.from('budgets')
      .select('id,order_id,professional_id,amount_cents,currency,description,status,valid_until,created_at,updated_at')
      .in('order_id', ids)
      .order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        return (result.data || []).reduce(function (map, row) {
          if (!map[row.order_id]) map[row.order_id] = row;
          return map;
        }, Object.create(null));
      });
  }

  function fetchRemoteOrders() {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return [];
      return client.from(REMOTE_TABLE).select('*').order('created_at', { ascending: false }).then(function (result) {
        if (result.error) throw result.error;
        var rows = result.data || [];
        return fetchRemoteBudgetMap(client, rows.map(function (row) { return row.id; })).then(function (budgetMap) {
          setProviderState('supabase-read');
          return Promise.all(rows.map(function (row) {
            return hydrateAttachmentUrls(mapRemoteRow(row, budgetMap[row.id] || null));
          }));
        });
      });
    });
  }

  function fetchRemoteOrderById(orderId) {
    var client = getSupabaseClient();
    var id = normalizeText(orderId);
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    if (!id) return Promise.resolve(null);
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return null;
      var query = client.from(REMOTE_TABLE).select('*');
      query = isUuid(id) ? query.eq('id', id) : query.eq('external_id', id);
      return query.maybeSingle().then(function (result) {
        if (result.error) throw result.error;
        if (!result.data) return null;
        return fetchRemoteBudgetMap(client, [result.data.id]).then(function (budgetMap) {
          setProviderState('supabase-read');
          return hydrateAttachmentUrls(mapRemoteRow(result.data, budgetMap[result.data.id] || null));
        });
      });
    });
  }

  function resolveRemoteServiceId""",
    'orders repository remote reads',
    re.S
)
text = regex_once(
    text,
    r"  function load\(options\) \{.*?\n  \}\n\n  function save\(order\)",
    """  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));
    var policy = getProviderPolicy();
    if (policy.mockDevelopmentActive) return loadLocal(options);
    if (!policy.remoteReadActive) return Promise.reject(readAuthorityError());
    var client = getSupabaseClient();
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    var localDrafts = readLocal().filter(function (item) {
      return normalizeStatus(item && item.status) === 'draft' || item && item.syncStatus === 'local-draft';
    });
    return fetchRemoteOrders().then(function (remote) {
      lastRemoteError = null;
      cache = mergeById(localDrafts, remote);
      return clone(cache);
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      throw error;
    });
  }

  function save(order)""",
    'orders repository load policy',
    re.S
)
text = replace_once(
    text,
    "  function saveMock(order) {\n    return saveLocal(normalizeOrder(order), 'mock');\n  }",
    "  function saveMock(order) {\n    assertMockDevelopment('saveMock');\n    return saveLocal(normalizeOrder(order), 'mock');\n  }",
    'orders repository save mock guard'
)
text = replace_once(
    text,
    "  function removeMock(orderId) {\n    return removeLocal(orderId);\n  }",
    "  function removeMock(orderId) {\n    assertMockDevelopment('removeMock');\n    return removeLocal(orderId);\n  }",
    'orders repository remove mock guard'
)
text = regex_once(
    text,
    r"  function listLocal\(filters\) \{.*?\n  \}\n\n  function getById",
    """  function listLocal(filters) {
    filters = filters || {};
    var currentUser = filters.currentUser === false ? null : getSessionUser();
    var policy = getProviderPolicy();
    var source = readLocal().filter(function (item) {
      return policy.mockDevelopmentActive
        || normalizeStatus(item && item.status) === 'draft'
        || item && item.syncStatus === 'local-draft';
    });
    return clone(source.filter(function (item) {
      if (filters.currentUser !== false && !matchesCurrentUser(item, currentUser)) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    }));
  }

  function getById""",
    'orders repository local list policy',
    re.S
)
text = regex_once(
    text,
    r"  function getById\(orderId\) \{.*?\n  \}\n\n  function saveLocal",
    """  function getById(orderId) {
    var id = normalizeText(orderId);
    var policy = getProviderPolicy();
    if (!id) return Promise.resolve(null);
    if (policy.remoteReadActive) return fetchRemoteOrderById(id);
    if (!policy.mockDevelopmentActive) return Promise.reject(readAuthorityError());
    return loadLocal({ currentUser: false }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === id; }) || null);
    });
  }

  function saveLocal""",
    'orders repository get by id policy',
    re.S
)
text = replace_once(
    text,
    "    getProviderStatus: function () {\n      return Object.freeze({\n        provider: getSupabaseClient() ? 'supabase' : 'local',\n        fallbackActive: Boolean(lastRemoteError),\n        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''\n      });\n    },",
    "    getProviderStatus: function () {\n      var policy = getProviderPolicy();\n      return Object.freeze({\n        provider: policy.remoteReadActive ? 'supabase-read' : policy.mockDevelopmentActive ? 'mock-development' : 'blocked',\n        remoteReadActive: policy.remoteReadActive,\n        mockDevelopmentActive: policy.mockDevelopmentActive,\n        fallbackActive: false,\n        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''\n      });\n    },",
    'orders repository provider status'
)
write(path, text)


# ---------------------------------------------------------------------------
# A04 documentation, evidence, audits and tests
# ---------------------------------------------------------------------------
write('docs/ORD-001-READ-AUTHORITY.md', """# ORD-001 — Autoridade canônica de leitura

## Escopo

O ORD-A04 remove a última autoridade mock implícita das leituras de pedidos fora do ambiente local. A partir deste sublote, staging utiliza o espelho participante do Supabase, protegido por RLS, enquanto fixtures continuam disponíveis somente em host local de desenvolvimento.

## Provider por ambiente

| Ambiente | Provider de leitura | Mock submetido |
| --- | --- | --- |
| Local | `mock-development` | permitido apenas por métodos explícitos |
| Staging | `supabase-read` | bloqueado |
| Produção | `supabase-read` | bloqueado; gate de produção continua fechado |

O provider de leitura é específico do domínio de pedidos e não depende da ativação global dos demais repositórios.

## Serviço único

`assets/js/services/orders-service.js` é a única autoridade de negócio. `order-service.js` tornou-se apenas uma fachada de compatibilidade: não lê fixtures, não persiste estado e delega ao serviço canônico quando ele está carregado.

## Falhas remotas

Falhas do Supabase não caem mais para `mock-orders.json` ou snapshots submetidos do `localStorage`. O runtime rejeita a leitura com `DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE`, preservando rascunhos locais sem apresentá-los como pedidos canônicos.

## Orçamentos

A leitura remota busca também o orçamento mais recente permitido por RLS. Cliente e profissional vinculados observam a mesma proposta em dispositivos distintos sem depender do cache do navegador.

## Escrita

O ORD-A04 não amplia escrita. Comandos enviados continuam exigindo a API/RPC canônica ou o canário de escrita. Apenas o ambiente local explícito pode executar `saveMock` e `removeMock`.

## Gates preservados

- produção permanece bloqueada;
- PAY-001 e SCHED-001 continuam fora deste sublote;
- nenhuma linha real foi criada ou alterada;
- nenhuma autoridade de mensagens ou pagamentos foi incorporada aos pedidos.
""")

write('docs/validation/ORD-001-A04-READ-AUTHORITY.json', json.dumps({
    'domain': 'ORD-001',
    'sublot': 'ORD-A04',
    'status': 'implemented_pending_final_workflow',
    'environment': 'staging',
    'projectRef': 'zwkczgewzbsorbrjuzpb',
    'recordedAt': '2026-07-29T18:27:00-03:00',
    'authority': {
        'canonicalFrontendService': 'assets/js/services/orders-service.js',
        'legacyServiceRole': 'compatibility_facade_only',
        'stagingReadProvider': 'supabase-read',
        'localReadProvider': 'mock-development',
        'silentReadFallback': False,
        'submittedMockWritesOutsideLocal': False,
        'latestBudgetProjection': True
    },
    'browser': {
        'remoteReadErrorCode': 'DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE',
        'mockMutationErrorCode': 'DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED',
        'localDraftsPreserved': True,
        'legacySubmittedSnapshotsIgnoredRemotely': True
    },
    'matrix': {
        'maturity': 4,
        'userFacingAuthority': 'hybrid',
        'serverAuthority': 'canonical',
        'stagingEvidence': 'staging_operational',
        'securityGate': 'partial',
        'productionGate': 'blocked'
    },
    'operationalSafety': {
        'realRowsMutatedDuringValidation': 0,
        'productionChanged': False,
        'paidProvidersEnabled': False,
        'mergeAuthorized': False
    },
    'validation': {'workflowRunId': None, 'workflowConclusion': 'pending'},
    'nextSublot': 'ORD-A05'
}, indent=2, ensure_ascii=False) + '\n')

write('scripts/test-order-read-authority-runtime.js', """'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = (path) => fs.readFileSync(path, 'utf8');
const runtime = read('assets/js/core/runtime-config.js');
const legacy = read('assets/js/services/order-service.js');
const service = read('assets/js/services/orders-service.js');
const repository = read('assets/js/repositories/orders-repository.js');

new vm.Script(runtime, { filename: 'runtime-config.js' });
new vm.Script(legacy, { filename: 'order-service.js' });
new vm.Script(service, { filename: 'orders-service.js' });
new vm.Script(repository, { filename: 'orders-repository.js' });

assert(runtime.includes("SUPABASE_READ: 'supabase-read'"));
assert(runtime.includes("environment === 'local'"));
assert(runtime.includes('ordersMockDevelopment'));
assert(!legacy.includes('mockData.load'));
assert(legacy.includes('isLegacyOrderFacade'));
assert(service.includes('isCanonicalOrderService: true'));
assert(service.includes('ordersRemoteReadActive'));
assert(service.includes('summary: summary'));
assert(repository.includes('DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE'));
assert(repository.includes('DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED'));
assert(repository.includes("setProviderState('remote-error')"));
assert(repository.includes("client.from('budgets')"));
assert(!repository.includes("Usando fallback local"));

function evaluateRuntime(hostname) {
  const storage = new Map();
  const sandbox = {
    window: {
      location: { hostname, search: '' },
      localStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); },
        removeItem(key) { storage.delete(key); }
      }
    },
    URLSearchParams,
    Object,
    String,
    Boolean
  };
  sandbox.window.window = sandbox.window;
  vm.runInNewContext(runtime, sandbox, { filename: 'runtime-config.js' });
  return sandbox.window.Doke.runtimeConfig;
}

const staging = evaluateRuntime('staging.doke.test');
assert.strictEqual(staging.ordersProvider, 'supabase-read');
assert.strictEqual(staging.ordersReadActivation, true);
assert.strictEqual(staging.ordersMockDevelopment, false);

const local = evaluateRuntime('127.0.0.1');
assert.strictEqual(local.ordersProvider, 'mock');
assert.strictEqual(local.ordersReadActivation, false);
assert.strictEqual(local.ordersMockDevelopment, true);

console.log('ORD-A04 order read authority runtime passed.');
""")

write('scripts/audit-ord-001-a04-read-authority.js', """'use strict';
const assert = require('assert');
const fs = require('fs');
const read = (path) => fs.readFileSync(path, 'utf8');
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const evidence = JSON.parse(read('docs/validation/ORD-001-A04-READ-AUTHORITY.json'));
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 matrix entry is required.');
assert(Number(matrix.version.split('.').pop()) >= 15, 'Matrix version must include ORD-A04.');
assert(ord.requiredPaths.includes('docs/ORD-001-READ-AUTHORITY.md'));
assert(ord.tests.includes('audit:ord-001-a04-read-authority'));
assert(ord.tests.includes('test:order-read-authority-runtime'));
const blocker = ord.blockers.find((item) => item.id === 'ORD-B02');
assert(blocker && blocker.description.includes('Submitted commands'), 'ORD-B02 must describe the remaining command activation gap.');
assert.strictEqual(evidence.authority.stagingReadProvider, 'supabase-read');
assert.strictEqual(evidence.authority.silentReadFallback, false);
assert.strictEqual(evidence.operationalSafety.productionChanged, false);
console.log('ORD-A04 read authority audit passed.');
""")

write('.github/workflows/ord-001-a04-read-authority.yml', """name: Doke ORD-A04 Read Authority

on:
  pull_request:
    paths:
      - assets/js/core/runtime-config.js
      - assets/js/repositories/orders-repository.js
      - assets/js/services/order-service.js
      - assets/js/services/orders-service.js
      - config/domain-completion-matrix.json
      - docs/ORD-001-READ-AUTHORITY.md
      - docs/validation/ORD-001-A04-READ-AUTHORITY.json
      - scripts/audit-ord-001-a04-read-authority.js
      - scripts/test-order-read-authority-runtime.js
      - .github/workflows/ord-001-a04-read-authority.yml
  workflow_dispatch:

permissions:
  contents: read

jobs:
  contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - name: Audit ORD-A04 read authority
        run: node scripts/audit-ord-001-a04-read-authority.js
      - name: Test ORD-A04 browser runtime
        run: node scripts/test-order-read-authority-runtime.js
      - name: Preserve ORD-A03 command boundary
        run: node scripts/audit-ord-001-a03-command-boundary.js && node scripts/test-order-command-boundary-runtime.js
      - name: Preserve order state machine
        run: node scripts/test-order-state-machine-runtime.js
      - name: Audit domain completion matrix
        run: node scripts/audit-domain-completion-matrix.js
""")

# package scripts
package = json.loads(read('package.json'))
scripts = package.setdefault('scripts', {})
scripts['audit:ord-001-a04-read-authority'] = 'node scripts/audit-ord-001-a04-read-authority.js'
scripts['test:order-read-authority-runtime'] = 'node scripts/test-order-read-authority-runtime.js'
write('package.json', json.dumps(package, indent=2, ensure_ascii=False) + '\n')

# matrix
matrix = json.loads(read('config/domain-completion-matrix.json'))
matrix['version'] = '1.3.15'
matrix['updatedAt'] = '2026-07-29T18:27:00-03:00'
ord = next(domain for domain in matrix['domains'] if domain['id'] == 'ORD-001')
for required in [
    'assets/js/core/runtime-config.js',
    'assets/js/services/order-service.js',
    'assets/js/services/orders-service.js',
    'docs/ORD-001-READ-AUTHORITY.md',
    'docs/validation/ORD-001-A04-READ-AUTHORITY.json',
    'scripts/audit-ord-001-a04-read-authority.js',
    'scripts/test-order-read-authority-runtime.js'
]:
    if required not in ord['requiredPaths']:
        ord['requiredPaths'].append(required)
for root in ['assets/js/services/order-service.js', 'assets/js/core/runtime-config.js']:
    if root not in ord['scanRoots']:
        ord['scanRoots'].append(root)
for test in ['audit:ord-001-a04-read-authority', 'test:order-read-authority-runtime']:
    if test not in ord['tests']:
        ord['tests'].append(test)
for item in [
    'ORD-A04 makes participant-scoped Supabase reads canonical outside local development and removes silent read fallback to submitted browser snapshots.',
    'The historical order-service.js is now a compatibility-only facade; orders-service.js is the single frontend business authority.',
    'Latest participant-visible budgets are projected with remote orders so proposal state remains consistent across devices.'
]:
    if item not in ord['evidence']:
        ord['evidence'].append(item)
for blocker in ord['blockers']:
    if blocker['id'] == 'ORD-B02':
        blocker['description'] = 'Remote reads are canonical in staging and mock is local-development-only. Submitted commands still require controlled activation plus two-account cross-device E2E before the frontend activation blocker can close.'
ord['nextActions'] = [
    'Run a two-account cross-device canary for request, accept and quote through the canonical command boundary.',
    'Harden worker invocation freshness and replay resistance.',
    'Connect order transitions to messaging, scheduling and payment authorities.'
]
write('config/domain-completion-matrix.json', json.dumps(matrix, indent=2, ensure_ascii=False) + '\n')

# regenerate living matrix artifacts
subprocess.run(['node', 'scripts/audit-domain-completion-matrix.js', '--write'], check=True)

print('ORD-A04 applicator completed.')

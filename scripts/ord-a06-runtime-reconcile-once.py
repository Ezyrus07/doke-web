#!/usr/bin/env python3
import json
from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    source = path.read_text(encoding='utf-8')
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one fragment, found {count}')
    path.write_text(source.replace(old, new, 1), encoding='utf-8')


runtime_path = Path('assets/js/core/runtime-config.js')
replace_once(
    runtime_path,
    "    ordersWriteEnabled: 'doke.canary.ordersWrite.enabled',\n    betaLaunchEnabled: 'doke.canary.betaLaunch.enabled'",
    "    ordersWriteEnabled: 'doke.canary.ordersWrite.enabled',\n    ordersWriteReadProvider: 'doke.canary.ordersWrite.readProvider',\n    betaLaunchEnabled: 'doke.canary.betaLaunch.enabled'",
    'runtime canary storage keys'
)
replace_once(
    runtime_path,
    "  function resolveOrderWriteActivation(windowConfig, ordersWriteCanary) {",
    """  function resolveOrdersReadProvider(windowConfig, environment) {
    var params = queryParams();
    var defaultProvider = environment === 'local'
      ? ORDERS_PROVIDER_VALUES.MOCK
      : ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    var nestedCanary = windowConfig.canary && typeof windowConfig.canary === 'object'
      ? windowConfig.canary.ordersReadProvider
      : '';
    var provider = windowConfig.ordersReadProvider
      || nestedCanary
      || readStorage(CANARY_STORAGE_KEYS.ordersWriteReadProvider)
      || windowConfig.ordersProvider
      || readStorage('doke.ordersProvider')
      || defaultProvider;
    if (params.has('dokeOrdersReadProvider')) provider = params.get('dokeOrdersReadProvider');
    var normalized = normalizeOrdersProvider(provider);
    if (normalized === ORDERS_PROVIDER_VALUES.API_WRITE_CANARY) normalized = defaultProvider;
    if (normalized === ORDERS_PROVIDER_VALUES.MOCK && environment !== 'local') {
      return ORDERS_PROVIDER_VALUES.SUPABASE_READ;
    }
    return normalized;
  }

  function resolveOrderWriteActivation(windowConfig, ordersWriteCanary) {""",
    'runtime read provider resolver'
)
replace_once(
    runtime_path,
    "  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary, environment);\n  var ordersReadActivation = ordersProvider === ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n  var ordersMockDevelopment = environment === 'local' && ordersProvider === ORDERS_PROVIDER_VALUES.MOCK;",
    "  var ordersProvider = resolveOrdersProvider(windowConfig, ordersWriteCanary, environment);\n  var ordersReadProvider = resolveOrdersReadProvider(windowConfig, environment);\n  var ordersReadActivation = ordersReadProvider === ORDERS_PROVIDER_VALUES.SUPABASE_READ;\n  var ordersMockDevelopment = environment === 'local' && ordersReadProvider === ORDERS_PROVIDER_VALUES.MOCK;",
    'runtime provider assignments'
)
replace_once(runtime_path, "    version: '20260729-ord-a04-read-authority-v1',", "    version: '20260729-ord-a06-visual-settlement-v1',", 'runtime version')
replace_once(
    runtime_path,
    "    ordersProvider: ordersProvider,\n    requestedOrdersProvider: ordersProvider,",
    "    ordersProvider: ordersProvider,\n    ordersReadProvider: ordersReadProvider,\n    requestedOrdersProvider: ordersProvider,",
    'runtime exposed read provider'
)
replace_once(
    runtime_path,
    "      ordersProvider: ordersProvider,\n      ordersRead: ordersReadActivation,",
    "      ordersProvider: ordersProvider,\n      ordersReadProvider: ordersReadProvider,\n      ordersRead: ordersReadActivation,",
    'runtime canary read provider'
)
replace_once(
    runtime_path,
    "    ordersProviderQueryParam: 'dokeOrdersProvider',\n    orderWriteActivationQueryParam: 'dokeOrderWriteActivation',",
    "    ordersProviderQueryParam: 'dokeOrdersProvider',\n    ordersReadProviderQueryParam: 'dokeOrdersReadProvider',\n    orderWriteActivationQueryParam: 'dokeOrderWriteActivation',",
    'runtime read query parameter'
)
replace_once(
    runtime_path,
    "    ordersProviderStorageKey: 'doke.ordersProvider',\n    orderWriteActivationStorageKey: 'doke.orderWriteActivation',",
    "    ordersProviderStorageKey: 'doke.ordersProvider',\n    ordersReadProviderStorageKey: CANARY_STORAGE_KEYS.ordersWriteReadProvider,\n    orderWriteActivationStorageKey: 'doke.orderWriteActivation',",
    'runtime read storage key'
)

repository_path = Path('assets/js/repositories/orders-repository.js')
replace_once(
    repository_path,
    "    var provider = String(config.ordersProvider || 'mock').trim().toLowerCase();",
    "    var provider = String(config.ordersReadProvider || config.ordersProvider || 'mock').trim().toLowerCase();",
    'repository read provider policy'
)

service_path = Path('assets/js/services/orders-service.js')
replace_once(
    service_path,
    "    ordersProvider: 'doke.ordersProvider',\n    orderWriteActivation: 'doke.orderWriteActivation',",
    "    ordersProvider: 'doke.ordersProvider',\n    readProvider: 'doke.canary.ordersWrite.readProvider',\n    orderWriteActivation: 'doke.orderWriteActivation',",
    'service storage key'
)
replace_once(
    service_path,
    "        'doke.ordersProvider': readStorage(ORDERS_WRITE_CANARY_KEYS.ordersProvider),\n        'doke.orderWriteActivation': readStorage(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation),",
    "        'doke.ordersProvider': readStorage(ORDERS_WRITE_CANARY_KEYS.ordersProvider),\n        'doke.canary.ordersWrite.readProvider': readStorage(ORDERS_WRITE_CANARY_KEYS.readProvider),\n        'doke.orderWriteActivation': readStorage(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation),",
    'service backup read provider'
)
replace_once(
    service_path,
    "  function readOrdersApiBaseUrl(config) {",
    """  function resolveOrdersReadProvider(config) {
    config = config || {};
    var environment = String(config.environment || '').trim().toLowerCase();
    var nested = config.canary && config.canary.ordersReadProvider;
    var provider = String(
      config.ordersReadProvider
      || nested
      || readStorage(ORDERS_WRITE_CANARY_KEYS.readProvider)
      || config.defaultOrdersProvider
      || (environment === 'local' ? 'mock' : 'supabase-read')
    ).trim().toLowerCase();
    if (provider === ORDERS_WRITE_CANARY_PROVIDER) provider = environment === 'local' ? 'mock' : 'supabase-read';
    if (provider === 'mock' && environment !== 'local') return 'supabase-read';
    return provider === 'supabase-read' ? 'supabase-read' : 'mock';
  }

  function readOrdersApiBaseUrl(config) {""",
    'service read provider resolver'
)
replace_once(
    service_path,
    """  function refreshRuntimeOrdersWriteCanaryConfig(enabled) {
    var config = getRuntimeConfig();
    var flags = Object.assign({}, getRuntimeFlags(), {
      enableNetworkRequests: readNetworkEnabled(config)
    });
    var ordersProvider = enabled ? ORDERS_WRITE_CANARY_PROVIDER : readOrdersProvider(config);
    Doke.runtimeConfig = Object.freeze(Object.assign({}, config, {
      flags: flags,
      dataProvider: enabled ? 'mock' : (config.dataProvider || 'mock'),
      ordersProvider: ordersProvider,
      orderWriteActivation: enabled && readOrderWriteActivation(config),
      ordersWriteCanary: enabled,
      apiBaseUrl: readOrdersApiBaseUrl(config) || config.apiBaseUrl || '',
      canary: Object.freeze(Object.assign({}, config.canary || {}, {
        ordersWrite: enabled,
        ordersProvider: ordersProvider,
        forcedDataProvider: enabled ? 'mock' : (config.canary && config.canary.forcedDataProvider || ''),
        orderWriteActivation: enabled && readOrderWriteActivation(config)
      }))
    }));
  }""",
    """  function refreshRuntimeOrdersWriteCanaryConfig(enabled) {
    var config = getRuntimeConfig();
    var flags = Object.assign({}, getRuntimeFlags(), {
      enableNetworkRequests: readNetworkEnabled(config)
    });
    var ordersReadProvider = resolveOrdersReadProvider(config);
    var restoredProvider = readOrdersProvider(config);
    if (!enabled && restoredProvider === ORDERS_WRITE_CANARY_PROVIDER) restoredProvider = ordersReadProvider;
    var ordersProvider = enabled ? ORDERS_WRITE_CANARY_PROVIDER : restoredProvider;
    var ordersReadActivation = ordersReadProvider === 'supabase-read';
    var ordersMockDevelopment = String(config.environment || '').toLowerCase() === 'local' && ordersReadProvider === 'mock';
    Doke.runtimeConfig = Object.freeze(Object.assign({}, config, {
      flags: flags,
      dataProvider: enabled ? 'mock' : (config.dataProvider || 'mock'),
      ordersProvider: ordersProvider,
      ordersReadProvider: ordersReadProvider,
      ordersReadActivation: ordersReadActivation,
      ordersMockDevelopment: ordersMockDevelopment,
      orderWriteActivation: enabled && readOrderWriteActivation(config),
      ordersWriteCanary: enabled,
      apiBaseUrl: readOrdersApiBaseUrl(config) || config.apiBaseUrl || '',
      canary: Object.freeze(Object.assign({}, config.canary || {}, {
        ordersWrite: enabled,
        ordersProvider: ordersProvider,
        ordersReadProvider: ordersReadProvider,
        ordersRead: ordersReadActivation,
        forcedDataProvider: enabled ? 'mock' : (config.canary && config.canary.forcedDataProvider || ''),
        orderWriteActivation: enabled && readOrderWriteActivation(config)
      }))
    }));
  }""",
    'service runtime refresh'
)
replace_once(
    service_path,
    "    var ordersProvider = readOrdersProvider(config);\n    var apiBaseUrl = readOrdersApiBaseUrl(config);",
    "    var ordersProvider = readOrdersProvider(config);\n    var ordersReadProvider = resolveOrdersReadProvider(config);\n    var apiBaseUrl = readOrdersApiBaseUrl(config);",
    'service canary status read provider'
)
replace_once(
    service_path,
    "      ordersProvider: ordersProvider,\n      dataProvider: dataProvider,",
    "      ordersProvider: ordersProvider,\n      ordersReadProvider: ordersReadProvider,\n      dataProvider: dataProvider,",
    'service canary status response'
)
replace_once(
    service_path,
    "    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.enabled, 'true');\n    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, ORDERS_WRITE_CANARY_PROVIDER);",
    "    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.enabled, 'true');\n    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.readProvider, resolveOrdersReadProvider(getRuntimeConfig()));\n    writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, ORDERS_WRITE_CANARY_PROVIDER);",
    'service configure preserves read provider'
)
replace_once(
    service_path,
    "      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, 'mock');\n      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation, null);",
    "      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.ordersProvider, null);\n      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.readProvider, null);\n      writeStorageValue(ORDERS_WRITE_CANARY_KEYS.orderWriteActivation, null);",
    'service rollback provider cleanup'
)
replace_once(
    service_path,
    "    var configuredProvider = String(config.ordersProvider || 'mock').trim().toLowerCase();\n    var activeBoundaryProvider = boundaryStatus && boundaryStatus.activeProvider || 'mock';",
    "    var configuredProvider = String(config.ordersProvider || 'mock').trim().toLowerCase();\n    var ordersReadProvider = resolveOrdersReadProvider(config);\n    var activeBoundaryProvider = boundaryStatus && boundaryStatus.activeProvider || 'mock';",
    'service provider status read provider'
)
replace_once(
    service_path,
    "    var ordersRemoteReadActive = configuredProvider === 'supabase-read';\n    var mockDevelopmentActive = config.ordersMockDevelopment === true\n      || (environment === 'local' && configuredProvider === 'mock');",
    "    var ordersRemoteReadActive = ordersReadProvider === 'supabase-read';\n    var mockDevelopmentActive = config.ordersMockDevelopment === true\n      || (environment === 'local' && ordersReadProvider === 'mock');",
    'service provider activation split'
)
replace_once(
    service_path,
    "      requestedProvider: String(config.requestedOrdersProvider || configuredProvider),\n      apiReady: apiReady || writeCanaryStatus.active,",
    "      requestedProvider: String(config.requestedOrdersProvider || configuredProvider),\n      readProvider: ordersReadProvider,\n      apiReady: apiReady || writeCanaryStatus.active,",
    'service provider status exposed read provider'
)

package_path = Path('package.json')
package = json.loads(package_path.read_text(encoding='utf-8'))
scripts = package.setdefault('scripts', {})
scripts['audit:ord-001-a06-visual-settlement'] = 'node scripts/audit-ord-001-a06-visual-settlement.js'
scripts['test:order-visual-settlement-runtime'] = 'node scripts/test-order-visual-settlement-runtime.js'
package_path.write_text(json.dumps(package, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

matrix_path = Path('config/domain-completion-matrix.json')
matrix = json.loads(matrix_path.read_text(encoding='utf-8'))
matrix['version'] = '1.3.17'
matrix['updatedAt'] = '2026-07-29T21:04:00-03:00'
ord_domain = next(domain for domain in matrix['domains'] if domain['id'] == 'ORD-001')
for item in [
    'docs/ORD-001-A06-VISUAL-SETTLEMENT-PREFLIGHT.md',
    'docs/validation/ORD-001-A06-VISUAL-SETTLEMENT-PREFLIGHT.json',
    'scripts/audit-ord-001-a06-visual-settlement.js',
    'scripts/test-order-visual-settlement-runtime.js',
    '.github/workflows/ord-001-a06-visual-settlement.yml'
]:
    if item not in ord_domain['requiredPaths']:
        ord_domain['requiredPaths'].append(item)
for item in ['audit:ord-001-a06-visual-settlement', 'test:order-visual-settlement-runtime']:
    if item not in ord_domain['tests']:
        ord_domain['tests'].append(item)
for item in [
    'ORD-A06 preflight found that command-canary activation and canonical order reads shared one provider field, preventing reliable read-after-write UI settlement.',
    'The frontend now preserves supabase-read as the independent order read provider while api-write-canary-frontend-activation is used only for authenticated commands.',
    'A deterministic two-context runtime proves requested, accepted and quoted states converge without shared storage or silent local fallback.',
    'The real two-account Playwright canary remains blocked until two explicitly authorized accounts and a runId-scoped cleanup boundary are available.'
]:
    if item not in ord_domain['evidence']:
        ord_domain['evidence'].append(item)
blocker = next(item for item in ord_domain['blockers'] if item['id'] == 'ORD-B02')
blocker['description'] = 'Canonical reads and canary commands are now separated and deterministic cross-context settlement passes. ORD-B02 remains until two explicitly authorized staging accounts complete the real browser UI canary with runId-scoped cleanup.'
ord_domain['nextActions'] = [
    'Freeze a service-role-only cleanup boundary for ORD-A06 runId-tagged fixtures.',
    'Obtain two explicitly authorized staging test accounts without changing real users.',
    'Run the two-browser requested, accepted, quoted, conflict and UI settlement canary, then prove zero residue.',
    'Harden worker invocation freshness and replay resistance.'
]
matrix_path.write_text(json.dumps(matrix, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

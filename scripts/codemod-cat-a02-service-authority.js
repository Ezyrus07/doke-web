#!/usr/bin/env node
'use strict';

const fs = require('fs');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function write(file, content) {
  fs.writeFileSync(file, content.endsWith('\n') ? content : content + '\n');
}

function replaceOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first === -1) throw new Error(`Missing replacement marker: ${label}`);
  if (source.indexOf(oldText, first + oldText.length) !== -1) throw new Error(`Ambiguous replacement marker: ${label}`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

function replaceBlock(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Missing block start: ${label}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end === -1) throw new Error(`Missing block end: ${label}`);
  return source.slice(0, start) + replacement + '\n\n  ' + source.slice(end);
}

const repositoryFile = 'assets/js/repositories/services-repository.js';
let repository = read(repositoryFile);

repository = replaceOnce(
  repository,
  `/* Doke Services Repository\n   Responsibility: canonical persistence boundary for service listings.\n   Production path: Supabase (shared across users/devices).\n   Development fallback: localStorage, with best-effort remote synchronization. */`,
  `/* Doke Services Repository\n   Responsibility: canonical persistence boundary for service listings.\n   Real authority: Supabase catalog and versioned moderation.\n   Fixture compatibility: non-UUID services held only in runtime memory. */`,
  'repository header'
);

repository = replaceOnce(
  repository,
  `  var STORAGE_KEY = 'doke.services.local.v1';\n  var PROVIDER_ATTRIBUTE = 'data-doke-services-provider';`,
  `  var AUTHORITY = 'supabase-or-fixture-memory';\n  var PROVIDER_ATTRIBUTE = 'data-doke-services-provider';`,
  'authority constant'
);

repository = replaceOnce(
  repository,
  `  var lastRemoteError = null;`,
  `  var lastRemoteError = null;\n  var fixtureServices = [];`,
  'fixture memory declaration'
);

repository = replaceBlock(
  repository,
  'function warnRemote(error, context) {',
  'function getSupabaseClient() {',
  `function warnRemote(error, context) {
    lastRemoteError = error || new Error('Falha desconhecida no catálogo remoto.');
    setProviderState('remote-unavailable');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke services repository] Supabase indisponível em ' + context + '. A operação falhou fechado.', error);
    }
  }`,
  'warnRemote'
);

repository = replaceBlock(
  repository,
  'function getSupabaseClient() {',
  'function readLocalServices() {',
  `function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;

    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.servicesEnabled === false || !config.url || !config.anonKey) {
      supabaseClientAttempted = true;
      setProviderState('fixture-memory');
      return null;
    }

    if (!sdk || typeof sdk.createClient !== 'function') {
      setProviderState('remote-loading');
      return null;
    }
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;

    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function readFixtureServices() {
    return fixtureServices.map(clone);
  }

  function writeFixtureServices(items) {
    fixtureServices = (Array.isArray(items) ? items : []).map(clone);
  }

  function createAuthorityUnavailableError(context, cause) {
    var suffix = cause && cause.message ? ': ' + normalizeText(cause.message) : '';
    var error = new Error('Autoridade remota do catálogo indisponível em ' + context + suffix);
    error.code = 'DOKE_SERVICE_AUTHORITY_UNAVAILABLE';
    if (cause) error.cause = cause;
    return error;
  }

  function isRemoteSubject(service, user) {
    service = service || {};
    return [
      user && user.id,
      service.id,
      service.remoteId,
      service.remote_id,
      service.ownerId,
      service.professionalId,
      service.providerId
    ].map(normalizeText).filter(Boolean).some(isUuid);
  }`,
  'client and fixture authority'
);

repository = replaceBlock(
  repository,
  'function readLocalServices() {',
  'function toPublicStatus(value) {',
  '',
  'retired local storage functions'
);

repository = replaceBlock(
  repository,
  'function canReadLocalService(service, user) {',
  'function toRemotePriceMode(value) {',
  `function canReadFixtureService(service, user) {
    if (!service) return false;
    if (isPubliclyVisible(service)) return true;
    var userId = normalizeText(user && user.id);
    if (!userId) return false;
    return [service.ownerId, service.professionalId, service.providerId]
      .map(normalizeText)
      .filter(Boolean)
      .indexOf(userId) !== -1;
  }

  function resolveReadableFixtureService(service) {
    if (!service) return Promise.resolve(null);
    return Promise.resolve(canReadFixtureService(service, getCachedCurrentUser()) ? service : null);
  }`,
  'fixture readability'
);

repository = replaceBlock(
  repository,
  'function upsertLocal(service, syncStatus) {',
  'function sanitizeMetadata(service) {',
  `function upsertFixture(service) {
    var normalized = normalizeService(Object.assign({}, service, {
      syncStatus: 'fixture-memory',
      updatedAt: service.updatedAt || new Date().toISOString()
    }));
    var fixtures = readFixtureServices().filter(function (item) { return String(item.id) !== String(normalized.id); });
    fixtures.push(normalized);
    writeFixtureServices(fixtures);
    cache = null;
    return normalized;
  }

  function removeFixture(serviceId) {
    var id = normalizeText(serviceId);
    writeFixtureServices(readFixtureServices().filter(function (item) { return String(item.id) !== id; }));
    cache = null;
  }`,
  'fixture mutation functions'
);

repository = replaceOnce(
  repository,
  `    if (!client) return Promise.reject(new Error('Conecte-se à internet para enviar o anúncio para análise. O rascunho continuará salvo neste dispositivo.'));`,
  `    if (!client) return Promise.reject(createAuthorityUnavailableError('submissão para análise'));`,
  'submit no-client failure'
);

repository = replaceOnce(
  repository,
  `          var localSaved = upsertLocal(saved, 'synced');\n          cache = null;\n          lastRemoteError = null;\n          setProviderState('supabase');\n          return clone(localSaved);`,
  `          cache = null;\n          lastRemoteError = null;\n          setProviderState('supabase');\n          return clone(saved);`,
  'submit canonical return'
);

repository = replaceBlock(
  repository,
  'function synchronizePending(items) {',
  'function load(options) {',
  '',
  'pending synchronization'
);

repository = replaceBlock(
  repository,
  'function load(options) {',
  'function list(filters) {',
  `function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    var client = getSupabaseClient();
    if (!client) {
      cache = readFixtureServices().map(normalizeService);
      return Promise.resolve(clone(cache));
    }

    return fetchRemoteServices().then(function (remote) {
      cache = remote.map(normalizeService);
      return clone(cache);
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      cache = null;
      throw createAuthorityUnavailableError('leitura', error);
    });
  }`,
  'load fail-closed authority'
);

repository = replaceBlock(
  repository,
  'function getById(serviceId) {',
  'function save(service) {',
  `function getById(serviceId) {
    var id = normalizeText(serviceId);
    if (!id) return Promise.resolve(null);

    var client = getSupabaseClient();
    if (!client) {
      var fixtureMatch = readFixtureServices().map(normalizeService).find(function (item) {
        return matchesServiceId(item, id);
      }) || null;
      return resolveReadableFixtureService(fixtureMatch).then(clone);
    }

    return fetchRemoteServiceById(id).then(function (remoteMatch) {
      return clone(remoteMatch);
    }).catch(function (error) {
      warnRemote(error, 'leitura do detalhe');
      throw createAuthorityUnavailableError('leitura do detalhe', error);
    });
  }`,
  'getById authority'
);

repository = replaceBlock(
  repository,
  'function save(service) {',
  'function listByProfessional(professionalId, filters) {',
  `function save(service) {
    var normalized = normalizeService(service);
    if (!normalized.id) throw new Error('Service id is required.');

    var client = getSupabaseClient();
    var cachedUser = getCachedCurrentUser();
    if (!client) {
      if (isRemoteSubject(normalized, cachedUser)) {
        return Promise.reject(createAuthorityUnavailableError('gravação'));
      }
      return Promise.resolve(clone(upsertFixture(normalized)));
    }

    return saveRemote(normalized).then(function (remoteSaved) {
      cache = null;
      return clone(remoteSaved);
    }).catch(function (error) {
      warnRemote(error, 'gravação');
      throw createAuthorityUnavailableError('gravação', error);
    });
  }`,
  'save fail-closed authority'
);

repository = replaceBlock(
  repository,
  'function resolveRemoteMetricServiceAfterSync(client, service) {',
  'function recordServiceMetric(service, eventType) {',
  `function resolveRemoteMetricServiceAfterSync(client, service) {
    return resolveRemoteMetricService(client, service);
  }`,
  'metric remote resolution'
);

repository = replaceOnce(
  repository,
  `      source: 'local'`,
  `      source: 'fixture-memory'`,
  'metric empty source'
);

repository = replaceBlock(
  repository,
  'repositories.services = Object.freeze({',
  'repositories.serviceMetrics = Object.freeze({',
  `repositories.services = Object.freeze({
    authority: AUTHORITY,
    normalize: normalizeService,
    load: load,
    list: list,
    getById: getById,
    listByProfessional: listByProfessional,
    save: save,
    submitForReview: submitForReview,
    getOwnedReviewDraft: getOwnedReviewDraft,
    update: update,
    deactivate: deactivate,
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : 'fixture-memory',
        fallbackActive: false,
        remoteUnavailable: Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''
      });
    },
    clearCache: function () { cache = null; },
    clearFixtures: function () { fixtureServices = []; cache = null; }
  });`,
  'repository exports'
);

if (/doke\.services\.local\.v1|localStorage|synchronizePending|upsertLocal|readLocalServices|writeLocalServices|resolveReadableLocalService|local-fallback/.test(repository)) {
  throw new Error('Retired service browser authority marker remains after codemod.');
}
write(repositoryFile, repository);

const repositoryContractFile = 'scripts/test-services-supabase-repository-contract.js';
let repositoryContract = read(repositoryContractFile);
repositoryContract = replaceOnce(
  repositoryContract,
  `  'fetchRemoteServices',\n  'saveRemote',\n  'synchronizePending',\n  "syncStatus: 'pending'",\n  "syncStatus: 'synced'",\n  "upsert(payload, { onConflict: 'external_id' })"`,
  `  'fetchRemoteServices',\n  'saveRemote',\n  "AUTHORITY = 'supabase-or-fixture-memory'",\n  'DOKE_SERVICE_AUTHORITY_UNAVAILABLE',\n  "syncStatus: 'synced'",\n  "upsert(payload, { onConflict: 'external_id' })"`,
  'repository contract markers'
);
repositoryContract = replaceOnce(
  repositoryContract,
  `const storage = new Map();`,
  `const storageAccess = { reads: 0, writes: 0, removes: 0 };`,
  'repository contract storage counter'
);
repositoryContract = replaceOnce(
  repositoryContract,
  `  localStorage: {\n    getItem(key) { return storage.has(key) ? storage.get(key) : null; },\n    setItem(key, value) { storage.set(key, value); }\n  },`,
  `  localStorage: {\n    getItem() { storageAccess.reads += 1; throw new Error('localStorage must not be accessed by the service repository.'); },\n    setItem() { storageAccess.writes += 1; throw new Error('localStorage must not be accessed by the service repository.'); },\n    removeItem() { storageAccess.removes += 1; throw new Error('localStorage must not be accessed by the service repository.'); }\n  },`,
  'repository contract hostile storage'
);
repositoryContract = replaceOnce(
  repositoryContract,
  `  assert(saved.syncStatus === 'synced', 'Authenticated remote save must finish as synced.');\n  assert(repository.getProviderStatus().provider === 'supabase', 'Supabase must be reported as active provider.');`,
  `  assert(saved.syncStatus === 'synced', 'Authenticated remote save must finish as synced.');\n  assert(repository.authority === 'supabase-or-fixture-memory', 'Repository must expose the retired authority contract.');\n  assert(repository.getProviderStatus().provider === 'supabase', 'Supabase must be reported as active provider.');\n  assert(repository.getProviderStatus().fallbackActive === false, 'Repository must never report a browser fallback.');\n  assert(storageAccess.reads === 0 && storageAccess.writes === 0 && storageAccess.removes === 0, 'localStorage must not be accessed by the service repository.');`,
  'repository contract assertions'
);
write(repositoryContractFile, repositoryContract);

const detailContractFile = 'scripts/test-detail-ad-canonical-route-contract.js';
let detailContract = read(detailContractFile);
detailContract = replaceOnce(
  detailContract,
  `assert(repository.includes('matchesServiceId'), 'Repository must reconcile local, external and remote ids.');\nassert(repository.includes('resolveReadableLocalService') && repository.includes('canReadLocalService'), 'Local pending services must remain readable only to their owner when remote sync fails.');`,
  `assert(repository.includes('matchesServiceId'), 'Repository must reconcile fixture, external and remote ids.');\nassert(repository.includes('resolveReadableFixtureService') && repository.includes('canReadFixtureService'), 'Fixture services must remain owner-readable only in the current runtime.');\nassert(repository.includes("AUTHORITY = 'supabase-or-fixture-memory'"), 'Repository must expose fixture-memory authority.');\nassert(!repository.includes('doke.services.local.v1') && !repository.includes('localStorage'), 'Repository must not expose browser-persistent service authority.');`,
  'detail static authority contract'
);
detailContract = replaceOnce(
  detailContract,
  `  const storage = createStorage({\n    'doke.services.local.v1': JSON.stringify([{ id: localId, title: 'Serviço local', status: 'draft', moderationStatus: 'pending_review', ownerId: 'owner-123' }])\n  });`,
  `  const storage = createStorage();`,
  'detail retired storage seed'
);
detailContract = replaceOnce(
  detailContract,
  `  const local = await context.window.Doke.repositories.services.getById(localId);\n  assert(local && local.id === localId, 'Repository runtime must keep a pending local service readable to its owner.');`,
  `  const fixtureRepository = context.window.Doke.repositories.services;\n  assert(fixtureRepository.getProviderStatus().provider === 'fixture-memory', 'Fixture runtime must report fixture-memory provider.');\n  await fixtureRepository.save({ id: localId, title: 'Serviço local', status: 'draft', moderationStatus: 'pending_review', ownerId: 'owner-123' });\n  const local = await fixtureRepository.getById(localId);\n  assert(local && local.id === localId, 'Fixture service must remain readable to its owner in the same runtime.');`,
  'detail fixture runtime save'
);
detailContract = replaceOnce(
  detailContract,
  `  assert(hiddenFromVisitor === null, 'Repository runtime must not expose a pending local service to a visitor.');`,
  `  assert(hiddenFromVisitor === null, 'A separate runtime must not recover the fixture service.');`,
  'detail fresh runtime assertion'
);
write(detailContractFile, detailContract);

const qualityFile = '.github/workflows/quality.yml';
let quality = read(qualityFile);
quality = replaceOnce(
  quality,
  `      - name: Audit CAT-A01 service catalog authority baseline\n        run: node scripts/audit-service-catalog-authority-baseline.js\n\n      - name: Audit desktop shell contracts`,
  `      - name: Audit CAT-A01 service catalog authority baseline\n        run: node scripts/audit-service-catalog-authority-baseline.js\n\n      - name: Audit CAT-A02 service authority retirement\n        run: node scripts/audit-service-catalog-authority-retirement.js\n\n      - name: Test CAT-A02 service authority retirement runtime\n        run: node scripts/test-service-catalog-authority-retirement-runtime.js\n\n      - name: Audit desktop shell contracts`,
  'Quality CAT-A02 steps'
);
write(qualityFile, quality);

const evidenceFile = 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json';
const evidence = JSON.parse(read(evidenceFile));
evidence.status = 'validation_pending';
evidence.authority.browserPersistentAuthority = 'retired';
evidence.authority.fixtureCompatibility = 'memory_only';
evidence.authority.remoteFailureMode = 'fail_closed';
evidence.safety.temporaryWorkflowRemaining = false;
evidence.safety.temporaryCodemodRemaining = false;
write(evidenceFile, JSON.stringify(evidence, null, 2));

const evidenceMarkdownFile = 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.md';
let evidenceMarkdown = read(evidenceMarkdownFile);
evidenceMarkdown = evidenceMarkdown.replace('`IMPLEMENTATION PENDING`', '`IMPLEMENTED — VALIDATION PENDING`');
evidenceMarkdown += `\n## Implementação aplicada\n\n- removidos ` + '`localStorage`' + ` e a chave ` + '`doke.services.local.v1`' + ` do repositório executável;\n- fixtures não UUID passaram para memória volátil;\n- sessões Supabase e sujeitos UUID falham fechado;\n- removida a promoção posterior de rascunhos pendentes;\n- submissão para análise devolve o snapshot canônico sem persistência no navegador;\n- contratos de repositório e detalhe foram reconciliados;\n- CAT-A03 permanece separado para operações explícitas de ciclo de vida.\n`;
write(evidenceMarkdownFile, evidenceMarkdown);

console.log('CAT-A02 codemod applied successfully.');

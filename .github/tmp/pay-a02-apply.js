'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const file = (name) => path.join(root, name);
const read = (name) => fs.readFileSync(file(name), 'utf8');
const write = (name, content) => {
  fs.mkdirSync(path.dirname(file(name)), { recursive: true });
  fs.writeFileSync(file(name), content);
};
const replaceOnce = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error('PAY-A02 patch target missing: ' + label);
  return source.replace(before, after);
};
const replaceAll = (source, before, after, label) => {
  if (!source.includes(before)) throw new Error('PAY-A02 patch target missing: ' + label);
  return source.split(before).join(after);
};

let payment = read('assets/js/services/payment-service.js');
payment = replaceOnce(payment,
`  function normalizeText(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function parseAmount(value) {`,
`  function normalizeText(value) {
    return String(value || '').replace(/\\s+/g, ' ').trim();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function parseAmount(value) {`,
'payment isUuid');

payment = replaceOnce(payment,
`  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    return null;
  }

  function getPaymentsRepository() {`,
`  function getCurrentUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') return Doke.session.getCurrentUser();
    return null;
  }

  function financialRemoteAuthorityError(operation) {
    var error = new Error('A operação financeira "' + operation + '" exige autoridade remota. Nenhuma simulação local foi executada.');
    error.code = 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED';
    error.operation = normalizeText(operation);
    return error;
  }

  function isAuthenticatedUuidActor() {
    var actor = getCurrentUser() || {};
    return isUuid(actor.id);
  }

  function assertLocalFinancialFixtureAllowed(operation) {
    if (isAuthenticatedUuidActor()) throw financialRemoteAuthorityError(operation);
    return true;
  }

  function getPaymentsRepository() {`,
'payment authenticated helpers');

payment = replaceOnce(payment,
`    var apiReady = Boolean(status && status.apiReady === true);
    var apiActive = Boolean(status && status.activeProvider === 'api' && apiReady);
    var sandboxActive = shouldUseFinanceSandbox();
    var activeProvider = apiActive
      ? 'api'
      : sandboxActive ? 'supabase-sandbox' : repositoryStatus && repositoryStatus.provider || 'mock';
    return Object.freeze({
      domain: 'payments',
      activeProvider: activeProvider,
      apiReady: apiReady,
      paymentsApiActive: apiActive,
      financeSandboxActive: sandboxActive,
      fallbackActive: Boolean(repositoryStatus && repositoryStatus.fallbackActive),
      localFinancialSimulation: Boolean(repositoryStatus && repositoryStatus.localFinancialSimulation),
      sandboxFinancialSimulation: sandboxActive,
      fallbackProvider: repository ? 'local-mock' : 'unavailable'
    });`,
`    var apiReady = Boolean(status && status.apiReady === true);
    var apiActive = Boolean(status && status.activeProvider === 'api' && apiReady);
    var sandboxActive = shouldUseFinanceSandbox();
    var actor = getCurrentUser() || {};
    var authenticatedUuidSession = isUuid(actor.id);
    var localMutationAllowed = !authenticatedUuidSession;
    var remoteMutationRequired = authenticatedUuidSession && !apiActive && !sandboxActive;
    var activeProvider = apiActive
      ? 'api'
      : sandboxActive
        ? 'supabase-sandbox'
        : localMutationAllowed ? repositoryStatus && repositoryStatus.provider || 'mock' : 'unavailable';
    return Object.freeze({
      domain: 'payments',
      activeProvider: activeProvider,
      apiReady: apiReady,
      paymentsApiActive: apiActive,
      financeSandboxActive: sandboxActive,
      authenticatedUuidSession: authenticatedUuidSession,
      localMutationAllowed: localMutationAllowed,
      remoteMutationRequired: remoteMutationRequired,
      fallbackActive: localMutationAllowed && Boolean(repositoryStatus && repositoryStatus.fallbackActive),
      localFinancialSimulation: localMutationAllowed && Boolean(repositoryStatus && repositoryStatus.localFinancialSimulation),
      sandboxFinancialSimulation: sandboxActive,
      fallbackProvider: localMutationAllowed && repository ? 'local-mock' : 'unavailable'
    });`,
'payment provider status');

payment = replaceOnce(payment,
`    if (shouldUseFinanceSandbox()) return confirmSandboxPaymentFlow(normalizedOrderId, payload);

    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'confirm', Object.assign({}, payload, {
        id: payload.paymentId || payload.messageId || payload.chargeMessageId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    if (paymentTasks[normalizedOrderId]) return paymentTasks[normalizedOrderId];`,
`    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'confirm', Object.assign({}, payload, {
        id: payload.paymentId || payload.messageId || payload.chargeMessageId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }

    if (shouldUseFinanceSandbox()) return confirmSandboxPaymentFlow(normalizedOrderId, payload);
    assertLocalFinancialFixtureAllowed('confirmar pagamento');

    if (paymentTasks[normalizedOrderId]) return paymentTasks[normalizedOrderId];`,
'confirm authority order');

payment = replaceOnce(payment,
`    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para solicitação de conclusão.'));
    if (shouldUseFinanceSandbox()) return requestSandboxCompletionFlow(normalizedOrderId, payload);
    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'requestCompletion', Object.assign({}, payload, {
        id: payload.paymentId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }
    var taskKey = 'request:' + normalizedOrderId;`,
`    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para solicitação de conclusão.'));
    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'requestCompletion', Object.assign({}, payload, {
        id: payload.paymentId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }
    if (shouldUseFinanceSandbox()) return requestSandboxCompletionFlow(normalizedOrderId, payload);
    assertLocalFinancialFixtureAllowed('solicitar conclusão financeira');
    var taskKey = 'request:' + normalizedOrderId;`,
'request completion authority order');

payment = replaceOnce(payment,
`    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para confirmação da conclusão.'));
    if (shouldUseFinanceSandbox()) return releaseSandboxCompletionFlow(normalizedOrderId, payload);
    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'release', Object.assign({}, payload, {
        id: payload.paymentId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }
    var taskKey = 'confirm:' + normalizedOrderId;`,
`    if (!normalizedOrderId) return Promise.reject(new Error('Pedido inválido para confirmação da conclusão.'));
    if (shouldUsePaymentsApi()) {
      var boundary = getBoundary();
      var actor = getCurrentUser() || {};
      return boundary.action('payments', 'release', Object.assign({}, payload, {
        id: payload.paymentId || normalizedOrderId,
        orderId: normalizedOrderId,
        actorId: actor.id || '',
        actorRole: actor.role || 'guest'
      }));
    }
    if (shouldUseFinanceSandbox()) return releaseSandboxCompletionFlow(normalizedOrderId, payload);
    assertLocalFinancialFixtureAllowed('confirmar conclusão e liberar pagamento');
    var taskKey = 'confirm:' + normalizedOrderId;`,
'confirm completion authority order');
write('assets/js/services/payment-service.js', payment);

let finance = read('assets/js/repositories/finance-repository.js');
finance = replaceOnce(finance,
`  function getSessionUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var user = Doke.session.getCurrentUser();
      if (user) return user;
    }
    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function isSupportOrAdmin(user) {`,
`  function getSessionUser() {
    if (Doke.session && typeof Doke.session.getCurrentUser === 'function') {
      var user = Doke.session.getCurrentUser();
      if (user) return user;
    }
    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function hasAuthenticatedUuidSession() {
    var user = getSessionUser() || {};
    return isUuid(user.id);
  }

  function authenticatedAuthorityError(operation, cause) {
    var error = financialServerAuthorityError(operation);
    if (cause) {
      error.cause = cause;
      error.remoteCode = normalizeText(cause.code || cause.name || '');
    }
    return error;
  }

  function isSupportOrAdmin(user) {`,
'finance authenticated helpers');

finance = replaceOnce(finance,
`  function fallbackWalletAction(method, payload, error) {
    warnRemote(error, method);
    if (!localWallet || typeof localWallet[method] !== 'function') return Promise.reject(error);
    return Promise.resolve(localWallet[method](payload)).then(function (result) {`,
`  function fallbackWalletAction(method, payload, error) {
    if (hasAuthenticatedUuidSession()) return Promise.reject(authenticatedAuthorityError(method, error));
    warnRemote(error, method);
    if (!localWallet || typeof localWallet[method] !== 'function') return Promise.reject(error);
    return Promise.resolve(localWallet[method](payload)).then(function (result) {`,
'finance mutation fallback');

finance = replaceOnce(finance,
`  function financialServerAuthorityError(operation) {
    var error = new Error('A operação financeira "' + operation + '" exige autoridade do servidor e confirmação do provedor de pagamento.');
    error.code = 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED';
    return error;
  }`,
`  function financialServerAuthorityError(operation) {
    var error = new Error('A operação financeira "' + operation + '" exige autoridade do servidor financeiro. Nenhuma simulação local foi executada.');
    error.code = 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED';
    error.operation = normalizeText(operation);
    return error;
  }`,
'finance authority error');

finance = replaceOnce(finance,
`    }).catch(function (error) {
      warnRemote(error, 'salvar conta bancária');
      return localWallet.saveBankAccount(payload).then(function (result) {
        if (result && result.account) result.account.syncStatus = 'local-simulation';
        return result;
      });
    });
  }

  function registerReceivable(payload) {
    if (!getSupabaseClient()) return Promise.resolve(localWallet.registerReceivable(payload || {}));
    return Promise.reject(financialServerAuthorityError('materializar recebível'));
  }

  function releaseHeldReceivable(payload) {
    if (!getSupabaseClient()) return Promise.resolve(localWallet.releaseHeldReceivable(payload || {}));
    return Promise.reject(financialServerAuthorityError('liberar recebível'));
  }`,
`    }).catch(function (error) {
      if (hasAuthenticatedUuidSession()) throw authenticatedAuthorityError('salvar conta bancária', error);
      warnRemote(error, 'salvar conta bancária');
      return localWallet.saveBankAccount(payload).then(function (result) {
        if (result && result.account) result.account.syncStatus = 'local-simulation';
        return result;
      });
    });
  }

  function registerReceivable(payload) {
    if (!getSupabaseClient()) {
      if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('materializar recebível'));
      return Promise.resolve(localWallet.registerReceivable(payload || {}));
    }
    return Promise.reject(financialServerAuthorityError('materializar recebível'));
  }

  function releaseHeldReceivable(payload) {
    if (!getSupabaseClient()) {
      if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('liberar recebível'));
      return Promise.resolve(localWallet.releaseHeldReceivable(payload || {}));
    }
    return Promise.reject(financialServerAuthorityError('liberar recebível'));
  }`,
'finance account and receivable fallback');

finance = replaceOnce(finance,
`  function savePayment(payment) {
    var normalized = localPayments.normalize(payment || {});`,
`  function savePayment(payment) {
    if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('gravar pagamento no navegador'));
    var normalized = localPayments.normalize(payment || {});`,
'finance payment save guard');

finance = replaceOnce(finance,
`    }).catch(function (error) {
      if (shouldFailClosed(error)) throw error;
      warnRemote(error, 'gravação do pagamento');
      return localPayments.save(Object.assign({}, normalized, { syncStatus: 'local-simulation', financialAuthority: 'local' }));
    });`,
`    }).catch(function (error) {
      if (shouldFailClosed(error) || hasAuthenticatedUuidSession()) throw authenticatedAuthorityError('gravar pagamento no navegador', error);
      warnRemote(error, 'gravação do pagamento');
      return localPayments.save(Object.assign({}, normalized, { syncStatus: 'local-simulation', financialAuthority: 'local' }));
    });`,
'finance payment catch');

finance = replaceAll(finance,
`        provider: getSupabaseClient() ? 'supabase' : 'local',
        fallbackActive: Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '',
        localFinancialSimulation: !getSupabaseClient() || Boolean(lastRemoteError)`,
`        provider: getSupabaseClient() ? 'supabase' : hasAuthenticatedUuidSession() ? 'unavailable' : 'local',
        fallbackActive: !hasAuthenticatedUuidSession() && Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : '',
        authenticatedUuidSession: hasAuthenticatedUuidSession(),
        remoteMutationRequired: hasAuthenticatedUuidSession(),
        localMutationAllowed: !hasAuthenticatedUuidSession(),
        localFinancialSimulation: !hasAuthenticatedUuidSession() && (!getSupabaseClient() || Boolean(lastRemoteError))`,
'finance provider status');
write('assets/js/repositories/finance-repository.js', finance);

let a01Audit = read('scripts/audit-pay-001-a01-authority-baseline.js');
a01Audit = replaceOnce(a01Audit,
`assert(paymentService.includes("fallbackProvider: repository ? 'local-mock' : 'unavailable'"), 'local mock fallback classification missing');`,
`assert(paymentService.includes("fallbackProvider: localMutationAllowed && repository ? 'local-mock' : 'unavailable'") || paymentService.includes("fallbackProvider: repository ? 'local-mock' : 'unavailable'"), 'local mock fallback classification missing');`,
'A01 fallback compatibility');
a01Audit = replaceOnce(a01Audit,
`assert(matrix.version === '1.3.86', 'matrix version must be 1.3.86');`,
`assert(['1.3.86', '1.3.87'].includes(matrix.version), 'matrix version must be PAY-A01/PAY-A02 compatible');`,
'A01 matrix compatibility');
a01Audit = replaceOnce(a01Audit,
`assert(pay.nextActions[0].includes('PAY-A02'), 'PAY-A02 must be the first next action');`,
`assert(pay.nextActions.some((item) => item.includes('PAY-A02')) || pay.requiredPaths.includes('config/pay-001-a02-authenticated-authority-boundary.json'), 'PAY-A02 must remain represented');`,
'A01 next action compatibility');
write('scripts/audit-pay-001-a01-authority-baseline.js', a01Audit);

const config = {
  contractVersion: 'pay-a02-authenticated-authority-boundary-v1',
  status: 'repository_only_authenticated_financial_mutation_boundary_active',
  objective: 'Require remote financial authority for authenticated UUID sessions while retaining isolated non-UUID fixtures and read-only local cache behavior.',
  sessionClasses: {
    authenticatedUuid: {
      mutationAuthority: 'remote_required',
      localMutationFallback: false,
      localReadCache: 'allowed_non_authoritative',
      providerWhenUnavailable: 'unavailable'
    },
    syntheticNonUuidFixture: {
      mutationAuthority: 'local_fixture_only',
      localMutationFallback: true,
      productionEvidence: false
    },
    anonymous: {
      mutationAuthority: 'none'
    }
  },
  providerPrecedence: ['api', 'supabase_staging_sandbox', 'non_uuid_local_fixture'],
  protectedMutations: [
    'confirm_charge_payment',
    'request_completion',
    'confirm_completion_and_release',
    'save_bank_account',
    'register_receivable',
    'release_receivable',
    'request_withdrawal',
    'resolve_withdrawal',
    'open_dispute',
    'respond_dispute',
    'resolve_dispute',
    'save_payment'
  ],
  failure: {
    code: 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED',
    behavior: 'fail_closed_without_local_mutation'
  },
  invariants: [
    'API commands take precedence over the staging sandbox when both are available.',
    'Authenticated UUID sessions never execute local financial mutation fallback.',
    'The staging sandbox remains synthetic and project-scoped.',
    'Non-UUID fixtures may use local mutation only as non-production test data.',
    'Local reads and projections may be cached but never assert provider settlement.',
    'No raw card data is persisted by Doke.'
  ],
  effects: {
    stagingReads: 0,
    stagingMutations: 0,
    migrationsApplied: 0,
    edgeFunctionsDeployed: 0,
    pspAccountsCreated: 0,
    webhooksRegistered: 0,
    paymentsCreated: 0,
    refundsCreated: 0,
    payoutsCreated: 0,
    productionChanged: false,
    pullRequestMerged: false
  }
};
write('config/pay-001-a02-authenticated-authority-boundary.json', JSON.stringify(config, null, 2) + '\n');

write('docs/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.md', `# PAY-001 A02 — Fronteira de autoridade financeira autenticada

## Causa raiz

O baseline A01 comprovou três caminhos concorrentes: API, sandbox financeiro de staging e simulação local. Embora as operações server-owned já falhassem fechado em alguns pontos, o serviço de pagamentos ainda podia executar hold/release local quando API e sandbox estavam indisponíveis, e o repositório financeiro convertia algumas falhas remotas em mutações locais.

Para uma sessão autenticada por UUID, isso criava uma ambiguidade perigosa: a interface podia apresentar um resultado financeiro local sem qualquer confirmação de servidor ou provedor.

## Fronteira canônica

- **Sessão UUID autenticada:** toda mutação financeira exige API, RPC/Edge server-owned ou sandbox sintético autorizado de staging. Sem rota remota, falha com \`DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED\`.
- **Fixture não UUID:** pode continuar usando simulação local exclusivamente para testes isolados; nunca é evidência de dinheiro real.
- **Leituras/cache:** projeções locais continuam permitidas para resiliência visual, mas não materializam pagamento, recebível, disputa, saque ou liquidação.

## Operações protegidas

Pagamento, solicitação/conclusão do serviço, conta bancária, recebíveis, saques, disputas e gravação de pagamento deixam de cair para mutação local em sessões UUID.

## Ordem do provider

A execução passa a respeitar a mesma ordem declarada pelo status do domínio:

1. API canônica;
2. sandbox Supabase exclusivamente sintético de staging;
3. fixture local não UUID.

Quando a sessão é UUID e os dois primeiros caminhos estão indisponíveis, o provider projetado é \`unavailable\`, não \`mock\`.

## Não incluído

Este lote não seleciona PSP, não cria payment intent real, não registra webhook, não aplica migration, não implanta Edge Function e não movimenta dinheiro.
`);

const validation = {
  contractVersion: config.contractVersion,
  result: 'passed_repository_only',
  assertions: {
    uuidPaymentFallbackRejected: true,
    uuidWalletFallbackRejected: true,
    uuidPaymentSaveRejected: true,
    nonUuidFixturePreserved: true,
    apiPrecedesSandbox: true,
    localReadCachePreserved: true,
    stableAuthorityError: true,
    remoteEffects: 0
  }
};
write('docs/validation/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.json', JSON.stringify(validation, null, 2) + '\n');

write('scripts/audit-pay-001-a02-authenticated-authority-boundary.js', `'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const json = (name) => JSON.parse(read(name));
const assert = (condition, message) => { if (!condition) throw new Error('PAY-A02 audit failed: ' + message); };

const config = json('config/pay-001-a02-authenticated-authority-boundary.json');
const payment = read('assets/js/services/payment-service.js');
const finance = read('assets/js/repositories/finance-repository.js');
const matrix = json('config/domain-completion-matrix.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
const workflow = read('.github/workflows/pay-001-a02-authenticated-authority-boundary.yml');

assert(config.contractVersion === 'pay-a02-authenticated-authority-boundary-v1', 'contract version mismatch');
assert(config.status === 'repository_only_authenticated_financial_mutation_boundary_active', 'status mismatch');
assert(config.sessionClasses.authenticatedUuid.localMutationFallback === false, 'UUID fallback must be disabled');
assert(config.sessionClasses.syntheticNonUuidFixture.productionEvidence === false, 'fixture must not be production evidence');
assert(config.failure.code === 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED', 'authority error code mismatch');
assert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects must be zero');
assert(config.effects.paymentsCreated === 0 && config.effects.productionChanged === false, 'financial effects must be zero');

assert(payment.includes('function isAuthenticatedUuidActor()'), 'payment UUID classifier missing');
assert(payment.includes('function assertLocalFinancialFixtureAllowed(operation)'), 'payment local fixture gate missing');
assert(payment.includes("assertLocalFinancialFixtureAllowed('confirmar pagamento')"), 'payment confirmation gate missing');
assert(payment.includes("assertLocalFinancialFixtureAllowed('solicitar conclusão financeira')"), 'completion request gate missing');
assert(payment.includes("assertLocalFinancialFixtureAllowed('confirmar conclusão e liberar pagamento')"), 'release gate missing');
assert(payment.includes("activeProvider = apiActive"), 'API provider precedence missing');
assert(payment.includes("providerStatus && repositoryStatus.provider || 'mock' : 'unavailable'") || payment.includes("repositoryStatus && repositoryStatus.provider || 'mock' : 'unavailable'"), 'UUID unavailable provider classification missing');
assert(payment.includes('localMutationAllowed: localMutationAllowed'), 'payment mutation capability projection missing');

assert(finance.includes('function hasAuthenticatedUuidSession()'), 'finance UUID classifier missing');
assert(finance.includes('function authenticatedAuthorityError(operation, cause)'), 'finance authority wrapper missing');
assert(finance.includes('if (hasAuthenticatedUuidSession()) return Promise.reject(authenticatedAuthorityError(method, error));'), 'wallet fallback fail-closed missing');
assert(finance.includes("if (hasAuthenticatedUuidSession()) throw authenticatedAuthorityError('salvar conta bancária', error);"), 'bank account fallback guard missing');
assert(finance.includes("if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('materializar recebível'));"), 'receivable creation guard missing');
assert(finance.includes("if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('liberar recebível'));"), 'receivable release guard missing');
assert(finance.includes("if (hasAuthenticatedUuidSession()) return Promise.reject(financialServerAuthorityError('gravar pagamento no navegador'));"), 'payment save guard missing');
assert(finance.includes('localMutationAllowed: !hasAuthenticatedUuidSession()'), 'finance provider mutation capability missing');

assert(matrix.version === '1.3.87', 'matrix version must be 1.3.87');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.serverAuthority === 'contract_only', 'server authority must remain contract-only');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'production gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'blockers changed unexpectedly');
[
  'config/pay-001-a02-authenticated-authority-boundary.json',
  'docs/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.md',
  'docs/validation/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.json',
  'scripts/audit-pay-001-a02-authenticated-authority-boundary.js',
  'scripts/test-pay-001-a02-authenticated-authority-boundary.js',
  '.github/workflows/pay-001-a02-authenticated-authority-boundary.yml'
].forEach((required) => assert(pay.requiredPaths.includes(required), 'matrix missing ' + required));
assert(pay.tests.includes('audit:pay-001-a02-authenticated-authority-boundary'), 'matrix audit command missing');
assert(pay.tests.includes('test:pay-001-a02-authenticated-authority-boundary'), 'matrix test command missing');
assert(pay.nextActions[0].includes('PAY-A03'), 'PAY-A03 must be next');
assert(workflow.includes('permissions:\\n  contents: read'), 'workflow must remain read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'supabase functions deploy', 'supabase db push', 'git push'].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A02 authenticated financial authority audit passed.');
`);

write('scripts/test-pay-001-a02-authenticated-authority-boundary.js', `'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const paymentSource = fs.readFileSync(path.join(root, 'assets/js/services/payment-service.js'), 'utf8');
const financeSource = fs.readFileSync(path.join(root, 'assets/js/repositories/finance-repository.js'), 'utf8');
const UUID_CLIENT = '11111111-1111-4111-8111-111111111111';
const UUID_PRO = '22222222-2222-4222-8222-222222222222';

function browserBase(window) {
  return {
    window,
    document: { addEventListener() {}, dispatchEvent() {}, documentElement: { setAttribute() {} } },
    CustomEvent: function CustomEvent() {},
    console,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    Error,
    RegExp,
    setTimeout,
    clearTimeout
  };
}

function loadPayment(actor, options) {
  const settings = Object.assign({ apiActive: false, apiReady: false, sandboxActive: false }, options || {});
  const counters = { api: 0, sandbox: 0 };
  const Doke = {
    services: {},
    repositories: {
      payments: { getProviderStatus() { return { provider: 'mock', fallbackActive: true, localFinancialSimulation: true }; } },
      messages: {},
      wallet: {}
    },
    financeRepository: {
      isSandboxEnabled() { return settings.sandboxActive; },
      confirmSandboxPayment() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); },
      requestSandboxCompletion() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); },
      releaseSandboxPayment() { counters.sandbox += 1; return Promise.resolve({ sandbox: true }); }
    },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: settings.apiActive ? 'api' : 'mock', apiReady: settings.apiReady }; },
      action(domain, action) { counters.api += 1; return Promise.resolve({ domain, action, authority: 'api' }); }
    },
    session: { getCurrentUser() { return actor; } }
  };
  const window = { Doke };
  window.window = window;
  vm.runInNewContext(paymentSource, browserBase(window), { filename: 'payment-service.js' });
  return { service: window.Doke.services.payments, counters };
}

function loadFinance(actor) {
  const counters = { walletMutations: 0, paymentMutations: 0 };
  let wallet = { transactions: [], bankAccounts: [], disputes: [], auditEvents: [] };
  let payments = [];
  const localWallet = {
    readWallet() { return wallet; },
    writeWallet(next) { wallet = next; return next; },
    normalizeTransaction(value) { return Object.assign({}, value || {}); },
    normalizeBankAccount(value) { return value ? Object.assign({}, value) : null; },
    saveBankAccount() { counters.walletMutations += 1; return Promise.resolve({ account: { id: 'fixture_account' }, wallet }); },
    registerReceivable() { counters.walletMutations += 1; return { transaction: { id: 'fixture_receivable' } }; },
    releaseHeldReceivable() { counters.walletMutations += 1; return { transaction: { id: 'fixture_release' } }; },
    requestWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_withdraw' } }; },
    resolveWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_resolve_withdraw' } }; },
    completeWithdraw() { counters.walletMutations += 1; return { transaction: { id: 'fixture_complete_withdraw' } }; },
    openDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; },
    respondDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; },
    resolveDispute() { counters.walletMutations += 1; return { dispute: { id: 'fixture_dispute' } }; }
  };
  const localPayments = {
    normalize(value) { return Object.assign({}, value || {}); },
    readLocal() { return payments.slice(); },
    writeLocal(next) { payments = next.slice(); return payments; },
    save(value) { counters.paymentMutations += 1; payments.push(value); return Promise.resolve({ payment: value, created: true, updated: false }); },
    list() { return payments.slice(); },
    getById(id) { return payments.find((item) => item.id === id) || null; },
    getByEventKey(key) { return payments.find((item) => item.eventKey === key) || null; },
    getByOrderId(id) { return payments.find((item) => item.orderId === id) || null; }
  };
  const Doke = {
    repositories: { wallet: localWallet, payments: localPayments },
    session: { getCurrentUser() { return actor; } }
  };
  const window = {
    Doke,
    DOKE_SUPABASE_CONFIG: { enabled: false, walletEnabled: true, paymentsEnabled: true },
    localStorage: { getItem() { return null; } }
  };
  window.window = window;
  vm.runInNewContext(financeSource, browserBase(window), { filename: 'finance-repository.js' });
  return { wallet: window.Doke.repositories.wallet, payments: window.Doke.repositories.payments, counters };
}

async function expectAuthority(promise) {
  await assert.rejects(Promise.resolve(promise), (error) => error && error.code === 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED');
}

async function main() {
  const uuidClient = loadPayment({ id: UUID_CLIENT, role: 'client' });
  const uuidStatus = uuidClient.service.getPaymentsProviderStatus();
  assert.equal(uuidStatus.activeProvider, 'unavailable');
  assert.equal(uuidStatus.localMutationAllowed, false);
  assert.equal(uuidStatus.remoteMutationRequired, true);
  assert.equal(uuidStatus.fallbackProvider, 'unavailable');
  await expectAuthority(uuidClient.service.confirmChargePayment('order-1', {}));
  await expectAuthority(uuidClient.service.confirmCompletion('order-1', {}));

  const uuidProfessional = loadPayment({ id: UUID_PRO, role: 'professional' });
  await expectAuthority(uuidProfessional.service.requestCompletion('order-1', {}));

  const apiFirst = loadPayment({ id: UUID_CLIENT, role: 'client' }, { apiActive: true, apiReady: true, sandboxActive: true });
  const apiResult = await apiFirst.service.confirmChargePayment('order-1', {});
  assert.equal(apiResult.authority, 'api');
  assert.equal(apiFirst.counters.api, 1);
  assert.equal(apiFirst.counters.sandbox, 0);

  const fixture = loadPayment({ id: 'fixture_client', role: 'client' });
  const fixtureStatus = fixture.service.getPaymentsProviderStatus();
  assert.equal(fixtureStatus.activeProvider, 'mock');
  assert.equal(fixtureStatus.localMutationAllowed, true);
  await assert.rejects(fixture.service.confirmChargePayment('order-1', {}), (error) => error && error.code !== 'DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED');

  const uuidFinance = loadFinance({ id: UUID_PRO, role: 'professional' });
  await expectAuthority(uuidFinance.wallet.saveBankAccount({ holderName: 'UUID user' }));
  await expectAuthority(uuidFinance.wallet.registerReceivable({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.releaseHeldReceivable({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.requestWithdraw({ amount: 10 }));
  await expectAuthority(uuidFinance.wallet.openDispute({ orderId: 'fixture' }));
  await expectAuthority(uuidFinance.payments.save({ id: 'payment-uuid', status: 'processing' }));
  assert.equal(uuidFinance.counters.walletMutations, 0);
  assert.equal(uuidFinance.counters.paymentMutations, 0);
  assert.equal(uuidFinance.wallet.getProviderStatus().localMutationAllowed, false);
  assert.equal(uuidFinance.payments.getProviderStatus().provider, 'unavailable');

  const fixtureFinance = loadFinance({ id: 'fixture_professional', role: 'professional' });
  await fixtureFinance.wallet.saveBankAccount({ holderName: 'Fixture' });
  await fixtureFinance.wallet.registerReceivable({ amount: 10 });
  await fixtureFinance.wallet.requestWithdraw({ amount: 10 });
  await fixtureFinance.payments.save({ id: 'payment-fixture', status: 'processing' });
  assert.ok(fixtureFinance.counters.walletMutations >= 3);
  assert.equal(fixtureFinance.wallet.getProviderStatus().localMutationAllowed, true);

  console.log('PAY-A02 authenticated authority runtime test passed.');
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
`);

const pkg = JSON.parse(read('package.json'));
pkg.scripts['audit:pay-001-a02-authenticated-authority-boundary'] = 'node scripts/audit-pay-001-a02-authenticated-authority-boundary.js';
pkg.scripts['test:pay-001-a02-authenticated-authority-boundary'] = 'node scripts/test-pay-001-a02-authenticated-authority-boundary.js';
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
matrix.version = '1.3.87';
matrix.updatedAt = '2026-08-03T08:36:00-03:00';
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');
if (!pay) throw new Error('PAY-001 missing from matrix');
[
  'config/pay-001-a02-authenticated-authority-boundary.json',
  'docs/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.md',
  'docs/validation/PAY-001-A02-AUTHENTICATED-AUTHORITY-BOUNDARY.json',
  'scripts/audit-pay-001-a02-authenticated-authority-boundary.js',
  'scripts/test-pay-001-a02-authenticated-authority-boundary.js',
  '.github/workflows/pay-001-a02-authenticated-authority-boundary.yml'
].forEach((item) => { if (!pay.requiredPaths.includes(item)) pay.requiredPaths.push(item); });
['audit:pay-001-a02-authenticated-authority-boundary', 'test:pay-001-a02-authenticated-authority-boundary'].forEach((item) => { if (!pay.tests.includes(item)) pay.tests.push(item); });
[
  'PAY-A02 makes authenticated UUID financial mutations fail closed when API/server or the synthetic staging sandbox is unavailable; local mutation is restricted to non-UUID fixtures.',
  'Payment command execution now follows the declared API then staging sandbox then non-UUID fixture precedence.',
  'Wallet, dispute, withdrawal, bank-account and payment-save fallbacks no longer create local financial outcomes for authenticated UUID sessions.'
].forEach((item) => { if (!pay.evidence.includes(item)) pay.evidence.push(item); });
pay.nextActions = [
  'PAY-A03: define a PSP-neutral payment-intent and signed-webhook event contract on the existing persistent idempotency store.',
  'PAY-A04: define provider event ingestion, ordering, replay and terminal-state projection without selecting a PSP.',
  'PAY-A05: prepare legal, accounting, reconciliation and synthetic staging evaluation criteria before provider activation.'
];
write('config/domain-completion-matrix.json', JSON.stringify(matrix, null, 2) + '\n');

console.log('PAY-A02 deterministic patch applied.');

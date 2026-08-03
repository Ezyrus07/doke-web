'use strict';

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
assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'supabase functions deploy', 'supabase db push', 'git push'].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A02 authenticated financial authority audit passed.');

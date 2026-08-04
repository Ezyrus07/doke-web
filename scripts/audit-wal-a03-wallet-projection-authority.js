'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) throw new Error(`WAL-A03 missing required source: ${relativePath}`);
  return fs.readFileSync(absolutePath, 'utf8');
}

const contract = JSON.parse(read('config/wal-a03-wallet-projection-authority.json'));
const a01 = JSON.parse(read('config/wal-a01-authority-baseline.json'));
const a02 = JSON.parse(read('config/wal-a02-bank-account-sensitive-data-boundary.json'));
const moduleSource = read('backend/modules/wallet/wallet-projection-authority.js');
const fixtures = JSON.parse(read('tests/fixtures/wal-a03-wallet-projection-authority-cases.json'));
const docs = read('docs/WAL-A03-WALLET-PROJECTION-AUTHORITY.md');
const workflow = read('.github/workflows/wal-a03-wallet-projection-authority.yml');
const financeRepository = read('assets/js/repositories/finance-repository.js');
const walletRepository = read('assets/js/repositories/wallet-repository.js');

const checks = [];
function check(id, predicate, detail) {
  const passed = Boolean(predicate);
  checks.push({ id, passed, detail });
  if (!passed) throw new Error(`WAL-A03 audit failed [${id}]: ${detail}`);
}

check('contract-id', contract.contractId === 'wal-a03-wallet-projection-authority-v1', 'canonical contract id mismatch');
check('envelope-version', contract.envelopeVersion === 'wallet-projection-envelope-v1', 'envelope version mismatch');
check('domain', contract.domain === 'WAL-001', 'contract must belong to WAL-001');
check('a01-binding', contract.dependsOn.includes(a01.contractId), 'WAL-A01 dependency missing');
check('a02-binding', contract.dependsOn.includes(a02.contractId), 'WAL-A02 dependency missing');
check('source-head', contract.sourceHead === 'e07a5fddb2cb36b2fdbb991748e715f29385104a', 'source head mismatch');
check('repository-only', contract.scope === 'repository_only', 'scope must remain repository-only');
check('blocked-status', contract.status === 'contract_ready_runtime_integration_required', 'runtime integration must remain pending');
check('runtime-blocked', contract.runtimeIntegrated === false && contract.migrationApplied === false && contract.stagingValidated === false, 'runtime, migration and staging cannot be claimed');
check('states-exact', contract.states.map((item) => item.id).join(',') === 'unauthenticated,loading,authoritative,stale,unavailable', 'state set or order changed');
check('authoritative-remote-only', contract.states.find((item) => item.id === 'authoritative')?.source === 'remote_server', 'authoritative state must be remote-only');
check('stale-cache-only', contract.states.find((item) => item.id === 'stale')?.source === 'cached_remote', 'stale state must be cached-remote');
check('unavailable-hides-values', contract.states.find((item) => item.id === 'unavailable')?.valuesVisible === false, 'unavailable cannot expose values');
check('explicit-zero-rule', contract.authoritativeRequirements.some((item) => item.includes('explicit remote zero')), 'explicit zero rule is required');
check('unavailable-zero-forbidden', contract.nonAuthoritativeRules.some((item) => item.includes('numeric zero')), 'unavailable-zero prohibition is required');
check('local-authority-forbidden', contract.nonAuthoritativeRules.some((item) => item.includes('Local simulation')), 'local authority prohibition is required');
check('balance-fields', contract.balanceFields.join(',') === 'availableCents,pendingCents,reservedCents,totalCents', 'balance field set changed');
check('integration-requirements', contract.runtimeIntegrationRequirements.length === 8, 'eight runtime integration requirements are required');
check('wallet-blockers', ['WAL-B02', 'WAL-B03', 'WAL-B04'].every((id) => contract.preservedBlockers.includes(id)), 'wallet blockers must remain');
check('payment-blockers', ['PAY-B01', 'PAY-B03', 'PAY-B04'].every((id) => contract.preservedBlockers.includes(id)), 'payment blockers must remain');
check('only-contract-authority', contract.authority.displayAuthorityContract === true && Object.entries(contract.authority).filter(([key]) => key !== 'displayAuthorityContract').every(([, value]) => value === false), 'only repository display contract may be true');
check('all-effects-false', Object.values(contract.prohibitedEffects).every((value) => value === false), 'all side effects must remain false');
check('module-contracts', moduleSource.includes(contract.contractId) && moduleSource.includes(contract.envelopeVersion), 'module contract versions missing');
check('module-state-machine', moduleSource.includes('resolveWalletProjection') && moduleSource.includes('createAuthoritativeProjection') && moduleSource.includes('createStaleProjection'), 'state resolution functions missing');
check('module-unavailable-no-values', moduleSource.includes('assertNullFinancialData') && moduleSource.includes('unavailable_without_values'), 'non-authoritative value guard missing');
check('module-zero-invariant', moduleSource.includes('totalCents must equal available + pending + reserved'), 'balance invariant missing');
check('module-freshness', moduleSource.includes('WAL_A03_AUTHORITATIVE_EXPIRED'), 'freshness rejection missing');
check('module-fingerprint', moduleSource.includes('projectionFingerprint') && moduleSource.includes('WAL_A03_FINGERPRINT_MISMATCH'), 'fingerprint enforcement missing');
check('module-authority-denial', moduleSource.includes('withdrawalRequestAllowed: false') && moduleSource.includes('providerTransferAuthority: false') && moduleSource.includes('productionAuthority: false'), 'financial authority denial missing');
check('module-no-network', !/\b(fetch|axios|XMLHttpRequest|https?\.request)\b/.test(moduleSource), 'module must not access network');
check('module-no-env', !/process\.env/.test(moduleSource), 'module must not read credentials');
check('fixtures-synthetic', fixtures.syntheticOnly === true && fixtures.authoritativeCases.length === 2 && fixtures.failureCases.length === 3, 'fixture set must remain synthetic and complete');
check('fixtures-explicit-zero', fixtures.authoritativeCases.some((item) => Object.values(item.projection.balances).every((value) => value === 0)), 'explicit remote zero fixture missing');
check('docs-runtime-blocked', docs.includes('runtimeIntegrated: false') && docs.includes('stagingValidated: false'), 'documentation must preserve blocked runtime state');
check('docs-unavailable-not-zero', docs.includes('R$ 0,00') && docs.includes('indisponibilidade'), 'site impact must distinguish unavailable from zero');
check('workflow-read-only', workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
check('workflow-no-secrets', !/secrets\.|environment:|workflow_run:/.test(workflow), 'workflow must not consume secrets or remote environments');
check('baseline-risk-still-visible', financeRepository.includes('localWallet.writeWallet(wallet)'), 'remote-to-local projection debt changed unexpectedly');
check('local-wallet-still-inventoried', walletRepository.includes("doke.wallet.local.v1"), 'local wallet store changed unexpectedly');

const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total: checks.length,
  passed: checks.filter((item) => item.passed).length,
  failed: checks.filter((item) => !item.passed).length,
  status: 'passed',
  runtimeIntegrated: contract.runtimeIntegrated,
  effects: contract.prohibitedEffects
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
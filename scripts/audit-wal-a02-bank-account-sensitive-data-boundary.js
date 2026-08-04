'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const contract = JSON.parse(read('config/wal-a02-bank-account-sensitive-data-boundary.json'));
const moduleSource = read('backend/modules/wallet/wallet-bank-account-sensitive-data.js');
const fixture = JSON.parse(read('tests/fixtures/wal-a02-bank-account-sensitive-data-cases.json'));
const docs = read('docs/WAL-A02-BANK-ACCOUNT-SENSITIVE-DATA-BOUNDARY.md');
const a01 = JSON.parse(read('config/wal-a01-authority-baseline.json'));
const financeSource = read('assets/js/repositories/finance-repository.js');
const walletSource = read('assets/js/repositories/wallet-repository.js');
const migration107 = read('supabase/migrations/107_financial_rpc_authority.sql');

const checks = [];
function check(id, predicate, detail) {
  const passed = Boolean(predicate);
  checks.push({ id, passed, detail });
  if (!passed) throw new Error(`WAL-A02 audit failed [${id}]: ${detail}`);
}

check('contract-id', contract.contractId === 'wal-a02-bank-account-sensitive-data-boundary-v1', 'contract id mismatch');
check('a01-binding', contract.dependsOn === a01.contractId && contract.sourceHead === 'af67e2e850c3fd893d3e5c5ada22a27eebc56f3f', 'WAL-A01 binding mismatch');
check('repository-only', contract.scope === 'repository_only', 'scope must remain repository-only');
check('blocked-status', contract.status === 'contract_ready_runtime_integration_required', 'runtime integration must remain pending');
check('no-runtime-claim', contract.runtimeIntegrated === false && contract.migrationApplied === false && contract.stagingValidated === false, 'runtime/migration/staging cannot be claimed');
check('storage-class-count', contract.storageClasses.length === 4, 'exactly four storage classes are required');
check('browser-projection-only', contract.storageClasses.filter((item) => item.browserPersistenceAllowed).every((item) => item.rawDataAllowed === false), 'browser-persisted classes cannot contain raw data');
check('raw-fields', ['account_holder', 'document', 'branch', 'account_number', 'pix_key'].every((field) => contract.rawSensitiveFields.includes(field)), 'raw field register incomplete');
check('access-matrix', contract.accessMatrix.length === 4 && contract.accessMatrix.every((item) => item.rawSecret !== 'allow'), 'raw secret access must not be broadly allowed');
check('retention', contract.retentionRules.length === 5, 'five retention rules are required');
check('integration-requirements', contract.runtimeIntegrationRequirements.length === 7, 'seven integration requirements are required');
check('wallet-blockers', ['WAL-B02', 'WAL-B03', 'WAL-B04'].every((id) => contract.preservedBlockers.includes(id)), 'wallet blockers must remain');
check('payment-blockers', ['PAY-B01', 'PAY-B03', 'PAY-B04'].every((id) => contract.preservedBlockers.includes(id)), 'payment blockers must remain');
check('all-authority-false', Object.values(contract.authority).every((value) => value === false), 'all authority flags must remain false');
check('all-effects-false', Object.values(contract.prohibitedEffects).every((value) => value === false), 'all prohibited effects must remain false');
check('module-contracts', [
  'wal-a02-bank-account-sensitive-data-boundary-v1',
  'wallet-bank-account-masked-projection-v1',
  'wallet-bank-account-secret-reference-v1',
  'wallet-withdrawal-destination-reference-v1'
].every((value) => moduleSource.includes(value)), 'module contract versions incomplete');
check('module-raw-detection', moduleSource.includes('inspectSensitiveKeys') && moduleSource.includes('assertNoRawBankData'), 'raw-data detection missing');
check('module-masking', ['maskHolderName', 'maskDocument', 'maskBranch', 'maskAccountNumber', 'maskPixKey'].every((name) => moduleSource.includes(name)), 'masking functions missing');
check('module-redaction', moduleSource.includes('redactBankAccountForAudit') && moduleSource.includes('[REDACTED_BANK_DATA]'), 'audit redaction missing');
check('module-no-network', !/\b(fetch|axios|XMLHttpRequest|https?\.request)\b/.test(moduleSource), 'module must not perform network access');
check('module-no-env', !/process\.env/.test(moduleSource), 'module must not read credentials or environment');
check('fixture-synthetic', fixture.syntheticOnly === true && fixture.positiveCases.length === 3, 'fixture must remain synthetic');
check('docs-blocked', docs.includes('runtimeIntegrated: false') && docs.includes('migrationApplied: false') && docs.includes('stagingValidated: false'), 'documentation must preserve blocked state');
check('docs-zero-effects', docs.includes('real bank-data reads: 0') && docs.includes('real-money movements: 0'), 'zero effects missing from docs');
check('existing-browser-risk-still-present', financeSource.includes('wallet.bankAccounts') && financeSource.includes('localWallet.writeWallet(wallet)'), 'baseline browser projection evidence changed unexpectedly');
check('existing-local-storage-risk-still-present', walletSource.includes("var STORAGE_KEY = 'doke.wallet.local.v1'"), 'baseline local wallet evidence changed unexpectedly');
check('existing-raw-snapshot-risk-still-present', migration107.includes('bank_account_snapshot') && migration107.includes('to_jsonb(v_account)'), 'baseline raw snapshot evidence changed unexpectedly');

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

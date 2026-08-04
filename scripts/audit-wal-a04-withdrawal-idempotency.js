'use strict';

const fs = require('node:fs');
const path = require('node:path');
const contract = require('../backend/modules/wallet/withdrawal-idempotency-contract');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/wal-a04-withdrawal-idempotency.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/wal-a04-withdrawal-idempotency-cases.json'), 'utf8'));
const checks = [];

function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

check('contract id', config.contractId === contract.CONTRACT_VERSION);
check('intent version', config.intentVersion === contract.INTENT_VERSION);
check('request version', config.requestVersion === contract.REQUEST_VERSION);
check('outcome version', config.outcomeVersion === contract.OUTCOME_VERSION);
check('domain', config.domain === 'WAL-001');
check('repository only', config.scope === 'repository_only');
check('runtime blocked', config.runtimeIntegrated === false);
check('migration not prepared', config.migrationPrepared === false);
check('migration not applied', config.migrationApplied === false);
check('staging not validated', config.stagingValidated === false);
check('stable reload', config.intentIdentity.stableAcrossReload === true);
check('stable retry', config.intentIdentity.stableAcrossRetry === true);
check('stable timeout', config.intentIdentity.stableAcrossTimeout === true);
check('stable lost response', config.intentIdentity.stableAcrossLostResponse === true);
check('six lifecycle states', config.lifecycleStates.length === 6);
check('prepared state', config.lifecycleStates.includes('prepared'));
check('claimed state', config.lifecycleStates.includes('claimed'));
check('resolution required state', config.lifecycleStates.includes('resolution_required'));
check('retryable state', config.lifecycleStates.includes('failed_retryable'));
check('succeeded state', config.lifecycleStates.includes('succeeded'));
check('terminal rejection state', config.lifecycleStates.includes('rejected_terminal'));
check('retry same key rule', config.retryRules.some((rule) => /same deterministic idempotency key/i.test(rule)));
check('payload conflict rule', config.retryRules.some((rule) => /different actor, amount, currency, destination or revision/i.test(rule)));
check('lost response rule', config.retryRules.some((rule) => /lost response/i.test(rule)));
check('stored replay rule', config.retryRules.some((rule) => /same stored withdrawal identifier/i.test(rule)));
check('raw bank boundary', config.dataBoundary.some((rule) => /Raw account holder/i.test(rule)));
check('opaque destination boundary', config.dataBoundary.some((rule) => /opaque destination reference/i.test(rule)));
check('intent persistence requirement', config.runtimeIntegrationRequirements.some((rule) => /Persist the withdrawal intent/i.test(rule)));
check('server binding requirement', config.runtimeIntegrationRequirements.some((rule) => /Bind the server ledger/i.test(rule)));
check('reconciliation requirement', config.runtimeIntegrationRequirements.some((rule) => /reconciliation path/i.test(rule)));
check('provider completion blocked', config.runtimeIntegrationRequirements.some((rule) => /provider confirmation and reconciliation/i.test(rule)));
check('contract authority only', config.authority.idempotencyContractAuthority === true);
check('runtime authority denied', config.authority.runtimeMutationAuthority === false);
check('withdrawal authority denied', config.authority.withdrawalRequestAuthority === false);
check('provider authority denied', config.authority.providerTransferAuthority === false);
check('money authority denied', config.authority.realMoneyAuthority === false);
check('staging authority denied', config.authority.stagingAuthority === false);
check('production authority denied', config.authority.productionAuthority === false);
check('all prohibited effects false', Object.values(config.prohibitedEffects).every((value) => value === false));
check('fixture positive coverage', fixtures.positive.length >= 10);
check('fixture negative coverage', fixtures.negative.length >= 30);
check('module exports create intent', typeof contract.createWithdrawalIntent === 'function');
check('module exports request binding', typeof contract.assertRequestBinding === 'function');
check('module exports transition guard', typeof contract.assertTransition === 'function');
check('module exports retry resolver', typeof contract.resolveRetryAction === 'function');

const failures = checks.filter((entry) => !entry.passed);
const result = {
  contractId: config.contractId,
  sourceHead: config.sourceHead,
  total: checks.length,
  passed: checks.length - failures.length,
  failed: failures.length,
  status: failures.length ? 'failed' : 'passed',
  runtimeIntegrated: config.runtimeIntegrated,
  effects: config.prohibitedEffects
};
console.log(JSON.stringify(result, null, 2));
if (failures.length) {
  failures.forEach((entry) => console.error(`FAIL: ${entry.name}`));
  process.exit(1);
}

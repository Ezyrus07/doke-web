'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'backend/modules/wallet/provider-transfer-reconciliation-contract.js',
  'config/wal-a05-provider-transfer-reconciliation.json',
  'tests/fixtures/wal-a05-provider-transfer-reconciliation-cases.json',
  'docs/WAL-A05-PROVIDER-TRANSFER-RECONCILIATION.md',
  'scripts/test-wal-a05-provider-transfer-reconciliation.js',
  '.github/workflows/wal-a05-provider-transfer-reconciliation.yml'
];

const checks = [];
function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

requiredFiles.forEach((file) => check(`file:${file}`, fs.existsSync(path.join(root, file))));

const config = JSON.parse(fs.readFileSync(path.join(root, 'config/wal-a05-provider-transfer-reconciliation.json'), 'utf8'));
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/fixtures/wal-a05-provider-transfer-reconciliation-cases.json'), 'utf8'));
const moduleSource = fs.readFileSync(path.join(root, 'backend/modules/wallet/provider-transfer-reconciliation-contract.js'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'docs/WAL-A05-PROVIDER-TRANSFER-RECONCILIATION.md'), 'utf8');
const workflow = fs.readFileSync(path.join(root, '.github/workflows/wal-a05-provider-transfer-reconciliation.yml'), 'utf8');

check('contract-id', config.contractId === 'wal-a05-provider-transfer-reconciliation-v1');
check('repository-only', config.scope === 'repository_only');
check('runtime-blocked', config.runtimeIntegrated === false);
check('provider-unselected', config.providerSelected === false);
check('credentials-unconfigured', config.providerCredentialsConfigured === false);
check('migration-blocked', config.migrationPrepared === false && config.migrationApplied === false);
check('staging-blocked', config.stagingValidated === false);
check('depends-on-a04', config.dependsOn.includes('wal-a04-withdrawal-idempotency-v1'));
check('depends-on-pay-b03', config.dependsOn.includes('pay-b03-commercial-policy-decision-gate-v1'));
check('provider-statuses-exact', JSON.stringify(config.providerStatuses) === JSON.stringify(['submission_unknown','accepted','processing','succeeded','failed','reversed']));
check('reconciliation-states-exact', JSON.stringify(config.reconciliationStates) === JSON.stringify(['queued','provider_unknown','provider_processing','reconciliation_required','settled','failed_terminal','reversed']));
check('settlement-rule', /only after authenticated provider success and matching settlement reconciliation evidence/i.test(config.settlementRule));
check('provider-success-shortcut-forbidden', config.forbiddenShortcuts.includes('provider success without reconciliation'));
check('manual-approval-shortcut-forbidden', config.forbiddenShortcuts.includes('manual approval as settlement evidence'));
check('completion-shortcut-forbidden', config.forbiddenShortcuts.includes('marking completed before settled'));
check('provider-selection-dependency', config.externalDependencies.includes('provider selection and contracting'));
check('approvals-dependency', config.externalDependencies.includes('commercial, legal and tax approval evidence'));
check('migration-dependency', config.externalDependencies.includes('immutable migrations'));
check('canary-dependency', config.externalDependencies.includes('staging transfer simulation and reconciliation canaries'));
check('contract-authority-only', config.authority.contractAuthority === true);
['runtimeMutationAuthority','providerSubmissionAuthority','providerTransferAuthority','realMoneyAuthority','remoteExecutionAuthority','stagingAuthority','productionAuthority'].forEach((field) => check(`authority-denied:${field}`, config.authority[field] === false));
Object.entries(config.prohibitedEffects).forEach(([field, value]) => check(`effect-denied:${field}`, value === false));
check('fixture-synthetic-only', fixture.fixturePolicy === 'synthetic_only' && fixture.realProvider === false && fixture.realCredentials === false && fixture.realBankData === false && fixture.realMoney === false);
check('module-provider-success-insufficient', moduleSource.includes('providerSuccessAloneIsInsufficient: true'));
check('module-manual-approval-denied', moduleSource.includes('manualApprovalCanSettle: false'));
check('module-raw-bank-guard', moduleSource.includes('WAL_A05_RAW_BANK_DATA_FORBIDDEN'));
check('module-credential-guard', moduleSource.includes('WAL_A05_PROVIDER_CREDENTIAL_FORBIDDEN'));
check('module-signature-guard', moduleSource.includes('WAL_A05_WEBHOOK_SIGNATURE_REQUIRED'));
check('module-segregation-guard', moduleSource.includes('WAL_A05_SEGREGATION_REQUIRED'));
check('module-completion-gate', moduleSource.includes("valid.state === 'settled'"));
check('docs-completion-rule', docs.includes('Provider success alone is insufficient'));
check('docs-external-blockers', docs.includes('Operational integration remains blocked'));
check('workflow-read-only', workflow.includes('contents: read'));
check('workflow-no-write-permission', !workflow.includes('contents: write'));
check('workflow-audit', workflow.includes('audit-wal-a05-provider-transfer-reconciliation.js'));
check('workflow-conformance', workflow.includes('test-wal-a05-provider-transfer-reconciliation.js'));
check('workflow-diff', workflow.includes('git diff --check'));

const failed = checks.filter((entry) => !entry.passed);
const report = {
  contractId: config.contractId,
  sourceHead: config.sourceHead,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  runtimeIntegrated: config.runtimeIntegrated,
  providerSelected: config.providerSelected,
  effects: config.prohibitedEffects
};
console.log(JSON.stringify(report, null, 2));
if (failed.length) {
  failed.forEach((entry) => console.error(`FAIL ${entry.name}`));
  process.exit(1);
}

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { isNumericSemanticVersionAtLeast } = require('./lib/semantic-version');
const contract = require('../backend/modules/payments/payment-reconciliation-migration-canary-contract');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => { if (!condition) throw new Error('PAY-A08 audit failed: ' + message); };
const sha256 = (value) => crypto.createHash('sha256').update(value, 'utf8').digest('hex');

const paths = {
  module: 'backend/modules/payments/payment-reconciliation-migration-canary-contract.js',
  config: 'config/pay-001-a08-immutable-migrations-read-only-canary.json',
  docs: 'docs/PAY-001-A08-IMMUTABLE-MIGRATIONS-READ-ONLY-CANARY.md',
  evidence: 'docs/validation/PAY-001-A08-IMMUTABLE-MIGRATIONS-READ-ONLY-CANARY.json',
  audit: 'scripts/audit-pay-001-a08-immutable-migrations-read-only-canary.js',
  test: 'scripts/test-pay-001-a08-immutable-migrations-read-only-canary.js',
  workflow: '.github/workflows/pay-001-a08-immutable-migrations-read-only-canary.yml'
};

Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(root, file)), 'missing asset: ' + file));

const config = readJson(paths.config);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);
const matrix = readJson('config/domain-completion-matrix.json');
const packageJson = readJson('package.json');
const pay = matrix.domains.find((domain) => domain.id === 'PAY-001');

assert(config.contractVersion === contract.CONTRACT_VERSION, 'contract version mismatch');
assert(config.status === 'repository_only_immutable_migrations_and_read_only_canary_ready_remote_application_blocked', 'status mismatch');
assert(config.migrationManifest.manifestHash === contract.validateMigrationManifest(config.migrationManifest).manifestHash, 'manifest hash mismatch');
assert(config.migrationManifest.migrations.length === 4, 'four migrations required');
for (const migration of config.migrationManifest.migrations) {
  assert(fs.existsSync(path.join(root, migration.path)), 'missing migration: ' + migration.path);
  const source = read(migration.path);
  assert(sha256(source) === migration.sha256, 'migration hash drift: ' + migration.path);
  assert(source.includes('has not been applied to any remote environment'), 'migration must state unapplied boundary');
  assert(source.includes('private.payment_reconciliation_'), 'migration must target private reconciliation objects');
  assert(source.includes('enable row level security'), 'RLS must be enabled');
  assert(source.includes('revoke all'), 'browser grants must be revoked');
  ['stripe', 'adyen', 'mercadopago', 'pagarme', 'asaas'].forEach((provider) => {
    assert(!source.toLowerCase().includes(provider), 'named provider dependency: ' + provider);
  });
  ['card_number', 'cvv', 'cvc', 'raw_provider_payload'].forEach((field) => {
    assert(!source.toLowerCase().includes(field), 'sensitive/raw field found: ' + field);
  });
}

assert(config.databaseBoundary.schema === 'private', 'private schema required');
assert(config.databaseBoundary.browserAccess === false && config.databaseBoundary.dataApiExposureAllowed === false, 'browser/Data API must remain denied');
assert(config.databaseBoundary.migrationApplicationPerformed === false, 'migration application must remain false');
assert(config.readOnlyCanary.enabled === false, 'canary must remain disabled');
assert(config.readOnlyCanary.allowedStatement === 'SELECT', 'SELECT-only boundary required');
['ddlAllowed', 'dmlAllowed', 'rpcAllowed', 'schedulerMutationAllowed', 'migrationApplicationAllowed', 'automaticDriftRepairAllowed', 'financialRowReadsAllowed', 'personalDataReadsAllowed', 'repositoryMayExecuteRemoteActions']
  .forEach((key) => assert(config.readOnlyCanary[key] === false, key + ' must remain false'));

assert(config.stagingAuthorization.phrase === contract.STAGING_PHRASE, 'authorization phrase mismatch');
assert(config.stagingAuthorization.scope === contract.STAGING_SCOPE, 'authorization scope mismatch');
assert(config.stagingAuthorization.genericContinuationAuthorizesStaging === false, 'generic continuation must be rejected');
assert(config.stagingAuthorization.remoteActionsAllowedByRepositoryContract === false, 'repository remote authority must remain absent');
assert(config.stagingAuthorization.repositoryExecutionPerformed === false, 'repository must not claim execution');
Object.entries(config.effects).forEach(([key, value]) => assert(value === 0 || value === false, 'effect must remain zero/false: ' + key));

['PAY-A08', 'SHA-256', 'SELECT', 'DDL', 'DML', 'não aplica SQL', 'auto-repair', contract.STAGING_PHRASE, 'PAY-B01', 'PAY-B03', 'PAY-B04', 'PAY-A09']
  .forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.manifestHash === config.migrationManifest.manifestHash, 'evidence manifest mismatch');
assert(evidence.validated.fourMigrationSourcesPinnedBySha256 === true, 'hash evidence missing');
assert(evidence.validated.readOnlySelectScannerEnforced === true, 'read-only evidence missing');
assert(evidence.validated.ddlAndDmlRejected === true, 'negative SQL evidence missing');
assert(evidence.validated.repositoryRemoteAuthorityAbsent === true, 'remote authority evidence missing');
Object.entries(evidence.execution).forEach(([key, value]) => assert(value === 0 || value === false, 'execution effect must remain zero/false: ' + key));

assert(packageJson.scripts['audit:pay-001-a08-immutable-migrations-read-only-canary'] === 'node scripts/audit-pay-001-a08-immutable-migrations-read-only-canary.js', 'package audit command missing');
assert(packageJson.scripts['test:pay-001-a08-immutable-migrations-read-only-canary'] === 'node scripts/test-pay-001-a08-immutable-migrations-read-only-canary.js', 'package test command missing');

assert(isNumericSemanticVersionAtLeast(matrix.version, '1.3.93'), 'matrix version must be at least 1.3.93');
assert(pay && pay.maturity === 2, 'PAY maturity must remain 2');
assert(pay.userFacingAuthority === 'local' && pay.serverAuthority === 'contract_only', 'PAY authority must remain local/contract-only');
assert(pay.stagingEvidence === 'local_e2e', 'PAY staging evidence must remain local E2E');
assert(pay.securityGate === 'blocked' && pay.productionGate === 'blocked', 'PAY gates must remain blocked');
assert(JSON.stringify(pay.blockers.map((item) => item.id)) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'blockers drifted');
[...Object.values(paths), ...config.migrationManifest.migrations.map((item) => item.path)]
  .forEach((file) => assert(pay.requiredPaths.includes(file), 'matrix requiredPaths missing: ' + file));
assert(pay.tests.includes('audit:pay-001-a08-immutable-migrations-read-only-canary'), 'matrix A08 audit missing');
assert(pay.tests.includes('test:pay-001-a08-immutable-migrations-read-only-canary'), 'matrix A08 test missing');
assert(pay.evidence.some((item) => item.includes('PAY-A08')), 'matrix A08 evidence missing');
assert(pay.nextActions[0].includes('PAY-B03'), 'PAY-A18 must be the first next action');

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must be read-only');
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'supabase db push', 'supabase migration up', 'git push', '--execute']
  .forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-A08 immutable migrations and read-only canary audit passed.');

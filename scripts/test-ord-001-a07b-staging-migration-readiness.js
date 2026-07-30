'use strict';

const assert = require('assert');
const {
  buildReadinessPlan,
  readConfig,
  resolveMode,
  sha256File
} = require('./plan-ord-001-a07b-staging-migration.js');

const config = readConfig();

assert.strictEqual(sha256File(config.migration.path), config.migration.sha256);

const dryRun = buildReadinessPlan({ env: {} });
assert.strictEqual(dryRun.status, 'staging_migration_application_unauthorized');
assert.strictEqual(dryRun.migration.hashMatches, true);
assert.strictEqual(dryRun.checks.environmentReady, false);
assert.strictEqual(dryRun.capabilities.executeModeAvailable, false);
assert.strictEqual(dryRun.capabilities.networkRequestsPerformed, 0);
assert.strictEqual(dryRun.capabilities.databaseMutationsPerformed, 0);
assert.strictEqual(dryRun.capabilities.productionChanged, false);
assert(Object.isFrozen(dryRun));
assert(Object.isFrozen(dryRun.authorization.stillBlocked));

const exactEnvironment = {
  DOKE_ORD_A07B_TARGET_ENV: 'staging',
  DOKE_ORD_A07B_MIGRATION_SHA256: config.migration.sha256,
  DOKE_ORD_A07B_MIGRATION_AUTHORIZATION: config.authorization.exactPhrase
};
const ready = buildReadinessPlan({ env: exactEnvironment });
assert.strictEqual(ready.checks.environmentReady, true);
assert.strictEqual(ready.status, 'staging_migration_environment_ready_execution_still_unavailable');
assert.strictEqual(ready.capabilities.executeModeAvailable, false);

[
  {},
  { ...exactEnvironment, DOKE_ORD_A07B_TARGET_ENV: 'production' },
  { ...exactEnvironment, DOKE_ENV: 'production' },
  { ...exactEnvironment, DOKE_ORD_A07B_MIGRATION_SHA256: 'wrong' },
  { ...exactEnvironment, DOKE_ORD_A07B_MIGRATION_AUTHORIZATION: 'proximo' },
  { ...exactEnvironment, DOKE_ORD_A07B_MIGRATION_AUTHORIZATION: 'próximo' },
  { ...exactEnvironment, DOKE_ORD_A07B_MIGRATION_AUTHORIZATION: 'pode prosseguir' },
  {
    ...exactEnvironment,
    DOKE_ORD_A07B_MIGRATION_AUTHORIZATION:
      config.authorization.exactPhrase.toLowerCase()
  }
].forEach((env) => {
  assert.strictEqual(buildReadinessPlan({ env }).checks.environmentReady, false);
});

assert.strictEqual(resolveMode([]), 'dry-run');
assert.strictEqual(resolveMode(['--dry-run']), 'dry-run');
assert.strictEqual(resolveMode(['--check-env']), 'check-env');

assert.throws(
  () => resolveMode(['--execute']),
  (error) => error.code === 'DOKE_ORD_A07B_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE'
);
assert.throws(
  () => resolveMode(['--dry-run', '--check-env']),
  (error) => error.code === 'DOKE_ORD_A07B_STAGING_MIGRATION_MODE_AMBIGUOUS'
);
assert.throws(
  () => resolveMode(['--write']),
  (error) => error.code === 'DOKE_ORD_A07B_STAGING_MIGRATION_OPTION_INVALID'
);

console.log('ORD-A07B staging migration readiness tests passed.');

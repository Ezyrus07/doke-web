'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');

const planner = 'scripts/plan-ord-001-a07c-staging-migration.js';
const config = JSON.parse(fs.readFileSync('config/ord-001-a07c-staging-migration-readiness.json', 'utf8'));

function run(args, env = {}) {
  return spawnSync(process.execPath, [planner, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
}

const dryRun = run(['--dry-run']);
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const dryPlan = JSON.parse(dryRun.stdout);
assert.strictEqual(dryPlan.target, 'staging');
assert.strictEqual(dryPlan.migration.sha256, config.migration.sha256);
assert.strictEqual(dryPlan.migration.changesCronSchedule, false);
assert.strictEqual(dryPlan.authorization.applicationAuthorized, false);
assert.strictEqual(dryPlan.execution.networkRequestsPerformed, 0);
assert.strictEqual(dryPlan.execution.databaseMutationsPerformed, 0);
assert.strictEqual(dryPlan.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(dryPlan.execution.productionChanged, false);

const generic = run(['--check-env'], {
  DOKE_TARGET_ENVIRONMENT: 'staging',
  DOKE_ORD_A07C_AUTHORIZATION: 'proximo',
  DOKE_ORD_A07C_MIGRATION_SHA256: config.migration.sha256,
});
assert.strictEqual(generic.status, 0, generic.stderr);
assert.strictEqual(JSON.parse(generic.stdout).authorization.applicationAuthorized, false);

const exact = run(['--check-env'], {
  DOKE_TARGET_ENVIRONMENT: 'staging',
  DOKE_ORD_A07C_AUTHORIZATION: config.authorization.exactPhrase,
  DOKE_ORD_A07C_MIGRATION_SHA256: config.migration.sha256,
});
assert.strictEqual(exact.status, 0, exact.stderr);
const exactPlan = JSON.parse(exact.stdout);
assert.strictEqual(exactPlan.authorization.applicationAuthorized, true);
assert.strictEqual(exactPlan.authorization.edgeFunctionDeployAuthorized, false);
assert.strictEqual(exactPlan.authorization.remoteCanaryAuthorized, false);
assert.strictEqual(exactPlan.execution.mode, 'check_env_only');
assert.strictEqual(exactPlan.execution.databaseMutationsPerformed, 0);

const wrongHash = run(['--check-env'], {
  DOKE_TARGET_ENVIRONMENT: 'staging',
  DOKE_ORD_A07C_AUTHORIZATION: config.authorization.exactPhrase,
  DOKE_ORD_A07C_MIGRATION_SHA256: 'wrong',
});
assert.strictEqual(wrongHash.status, 0, wrongHash.stderr);
assert.strictEqual(JSON.parse(wrongHash.stdout).authorization.applicationAuthorized, false);

const production = run(['--check-env'], {
  DOKE_TARGET_ENVIRONMENT: 'production',
  DOKE_ORD_A07C_AUTHORIZATION: config.authorization.exactPhrase,
  DOKE_ORD_A07C_MIGRATION_SHA256: config.migration.sha256,
});
assert.notStrictEqual(production.status, 0);
assert(production.stderr.includes('DOKE_ORD_A07C_PRODUCTION_TARGET_PROHIBITED') || production.stderr.includes('Production target'));

for (const forbidden of ['--execute', '--apply', '--deploy']) {
  const result = run([forbidden]);
  assert.notStrictEqual(result.status, 0, `${forbidden} must be rejected`);
  assert(result.stderr.includes('DOKE_ORD_A07C_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE') || result.stderr.includes('execution is intentionally unavailable'));
}

const noMode = run([]);
assert.notStrictEqual(noMode.status, 0);
assert(noMode.stderr.includes('There is no execute mode') || noMode.stderr.includes('PLANNING_MODE_REQUIRED'));

console.log('ORD-A07C staging migration readiness tests passed.');

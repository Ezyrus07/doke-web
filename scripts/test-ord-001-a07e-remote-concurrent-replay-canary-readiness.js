'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const script = path.join(ROOT, 'scripts/plan-ord-001-a07e-remote-concurrent-replay-canary.js');
const authorization = 'I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING';
const bundle = '2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0';

function run(args, env = {}) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

const dryRun = run(['--dry-run']);
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const plan = JSON.parse(dryRun.stdout);
assert.strictEqual(plan.mode, 'readiness_only_no_network_no_mutation');
assert.strictEqual(plan.scenario.concurrency, 32);
assert.strictEqual(plan.scenario.expected.accepted, 1);
assert.strictEqual(plan.scenario.expected.replayRejected, 31);
assert.strictEqual(plan.scenario.expected.replayStatus, 409);
assert.strictEqual(plan.capabilities.network, false);
assert.strictEqual(plan.capabilities.executeRemoteCanary, false);
assert.strictEqual(plan.capabilities.databaseMutation, false);
assert.strictEqual(plan.capabilities.production, false);

for (const argument of ['--execute', '--remote', '--staging', '--production', '--deploy', '--cleanup', '--canary']) {
  const result = run([argument]);
  assert.strictEqual(result.status, 2, `${argument} must be rejected`);
}

const noArguments = run([]);
assert.strictEqual(noArguments.status, 2);

const missingEnvironment = run(['--check-env']);
assert.strictEqual(missingEnvironment.status, 1);

const genericContinuation = run(['--check-env'], {
  ORD_A07E_AUTHORIZATION: authorization,
  ORD_A07E_TARGET_PROJECT_ID: 'zwkczgewzbsorbrjuzpb',
  ORD_A07E_EXPECTED_FUNCTION_VERSION: '10',
  ORD_A07E_EXPECTED_BUNDLE_SHA256: bundle,
  ORD_A07E_CONCURRENCY: '32',
  ORD_A07E_TARGET_ENVIRONMENT: 'staging',
  ORD_A07E_GENERIC_CONTINUATION: 'proximo',
});
assert.strictEqual(genericContinuation.status, 1);

const correctEnvironment = run(['--check-env'], {
  ORD_A07E_AUTHORIZATION: authorization,
  ORD_A07E_TARGET_PROJECT_ID: 'zwkczgewzbsorbrjuzpb',
  ORD_A07E_EXPECTED_FUNCTION_VERSION: '10',
  ORD_A07E_EXPECTED_BUNDLE_SHA256: bundle,
  ORD_A07E_CONCURRENCY: '32',
  ORD_A07E_TARGET_ENVIRONMENT: 'staging',
  ORD_A07E_GENERIC_CONTINUATION: '',
});
assert.strictEqual(correctEnvironment.status, 0, correctEnvironment.stderr);
const environmentResult = JSON.parse(correctEnvironment.stdout);
assert.strictEqual(environmentResult.ok, true);
assert.strictEqual(environmentResult.readinessOnly, true);
assert.strictEqual(environmentResult.executionAuthorizedByThisPlanner, false);

console.log('ORD-A07E remote concurrent replay canary readiness tests passed.');

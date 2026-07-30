import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runConcurrentReplayCanary } from './lib/ord-a07e-concurrent-replay-canary.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runnerPath = path.join(__dirname, 'run-ord-001-a07e-concurrent-replay-canary.mjs');

const result = await runConcurrentReplayCanary({ concurrency: 32 });
assert.equal(result.passed, true);
assert.equal(result.mode, 'local_deterministic_no_network');
assert.equal(result.concurrency, 32);
assert.equal(result.acceptedCount, 1);
assert.equal(result.replayRejectedCount, 31);
assert.equal(result.unexpectedCount, 0);
assert.equal(result.workerRunsStarted, 1);
assert.equal(result.eventClaimsStarted, 1);
assert.deepEqual(result.ledger, { calls: 32, consumedCount: 1 });
assert.equal(result.networkRequestsPerformed, 0);
assert.equal(result.stagingMutationsPerformed, 0);
assert.equal(result.productionChanged, false);
assert.equal(Object.isFrozen(result), true);
assert.equal(Object.isFrozen(result.outcomes), true);

const twoWay = await runConcurrentReplayCanary({ concurrency: 2 });
assert.equal(twoWay.passed, true);
assert.equal(twoWay.acceptedCount, 1);
assert.equal(twoWay.replayRejectedCount, 1);

for (const forbidden of ['--staging', '--remote', '--production', '--execute', '--deploy']) {
  const invocation = spawnSync(process.execPath, [runnerPath, forbidden], { encoding: 'utf8' });
  assert.equal(invocation.status, 2, `${forbidden} must be rejected`);
  assert.match(invocation.stderr, /local-only/);
}

const cli = spawnSync(process.execPath, [runnerPath, '--concurrency=32'], { encoding: 'utf8' });
assert.equal(cli.status, 0);
const cliResult = JSON.parse(cli.stdout);
assert.equal(cliResult.passed, true);
assert.equal(cliResult.acceptedCount, 1);
assert.equal(cliResult.replayRejectedCount, 31);

console.log('ORD-A07E concurrent replay canary tests passed.');

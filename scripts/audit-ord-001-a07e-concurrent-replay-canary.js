'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const paths = {
  config: 'config/ord-001-a07e-concurrent-replay-canary.json',
  runtime: 'scripts/lib/ord-a07e-concurrent-replay-canary.mjs',
  runner: 'scripts/run-ord-001-a07e-concurrent-replay-canary.mjs',
  test: 'scripts/test-ord-001-a07e-concurrent-replay-canary.mjs',
  docs: 'docs/ORD-001-A07E-CONCURRENT-REPLAY-CANARY.md',
  evidence: 'docs/validation/ORD-001-A07E-CONCURRENT-REPLAY-CANARY.json',
  workflow: '.github/workflows/ord-001-a07e-concurrent-replay-canary.yml',
  gate: 'supabase/functions/order-event-worker/invocation-gate.mjs',
};

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function includesAll(text, values) {
  return values.every((value) => text.includes(value));
}

function main() {
  const failures = [];
  for (const relativePath of Object.values(paths)) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) failures.push(`missing required file: ${relativePath}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));

  const config = JSON.parse(read(paths.config));
  const evidence = JSON.parse(read(paths.evidence));
  const runtime = read(paths.runtime);
  const runner = read(paths.runner);
  const test = read(paths.test);
  const docs = read(paths.docs);
  const workflow = read(paths.workflow);
  const gate = read(paths.gate);

  if (config.domain !== 'ORD-001' || config.sublot !== 'ORD-A07E') failures.push('invalid ORD-A07E identity');
  if (config.status !== 'local_concurrent_replay_canary_complete_remote_canary_unauthorized') failures.push('invalid ORD-A07E status');
  if (config.mode !== 'local_deterministic_no_network') failures.push('canary must remain local and deterministic');
  if (config.concurrency !== 32) failures.push('canonical concurrency must remain 32');
  if (config.expected.acceptedCount !== 1 || config.expected.replayRejectedCount !== 31) failures.push('canonical replay expectation is invalid');
  if (config.activation.remoteReplayCanaryExecuted !== false) failures.push('remote replay canary must remain unauthorized');
  if (config.execution.externalNetworkRequestsPerformed !== 0 || config.execution.stagingDatabaseMutationsPerformed !== 0) failures.push('execution counters must remain zero');
  if (config.execution.productionChanged !== false) failures.push('production must remain unchanged');

  if (!includesAll(runtime, [
    'runConcurrentReplayCanary',
    'DEFAULT_CONCURRENCY = 32',
    'Promise.all(attempts)',
    "DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED",
    'accepted.length === 1',
    'replayRejected.length === concurrency - 1',
    'workerRunsStarted === 1',
    'eventClaimsStarted === 1',
    "mode: 'local_deterministic_no_network'",
    'networkRequestsPerformed: 0',
    'stagingMutationsPerformed: 0',
    'productionChanged: false',
  ])) failures.push('concurrent replay runtime is incomplete');

  if (!includesAll(runner, ['--staging', '--remote', '--production', '--execute', '--deploy', 'local-only'])) {
    failures.push('runner must reject all remote and execution modes');
  }
  if (/\bfetch\s*\(|createClient\s*\(|apply_migration|supabase\s+(db|functions)|https?:\/\//.test(runtime + '\n' + runner)) {
    failures.push('local canary must not contain network, Supabase, migration or deploy capabilities');
  }

  if (!includesAll(test, [
    'concurrency: 32',
    'acceptedCount, 1',
    'replayRejectedCount, 31',
    "['--staging', '--remote', '--production', '--execute', '--deploy']",
  ])) failures.push('ORD-A07E tests are incomplete');

  if (!includesAll(gate, ['assertFreshWorkerRequest', 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED'])) {
    failures.push('repository freshness gate is not preserved');
  }

  if (!includesAll(docs.toLowerCase(), ['32 concurrent', 'exactly one', 'local-only', 'activation remains pending'])) {
    failures.push('ORD-A07E documentation is incomplete');
  }
  if (evidence.status !== config.status || evidence.verified.acceptedCount !== 1 || evidence.verified.replayRejectedCount !== 31) {
    failures.push('ORD-A07E evidence is not reconciled');
  }
  if (evidence.execution.externalNetworkRequestsPerformed !== 0 || evidence.execution.stagingDatabaseMutationsPerformed !== 0 || evidence.execution.productionChanged !== false) {
    failures.push('ORD-A07E evidence must remain mutation-free');
  }

  if (!workflow.includes('permissions:\n  contents: read')) failures.push('permanent workflow must use contents: read');
  if (/contents:\s*write|apply_migration|supabase db push|supabase functions deploy/.test(workflow)) {
    failures.push('permanent workflow must not write, apply or deploy');
  }

  if (failures.length) {
    console.error('ORD-A07E concurrent replay canary audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('ORD-A07E concurrent replay canary audit passed.');
}

main();

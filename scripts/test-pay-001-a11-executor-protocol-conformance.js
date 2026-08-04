'use strict';

const assert = require('node:assert/strict');
const corpus = require('../tests/fixtures/pay-a11-executor-protocol-conformance-corpus.json');
const {
  CONTRACT_VERSION,
  MANIFEST_VERSION,
  DRY_RUN_VERSION,
  CORPUS_VERSION,
  RESULT_VERSION,
  COMMAND_KINDS,
  buildProtocolManifest,
  validateProtocolManifest,
  buildDryRunEnvelope,
  validateDryRunEnvelope,
  createCanonicalFixture,
  runConformanceCorpus
} = require('../backend/modules/payments/payment-reconciliation-executor-protocol');

assert.equal(CONTRACT_VERSION, 'pay-a11-executor-protocol-conformance-v1');
assert.equal(MANIFEST_VERSION, 'pay-reconciliation-executor-protocol-manifest-v1');
assert.equal(DRY_RUN_VERSION, 'pay-reconciliation-executor-dry-run-v1');
assert.equal(CORPUS_VERSION, 'pay-reconciliation-executor-conformance-corpus-v1');
assert.equal(RESULT_VERSION, 'pay-reconciliation-executor-conformance-result-v1');

const summary = runConformanceCorpus(corpus);
assert.equal(summary.totalCases, 35);
assert.equal(summary.acceptedCases, 5);
assert.equal(summary.rejectedCases, 30);
assert.equal(summary.passedCases, 35);
assert.equal(summary.allPassed, true);
assert.equal(summary.networkRequests, 0);
assert.equal(summary.databaseConnections, 0);
assert.equal(summary.subprocesses, 0);
assert.equal(summary.environmentReads, 0);
assert.equal(summary.remoteExecutions, 0);
assert.equal(summary.repositoryExecutions, 0);
assert.equal(summary.productionChanges, 0);
assert.equal(summary.financialMutations, 0);
assert.equal(summary.providerOperations, 0);

const fingerprints = new Set();
for (const operation of Object.keys(COMMAND_KINDS)) {
  const first = buildProtocolManifest(operation);
  const second = buildProtocolManifest(operation);
  assert.deepEqual(first, second);
  assert.equal(validateProtocolManifest(first).manifestFingerprint, first.manifestFingerprint);
  assert.equal(first.providerNeutral, true);
  assert.equal(first.dryRunOnly, true);
  assert.equal(first.transportConfigured, false);
  assert.equal(first.credentialsConfigured, false);
  assert.equal(first.endpointConfigured, false);
  assert.equal(first.networkAllowed, false);
  assert.equal(first.databaseConnectionAllowed, false);
  assert.equal(first.subprocessAllowed, false);
  assert.equal(first.environmentReadAllowed, false);
  assert.equal(first.rawSqlAllowed, false);
  assert.equal(first.productionAllowed, false);
  assert.equal(first.directMoneyMutationAllowed, false);
  assert.equal(first.providerOperationAllowed, false);
  assert.equal(first.automaticNextPhaseAllowed, false);
  assert.equal(fingerprints.has(first.manifestFingerprint), false);
  fingerprints.add(first.manifestFingerprint);

  const fixture = createCanonicalFixture(operation, {
    exactGitHead: corpus.exactGitHead,
    fixtureClock: corpus.fixtureClock,
    seed: 'deterministic-' + operation
  });
  const dryRun = buildDryRunEnvelope(
    fixture.dispatch,
    first,
    'pay-a11-deterministic-' + operation.replaceAll('_', '-'),
    corpus.fixtureClock
  );
  assert.equal(validateDryRunEnvelope(dryRun, first, fixture.dispatch).dryRunFingerprint, dryRun.dryRunFingerprint);
  assert.equal(dryRun.executionMode, 'dry_run_only');
  assert.equal(dryRun.remoteExecutionPerformed, false);
  assert.equal(dryRun.repositoryExecutionPerformed, false);
  assert.equal('execute' in dryRun, false);
  assert.equal('send' in dryRun, false);
  assert.equal('request' in dryRun, false);
}

assert.equal(fingerprints.size, 5);
console.log('PAY-A11 executor protocol conformance runtime tests passed.');

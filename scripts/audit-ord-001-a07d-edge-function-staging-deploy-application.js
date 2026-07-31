'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');

const paths = {
  config: 'config/ord-001-a07d-edge-function-staging-deploy-application.json',
  evidence: 'docs/validation/ORD-001-A07D-EDGE-FUNCTION-STAGING-DEPLOY-APPLICATION.json',
  docs: 'docs/ORD-001-A07D-EDGE-FUNCTION-STAGING-DEPLOY-APPLICATION.md',
  workflow: '.github/workflows/ord-001-a07d-edge-function-staging-deploy-application.yml'
};

for (const file of Object.values(paths)) {
  assert(fs.existsSync(file), `Missing ORD-A07D deployment asset: ${file}`);
}

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');

const gitBlobSha = (file) => {
  const content = fs.readFileSync(file);
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${content.length}\0`))
    .update(content)
    .digest('hex');
};

assert.strictEqual(config.contractVersion, 'ord-a07d-edge-function-staging-deploy-application-v1');
assert.strictEqual(config.status, 'edge_function_staging_deploy_applied_and_verified');
assert.strictEqual(config.target.environment, 'staging');
assert.strictEqual(config.target.projectId, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.target.functionName, 'order-event-worker');
assert.strictEqual(config.target.productionAllowed, false);
assert.strictEqual(config.authorizationPhrase, 'I_EXPLICITLY_AUTHORIZE_ORD_A07D_ORDER_EVENT_WORKER_EDGE_FUNCTION_DEPLOY_ON_DOKE_STAGING');

const frozenBundle = config.repository.bundle;
assert.strictEqual(Object.keys(frozenBundle).length, 6);
for (const [file, expectedSha] of Object.entries(frozenBundle)) {
  assert(fs.existsSync(file), `Missing frozen bundle file: ${file}`);
  assert.strictEqual(gitBlobSha(file), expectedSha, `Frozen Git blob mismatch: ${file}`);
}

assert.strictEqual(config.deployment.beforeVersion, 9);
assert.strictEqual(config.deployment.afterVersion, 10);
assert.strictEqual(config.deployment.status, 'ACTIVE');
assert.strictEqual(config.deployment.verifyJwtBefore, false);
assert.strictEqual(config.deployment.verifyJwtAfter, false);
assert.strictEqual(config.deployment.entrypointPath, 'index.ts');
assert.strictEqual(config.deployment.importMapPath, 'deno.json');
assert(/^[a-f0-9]{64}$/.test(config.deployment.beforeBundleSha256));
assert(/^[a-f0-9]{64}$/.test(config.deployment.afterBundleSha256));
assert.notStrictEqual(config.deployment.beforeBundleSha256, config.deployment.afterBundleSha256);

assert.strictEqual(config.runtimeVerification.requiredSecretsExistWithoutDisclosure, true);
assert.deepStrictEqual(config.runtimeVerification.invalidToken, {
  requestId: 11,
  status: 401,
  error: 'WORKER_AUTH_REQUIRED'
});
assert.deepStrictEqual(config.runtimeVerification.validTokenMissingFreshness, {
  requestId: 12,
  status: 428,
  error: 'DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED'
});
assert.strictEqual(config.runtimeVerification.remoteReplayCanaryExecuted, false);

for (const pair of [
  ['ordersBefore', 'ordersAfter'],
  ['budgetsBefore', 'budgetsAfter'],
  ['historyBefore', 'historyAfter'],
  ['domainEventsBefore', 'domainEventsAfter'],
  ['metricEventsBefore', 'metricEventsAfter'],
  ['deliveryAttemptsBefore', 'deliveryAttemptsAfter'],
  ['workerRunsBefore', 'workerRunsAfter'],
  ['nonceLedgerRowsBefore', 'nonceLedgerRowsAfter']
]) {
  assert.strictEqual(config.integrity[pair[0]], config.integrity[pair[1]], `${pair[0]} changed unexpectedly`);
}
assert.strictEqual(config.integrity.cronJobActive, true);
assert.strictEqual(config.integrity.cronSchedule, '* * * * *');
assert.strictEqual(config.integrity.cronCommand, 'select private.invoke_order_event_worker_if_needed();');
assert.strictEqual(config.integrity.a07bLedgerExists, true);
assert.strictEqual(config.integrity.a07bConsumeRpcExists, true);

assert.strictEqual(config.execution.edgeFunctionsDeployed, 1);
assert.strictEqual(config.execution.httpVerificationProbes, 2);
assert.strictEqual(config.execution.domainRowsMutated, 0);
assert.strictEqual(config.execution.cronJobsChanged, 0);
assert.strictEqual(config.execution.databaseMigrationsApplied, 0);
assert.strictEqual(config.execution.productionChanged, false);

assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.authorization.exactPhraseReceived, true);
assert.strictEqual(evidence.authorization.remoteReplayCanaryAuthorized, false);
assert.strictEqual(evidence.authorization.productionAuthorized, false);
assert.strictEqual(evidence.remoteAfter.version, 10);
assert.strictEqual(evidence.remoteAfter.verifyJwt, false);
assert.strictEqual(evidence.remoteAfter.fileCount, 6);
assert.strictEqual(evidence.probes.invalidToken.status, 401);
assert.strictEqual(evidence.probes.missingFreshness.status, 428);
assert.strictEqual(evidence.probes.missingFreshness.workerTokenDisclosed, false);
assert.strictEqual(evidence.execution.domainRowsMutated, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

for (const fragment of [
  'I_EXPLICITLY_AUTHORIZE_ORD_A07D_ORDER_EVENT_WORKER_EDGE_FUNCTION_DEPLOY_ON_DOKE_STAGING',
  'Previous version: `9`',
  'Deployed version: `10`',
  '`verify_jwt` before and after: `false`',
  'HTTP `401` with `WORKER_AUTH_REQUIRED`',
  'HTTP `428` with `DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED`',
  'remote concurrent replay canary'
]) {
  assert(docs.includes(fragment), `Deployment documentation missing: ${fragment}`);
}

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a07d-edge-function-staging-deploy-application.js'));
for (const forbidden of ['contents: write', 'deploy_edge_function', 'supabase functions deploy', 'apply_migration']) {
  assert(!workflow.includes(forbidden), `Permanent deployment workflow must not include ${forbidden}`);
}

console.log('ORD-A07D Edge Function staging deployment application audit passed.');

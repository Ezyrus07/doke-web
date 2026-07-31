'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const paths = {
  config: 'config/ord-001-a07e-remote-concurrent-replay-canary-readiness.json',
  planner: 'scripts/plan-ord-001-a07e-remote-concurrent-replay-canary.js',
  test: 'scripts/test-ord-001-a07e-remote-concurrent-replay-canary-readiness.js',
  docs: 'docs/ORD-001-A07E-REMOTE-CONCURRENT-REPLAY-CANARY-READINESS.md',
  evidence: 'docs/validation/ORD-001-A07E-REMOTE-CONCURRENT-REPLAY-CANARY-READINESS.json',
  workflow: '.github/workflows/ord-001-a07e-remote-concurrent-replay-canary-readiness.yml',
  localConfig: 'config/ord-001-a07e-concurrent-replay-canary.json',
  localAudit: 'scripts/audit-ord-001-a07e-concurrent-replay-canary.js',
  deployApplication: 'config/ord-001-a07d-edge-function-staging-deploy-application.json',
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
  const localConfig = JSON.parse(read(paths.localConfig));
  const deployApplication = JSON.parse(read(paths.deployApplication));
  const planner = read(paths.planner);
  const test = read(paths.test);
  const docs = read(paths.docs);
  const workflow = read(paths.workflow);

  if (config.domain !== 'ORD-001' || config.sublot !== 'ORD-A07E-REMOTE-READINESS') failures.push('invalid readiness identity');
  if (config.status !== 'remote_concurrent_replay_canary_readiness_complete_execution_unauthorized') failures.push('invalid readiness status');
  if (config.target.environment !== 'staging' || config.target.projectId !== 'zwkczgewzbsorbrjuzpb') failures.push('target must remain Doke staging');
  if (config.target.requiredVersion !== 10 || config.target.requiredStatus !== 'ACTIVE') failures.push('remote v10 ACTIVE prerequisite is not frozen');
  if (config.target.requiredVerifyJwt !== false) failures.push('verify_jwt must remain false');
  if (config.target.requiredBundleSha256 !== '2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0') failures.push('remote bundle hash drift');

  if (config.scenario.concurrency !== 32
    || config.scenario.expectedAcceptedCount !== 1
    || config.scenario.expectedReplayRejectedCount !== 31
    || config.scenario.expectedUnexpectedCount !== 0) failures.push('canonical concurrency expectations are invalid');
  if (config.scenario.replayHttpStatus !== 409 || config.scenario.replayError !== 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED') failures.push('stable replay response is invalid');

  if (!config.cleanup.required
    || !config.cleanup.workerRunDeleteConditions.idEqualsAcceptedRunId
    || config.cleanup.workerRunDeleteConditions.sourceEquals !== 'test'
    || config.cleanup.workerRunDeleteConditions.claimedCountEquals !== 0
    || !config.cleanup.nonceDeleteConditions.nonceHashEqualsCanaryNonceSha256
    || !config.cleanup.mustNotDeletePreexistingTestNonceRows) failures.push('cleanup is not sufficiently constrained');
  if (config.preflightSnapshot.serviceRoleCanDeleteWorkerRun !== false || config.preflightSnapshot.serviceRoleCanDeleteNonce !== true) failures.push('cleanup privilege boundary is not recorded');

  const phrase = 'I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING';
  if (config.authorization.exactPhraseRequired !== phrase || config.authorization.remoteCanaryAuthorized !== false) failures.push('authorization boundary is invalid');
  if (config.execution.remoteRequestsExecuted !== 0
    || config.execution.stagingDatabaseMutationsPerformed !== 0
    || config.execution.cleanupRowsDeleted !== 0
    || config.execution.productionChanged !== false) failures.push('readiness must remain execution-free');

  if (localConfig.status !== 'local_concurrent_replay_canary_complete_remote_canary_unauthorized') failures.push('local A07E gate is not preserved');
  if (deployApplication.deployment.afterVersion !== 10
    || deployApplication.deployment.afterBundleSha256 !== config.target.requiredBundleSha256
    || deployApplication.deployment.verifyJwtAfter !== false) failures.push('A07D deployment prerequisite is not preserved');

  if (!includesAll(planner, [
    '--dry-run',
    '--check-env',
    phrase,
    'readiness_only_no_network_no_mutation',
    'executeRemoteCanary: false',
    'databaseMutation: false',
    'generic continuation is not authorization',
  ])) failures.push('readiness planner is incomplete');
  if (/\bfetch\s*\(|createClient\s*\(|execute_sql|apply_migration|deploy_edge_function|supabase\s+(db|functions)|https?:\/\//.test(planner)) {
    failures.push('readiness planner must not contain network, SQL, Supabase or deploy capabilities');
  }

  if (!includesAll(test, [
    "['--execute', '--remote', '--staging', '--production', '--deploy', '--cleanup', '--canary']",
    'plan.scenario.concurrency, 32',
    'plan.scenario.expected.accepted, 1',
    'plan.scenario.expected.replayRejected, 31',
    'executionAuthorizedByThisPlanner, false',
  ])) failures.push('readiness tests are incomplete');

  if (!includesAll(docs, [
    '32 requisições concorrentes',
    '1 resposta aceita',
    '31 respostas rejeitadas',
    'runId',
    "source = 'test'",
    phrase,
    'chamadas remotas executadas: `0`',
  ])) failures.push('readiness documentation is incomplete');

  if (evidence.status !== config.status
    || evidence.verified.concurrencyFrozen !== 32
    || evidence.verified.expectedAcceptedCount !== 1
    || evidence.verified.expectedReplayRejectedCount !== 31
    || evidence.authorization.received !== false
    || evidence.execution.remoteRequestsExecuted !== 0) failures.push('readiness evidence is not reconciled');

  if (!workflow.includes('permissions:\n  contents: read')) failures.push('permanent workflow must use contents: read');
  if (/contents:\s*write|execute_sql|apply_migration|deploy_edge_function|supabase db push|supabase functions deploy/.test(workflow)) {
    failures.push('permanent workflow must not write, mutate or deploy');
  }

  if (failures.length) {
    console.error('ORD-A07E remote concurrent replay canary readiness audit failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log('ORD-A07E remote concurrent replay canary readiness audit passed.');
}

main();

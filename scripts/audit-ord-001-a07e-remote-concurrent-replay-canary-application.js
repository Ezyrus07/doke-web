'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const files = {
  config: 'config/ord-001-a07e-remote-concurrent-replay-canary-application.json',
  evidence: 'docs/validation/ORD-001-A07E-REMOTE-CONCURRENT-REPLAY-CANARY-APPLICATION.json',
  docs: 'docs/ORD-001-A07E-REMOTE-CONCURRENT-REPLAY-CANARY-APPLICATION.md',
  readiness: 'config/ord-001-a07e-remote-concurrent-replay-canary-readiness.json',
  deploy: 'config/ord-001-a07d-edge-function-staging-deploy-application.json',
  workflow: '.github/workflows/ord-001-a07e-remote-concurrent-replay-canary-application.yml'
};

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

function main() {
  const failures = [];
  for (const relativePath of Object.values(files)) {
    if (!fs.existsSync(path.join(ROOT, relativePath))) failures.push(`missing required file: ${relativePath}`);
  }
  if (failures.length) throw new Error(failures.join('\n'));

  const config = JSON.parse(read(files.config));
  const evidence = JSON.parse(read(files.evidence));
  const readiness = JSON.parse(read(files.readiness));
  const deploy = JSON.parse(read(files.deploy));
  const docs = read(files.docs);
  const workflow = read(files.workflow);

  if (config.status !== 'remote_concurrent_replay_canary_passed_cleanup_baseline_restored') failures.push('invalid application status');
  if (config.authorizationPhrase !== 'I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING') failures.push('exact authorization phrase missing');
  if (config.target.environment !== 'staging' || config.target.projectId !== 'zwkczgewzbsorbrjuzpb') failures.push('invalid staging target');
  if (config.target.version !== 10 || config.target.status !== 'ACTIVE' || config.target.verifyJwt !== false) failures.push('remote function identity drift');
  if (config.target.bundleSha256 !== '2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0') failures.push('remote bundle hash drift');
  if (config.dispatch.requestCount !== 32 || config.dispatch.requestIds.length !== 32) failures.push('dispatch count must be 32');
  if (config.result.received !== 32 || config.result.acceptedCount !== 1 || config.result.replayRejectedCount !== 31 || config.result.unexpectedCount !== 0) failures.push('remote replay result is not exact');
  if (config.result.timedOutCount !== 0 || config.result.transportErrorCount !== 0) failures.push('transport must be clean');
  if (config.result.replayHttpStatus !== 409 || config.result.replayError !== 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED') failures.push('stable replay response drift');
  if (config.result.acceptedClaimed !== 0 || config.result.acceptedCompleted !== 0 || config.result.acceptedFailed !== 0 || config.result.acceptedDeadLetter !== 0) failures.push('accepted canary run must remain empty');
  if (!config.cleanup.acceptedWorkerRunDeleted || config.cleanup.deletedWorkerRunCount !== 1) failures.push('accepted worker run cleanup missing');
  if (config.cleanup.canaryNonceDeleted !== false || config.cleanup.baselinePreservedByCount !== true) failures.push('nonce baseline exception is not recorded');

  const post = config.postCleanup;
  for (const key of ['orders','budgets','history','domainEvents','metricEvents','deliveryAttempts','testWorkerRuns']) {
    if (post[key] !== 0) failures.push(`post-cleanup ${key} must be zero`);
  }
  if (post.workerRuns !== 1 || post.nonceLedgerRows !== 1 || post.testNonceRows !== 1) failures.push('post-cleanup baseline counts drifted');
  if (post.acceptedRunPresent !== false || post.canaryNoncePresent !== true) failures.push('cleanup identity state is invalid');
  if (!post.cronActive || post.cronSchedule !== '* * * * *' || post.cronCommand !== 'select private.invoke_order_event_worker_if_needed();') failures.push('Cron drift detected');

  if (config.execution.domainRowsMutated !== 0 || config.execution.cronJobsChanged !== 0 || config.execution.edgeFunctionsDeployed !== 0 || config.execution.migrationsApplied !== 0 || config.execution.productionChanged !== false) failures.push('forbidden mutations recorded');
  if (evidence.result !== 'exactly_one_remote_invocation_accepted_and_all_31_replays_rejected') failures.push('evidence result drift');
  if (readiness.authorization.exactPhraseRequired !== config.authorizationPhrase) failures.push('readiness authorization mismatch');
  if (deploy.deployment.afterVersion !== 10 || deploy.deployment.afterBundleSha256 !== config.target.bundleSha256) failures.push('A07D deployment evidence mismatch');

  for (const required of ['1 HTTP 200 acceptance', '31 HTTP 409 replay rejections', 'expired preexisting test nonce', 'Production, Railway and PR merge remain blocked']) {
    if (!docs.includes(required)) failures.push(`documentation missing: ${required}`);
  }
  if (!workflow.includes('permissions:\n  contents: read')) failures.push('permanent workflow must be read-only');
  if (/contents:\s*write|execute_sql|apply_migration|deploy_edge_function|supabase functions deploy/.test(workflow)) failures.push('permanent workflow contains mutation capability');

  if (failures.length) {
    console.error('ORD-A07E remote replay application audit failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
    return;
  }

  console.log('ORD-A07E remote replay application audit passed.');
}

main();

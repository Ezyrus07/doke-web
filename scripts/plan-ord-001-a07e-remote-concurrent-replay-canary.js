'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config/ord-001-a07e-remote-concurrent-replay-canary-readiness.json');
const APPLICATION_PATH = path.join(ROOT, 'config/ord-001-a07d-edge-function-staging-deploy-application.json');
const AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING';
const PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const BUNDLE_SHA256 = '2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0';
const FUNCTION_VERSION = 10;
const CONCURRENCY = 32;

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function buildPlan() {
  const config = readJson(CONFIG_PATH);
  const application = readJson(APPLICATION_PATH);

  if (config.status !== 'remote_concurrent_replay_canary_readiness_complete_execution_unauthorized') {
    throw new Error('ORD-A07E readiness contract is not frozen.');
  }
  if (application.deployment.afterVersion !== FUNCTION_VERSION
    || application.deployment.afterBundleSha256 !== BUNDLE_SHA256
    || application.deployment.verifyJwtAfter !== false) {
    throw new Error('ORD-A07D staging deployment evidence does not match the remote canary prerequisite.');
  }

  return deepFreeze({
    mode: 'readiness_only_no_network_no_mutation',
    target: {
      environment: 'staging',
      projectId: PROJECT_ID,
      functionName: 'order-event-worker',
      functionVersion: FUNCTION_VERSION,
      bundleSha256: BUNDLE_SHA256,
      verifyJwt: false,
    },
    scenario: {
      concurrency: CONCURRENCY,
      sameIssuedAt: true,
      sameNonce: true,
      source: 'test',
      expected: {
        accepted: 1,
        replayRejected: CONCURRENCY - 1,
        replayStatus: 409,
        replayError: 'DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED',
      },
    },
    cleanup: {
      acceptedRunIdFromResponse: true,
      deleteRunOnlyWhenEmptyCompletedTestRun: true,
      deleteOnlyCanaryNonceHash: true,
      preservePreexistingTestNonce: true,
      restoreBaselineCounts: true,
    },
    authorization: {
      exactPhrase: AUTHORIZATION,
      authorized: false,
      genericContinuationRejected: true,
    },
    capabilities: {
      network: false,
      executeRemoteCanary: false,
      databaseMutation: false,
      deploy: false,
      production: false,
      merge: false,
    },
  });
}

function checkEnvironment() {
  const failures = [];
  if (process.env.ORD_A07E_AUTHORIZATION !== AUTHORIZATION) failures.push('exact authorization phrase is missing');
  if (process.env.ORD_A07E_TARGET_PROJECT_ID !== PROJECT_ID) failures.push('staging project id does not match');
  if (process.env.ORD_A07E_EXPECTED_FUNCTION_VERSION !== String(FUNCTION_VERSION)) failures.push('function version does not match');
  if (process.env.ORD_A07E_EXPECTED_BUNDLE_SHA256 !== BUNDLE_SHA256) failures.push('bundle SHA-256 does not match');
  if (process.env.ORD_A07E_CONCURRENCY !== String(CONCURRENCY)) failures.push('concurrency does not match');
  if ((process.env.ORD_A07E_TARGET_ENVIRONMENT || '').toLowerCase() !== 'staging') failures.push('target must be staging');
  if ((process.env.ORD_A07E_GENERIC_CONTINUATION || '').trim()) failures.push('generic continuation is not authorization');
  if (failures.length) throw new Error(failures.join('; '));
  return deepFreeze({ ok: true, readinessOnly: true, executionAuthorizedByThisPlanner: false });
}

const args = process.argv.slice(2);
const forbidden = ['--execute', '--remote', '--staging', '--production', '--deploy', '--cleanup', '--canary'];
const forbiddenArg = forbidden.find((arg) => args.includes(arg));
if (forbiddenArg) {
  console.error(`ORD-A07E readiness planner does not support ${forbiddenArg}.`);
  process.exitCode = 2;
} else if (args.length !== 1 || !['--dry-run', '--check-env'].includes(args[0])) {
  console.error('Usage: node scripts/plan-ord-001-a07e-remote-concurrent-replay-canary.js --dry-run|--check-env');
  process.exitCode = 2;
} else {
  try {
    const output = args[0] === '--dry-run' ? buildPlan() : checkEnvironment();
    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

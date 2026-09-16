#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const r4n = require('../backend/modules/communities/community-realtime-private-auth-r4n');
const r4o = require('../backend/modules/communities/community-realtime-private-auth-r4o');
const r4p = require('../backend/modules/communities/community-realtime-private-auth-r4p');
const r4q = require('../backend/modules/communities/community-realtime-private-auth-r4q');
const r4pConfig = require('../config/com-b03c-r4p-r4o-fresh-authorization-consumption.json');

const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const r4lExecutor = require('./execute-com-b03c-r4l-single-use-hosted-terminal-status-observation');

const REPORT_PATH = path.resolve(process.env.COM_B03C_R4Q_REPORT_PATH || r4q.REPORT_PATH);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R4Q_REMOTE_FAILURE');
  return Object.freeze({
    code: /^DOKE_COM_B03C_(?:R3Y|R4G|R4J|R4L|R4N|R4O|R4Q)_[A-Z0-9_]+$/.test(raw)
      ? raw
      : 'DOKE_COM_B03C_R4Q_REMOTE_FAILURE',
    phase: r4o.PHASES.includes(error?.phase) ? error.phase : null,
    rawRemoteErrorExposed: false
  });
}

function writeReport(report, reportPath = REPORT_PATH) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function exactChangedFilesFromGit() {
  const parentHead = childProcess.execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  const changedFiles = childProcess.execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' })
    .trim().split(/\n/).filter(Boolean);
  return { parentHead, changedFiles };
}

function readTrigger(triggerPath = r4q.FUTURE_TRIGGER_PATH) {
  if (!fs.existsSync(triggerPath)) fail(r4q.REMOTE_EXECUTION_BLOCK_CODE);
  try { return JSON.parse(fs.readFileSync(triggerPath, 'utf8')); }
  catch { fail('DOKE_COM_B03C_R4Q_TRIGGER_JSON_INVALID'); }
}

function assertAuthorizedExecution({ trigger, parentHead, changedFiles, runAttempt } = {}) {
  const authorization = r4q.authorizeFutureTriggerExecution({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4pConfig.receipt
  });
  if (authorization.decision !== r4q.AUTHORIZED_DECISION) {
    fail(typeof authorization.reason === 'string'
      ? `DOKE_COM_B03C_R4Q_${authorization.reason}`
      : r4q.REMOTE_EXECUTION_BLOCK_CODE);
  }
  return authorization;
}

function prepareRemoteRuntime({ authorization, readCredential, loadDependency } = {}) {
  if (!authorization || authorization.decision !== r4q.AUTHORIZED_DECISION ||
      authorization.executionAttempted !== true || authorization.runAttempt !== 1) {
    fail(r4q.REMOTE_EXECUTION_BLOCK_CODE);
  }
  if (typeof readCredential !== 'function') fail('DOKE_COM_B03C_R4Q_CREDENTIAL_READER_REQUIRED');
  if (typeof loadDependency !== 'function') fail('DOKE_COM_B03C_R4Q_DEPENDENCY_LOADER_REQUIRED');

  const credentialNames = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF'];
  const credentials = Object.fromEntries(credentialNames.map((name) => {
    const value = readCredential(name);
    if (!value) fail(`DOKE_COM_B03C_R4Q_CREDENTIAL_MISSING_${name}`);
    return [name, value];
  }));
  if (credentials.SUPABASE_PROJECT_REF !== r4j.TARGET_STAGING_PROJECT) {
    fail('DOKE_COM_B03C_R4Q_PROJECT_REF_MISMATCH');
  }

  const dependencyNames = ['pg', '@supabase/supabase-js'];
  const dependencies = Object.fromEntries(dependencyNames.map((name) => {
    const value = loadDependency(name);
    if (!value) fail(`DOKE_COM_B03C_R4Q_DEPENDENCY_MISSING_${name}`);
    return [name, value];
  }));
  return { credentials, dependencies };
}

function counterDelta(after, before, key) {
  const value = Number(after?.[key]) - Number(before?.[key]);
  if (!Number.isSafeInteger(value) || value < 0) fail('DOKE_COM_B03C_R4Q_COUNTER_DELTA_INVALID');
  return value;
}

function baseReport({ trigger } = {}) {
  return {
    schema: r4q.REPORT_SCHEMA,
    validationId: 'COM-B03C-R4Q-SINGLE-USE-PHASE-ATTRIBUTED-HOSTED-TERMINAL-OBSERVATION',
    contractId: r4o.CONTRACT_ID,
    executionBoundaryContractId: r4q.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: r4j.TARGET_STAGING_PROJECT,
      branch: r4j.TARGET_BRANCH,
      pullRequest: r4j.TARGET_PR
    },
    phases: [...r4o.PHASES],
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizationEvidenceHead: r4q.AUTHORIZATION_EVIDENCE_HEAD,
    authorizedR4oHead: r4q.AUTHORIZED_R4O_HEAD,
    authorizationReceiptId: r4q.AUTHORIZATION_RECEIPT_ID,
    workflowInstallHead: trigger?.workflowInstallHead || null,
    r3vContractId: r4q.EXECUTION_BINDING.r3vContractId,
    statementFingerprint: r4q.EXECUTION_BINDING.statementFingerprint,
    statementCount: r4q.EXECUTION_BINDING.statementCount,
    ownershipDigest: r4q.EXECUTION_BINDING.ownershipDigest,
    rawOwnershipTokenPersisted: false,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    rawRemoteErrorExposed: false,
    productionChanged: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

async function executeAuthorizedStaging(env = process.env) {
  let trigger = null;
  let connection = null;
  let db = null;
  let identity = null;
  let projectSummary = null;
  let apiKeys = null;
  let accessToken = null;
  let baselinePolicySnapshot = null;
  let baselineCounters = null;
  let terminalCounters = null;
  let terminalOutcome = null;
  let observation = null;
  let primaryFailure = null;
  let cleanupFailure = null;
  let identityCleanupAttempted = false;
  let identityCleanupSucceeded = false;
  let cleanupAttempted = false;
  let residueCounts = null;
  let zeroResidueProven = false;
  let baselineRestored = false;
  let realtimeSubscriptionAttempted = false;
  let instrumentationInstalled = false;
  let presencePolicySwitched = false;

  const recorder = r4n.createPhaseRecorder();
  let primarySnapshot = recorder.snapshot();

  try {
    trigger = readTrigger();
    const gitState = exactChangedFilesFromGit();
    const authorization = assertAuthorizedExecution({
      trigger,
      parentHead: gitState.parentHead,
      changedFiles: gitState.changedFiles,
      runAttempt: Number(env.GITHUB_RUN_ATTEMPT)
    });
    const runtime = prepareRemoteRuntime({
      authorization,
      readCredential: (name) => env[name],
      loadDependency: (name) => require(name)
    });
    const Pool = runtime.dependencies.pg.Pool;
    const createClient = runtime.dependencies['@supabase/supabase-js'].createClient;
    if (typeof Pool !== 'function' || typeof createClient !== 'function') {
      fail('DOKE_COM_B03C_R4Q_REMOTE_DEPENDENCY_SHAPE_INVALID');
    }

    const project = await r4n.runAttributedPhase(recorder, 'project_preflight', () =>
      r3yExecutor.inspectProject(runtime.credentials.SUPABASE_ACCESS_TOKEN));
    projectSummary = { id: project.id, name: project.name, status: project.status, region: project.region };

    apiKeys = await r4n.runAttributedPhase(recorder, 'api_key_discovery', () =>
      r3yExecutor.fetchApiKeys(runtime.credentials.SUPABASE_ACCESS_TOKEN));

    connection = await r4n.runAttributedPhase(recorder, 'database_connect', () =>
      r3yExecutor.connectDatabase(Pool, project, runtime.credentials.SUPABASE_DB_PASSWORD));

    const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: r4q.ownershipTokenForReceipt() });
    if (plan.statementFingerprint !== trigger.statementFingerprint ||
        plan.statementCount !== trigger.statementCount ||
        plan.ownershipDigest !== trigger.ownershipDigest) {
      fail('DOKE_COM_B03C_R4Q_TRIGGER_SQL_BINDING_MISMATCH');
    }
    db = r3vExecutor.buildRestrictedDbExecutionAdapter(connection.client, plan);

    identity = await r4n.runAttributedPhase(recorder, 'synthetic_identity_create', () =>
      r3yExecutor.createSyntheticIdentity({ createClient, secretKey: apiKeys.secretKey }));

    accessToken = await r4n.runAttributedPhase(recorder, 'synthetic_identity_login', () =>
      r3yExecutor.loginSyntheticIdentity({ createClient, publishableKey: apiKeys.publishableKey, identity }));

    baselinePolicySnapshot = await r4n.runAttributedPhase(recorder, 'baseline_policy_snapshot', () =>
      db.snapshotPolicies());

    baselineCounters = await r4n.runAttributedPhase(recorder, 'baseline_counter_read', () =>
      db.readCounters('baseline_before_probe'));

    await r4n.runAttributedPhase(recorder, 'instrumentation_install', async () => {
      await db.installInstrumentation();
      instrumentationInstalled = true;
    });

    await r4n.runAttributedPhase(recorder, 'presence_policy_switch', async () => {
      await db.switchToPresenceOnlyPolicy();
      presencePolicySwitched = true;
    });

    const realtime = r4lExecutor.buildTerminalRealtimeBridge({
      createClient,
      url: `https://${r4j.TARGET_STAGING_PROJECT}.supabase.co`,
      publishableKey: apiKeys.publishableKey,
      timeoutMs: 5000
    });
    terminalOutcome = await r4n.runAttributedPhase(recorder, 'realtime_subscribe', async () => {
      realtimeSubscriptionAttempted = true;
      return realtime.runPresenceOnlyProbe({
        userId: identity.userId,
        accessToken,
        topic: `room:com-b03c-r4q-${identity.nonce}-presence-only`
      });
    });

    observation = await r4n.runAttributedPhase(recorder, 'terminal_observation_build', async () => {
      terminalCounters = await db.readCounters('after_presence_only_join');
      const sanitized = r4j.buildSanitizedTerminalObservation({
        terminalStatus: terminalOutcome.terminalStatus,
        subscribed: terminalOutcome.subscribed,
        sanitizedJoinClassification: terminalOutcome.classification,
        broadcastDelta: counterDelta(terminalCounters, baselineCounters, 'broadcast_rls_evaluations'),
        presenceDelta: counterDelta(terminalCounters, baselineCounters, 'presence_rls_evaluations')
      });
      if (sanitized.decision !== 'terminal_observation_sanitized') {
        fail('DOKE_COM_B03C_R4Q_TERMINAL_OBSERVATION_INVALID');
      }
      return sanitized;
    });

    primarySnapshot = recorder.snapshot();
  } catch (error) {
    primaryFailure = safeFailure(error);
    primarySnapshot = recorder.snapshot();
  } finally {
    if (db) {
      cleanupAttempted = true;
      try {
        await r4n.runAttributedPhase(recorder, 'database_cleanup', async () => {
          await db.cleanup();
          residueCounts = await db.inspectResidue();
          const afterCleanup = await db.snapshotPolicies();
          zeroResidueProven = residueCounts.policyCount === 0 &&
            residueCounts.functionCount === 0 && residueCounts.sequenceCount === 0;
          baselineRestored = baselinePolicySnapshot
            ? r3yExecutor.policiesEqual(baselinePolicySnapshot.rows, afterCleanup.rows)
            : false;
          if (!zeroResidueProven) fail('DOKE_COM_B03C_R4Q_ZERO_RESIDUE_REQUIRED');
          if (baselinePolicySnapshot && !baselineRestored) fail('DOKE_COM_B03C_R4Q_BASELINE_RESTORATION_REQUIRED');
        });
      } catch (error) {
        cleanupFailure = safeFailure(error);
      }
    }

    if (identity?.admin && identity?.userId) {
      identityCleanupAttempted = true;
      try {
        await r4n.runAttributedPhase(recorder, 'synthetic_identity_cleanup', async () => {
          await identity.admin.deleteUser(identity.userId);
          identityCleanupSucceeded = true;
        });
      } catch (error) {
        if (!cleanupFailure) cleanupFailure = safeFailure(error);
      }
    }

    if (connection?.client) { try { connection.client.release(); } catch {} }
    if (connection?.pool) await connection.pool.end().catch(() => {});
  }

  const executionFailure = primaryFailure || cleanupFailure || null;
  const finalSnapshot = recorder.snapshot();
  return {
    ...baseReport({ trigger }),
    phaseRecords: finalSnapshot.records,
    lastSucceededPhase: primarySnapshot.lastSucceededPhase,
    failedPhase: primarySnapshot.failedPhase,
    projectPreflight: projectSummary,
    authorizationConsumed: true,
    triggerCreated: true,
    executionAttempted: true,
    credentialReads: 3,
    dependencyLoads: 2,
    networkAccess: true,
    stagingAccess: true,
    databaseQueryAgainstRemote: Boolean(connection),
    realtimeSubscriptionAttempted,
    authIdentityMutation: Boolean(identity),
    identityCreated: Boolean(identity),
    identityCleanupAttempted,
    identityCleanupSucceeded,
    instrumentationInstalled,
    presencePolicySwitched,
    cleanupAttempted,
    residueCounts,
    zeroResidueProven,
    baselinePolicySnapshotComplete: baselinePolicySnapshot?.complete === true,
    baselineRestored,
    terminalStatus: terminalOutcome?.terminalStatus || null,
    joinSubscribed: terminalOutcome?.subscribed === true,
    sanitizedJoinClassification: terminalOutcome?.classification || null,
    observation,
    executionFailure,
    hostedPhaseAttributedAttemptExecuted: true,
    rawRemoteErrorExposed: false,
    productionChanged: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      authorization: null,
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R4Q_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r4q.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R4Q_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const workflowInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
  const trigger = r4q.buildFutureTriggerDescriptor({
    workflowInstallHead,
    nonce: 'r4q_repository_executor_self_test',
    authorizationReceipt: r4pConfig.receipt
  });
  if (trigger.executionContractId !== r4q.CONTRACT_ID) fail('DOKE_COM_B03C_R4Q_SYNTHETIC_TRIGGER_INVALID');
  const authorization = assertAuthorizedExecution({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4q.FUTURE_TRIGGER_PATH],
    runAttempt: 1
  });
  const runtime = prepareRemoteRuntime({
    authorization,
    readCredential(name) {
      credentialReads += 1;
      return name === 'SUPABASE_PROJECT_REF' ? r4j.TARGET_STAGING_PROJECT : `repository-only-${name.toLowerCase()}`;
    },
    loadDependency(name) {
      dependencyLoads += 1;
      return name === 'pg' ? { Pool: function RepositoryOnlyPool() {} } : { createClient() {} };
    }
  });
  if (Object.keys(runtime.credentials).length !== 3 || Object.keys(runtime.dependencies).length !== 2) {
    fail('DOKE_COM_B03C_R4Q_SYNTHETIC_RUNTIME_SHAPE_INVALID');
  }

  const recorder = r4n.createPhaseRecorder();
  await r4n.runAttributedPhase(recorder, 'synthetic_identity_login', async () => 'repository-token-placeholder');
  await r4n.runAttributedPhase(recorder, 'baseline_policy_snapshot', async () => ({ complete: true, rows: [] }));
  try {
    await r4n.runAttributedPhase(recorder, 'baseline_counter_read', async () => {
      throw new Error('raw repository-only error must not persist');
    });
  } catch (error) {
    if (error.phase !== 'baseline_counter_read' || error.rawRemoteErrorExposed !== false) throw error;
  }
  const snapshot = recorder.snapshot();

  return Object.freeze({
    schema: r4q.REPORT_SCHEMA,
    validationId: 'COM-B03C-R4Q-REPOSITORY-EXECUTOR-SELF-TEST',
    contractId: r4o.CONTRACT_ID,
    executionBoundaryContractId: r4q.CONTRACT_ID,
    status: 'repository_self_test_only',
    phases: [...r4o.PHASES],
    phaseRecords: snapshot.records,
    lastSucceededPhase: snapshot.lastSucceededPhase,
    failedPhase: snapshot.failedPhase,
    authorizationConsumed: false,
    triggerCreated: false,
    executionAttempted: false,
    credentialReads: 0,
    dependencyLoads: 0,
    networkAccess: false,
    stagingAccess: false,
    databaseQueryAgainstRemote: false,
    realtimeSubscriptionAttempted: false,
    authIdentityMutation: false,
    cleanupAttempted: false,
    zeroResidueProven: false,
    rawRemoteErrorExposed: false,
    productionChanged: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  });
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    if (!fs.existsSync(r4q.FUTURE_TRIGGER_PATH)) fail(r4q.REMOTE_EXECUTION_BLOCK_CODE);
    const report = await executeAuthorizedStaging(process.env);
    writeReport(report);
    process.stdout.write(`${JSON.stringify({
      schema: report.schema,
      lastSucceededPhase: report.lastSucceededPhase,
      failedPhase: report.failedPhase,
      terminalStatus: report.terminalStatus,
      zeroResidueProven: report.zeroResidueProven,
      identityCleanupSucceeded: report.identityCleanupSucceeded,
      executionFailure: report.executionFailure?.code || null,
      rawRemoteErrorExposed: false
    })}\n`);
    if (report.executionFailure) process.exitCode = 1;
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4Q_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeFailure,
  writeReport,
  exactChangedFilesFromGit,
  readTrigger,
  assertAuthorizedExecution,
  prepareRemoteRuntime,
  baseReport,
  executeAuthorizedStaging,
  repositorySelfTest
};

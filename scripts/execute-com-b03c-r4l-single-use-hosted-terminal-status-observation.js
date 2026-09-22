#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r4j = require('../backend/modules/communities/community-realtime-private-auth-r4j');
const r4l = require('../backend/modules/communities/community-realtime-private-auth-r4l');
const r4iConfig = require('../config/com-b03c-r4i-r4h-terminal-observation-authorization-consumption.json');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const r4gExecutor = require('./execute-com-b03c-r4g-presence-only-terminal-observation-envelope');

const REPORT_PATH = path.resolve(process.env.COM_B03C_R4L_REPORT_PATH || r4l.REPORT_PATH);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R4L_REMOTE_FAILURE');
  return Object.freeze({
    code: /^DOKE_COM_B03C_(?:R3Y|R4G|R4J|R4L)_[A-Z0-9_]+$/.test(raw)
      ? raw
      : 'DOKE_COM_B03C_R4L_REMOTE_FAILURE',
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

function readTrigger(triggerPath = r4l.FUTURE_TRIGGER_PATH) {
  if (!fs.existsSync(triggerPath)) fail(r4l.REMOTE_EXECUTION_BLOCK_CODE);
  try { return JSON.parse(fs.readFileSync(triggerPath, 'utf8')); }
  catch { fail('DOKE_COM_B03C_R4L_TRIGGER_JSON_INVALID'); }
}

function assertAuthorizedExecution({ trigger, parentHead, changedFiles, runAttempt } = {}) {
  const authorization = r4l.authorizeFutureTriggerExecution({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    hostedWorkflowCertified: true,
    authorizationReceipt: r4iConfig.receipt
  });
  if (authorization.decision !== r4l.AUTHORIZED_DECISION) {
    fail(typeof authorization.reason === 'string'
      ? `DOKE_COM_B03C_R4L_${authorization.reason}`
      : r4l.REMOTE_EXECUTION_BLOCK_CODE);
  }
  return authorization;
}

function prepareRemoteRuntime({ authorization, readCredential, loadDependency } = {}) {
  if (!authorization || authorization.decision !== r4l.AUTHORIZED_DECISION ||
      authorization.executionAttempted !== true || authorization.runAttempt !== 1) {
    fail(r4l.REMOTE_EXECUTION_BLOCK_CODE);
  }
  if (typeof readCredential !== 'function') fail('DOKE_COM_B03C_R4L_CREDENTIAL_READER_REQUIRED');
  if (typeof loadDependency !== 'function') fail('DOKE_COM_B03C_R4L_DEPENDENCY_LOADER_REQUIRED');

  const credentialNames = ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'SUPABASE_PROJECT_REF'];
  const credentials = Object.fromEntries(credentialNames.map((name) => {
    const value = readCredential(name);
    if (!value) fail(`DOKE_COM_B03C_R4L_CREDENTIAL_MISSING_${name}`);
    return [name, value];
  }));
  if (credentials.SUPABASE_PROJECT_REF !== r4j.TARGET_STAGING_PROJECT) {
    fail('DOKE_COM_B03C_R4L_PROJECT_REF_MISMATCH');
  }

  const dependencyNames = ['pg', '@supabase/supabase-js'];
  const dependencies = Object.fromEntries(dependencyNames.map((name) => {
    const value = loadDependency(name);
    if (!value) fail(`DOKE_COM_B03C_R4L_DEPENDENCY_MISSING_${name}`);
    return [name, value];
  }));
  return { credentials, dependencies };
}

function buildTerminalRealtimeBridge({ createClient, url, publishableKey, timeoutMs = 5000 } = {}) {
  if (typeof createClient !== 'function' || !url || !publishableKey) {
    fail('DOKE_COM_B03C_R4L_REALTIME_BRIDGE_CONFIG_REQUIRED');
  }
  return Object.freeze({
    async runPresenceOnlyProbe({ userId, accessToken, topic } = {}) {
      if (!userId || !accessToken || !topic) fail('DOKE_COM_B03C_R4L_PRESENCE_PROBE_INPUT_REQUIRED');
      const client = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      if (!client?.realtime || typeof client.realtime.setAuth !== 'function') {
        fail('DOKE_COM_B03C_R4L_REALTIME_CLIENT_INVALID');
      }
      await client.realtime.setAuth(accessToken);
      let channel = null;
      try {
        channel = client.channel(topic, {
          config: {
            private: true,
            presence: {
              enabled: true,
              key: crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 16)
            }
          }
        });
        channel.on('presence', { event: 'sync' }, () => channel.presenceState());
        return r4gExecutor.observeSubscribeChannel(channel, timeoutMs);
      } finally {
        if (channel && typeof client.removeChannel === 'function') {
          await client.removeChannel(channel).catch(() => {});
        }
      }
    }
  });
}

function counterDelta(after, before, key) {
  const value = Number(after?.[key]) - Number(before?.[key]);
  if (!Number.isSafeInteger(value) || value < 0) fail('DOKE_COM_B03C_R4L_COUNTER_DELTA_INVALID');
  return value;
}

async function executeTerminalObservation({ db, realtime, identityId, accessToken, nonce } = {}) {
  const baselinePolicySnapshot = await db.snapshotPolicies();
  const baselineCounters = await db.readCounters('baseline_before_probe');
  let instrumentationInstalled = false;
  let cleanupAttempted = false;
  let cleanupFailure = null;
  let residueCounts = null;
  let zeroResidueProven = false;
  let baselineRestored = false;
  let terminalCounters = null;
  let outcome = null;
  let observation = null;
  let executionFailure = null;

  try {
    await db.installInstrumentation();
    instrumentationInstalled = true;
    await db.switchToPresenceOnlyPolicy();
    outcome = await realtime.runPresenceOnlyProbe({
      userId: identityId,
      accessToken,
      topic: `room:com-b03c-r4l-${nonce}-presence-only`
    });
    terminalCounters = await db.readCounters('after_presence_only_join');
    observation = r4j.buildSanitizedTerminalObservation({
      terminalStatus: outcome.terminalStatus,
      subscribed: outcome.subscribed,
      sanitizedJoinClassification: outcome.classification,
      broadcastDelta: counterDelta(terminalCounters, baselineCounters, 'broadcast_rls_evaluations'),
      presenceDelta: counterDelta(terminalCounters, baselineCounters, 'presence_rls_evaluations')
    });
    if (observation.decision !== 'terminal_observation_sanitized') {
      fail('DOKE_COM_B03C_R4L_TERMINAL_OBSERVATION_INVALID');
    }
  } catch (error) {
    executionFailure = safeFailure(error);
  } finally {
    cleanupAttempted = true;
    try { await db.cleanup(); }
    catch (error) { cleanupFailure = safeFailure(error); }
    try {
      residueCounts = await db.inspectResidue();
      zeroResidueProven = residueCounts.policyCount === 0 &&
        residueCounts.functionCount === 0 && residueCounts.sequenceCount === 0;
    } catch (error) {
      if (!cleanupFailure) cleanupFailure = safeFailure(error);
    }
    try {
      const afterCleanupPolicySnapshot = await db.snapshotPolicies();
      baselineRestored = r3yExecutor.policiesEqual(
        baselinePolicySnapshot.rows,
        afterCleanupPolicySnapshot.rows
      );
    } catch (error) {
      if (!cleanupFailure) cleanupFailure = safeFailure(error);
    }
  }

  if (!executionFailure && cleanupFailure) executionFailure = cleanupFailure;
  if (!executionFailure && (!zeroResidueProven || !baselineRestored)) {
    executionFailure = safeFailure(new Error(
      zeroResidueProven
        ? 'DOKE_COM_B03C_R4L_BASELINE_RESTORATION_REQUIRED'
        : 'DOKE_COM_B03C_R4L_ZERO_RESIDUE_REQUIRED'
    ));
  }

  return {
    instrumentationInstalled,
    cleanupAttempted,
    cleanupFailure,
    residueCounts,
    zeroResidueProven,
    baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
    baselineRestored,
    terminalCounters,
    terminalOutcome: outcome,
    observation,
    executionFailure
  };
}

function baseReport({ trigger } = {}) {
  return {
    reportSchema: r4l.REPORT_SCHEMA,
    validationId: 'COM-B03C-R4L-SINGLE-USE-HOSTED-TERMINAL-STATUS-OBSERVATION',
    contractId: r4l.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: r4j.TARGET_STAGING_PROJECT,
      branch: r4j.TARGET_BRANCH,
      pullRequest: r4j.TARGET_PR
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizationEvidenceHead: r4l.AUTHORIZATION_EVIDENCE_HEAD,
    authorizationReceiptId: r4l.AUTHORIZATION_RECEIPT_ID,
    workflowInstallHead: trigger?.workflowInstallHead || null,
    r3vContractId: r4l.EXECUTION_BINDING.r3vContractId,
    statementFingerprint: r4l.EXECUTION_BINDING.statementFingerprint,
    statementCount: r4l.EXECUTION_BINDING.statementCount,
    ownershipDigest: r4l.EXECUTION_BINDING.ownershipDigest,
    rawOwnershipTokenPersisted: false,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimePolicyChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  };
}

async function executeAuthorizedStaging(env = process.env) {
  let trigger = null;
  let connection = null;
  let identity = null;
  let identityCleanupAttempted = false;
  let identityCleanupSucceeded = false;
  let projectSummary = null;
  let observation = null;
  let outerFailure = null;

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
      fail('DOKE_COM_B03C_R4L_REMOTE_DEPENDENCY_SHAPE_INVALID');
    }

    const project = await r3yExecutor.inspectProject(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    projectSummary = { id: project.id, name: project.name, status: project.status, region: project.region };
    const apiKeys = await r3yExecutor.fetchApiKeys(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    connection = await r3yExecutor.connectDatabase(Pool, project, runtime.credentials.SUPABASE_DB_PASSWORD);

    const plan = r3v.buildSingleUseExecutionPlan({
      ownershipToken: r4l.ownershipTokenForReceipt()
    });
    if (plan.statementFingerprint !== trigger.statementFingerprint ||
        plan.statementCount !== trigger.statementCount ||
        plan.ownershipDigest !== trigger.ownershipDigest) {
      fail('DOKE_COM_B03C_R4L_TRIGGER_SQL_BINDING_MISMATCH');
    }
    const db = r3vExecutor.buildRestrictedDbExecutionAdapter(connection.client, plan);
    const realtime = buildTerminalRealtimeBridge({
      createClient,
      url: `https://${r4j.TARGET_STAGING_PROJECT}.supabase.co`,
      publishableKey: apiKeys.publishableKey,
      timeoutMs: 5000
    });

    identity = await r3yExecutor.createSyntheticIdentity({ createClient, secretKey: apiKeys.secretKey });
    const accessToken = await r3yExecutor.loginSyntheticIdentity({
      createClient,
      publishableKey: apiKeys.publishableKey,
      identity
    });
    observation = await executeTerminalObservation({
      db,
      realtime,
      identityId: identity.userId,
      accessToken,
      nonce: identity.nonce
    });
  } catch (error) {
    outerFailure = safeFailure(error);
  } finally {
    if (identity?.admin && identity?.userId) {
      identityCleanupAttempted = true;
      try {
        await identity.admin.deleteUser(identity.userId);
        identityCleanupSucceeded = true;
      } catch (error) {
        if (!outerFailure) outerFailure = safeFailure(error);
      }
    }
    if (connection?.client) { try { connection.client.release(); } catch {} }
    if (connection?.pool) await connection.pool.end().catch(() => {});
  }

  const executionFailure = outerFailure || observation?.executionFailure || null;
  return {
    ...baseReport({ trigger }),
    projectPreflight: projectSummary,
    identityCreated: Boolean(identity?.userId),
    identityCleanupAttempted,
    identityCleanupSucceeded,
    instrumentationInstalled: observation?.instrumentationInstalled === true,
    cleanupAttempted: observation?.cleanupAttempted === true,
    cleanupFailure: observation?.cleanupFailure || null,
    residueCounts: observation?.residueCounts || null,
    zeroResidueProven: observation?.zeroResidueProven === true,
    baselinePolicySnapshotComplete: observation?.baselinePolicySnapshotComplete === true,
    baselineRestored: observation?.baselineRestored === true,
    terminalStatus: observation?.terminalOutcome?.terminalStatus || null,
    joinSubscribed: observation?.terminalOutcome?.subscribed === true,
    sanitizedJoinClassification: observation?.terminalOutcome?.classification || null,
    observation: observation?.observation || null,
    executionFailure,
    hostedTerminalObservationExecuted: Boolean(observation?.observation) && !outerFailure,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimePolicyChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
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
    fail('DOKE_COM_B03C_R4L_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r4l.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R4L_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const workflowInstallHead = 'dddddddddddddddddddddddddddddddddddddddd';
  const trigger = r4l.buildFutureTriggerDescriptor({
    workflowInstallHead,
    nonce: 'r4l_repository_executor_self_test',
    hostedWorkflowCertified: true
  });
  const authorization = assertAuthorizedExecution({
    trigger,
    parentHead: workflowInstallHead,
    changedFiles: [r4l.FUTURE_TRIGGER_PATH],
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
    fail('DOKE_COM_B03C_R4L_SYNTHETIC_RUNTIME_SHAPE_INVALID');
  }

  const outcome = await r4gExecutor.observeSubscribeChannel({
    subscribe(callback) { queueMicrotask(() => callback('CHANNEL_ERROR', new Error('policy denied'))); return this; }
  });
  const sanitized = r4j.buildSanitizedTerminalObservation({
    terminalStatus: outcome.terminalStatus,
    subscribed: outcome.subscribed,
    sanitizedJoinClassification: outcome.classification,
    broadcastDelta: 1,
    presenceDelta: 1
  });
  if (sanitized.decision !== 'terminal_observation_sanitized' ||
      sanitized.rawRemoteErrorExposed !== false || sanitized.exactRootCauseProven !== false ||
      sanitized.causalPromotionAllowed !== false) {
    fail('DOKE_COM_B03C_R4L_SANITIZED_TERMINAL_OBSERVATION_INVALID');
  }

  let instrumentationInstalled = false;
  let presenceOnlyPolicyInstalled = false;
  let cleanupExecuted = false;
  const syntheticObservation = await executeTerminalObservation({
    db: {
      async snapshotPolicies() {
        return { complete: true, rows: [{ policyname: 'repository_baseline', roles: ['authenticated'] }] };
      },
      async readCounters(phase) {
        return phase === 'baseline_before_probe'
          ? { phase, broadcast_rls_evaluations: 0, presence_rls_evaluations: 0 }
          : { phase, broadcast_rls_evaluations: 1, presence_rls_evaluations: 1 };
      },
      async installInstrumentation() { instrumentationInstalled = true; },
      async switchToPresenceOnlyPolicy() { presenceOnlyPolicyInstalled = true; },
      async cleanup() { cleanupExecuted = true; },
      async inspectResidue() { return { policyCount: 0, functionCount: 0, sequenceCount: 0 }; }
    },
    realtime: {
      async runPresenceOnlyProbe() {
        return {
          terminalStatus: 'CHANNEL_ERROR',
          subscribed: false,
          classification: 'realtime_rls_authorization_rejected',
          rawRemoteErrorExposed: false
        };
      }
    },
    identityId: 'repository-user',
    accessToken: 'repository-token',
    nonce: 'repository-nonce'
  });
  if (!instrumentationInstalled || !presenceOnlyPolicyInstalled || !cleanupExecuted ||
      syntheticObservation.zeroResidueProven !== true || syntheticObservation.baselineRestored !== true ||
      syntheticObservation.observation?.classification !== 'presence_only_join_rls_rejected_after_both_gates' ||
      syntheticObservation.executionFailure !== null) {
    fail('DOKE_COM_B03C_R4L_SYNTHETIC_EXECUTION_LIFECYCLE_INVALID');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4L-REPOSITORY-EXECUTOR-SELF-TEST',
    contractId: r4l.CONTRACT_ID,
    workflowInstallHeadSeparatedFromAuthorizationEvidenceHead: true,
    triggerContinuityVerified: true,
    terminalStatusPreserved: true,
    sanitizedJoinClassificationVerified: true,
    syntheticExecutionLifecycleVerified: true,
    syntheticZeroResidueProven: true,
    credentialReadsBeforeAuthorization: 0,
    dependencyLoadsBeforeAuthorization: 0,
    credentialReadsAfterSyntheticAuthorization: credentialReads,
    dependencyLoadsAfterSyntheticAuthorization: dependencyLoads,
    triggerCreated: false,
    stagingAccess: false,
    secretsRead: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    authIdentityMutation: false,
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
    if (!fs.existsSync(r4l.FUTURE_TRIGGER_PATH)) fail(r4l.REMOTE_EXECUTION_BLOCK_CODE);
    const report = await executeAuthorizedStaging(process.env);
    writeReport(report);
    process.stdout.write(`${JSON.stringify({
      reportSchema: report.reportSchema,
      terminalStatus: report.terminalStatus,
      classification: report.observation?.classification || null,
      zeroResidueProven: report.zeroResidueProven,
      identityCleanupSucceeded: report.identityCleanupSucceeded,
      executionFailure: report.executionFailure?.code || null,
      rawRemoteErrorExposed: false
    })}\n`);
    if (report.executionFailure) process.exitCode = 1;
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4L_FAILURE')}\n`);
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
  buildTerminalRealtimeBridge,
  executeTerminalObservation,
  baseReport,
  executeAuthorizedStaging,
  repositorySelfTest
};

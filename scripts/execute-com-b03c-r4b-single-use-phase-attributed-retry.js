#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const r4b = require('../backend/modules/communities/community-realtime-private-auth-r4b');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const r3zExecutor = require('./execute-com-b03c-r3z-preinstall-phase-attribution');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');

const REPORT_PATH = path.resolve(
  process.env.COM_B03C_R4B_REPORT_PATH ||
  'reports/generated/COM-B03C-R4B-SINGLE-USE-PHASE-ATTRIBUTED-RETRY.json'
);

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function assertFunction(value, code) { if (typeof value !== 'function') fail(code); }

function safeFailure(error) {
  const code = typeof error?.code === 'string' && /^DOKE_COM_B03C_(?:R3Y|R4B)_[A-Z0-9_]+$/.test(error.code)
    ? error.code
    : 'DOKE_COM_B03C_R4B_REMOTE_FAILURE';
  const failurePhase = r3z.isValidFailureAttribution({ code, failurePhase: error?.failurePhase })
    ? error.failurePhase
    : null;
  return Object.freeze({ code, failurePhase, rawRemoteErrorExposed: false });
}

function writeReport(report, reportPath = REPORT_PATH) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function exactChangedFilesFromGit() {
  const parentHead = childProcess.execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  const changedFiles = childProcess.execFileSync('git', ['diff', '--name-only', 'HEAD^', 'HEAD'], { encoding: 'utf8' }).trim().split(/\n/).filter(Boolean);
  return { parentHead, changedFiles };
}

function readTrigger(triggerPath = r4b.FUTURE_TRIGGER_PATH) {
  if (!fs.existsSync(triggerPath)) fail(r4b.REMOTE_EXECUTION_BLOCK_CODE);
  try { return JSON.parse(fs.readFileSync(triggerPath, 'utf8')); }
  catch { fail('DOKE_COM_B03C_R4B_EXECUTION_TRIGGER_JSON_INVALID'); }
}

function assertAuthorizedExecution({ trigger, parentHead, changedFiles, runAttempt } = {}) {
  const authorizationReceipt = r4b.buildExpectedConsumedReceipt(trigger?.authorizationEvidenceHead);
  const authorized = r4b.authorizeExecution({ trigger, parentHead, changedFiles, runAttempt, authorizationReceipt });
  if (authorized.decision !== r4b.AUTHORIZED_DECISION) {
    fail(typeof authorized.reason === 'string' ? `DOKE_COM_B03C_R4B_${authorized.reason}` : r4b.REMOTE_EXECUTION_BLOCK_CODE);
  }
  return authorized;
}

function prepareRemoteRuntime({ authorization, readCredential, loadDependency } = {}) {
  if (!authorization || authorization.decision !== r4b.AUTHORIZED_DECISION || authorization.executionAttempted !== true || authorization.runAttempt !== 1) {
    fail(r4b.REMOTE_EXECUTION_BLOCK_CODE);
  }
  assertFunction(readCredential, 'DOKE_COM_B03C_R4B_CREDENTIAL_READER_REQUIRED');
  assertFunction(loadDependency, 'DOKE_COM_B03C_R4B_DEPENDENCY_LOADER_REQUIRED');
  const credentials = Object.fromEntries(r3k.CREDENTIAL_NAMES.map((name) => {
    const value = readCredential(name);
    if (!value) fail(`DOKE_COM_B03C_R4B_CREDENTIAL_MISSING_${name}`);
    return [name, value];
  }));
  if (credentials.SUPABASE_PROJECT_REF !== r4b.REQUIRED_PROJECT_ID) fail('DOKE_COM_B03C_R4B_PROJECT_REF_MISMATCH');
  const dependencies = Object.fromEntries(r3k.REMOTE_DEPENDENCIES.map((name) => {
    const value = loadDependency(name);
    if (!value) fail(`DOKE_COM_B03C_R4B_DEPENDENCY_MISSING_${name}`);
    return [name, value];
  }));
  return { credentials, dependencies };
}

function baseReport({ trigger, plan } = {}) {
  return {
    reportSchema: r4b.REPORT_SCHEMA,
    validationId: 'COM-B03C-R4B-SINGLE-USE-PHASE-ATTRIBUTED-RETRY',
    contractId: r4b.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: r4b.REQUIRED_PROJECT_ID,
      projectName: r4b.REQUIRED_PROJECT_NAME,
      branch: r4b.REQUIRED_BRANCH,
      pullRequest: r4b.REQUIRED_PULL_REQUEST
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizationEvidenceHead: trigger?.authorizationEvidenceHead || null,
    authorizationReceiptId: trigger?.authorizationReceiptId || null,
    r4aEvidenceHead: r4b.R4A_EVIDENCE_HEAD,
    r4aTriggerCommit: r4b.R4A_TRIGGER_COMMIT,
    r4aAuthorizationReceiptId: r4b.R4A_AUTHORIZATION_RECEIPT_ID,
    r3zContractId: r3z.CONTRACT_ID,
    phaseSemanticsFingerprint: r4b.R3Z_PHASE_SEMANTICS_FINGERPRINT,
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint: plan?.statementFingerprint || trigger?.statementFingerprint || null,
    statementCount: plan?.statementCount || trigger?.statementCount || null,
    ownershipDigest: plan?.ownershipDigest || trigger?.ownershipDigest || null,
    rawOwnershipTokenPersisted: false,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    rawRemoteErrorExposed: false,
    historicalR3yFailurePhaseProven: false,
    historicalR3yFailureReclassified: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimePolicyChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  };
}

async function executeAuthorizedStaging(env = process.env) {
  let trigger = null;
  let authorization = null;
  let plan = null;
  let projectSummary = null;
  let connection = null;
  let identity = null;
  let identityCleanupAttempted = false;
  let identityCleanupSucceeded = false;
  let observation = null;
  let outerFailure = null;

  try {
    trigger = readTrigger();
    const gitState = exactChangedFilesFromGit();
    authorization = assertAuthorizedExecution({
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
    if (typeof Pool !== 'function' || typeof createClient !== 'function') fail('DOKE_COM_B03C_R4B_REMOTE_DEPENDENCY_SHAPE_INVALID');

    const project = await r3yExecutor.inspectProject(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    projectSummary = { id: project.id, name: project.name, status: project.status, region: project.region };
    const apiKeys = await r3yExecutor.fetchApiKeys(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    connection = await r3yExecutor.connectDatabase(Pool, project, runtime.credentials.SUPABASE_DB_PASSWORD);

    plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: r4b.ownershipTokenForReceipt(trigger.authorizationReceiptId) });
    if (plan.statementFingerprint !== trigger.statementFingerprint || plan.statementCount !== trigger.statementCount || plan.ownershipDigest !== trigger.ownershipDigest) {
      fail('DOKE_COM_B03C_R4B_TRIGGER_SQL_BINDING_MISMATCH');
    }

    const db = r3vExecutor.buildRestrictedDbExecutionAdapter(connection.client, plan);
    const realtime = r3vExecutor.buildPresenceAwareRealtimeBridge({
      createClient,
      url: `https://${r4b.REQUIRED_PROJECT_ID}.supabase.co`,
      publishableKey: apiKeys.publishableKey,
      presenceTimeoutMs: 3000
    });

    identity = await r3yExecutor.createSyntheticIdentity({ createClient, secretKey: apiKeys.secretKey });
    const accessToken = await r3zExecutor.loginSyntheticIdentityPhaseAttributed({
      createClient,
      publishableKey: apiKeys.publishableKey,
      identity
    });

    observation = await r3zExecutor.executeTwoProbeObservationPhaseAttributed({
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
    ...baseReport({ trigger, plan }),
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
    classification: observation?.result?.classification || null,
    observation: observation?.result?.observation || null,
    deltas: observation?.result?.deltas || null,
    executionFailure,
    failurePhase: executionFailure?.failurePhase || null,
    hostedRuntimeObservationExecuted: Boolean(observation?.result) && !outerFailure,
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
    fail('DOKE_COM_B03C_R4B_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r4b.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) fail('DOKE_COM_B03C_R4B_PREAUTH_SIDE_EFFECT_DETECTED');

  const head = '1111111111111111111111111111111111111111';
  const received = r4b.evaluateExplicitExecutionAuthorization({
    certifiedLifecycleHead: head,
    authorizationPhrase: r4b.buildAuthorizationPhrase(head),
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r4b.REQUIRED_PROJECT_ID,
    branch: r4b.REQUIRED_BRANCH,
    pullRequest: r4b.REQUIRED_PULL_REQUEST
  });
  const consumed = r4b.consumeExecutionAuthorizationForTrigger(received);
  const trigger = r4b.buildFutureExecutionTriggerDescriptor({ certifiedLifecycleHead: head, authorizationReceiptId: consumed.authorizationReceiptId });
  const authorization = r4b.authorizeExecution({
    trigger,
    parentHead: head,
    changedFiles: [r4b.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  if (authorization.decision !== r4b.AUTHORIZED_DECISION) fail('DOKE_COM_B03C_R4B_REPOSITORY_AUTHORIZATION_PATH_INVALID');

  const fakeRuntime = prepareRemoteRuntime({
    authorization,
    readCredential(name) {
      credentialReads += 1;
      return name === 'SUPABASE_PROJECT_REF' ? r4b.REQUIRED_PROJECT_ID : `repository-only-${name.toLowerCase()}`;
    },
    loadDependency(name) {
      dependencyLoads += 1;
      return name === 'pg' ? { Pool: function RepositoryOnlyPool() {} } : { createClient() {} };
    }
  });
  if (Object.keys(fakeRuntime.credentials).length !== r3k.CREDENTIAL_NAMES.length || Object.keys(fakeRuntime.dependencies).length !== r3k.REMOTE_DEPENDENCIES.length) {
    fail('DOKE_COM_B03C_R4B_POSTAUTH_RUNTIME_SHAPE_INVALID');
  }

  const r3zSelfTest = await r3zExecutor.repositorySelfTest();
  const r3ySelfTest = await r3yExecutor.repositorySelfTest();
  if (!r3zSelfTest.loginPhaseAttributionVerified || !r3zSelfTest.baselinePolicyPhaseAttributionVerified || !r3zSelfTest.baselineCounterPhaseAttributionVerified) {
    fail('DOKE_COM_B03C_R4B_R3Z_PHASE_ATTRIBUTION_INVALID');
  }
  if (r3ySelfTest.r3vZeroResidueProven !== true || r3ySelfTest.r3vFailureCleanupVerified !== true) {
    fail('DOKE_COM_B03C_R4B_R3Y_EXECUTION_MECHANICS_INVALID');
  }

  return Object.freeze({
    validationId: 'COM-B03C-R4B-REPOSITORY-SELF-TEST',
    contractId: r4b.CONTRACT_ID,
    freshExecutionAuthorizationLifecycleVerified: true,
    r4aAuthorizationReusable: false,
    r3zThreePhaseAttributionVerified: true,
    r3yExecutionMechanicsReused: true,
    r3vZeroResidueMechanicsVerified: true,
    credentialReadsBeforeAuthorization: 0,
    dependencyLoadsBeforeAuthorization: 0,
    credentialReadsAfterSyntheticAuthorization: credentialReads,
    dependencyLoadsAfterSyntheticAuthorization: dependencyLoads,
    stagingAccess: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    remoteClientInstantiated: false,
    authorizationPlaintextPersisted: false,
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
    if (!fs.existsSync(r4b.FUTURE_TRIGGER_PATH)) fail(r4b.REMOTE_EXECUTION_BLOCK_CODE);
    const report = await executeAuthorizedStaging(process.env);
    writeReport(report);
    process.stdout.write(`${JSON.stringify({
      reportSchema: report.reportSchema,
      classification: report.classification,
      failurePhase: report.failurePhase,
      zeroResidueProven: report.zeroResidueProven,
      identityCleanupSucceeded: report.identityCleanupSucceeded,
      executionFailure: report.executionFailure?.code || null,
      rawRemoteErrorExposed: false
    })}\n`);
    if (report.executionFailure) process.exitCode = 1;
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4B_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeFailure, writeReport, exactChangedFilesFromGit, readTrigger,
  assertAuthorizedExecution, prepareRemoteRuntime, baseReport,
  executeAuthorizedStaging, repositorySelfTest
};

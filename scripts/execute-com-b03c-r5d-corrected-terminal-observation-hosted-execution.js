#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const boundary = require('../backend/modules/communities/community-realtime-private-auth-r5d-hosted-execution');
const r5d = require('../backend/modules/communities/community-realtime-private-auth-r5d');
const r5h = require('../backend/modules/communities/community-realtime-private-auth-r5h');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const {
  buildCorrectedTerminalRealtimeBridge
} = require('./build-com-b03c-r4z-corrected-terminal-realtime-bridge');

const REPORT_PATH = path.resolve(
  process.env.COM_B03C_R5D_HOSTED_REPORT_PATH ||
  'reports/generated/COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION.json'
);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R5D_HOSTED_REMOTE_FAILURE');
  return Object.freeze({
    code: /^DOKE_COM_B03C_(?:R3Y|R4G|R4Z|R5D)_HOSTED_[A-Z0-9_]+$/.test(raw) ||
          /^DOKE_COM_B03C_(?:R3Y|R4G|R4Z|R5D)_[A-Z0-9_]+$/.test(raw)
      ? raw
      : 'DOKE_COM_B03C_R5D_HOSTED_REMOTE_FAILURE',
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

function readJson(file, code) {
  if (!fs.existsSync(file)) fail(code);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    fail(`${code}_JSON_INVALID`);
  }
}

function assertAuthorizedExecution({ receipt, parentHead, changedFiles, runAttempt } = {}) {
  const authorization = boundary.authorizeExecution({
    receipt,
    parentHead,
    changedFiles,
    runAttempt,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (authorization.decision !== boundary.AUTHORIZED_DECISION) {
    fail(
      typeof authorization.reason === 'string'
        ? `DOKE_COM_B03C_R5D_HOSTED_${authorization.reason}`
        : 'DOKE_COM_B03C_R5D_HOSTED_REMOTE_EXECUTION_NOT_AUTHORIZED'
    );
  }
  return authorization;
}

function prepareRemoteRuntime({ authorization, readCredential, loadDependency } = {}) {
  if (
    !authorization ||
    authorization.decision !== boundary.AUTHORIZED_DECISION ||
    authorization.executionAttempted !== true ||
    authorization.remoteExecutionAuthority !== true
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_REMOTE_EXECUTION_NOT_AUTHORIZED');
  }
  if (typeof readCredential !== 'function') {
    fail('DOKE_COM_B03C_R5D_HOSTED_CREDENTIAL_READER_REQUIRED');
  }
  if (typeof loadDependency !== 'function') {
    fail('DOKE_COM_B03C_R5D_HOSTED_DEPENDENCY_LOADER_REQUIRED');
  }

  const credentialNames = [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_PROJECT_REF'
  ];
  const credentials = Object.fromEntries(credentialNames.map((name) => {
    const value = readCredential(name);
    if (!value) fail(`DOKE_COM_B03C_R5D_HOSTED_CREDENTIAL_MISSING_${name}`);
    return [name, value];
  }));
  if (credentials.SUPABASE_PROJECT_REF !== boundary.TARGET_STAGING_PROJECT) {
    fail('DOKE_COM_B03C_R5D_HOSTED_PROJECT_REF_MISMATCH');
  }

  const dependencyNames = ['pg', '@supabase/supabase-js'];
  const dependencies = Object.fromEntries(dependencyNames.map((name) => {
    const value = loadDependency(name);
    if (!value) fail(`DOKE_COM_B03C_R5D_HOSTED_DEPENDENCY_MISSING_${name}`);
    return [name, value];
  }));
  return { credentials, dependencies };
}

async function readIdentityResidue(client, userId) {
  const result = await client.query(
    `select
       (select count(*)::int from auth.users where id = $1::uuid) as auth_users,
       (select count(*)::int from public.users where id = $1::uuid) as public_users,
       (select count(*)::int from public.user_profiles where user_id = $1::uuid) as user_profiles,
       (select count(*)::int from public.client_profiles where user_id = $1::uuid) as client_profiles`,
    [userId]
  );
  const row = result.rows?.[0] || {};
  return Object.freeze({
    authUsers: Number(row.auth_users || 0),
    publicUsers: Number(row.public_users || 0),
    userProfiles: Number(row.user_profiles || 0),
    clientProfiles: Number(row.client_profiles || 0)
  });
}

function residueIsZero(residue) {
  return residue &&
    residue.authUsers === 0 &&
    residue.publicUsers === 0 &&
    residue.userProfiles === 0 &&
    residue.clientProfiles === 0;
}

function baseReport({ receipt } = {}) {
  return {
    schema: boundary.REPORT_SCHEMA,
    validationId: 'COM-B03C-R5D-CORRECTED-TERMINAL-OBSERVATION-HOSTED-EXECUTION',
    executionBoundaryContractId: boundary.CONTRACT_ID,
    r5dContractId: r5d.CONTRACT_ID,
    r5hContractId: r5h.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: boundary.TARGET_STAGING_PROJECT,
      branch: boundary.TARGET_BRANCH,
      pullRequest: boundary.TARGET_PR
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizedBoundaryHead: receipt?.authorizedHead || null,
    executionAuthorizationReceiptId: receipt?.authorizationReceiptId || null,
    r5hCertifiedHead: boundary.R5H_CERTIFIED_HEAD,
    r5dCertifiedHead: boundary.R5D_CERTIFIED_HEAD,
    r5fAuthorizationReceiptId: boundary.R5F_RECEIPT_ID,
    frozenTriggerPath: boundary.TRIGGER_PATH,
    frozenTriggerBlob: boundary.TRIGGER_BLOB,
    correctedBridgeBlob: boundary.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    authorizationPlaintextPersisted: false,
    credentialValuesPersisted: false,
    rawAccessTokenPersisted: false,
    rawIdentityPersisted: false,
    rawRemoteErrorExposed: false,
    runtimeChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

async function executeAuthorizedStaging(env = process.env) {
  const receipt = readJson(
    boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH,
    'DOKE_COM_B03C_R5D_HOSTED_EXECUTION_AUTHORIZATION_RECEIPT_REQUIRED'
  );
  const frozenTrigger = readJson(
    boundary.TRIGGER_PATH,
    'DOKE_COM_B03C_R5D_HOSTED_FROZEN_TRIGGER_REQUIRED'
  );
  if (
    frozenTrigger.contractId !== r5d.CONTRACT_ID ||
    frozenTrigger.r5dCertifiedHead !== boundary.R5D_CERTIFIED_HEAD ||
    frozenTrigger.r5fAuthorizationReceiptId !== boundary.R5F_RECEIPT_ID ||
    frozenTrigger.correctedBridgeSemanticsFingerprint !== boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT ||
    frozenTrigger.singleUse !== true ||
    frozenTrigger.reusableAfterFailure !== false
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_FROZEN_TRIGGER_STATE_INVALID');
  }

  const gitState = exactChangedFilesFromGit();
  const authorization = assertAuthorizedExecution({
    receipt,
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
    fail('DOKE_COM_B03C_R5D_HOSTED_REMOTE_DEPENDENCY_SHAPE_INVALID');
  }

  let connection = null;
  let identity = null;
  let projectSummary = null;
  let terminalOutcome = null;
  let trace = [];
  let identityCleanupAttempted = false;
  let identityCleanupSucceeded = false;
  let residueCounts = null;
  let zeroResidueProven = false;
  let executionFailure = null;
  let realtimeSubscriptionAttempted = false;

  try {
    const project = await r3yExecutor.inspectProject(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    if (project.id !== boundary.TARGET_STAGING_PROJECT) {
      fail('DOKE_COM_B03C_R5D_HOSTED_PROJECT_PREFLIGHT_MISMATCH');
    }
    projectSummary = {
      id: project.id,
      status: project.status,
      region: project.region
    };

    const apiKeys = await r3yExecutor.fetchApiKeys(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    connection = await r3yExecutor.connectDatabase(
      Pool,
      project,
      runtime.credentials.SUPABASE_DB_PASSWORD
    );

    identity = await r3yExecutor.createSyntheticIdentity({
      createClient,
      secretKey: apiKeys.secretKey
    });
    const accessToken = await r3yExecutor.loginSyntheticIdentity({
      createClient,
      publishableKey: apiKeys.publishableKey,
      identity
    });

    const bridge = buildCorrectedTerminalRealtimeBridge({
      createClient,
      url: `https://${boundary.TARGET_STAGING_PROJECT}.supabase.co`,
      publishableKey: apiKeys.publishableKey,
      timeoutMs: 5000,
      trace(event) {
        trace.push(event);
      }
    });

    realtimeSubscriptionAttempted = true;
    terminalOutcome = await bridge.runPresenceOnlyProbe({
      userId: identity.userId,
      accessToken,
      topic: `room:com-b03c-r5d-${identity.nonce}-corrected-terminal`
    });

    if (
      !terminalOutcome ||
      terminalOutcome.rawRemoteErrorExposed !== false ||
      !['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED', 'UNKNOWN'].includes(terminalOutcome.terminalStatus)
    ) {
      fail('DOKE_COM_B03C_R5D_HOSTED_TERMINAL_OUTCOME_INVALID');
    }
    if (
      JSON.stringify(trace) !==
      JSON.stringify(['observation_started', 'observation_settled', 'cleanup_started', 'cleanup_finished'])
    ) {
      fail('DOKE_COM_B03C_R5D_HOSTED_CORRECTED_BRIDGE_TRACE_INVALID');
    }
  } catch (error) {
    executionFailure = safeFailure(error);
  } finally {
    if (identity?.admin && identity?.userId) {
      identityCleanupAttempted = true;
      try {
        await identity.admin.deleteUser(identity.userId);
        identityCleanupSucceeded = true;
      } catch (error) {
        if (!executionFailure) executionFailure = safeFailure(error);
      }
    }

    if (connection?.client && identity?.userId) {
      try {
        residueCounts = await readIdentityResidue(connection.client, identity.userId);
        zeroResidueProven = residueIsZero(residueCounts);
        if (!zeroResidueProven && !executionFailure) {
          executionFailure = safeFailure(
            Object.assign(new Error('DOKE_COM_B03C_R5D_HOSTED_IDENTITY_RESIDUE_DETECTED'), {
              code: 'DOKE_COM_B03C_R5D_HOSTED_IDENTITY_RESIDUE_DETECTED'
            })
          );
        }
      } catch (error) {
        if (!executionFailure) executionFailure = safeFailure(error);
      }
    }

    if (connection?.client) {
      try { connection.client.release(); } catch {}
    }
    if (connection?.pool) {
      await connection.pool.end().catch(() => {});
    }
  }

  return {
    ...baseReport({ receipt }),
    projectPreflight: projectSummary,
    executionAuthorizationConsumed: true,
    triggerCreated: true,
    triggerCertified: true,
    executionAttempted: true,
    credentialReads: 3,
    dependencyLoads: 2,
    networkAccess: true,
    stagingReadAccess: true,
    stagingMutationAccess: Boolean(identity),
    databaseQueryAgainstRemote: Boolean(connection),
    realtimeSubscriptionAttempted,
    authIdentityMutation: Boolean(identity),
    identityCreated: Boolean(identity?.userId),
    identityCleanupAttempted,
    identityCleanupSucceeded,
    residueCounts,
    zeroResidueProven,
    correctedBridgeTrace: trace,
    terminalStatus: terminalOutcome?.terminalStatus || null,
    joinSubscribed: terminalOutcome?.subscribed === true,
    sanitizedJoinClassification: terminalOutcome?.classification || null,
    executionFailure,
    correctedTerminalObservationExecuted: Boolean(terminalOutcome) && !executionFailure,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimeChangeExecuted: false,
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
      readCredential() {
        credentialReads += 1;
        return 'forbidden';
      },
      loadDependency() {
        dependencyLoads += 1;
        return {};
      }
    });
    fail('DOKE_COM_B03C_R5D_HOSTED_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== 'DOKE_COM_B03C_R5D_HOSTED_REMOTE_EXECUTION_NOT_AUTHORIZED') {
      throw error;
    }
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R5D_HOSTED_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const head = '1111111111111111111111111111111111111111';
  const receipt = boundary.buildConsumedExecutionAuthorizationReceipt({
    certifiedBoundaryHead: head
  });
  const authorization = boundary.authorizeExecution({
    receipt,
    parentHead: head,
    changedFiles: [boundary.FUTURE_EXECUTION_AUTHORIZATION_RECEIPT_PATH],
    runAttempt: 1,
    triggerBlob: boundary.TRIGGER_BLOB
  });
  if (authorization.decision !== boundary.AUTHORIZED_DECISION) {
    fail('DOKE_COM_B03C_R5D_HOSTED_SYNTHETIC_AUTHORIZATION_INVALID');
  }

  const runtime = prepareRemoteRuntime({
    authorization,
    readCredential(name) {
      credentialReads += 1;
      return name === 'SUPABASE_PROJECT_REF'
        ? boundary.TARGET_STAGING_PROJECT
        : `repository-only-${name.toLowerCase()}`;
    },
    loadDependency(name) {
      dependencyLoads += 1;
      return name === 'pg'
        ? { Pool: function RepositoryOnlyPool() {} }
        : { createClient() {} };
    }
  });
  if (
    Object.keys(runtime.credentials).length !== 3 ||
    Object.keys(runtime.dependencies).length !== 2
  ) {
    fail('DOKE_COM_B03C_R5D_HOSTED_POSTAUTH_RUNTIME_SHAPE_INVALID');
  }

  return {
    validationId: 'COM-B03C-R5D-HOSTED-EXECUTION-REPOSITORY-SELF-TEST',
    contractId: boundary.CONTRACT_ID,
    correctedBridgeBlob: boundary.CORRECTED_BRIDGE_BLOB,
    correctedBridgeSemanticsFingerprint: boundary.CORRECTED_BRIDGE_SEMANTICS_FINGERPRINT,
    credentialReadsBeforeAuthorization: 0,
    dependencyLoadsBeforeAuthorization: 0,
    credentialReadsAfterSyntheticAuthorization: credentialReads,
    dependencyLoadsAfterSyntheticAuthorization: dependencyLoads,
    remoteClientInstantiated: false,
    networkAccess: false,
    stagingAccess: false,
    authIdentityMutation: false,
    realtimeSubscriptionAgainstRemote: false,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    const report = await executeAuthorizedStaging(process.env);
    writeReport(report);
    process.stdout.write(`${JSON.stringify({
      schema: report.schema,
      terminalStatus: report.terminalStatus,
      joinSubscribed: report.joinSubscribed,
      sanitizedJoinClassification: report.sanitizedJoinClassification,
      identityCleanupSucceeded: report.identityCleanupSucceeded,
      zeroResidueProven: report.zeroResidueProven,
      executionFailure: report.executionFailure?.code || null,
      rawRemoteErrorExposed: false
    })}\n`);
    if (report.executionFailure) process.exitCode = 1;
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R5D_HOSTED_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeFailure,
  writeReport,
  exactChangedFilesFromGit,
  readJson,
  assertAuthorizedExecution,
  prepareRemoteRuntime,
  readIdentityResidue,
  residueIsZero,
  baseReport,
  executeAuthorizedStaging,
  repositorySelfTest
};

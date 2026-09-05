#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const r3y = require('../backend/modules/communities/community-realtime-private-auth-r3y');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3p = require('../backend/modules/communities/community-realtime-private-auth-r3p');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');

const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');

const REPORT_PATH = path.resolve(
  process.env.COM_B03C_R3Y_REPORT_PATH ||
    'reports/generated/COM-B03C-R3Y-SINGLE-USE-HOSTED-RUNTIME-OBSERVATION.json'
);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertFunction(value, code) {
  if (typeof value !== 'function') fail(code);
}

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3Y_REMOTE_FAILURE');
  const code = /^DOKE_COM_B03C_R3Y_[A-Z0-9_]+$/.test(raw)
    ? raw
    : 'DOKE_COM_B03C_R3Y_REMOTE_FAILURE';
  return Object.freeze({ code, rawRemoteErrorExposed: false });
}

function writeReport(report, reportPath = REPORT_PATH) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function exactChangedFilesFromGit() {
  const parentHead = childProcess.execFileSync(
    'git',
    ['rev-parse', 'HEAD^'],
    { encoding: 'utf8' }
  ).trim();
  const changedFiles = childProcess.execFileSync(
    'git',
    ['diff', '--name-only', 'HEAD^', 'HEAD'],
    { encoding: 'utf8' }
  ).trim().split(/\n/).filter(Boolean);
  return { parentHead, changedFiles };
}

function readTrigger(triggerPath = r3y.FUTURE_TRIGGER_PATH) {
  if (!fs.existsSync(triggerPath)) fail(r3y.REMOTE_EXECUTION_BLOCK_CODE);
  let trigger;
  try {
    trigger = JSON.parse(fs.readFileSync(triggerPath, 'utf8'));
  } catch {
    fail('DOKE_COM_B03C_R3Y_TRIGGER_JSON_INVALID');
  }
  return trigger;
}

function assertAuthorizedExecution({
  trigger,
  parentHead,
  changedFiles,
  runAttempt
} = {}) {
  const authorizationReceipt = r3y.buildExpectedConsumedReceipt(
    trigger?.authorizationEvidenceHead
  );
  const authorized = r3y.authorizeExecution({
    trigger,
    parentHead,
    changedFiles,
    runAttempt,
    authorizationReceipt
  });
  if (authorized.decision !== r3y.AUTHORIZED_DECISION) {
    fail(
      typeof authorized.reason === 'string'
        ? `DOKE_COM_B03C_R3Y_${authorized.reason}`
        : r3y.REMOTE_EXECUTION_BLOCK_CODE
    );
  }
  return authorized;
}

function prepareRemoteRuntime({
  authorization,
  readCredential,
  loadDependency
} = {}) {
  if (
    !authorization ||
    authorization.decision !== r3y.AUTHORIZED_DECISION ||
    authorization.executionAttempted !== true ||
    authorization.runAttempt !== 1
  ) {
    fail(r3y.REMOTE_EXECUTION_BLOCK_CODE);
  }

  assertFunction(
    readCredential,
    'DOKE_COM_B03C_R3Y_CREDENTIAL_READER_REQUIRED'
  );
  assertFunction(
    loadDependency,
    'DOKE_COM_B03C_R3Y_DEPENDENCY_LOADER_REQUIRED'
  );

  const credentials = Object.fromEntries(
    r3k.CREDENTIAL_NAMES.map((name) => {
      const value = readCredential(name);
      if (!value) fail(`DOKE_COM_B03C_R3Y_CREDENTIAL_MISSING_${name}`);
      return [name, value];
    })
  );
  if (credentials.SUPABASE_PROJECT_REF !== r3y.REQUIRED_PROJECT_ID) {
    fail('DOKE_COM_B03C_R3Y_PROJECT_REF_MISMATCH');
  }

  const dependencies = Object.fromEntries(
    r3k.REMOTE_DEPENDENCIES.map((name) => {
      const value = loadDependency(name);
      if (!value) fail(`DOKE_COM_B03C_R3Y_DEPENDENCY_MISSING_${name}`);
      return [name, value];
    })
  );

  return { credentials, dependencies };
}

async function fetchJson(url, options, code) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    fail(code);
  }
  if (!response?.ok) fail(code);
  try {
    return await response.json();
  } catch {
    fail(code);
  }
}

async function inspectProject(accessToken) {
  const management = r3gExecutor.buildManagementAdapter({
    fetchImpl: fetch,
    accessToken
  });
  const project = await management.inspectProject();
  return {
    id: project.id,
    name: project.name,
    status: project.status,
    region: String(project.region || '').toLowerCase(),
    directHost: project.directHost || null
  };
}

async function fetchApiKeys(accessToken) {
  const data = await fetchJson(
    `https://api.supabase.com/v1/projects/${r3y.REQUIRED_PROJECT_ID}/api-keys?reveal=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json'
      }
    },
    'DOKE_COM_B03C_R3Y_API_KEY_DISCOVERY_FAILED'
  );
  const rows = Array.isArray(data) ? data : (data?.data || []);
  const value = (entry) =>
    String(entry?.api_key || entry?.key || entry?.value || '').trim();
  const label = (entry) =>
    `${entry?.name || ''} ${entry?.type || ''} ${entry?.id || ''}`.toLowerCase();

  const publishableKey = value(
    rows.find((entry) =>
      label(entry).includes('publishable') || label(entry).includes('anon')
    )
  );
  const secretKey = value(
    rows.find((entry) =>
      label(entry).includes('secret') ||
      label(entry).includes('service_role') ||
      value(entry).startsWith('sb_secret_')
    )
  );

  if (!publishableKey || !secretKey || publishableKey === secretKey) {
    fail('DOKE_COM_B03C_R3Y_API_KEY_BOUNDARY_FAILED');
  }
  return { publishableKey, secretKey };
}

async function connectDatabase(Pool, project, password) {
  const hosts = [
    `aws-0-${project.region}.pooler.supabase.com`,
    `aws-1-${project.region}.pooler.supabase.com`,
    project.directHost
  ].filter(Boolean);

  for (const host of [...new Set(hosts)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host,
      port: 5432,
      user: direct ? 'postgres' : `postgres.${r3y.REQUIRED_PROJECT_ID}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 1000,
      application_name: 'doke-com-b03c-r3y'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client };
    } catch {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_COM_B03C_R3Y_DATABASE_CONNECTION_FAILED');
}

async function createSyntheticIdentity({ createClient, secretKey }) {
  const admin = r3gExecutor.buildSupabaseAdminAdapter({
    createClient,
    url: `https://${r3y.REQUIRED_PROJECT_ID}.supabase.co`,
    secretKey
  });
  const nonce = crypto.randomBytes(12).toString('hex');
  const email = `com-b03c-r3y-${nonce}@doke.invalid`;
  const password = `${crypto.randomBytes(32).toString('base64url')}Aa1!`;
  const user = await admin.createUser({
    email,
    password,
    purpose: 'com-b03c-r3y-hosted-runtime-observation'
  });
  return {
    admin,
    userId: user.id,
    email,
    password,
    nonce
  };
}

async function loginSyntheticIdentity({
  createClient,
  publishableKey,
  identity
}) {
  const client = createClient(
    `https://${r3y.REQUIRED_PROJECT_ID}.supabase.co`,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    }
  );
  const result = await client.auth.signInWithPassword({
    email: identity.email,
    password: identity.password
  });
  if (
    result?.error ||
    result?.data?.user?.id !== identity.userId ||
    !result?.data?.session?.access_token
  ) {
    fail('DOKE_COM_B03C_R3Y_EPHEMERAL_LOGIN_FAILED');
  }
  return result.data.session.access_token;
}

function normalizePolicyRows(rows) {
  return [...(rows || [])]
    .map((row) => ({
      policyname: String(row.policyname || ''),
      permissive: String(row.permissive || ''),
      roles: Array.isArray(row.roles) ? [...row.roles].map(String).sort() : [],
      cmd: String(row.cmd || ''),
      qual: row.qual == null ? null : String(row.qual),
      with_check: row.with_check == null ? null : String(row.with_check)
    }))
    .sort((a, b) =>
      `${a.policyname}:${a.cmd}`.localeCompare(`${b.policyname}:${b.cmd}`)
    );
}

function policiesEqual(left, right) {
  return JSON.stringify(normalizePolicyRows(left)) ===
    JSON.stringify(normalizePolicyRows(right));
}

function buildObservationInput({
  identityId,
  accessToken,
  nonce
}) {
  const tokenFingerprint = crypto
    .createHash('sha256')
    .update(accessToken)
    .digest('hex');
  return {
    identityId,
    anchorIdentityId: identityId,
    presenceOnlyIdentityId: identityId,
    tokenFingerprint,
    anchorTokenFingerprint: tokenFingerprint,
    presenceOnlyTokenFingerprint: tokenFingerprint,
    anchorClientId: `r3y-anchor-${nonce}`,
    presenceOnlyClientId: `r3y-presence-only-${nonce}`,
    anchorTopic: `room:com-b03c-r3y-${nonce}-anchor`,
    presenceOnlyTopic: `room:com-b03c-r3y-${nonce}-presence-only`,
    privateChannel: true,
    presenceExplicitlyEnabled: true,
    presenceListenerRegisteredBeforeSubscribe: true
  };
}

async function executeTwoProbeObservation({
  db,
  realtime,
  identityId,
  accessToken,
  nonce
}) {
  const observationInput = buildObservationInput({
    identityId,
    accessToken,
    nonce
  });

  const baselinePolicySnapshot = await db.snapshotPolicies();
  const baselineCounters = await db.readCounters('baseline_before_probe');

  let instrumentationInstalled = false;
  let cleanupAttempted = false;
  let cleanupFailure = null;
  let residueCounts = null;
  let zeroResidueProven = false;
  let afterCleanupPolicySnapshot = null;
  let baselineRestored = false;

  let afterAnchorCounters = null;
  let afterPresenceOnlyCounters = null;
  let afterCleanupCounters = null;
  let anchorResult = null;
  let presenceOnlyResult = null;
  let observationFailure = null;

  try {
    await db.installInstrumentation();
    instrumentationInstalled = true;

    anchorResult = await realtime.runProbe({
      userId: identityId,
      accessToken,
      topic: observationInput.anchorTopic,
      requirePresenceState: true
    });

    afterAnchorCounters =
      await db.readCounters('after_presence_read_effective_gate');

    await db.switchToPresenceOnlyPolicy();

    presenceOnlyResult = await realtime.runProbe({
      userId: identityId,
      accessToken,
      topic: observationInput.presenceOnlyTopic,
      requirePresenceState: false
    });

    afterPresenceOnlyCounters =
      await db.readCounters('after_presence_only_join');
  } catch (error) {
    observationFailure = safeFailure(error);
  } finally {
    cleanupAttempted = true;
    try {
      await db.cleanup();
    } catch (error) {
      cleanupFailure = safeFailure(error);
    }

    try {
      afterCleanupCounters = await db.readCounters('after_cleanup');
    } catch (error) {
      if (!cleanupFailure) cleanupFailure = safeFailure(error);
    }

    try {
      residueCounts = await db.inspectResidue();
      zeroResidueProven =
        residueCounts.policyCount === 0 &&
        residueCounts.functionCount === 0 &&
        residueCounts.sequenceCount === 0;
    } catch (error) {
      if (!cleanupFailure) cleanupFailure = safeFailure(error);
    }

    try {
      afterCleanupPolicySnapshot = await db.snapshotPolicies();
      baselineRestored = policiesEqual(
        baselinePolicySnapshot.rows,
        afterCleanupPolicySnapshot.rows
      );
    } catch (error) {
      if (!cleanupFailure) cleanupFailure = safeFailure(error);
    }
  }

  if (observationFailure) {
    return {
      instrumentationInstalled,
      cleanupAttempted,
      cleanupFailure,
      residueCounts,
      zeroResidueProven,
      baselineRestored,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      result: null,
      executionFailure: observationFailure
    };
  }

  if (cleanupFailure) {
    return {
      instrumentationInstalled,
      cleanupAttempted,
      cleanupFailure,
      residueCounts,
      zeroResidueProven,
      baselineRestored,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      result: null,
      executionFailure: cleanupFailure
    };
  }

  if (
    !afterAnchorCounters ||
    !afterPresenceOnlyCounters ||
    !afterCleanupCounters ||
    !anchorResult ||
    !presenceOnlyResult
  ) {
    return {
      instrumentationInstalled,
      cleanupAttempted,
      cleanupFailure,
      residueCounts,
      zeroResidueProven,
      baselineRestored,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      result: null,
      executionFailure: safeFailure(
        new Error('DOKE_COM_B03C_R3Y_OBSERVATION_INCOMPLETE')
      )
    };
  }

  if (!zeroResidueProven || !baselineRestored) {
    return {
      instrumentationInstalled,
      cleanupAttempted,
      cleanupFailure,
      residueCounts,
      zeroResidueProven,
      baselineRestored,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      result: null,
      executionFailure: safeFailure(
        new Error(
          !zeroResidueProven
            ? 'DOKE_COM_B03C_R3Y_ZERO_RESIDUE_REQUIRED'
            : 'DOKE_COM_B03C_R3Y_BASELINE_POLICY_RESTORATION_REQUIRED'
        )
      )
    };
  }

  let result;
  try {
    result = r3p.runSyntheticObservationHarness({
      ...observationInput,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      baselinePolicyImmutableDuringHarness: baselineRestored,
      snapshots: {
        baseline_before_probe: baselineCounters,
        after_presence_read_effective_gate: afterAnchorCounters,
        after_presence_only_join: afterPresenceOnlyCounters,
        after_cleanup: afterCleanupCounters
      },
      anchorJoinSubscribed: anchorResult.joinSubscribed === true,
      anchorPresenceStateObserved: anchorResult.presenceStateObserved === true,
      presenceOnlyJoinSubscribed: presenceOnlyResult.joinSubscribed === true,
      cleanupComplete: cleanupAttempted,
      zeroResidueProven
    });
  } catch (error) {
    return {
      instrumentationInstalled,
      cleanupAttempted,
      cleanupFailure,
      residueCounts,
      zeroResidueProven,
      baselineRestored,
      baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
      result: null,
      executionFailure: safeFailure(error)
    };
  }

  return {
    instrumentationInstalled,
    cleanupAttempted,
    cleanupFailure,
    residueCounts,
    zeroResidueProven,
    baselineRestored,
    baselinePolicySnapshotComplete: baselinePolicySnapshot.complete === true,
    result,
    executionFailure: null
  };
}

function baseReport({
  trigger,
  authorization,
  plan
} = {}) {
  return {
    reportSchema: r3y.REPORT_SCHEMA,
    validationId: 'COM-B03C-R3Y-SINGLE-USE-HOSTED-RUNTIME-OBSERVATION',
    contractId: r3y.CONTRACT_ID,
    target: {
      environment: 'staging',
      projectId: r3y.REQUIRED_PROJECT_ID,
      projectName: r3y.REQUIRED_PROJECT_NAME,
      branch: r3y.REQUIRED_BRANCH,
      pullRequest: r3y.REQUIRED_PULL_REQUEST
    },
    singleUse: true,
    reusableAfterFailure: false,
    runAttempt: 1,
    authorizationEvidenceHead:
      trigger?.authorizationEvidenceHead || authorization?.authorizationEvidenceHead || null,
    authorizationReceiptId:
      trigger?.authorizationReceiptId || authorization?.authorizationReceiptId || null,
    r3vContractId: r3v.CONTRACT_ID,
    statementFingerprint:
      plan?.statementFingerprint || trigger?.statementFingerprint || null,
    statementCount:
      plan?.statementCount || trigger?.statementCount || null,
    ownershipDigest:
      plan?.ownershipDigest || trigger?.ownershipDigest || null,
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
    const createClient =
      runtime.dependencies['@supabase/supabase-js'].createClient;
    if (typeof Pool !== 'function' || typeof createClient !== 'function') {
      fail('DOKE_COM_B03C_R3Y_REMOTE_DEPENDENCY_SHAPE_INVALID');
    }

    const project = await inspectProject(
      runtime.credentials.SUPABASE_ACCESS_TOKEN
    );
    projectSummary = {
      id: project.id,
      name: project.name,
      status: project.status,
      region: project.region
    };

    const apiKeys = await fetchApiKeys(
      runtime.credentials.SUPABASE_ACCESS_TOKEN
    );

    connection = await connectDatabase(
      Pool,
      project,
      runtime.credentials.SUPABASE_DB_PASSWORD
    );

    plan = r3v.buildSingleUseExecutionPlan({
      ownershipToken: r3y.ownershipTokenForReceipt(
        trigger.authorizationReceiptId
      )
    });
    if (
      plan.statementFingerprint !== trigger.statementFingerprint ||
      plan.statementCount !== trigger.statementCount ||
      plan.ownershipDigest !== trigger.ownershipDigest
    ) {
      fail('DOKE_COM_B03C_R3Y_TRIGGER_SQL_BINDING_MISMATCH');
    }

    const db = r3vExecutor.buildRestrictedDbExecutionAdapter(
      connection.client,
      plan
    );
    const realtime = r3vExecutor.buildPresenceAwareRealtimeBridge({
      createClient,
      url: `https://${r3y.REQUIRED_PROJECT_ID}.supabase.co`,
      publishableKey: apiKeys.publishableKey,
      presenceTimeoutMs: 3000
    });

    identity = await createSyntheticIdentity({
      createClient,
      secretKey: apiKeys.secretKey
    });
    const accessToken = await loginSyntheticIdentity({
      createClient,
      publishableKey: apiKeys.publishableKey,
      identity
    });

    observation = await executeTwoProbeObservation({
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
    if (connection?.client) {
      try {
        connection.client.release();
      } catch {}
    }
    if (connection?.pool) {
      await connection.pool.end().catch(() => {});
    }
  }

  const report = {
    ...baseReport({ trigger, authorization, plan }),
    projectPreflight: projectSummary,
    identityCreated: Boolean(identity?.userId),
    identityCleanupAttempted,
    identityCleanupSucceeded,
    instrumentationInstalled: observation?.instrumentationInstalled === true,
    cleanupAttempted: observation?.cleanupAttempted === true,
    cleanupFailure: observation?.cleanupFailure || null,
    residueCounts: observation?.residueCounts || null,
    zeroResidueProven: observation?.zeroResidueProven === true,
    baselinePolicySnapshotComplete:
      observation?.baselinePolicySnapshotComplete === true,
    baselineRestored: observation?.baselineRestored === true,
    classification: observation?.result?.classification || null,
    observation: observation?.result?.observation || null,
    deltas: observation?.result?.deltas || null,
    executionFailure:
      outerFailure || observation?.executionFailure || null,
    hostedRuntimeObservationExecuted:
      Boolean(observation?.result) && !outerFailure,
    rawRemoteErrorExposed: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimePolicyChangeExecuted: false,
    productionExecuted: false,
    mergeExecuted: false
  };

  return report;
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
    fail('DOKE_COM_B03C_R3Y_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3y.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R3Y_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const sampleHead = '1111111111111111111111111111111111111111';
  const received = r3y.evaluateExplicitAuthorization({
    certifiedLifecycleHead: sampleHead,
    authorizationPhrase: r3y.buildAuthorizationPhrase(sampleHead),
    authorizationConsumed: false,
    executionAttempted: false,
    targetEnvironment: 'staging',
    projectId: r3y.REQUIRED_PROJECT_ID,
    branch: r3y.REQUIRED_BRANCH,
    pullRequest: r3y.REQUIRED_PULL_REQUEST
  });
  const consumed = r3y.consumeAuthorizationForTrigger(received);
  const trigger = r3y.buildFutureTriggerDescriptor({
    certifiedLifecycleHead: sampleHead,
    authorizationReceiptId: consumed.authorizationReceiptId
  });
  const authorization = r3y.authorizeExecution({
    trigger,
    parentHead: sampleHead,
    changedFiles: [r3y.FUTURE_TRIGGER_PATH],
    runAttempt: 1,
    authorizationReceipt: consumed
  });
  if (authorization.decision !== r3y.AUTHORIZED_DECISION) {
    fail('DOKE_COM_B03C_R3Y_REPOSITORY_AUTHORIZATION_PATH_INVALID');
  }

  const fakeRuntime = prepareRemoteRuntime({
    authorization,
    readCredential(name) {
      credentialReads += 1;
      return name === 'SUPABASE_PROJECT_REF'
        ? r3y.REQUIRED_PROJECT_ID
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
    Object.keys(fakeRuntime.credentials).length !== r3k.CREDENTIAL_NAMES.length ||
    Object.keys(fakeRuntime.dependencies).length !== r3k.REMOTE_DEPENDENCIES.length
  ) {
    fail('DOKE_COM_B03C_R3Y_POSTAUTH_RUNTIME_SHAPE_INVALID');
  }

  const r3vSelfTest = await r3vExecutor.repositorySelfTest();
  if (
    r3vSelfTest.zeroResidueProven !== true ||
    r3vSelfTest.failureCleanupVerified !== true ||
    r3vSelfTest.credentialReadsBeforeAuthorization !== 0 ||
    r3vSelfTest.dependencyLoadsBeforeAuthorization !== 0
  ) {
    fail('DOKE_COM_B03C_R3Y_R3V_EXECUTION_MECHANICS_INVALID');
  }

  return {
    validationId: 'COM-B03C-R3Y-REPOSITORY-SELF-TEST',
    contractId: r3y.CONTRACT_ID,
    freshAuthorizationLifecycleVerified: true,
    triggerSingleFileShapeVerified: true,
    exactR3vSqlBindingVerified:
      trigger.statementFingerprint ===
        r3y.buildExecutionBinding(trigger.authorizationReceiptId)
          .statementFingerprint,
    credentialReadsBeforeAuthorization: 0,
    dependencyLoadsBeforeAuthorization: 0,
    credentialReadsAfterSyntheticAuthorization: credentialReads,
    dependencyLoadsAfterSyntheticAuthorization: dependencyLoads,
    r3vRepositoryClassification: r3vSelfTest.classification,
    r3vFailureCleanupVerified: r3vSelfTest.failureCleanupVerified,
    r3vZeroResidueProven: r3vSelfTest.zeroResidueProven,
    stagingAccess: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    remoteClientInstantiated: false,
    authorizationPlaintextPersisted: false,
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

    if (!fs.existsSync(r3y.FUTURE_TRIGGER_PATH)) {
      fail(r3y.REMOTE_EXECUTION_BLOCK_CODE);
    }

    const report = await executeAuthorizedStaging(process.env);
    writeReport(report);
    process.stdout.write(`${JSON.stringify({
      reportSchema: report.reportSchema,
      classification: report.classification,
      zeroResidueProven: report.zeroResidueProven,
      baselineRestored: report.baselineRestored,
      identityCleanupSucceeded: report.identityCleanupSucceeded,
      executionFailure: report.executionFailure?.code || null,
      rawRemoteErrorExposed: false
    })}\n`);

    if (report.executionFailure) process.exitCode = 1;
  })().catch((error) => {
    process.stderr.write(
      `${String(error?.code || error?.message || 'DOKE_COM_B03C_R3Y_FAILURE')}\n`
    );
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
  inspectProject,
  fetchApiKeys,
  connectDatabase,
  createSyntheticIdentity,
  loginSyntheticIdentity,
  normalizePolicyRows,
  policiesEqual,
  buildObservationInput,
  executeTwoProbeObservation,
  baseReport,
  executeAuthorizedStaging,
  repositorySelfTest
};

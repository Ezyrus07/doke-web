#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3h = require('../backend/modules/communities/community-realtime-private-auth-r3h');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');

const REPO = 'Ezyrus07/doke-web';
const REPORT_PATH = path.resolve(process.env.COM_B03C_R3H_REPORT_PATH || 'reports/generated/COM-B03C-R3H-CASE-TIME-POLICY-SNAPSHOT-PRESENCE-STAGING.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function exact(actual, expected, code) {
  if (actual !== expected) fail(code);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function safeRemoteFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3H_UNEXPECTED_FAILURE');
  const code = /^DOKE_COM_B03C_R3H_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3H_UNEXPECTED_FAILURE';
  return { code, message: code, rawRemoteErrorExposed: false };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

function readTrigger() {
  if (!fs.existsSync(r3h.TRIGGER_PATH)) fail('DOKE_COM_B03C_R3H_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(r3h.TRIGGER_PATH, 'utf8'));
}

function assertAuthorizationBoundary(env) {
  if (env.COM_B03C_R3H_AUTHORIZATION !== r3h.REQUIRED_AUTHORIZATION_PHRASE) {
    fail(r3h.STAGING_AUTHORIZATION_BLOCK_CODE);
  }
  exact(String(env.GITHUB_RUN_ATTEMPT || ''), '1', 'DOKE_COM_B03C_R3H_WORKFLOW_RERUN_BLOCKED');
  const trigger = readTrigger();
  exact(trigger.contractId, r3h.TRIGGER_CONTRACT_ID, 'DOKE_COM_B03C_R3H_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03C_R3H_TRIGGER_NOT_PENDING');
  for (const [key, value] of [
    ['phrase', r3h.REQUIRED_AUTHORIZATION_PHRASE],
    ['received', true],
    ['consumed', true],
    ['executionAttempted', true],
    ['singleUse', true],
    ['reusableAfterFailure', false],
    ['predecessorAuthorizationReusable', false]
  ]) exact(trigger.authorization?.[key], value, 'DOKE_COM_B03C_R3H_AUTHORIZATION_BOUNDARY_FAILED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03C_R3H_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || '')) || trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03C_R3H_EXECUTION_HEAD_INVALID');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03C_R3H_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, r3h.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3H_PROJECT_MISMATCH');
  exact(trigger.target?.branch, r3h.REQUIRED_BRANCH, 'DOKE_COM_B03C_R3H_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, r3h.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03C_R3H_PR_MISMATCH');
  const authorization = r3h.evaluateStagingAuthorization({
    authorizationPhrase: trigger.authorization.phrase,
    targetEnvironment: trigger.target.environment,
    projectId: trigger.target.projectId,
    branch: trigger.target.branch,
    pullRequest: trigger.target.pullRequest,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    authorizationConsumed: false,
    executionAttempted: false,
    predecessorAuthorizationReusable: false,
    ...trigger.canary
  });
  exact(authorization.decision, 'authorized_for_single_bounded_ephemeral_policy_identity_presence_diagnostic', 'DOKE_COM_B03C_R3H_CONTRACT_AUTHORIZATION_REJECTED');
  return trigger;
}

function validateAuthorizedCredentials(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03C_R3H_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03C_R3H_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, r3h.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3H_ENV_PROJECT_MISMATCH');
  if (env.DOKE_STAGING_CLIENT_PASSWORD) fail('DOKE_COM_B03C_R3H_SHARED_CANARY_CREDENTIAL_PROHIBITED');
}

function loadDependencies() {
  const { Pool } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  return { Pool, createClient };
}

async function fetchJson(url, options, code) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    fail(code);
  }
  if (!response.ok) fail(code);
  try {
    return await response.json();
  } catch {
    fail(code);
  }
}

async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03c-r3h' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pr = await fetchJson(`https://api.github.com/repos/${REPO}/pulls/${r3h.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03C_R3H_PR_PREFLIGHT_FAILED');
  exact(pr.state, 'open', 'DOKE_COM_B03C_R3H_PR_NOT_OPEN');
  exact(pr.draft, true, 'DOKE_COM_B03C_R3H_PR_NOT_DRAFT');
  exact(pr.merged, false, 'DOKE_COM_B03C_R3H_PR_ALREADY_MERGED');
  exact(pr.auto_merge, null, 'DOKE_COM_B03C_R3H_AUTO_MERGE_ENABLED');
  exact(pr.head?.ref, r3h.REQUIRED_BRANCH, 'DOKE_COM_B03C_R3H_PR_BRANCH_MISMATCH');
  exact(pr.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03C_R3H_PR_SHA_MISMATCH');
  return { number: pr.number, state: pr.state, draft: pr.draft, merged: pr.merged, headSha: pr.head.sha, installHead: trigger.workflowInstallHead };
}

async function inspectProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${r3h.REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json' }
  }, 'DOKE_COM_B03C_R3H_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, r3h.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3H_PROJECT_ID_MISMATCH');
  exact(project.name, r3h.REQUIRED_PROJECT_NAME, 'DOKE_COM_B03C_R3H_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03C_R3H_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03C_R3H_PROJECT_REGION_INVALID');
  return { id: project.id, name: project.name, status: project.status, region, directHost: project.database?.host || null };
}

async function fetchApiKeys(env) {
  const response = await fetchJson(`https://api.supabase.com/v1/projects/${r3h.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json' }
  }, 'DOKE_COM_B03C_R3H_API_KEYS_PREFLIGHT_FAILED');
  const keys = Array.isArray(response) ? response : (response?.data || []);
  const value = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
  const label = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
  const publishableKey = value(keys.find((item) => label(item).includes('publishable') || label(item).includes('anon')));
  const secretKey = value(keys.find((item) => label(item).includes('secret') || label(item).includes('service_role') || value(item).startsWith('sb_secret_')));
  if (!publishableKey || !secretKey || publishableKey === secretKey) fail('DOKE_COM_B03C_R3H_API_KEY_BOUNDARY_FAILED');
  return { publishableKey, secretKey };
}

async function connectDatabase(Pool, project, password) {
  const hosts = [...new Set([
    `aws-0-${project.region}.pooler.supabase.com`,
    `aws-1-${project.region}.pooler.supabase.com`,
    project.directHost
  ].filter(Boolean))];
  for (const host of hosts) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host,
      port: 5432,
      user: direct ? 'postgres' : `postgres.${r3h.REQUIRED_PROJECT_ID}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 1000,
      application_name: 'doke-com-b03c-r3h'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_COM_B03C_R3H_DATABASE_CONNECTION_FAILED');
}

async function verifyFoundation(client) {
  const result = await client.query(`select
    to_regclass('realtime.messages') is not null messages_present,
    to_regprocedure('realtime.topic()') is not null topic_function_present,
    (select relrowsecurity from pg_class where oid=to_regclass('realtime.messages')) messages_rls_enabled`);
  const row = result.rows[0] || {};
  if (row.messages_present !== true || row.topic_function_present !== true || row.messages_rls_enabled !== true) {
    fail('DOKE_COM_B03C_R3H_REALTIME_FOUNDATION_FAILED');
  }
  return row;
}

async function createSyntheticIdentity({ client, rawAdmin, nonce }) {
  const email = `${r3h.AUTH_EMAIL_PREFIX}${nonce}${r3h.AUTH_EMAIL_SUFFIX}`;
  const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  const created = await rawAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'client', name: 'COM-B03C-R3H Canary', purpose: r3h.AUTH_USER_PURPOSE }
  });
  if (created.error || !created.data?.user?.id) fail('DOKE_COM_B03C_R3H_EPHEMERAL_AUTH_CREATE_FAILED');
  const userId = created.data.user.id;
  const materialized = await client.query(`select
    exists(select 1 from public.users where id=$1::uuid) users_present,
    exists(select 1 from public.user_profiles where user_id=$1::uuid) user_profile_present,
    exists(select 1 from public.client_profiles where user_id=$1::uuid) client_profile_present`, [userId]);
  const row = materialized.rows[0] || {};
  if (!row.users_present || !row.user_profile_present || !row.client_profile_present) {
    await rawAdmin.auth.admin.deleteUser(userId, false).catch(() => {});
    fail('DOKE_COM_B03C_R3H_CANONICAL_ACCOUNT_MATERIALIZATION_REQUIRED');
  }
  return { userId, email, password };
}

async function loginSyntheticIdentity({ createClient, publishableKey, identity }) {
  const authClient = createClient(`https://${r3h.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const result = await authClient.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || !result.data?.session?.access_token || result.data?.user?.id !== identity.userId) {
    fail('DOKE_COM_B03C_R3H_EPHEMERAL_LOGIN_FAILED');
  }
  const accessToken = result.data.session.access_token;
  const verified = await authClient.auth.getUser(accessToken);
  if (verified.error || verified.data?.user?.id !== identity.userId) fail('DOKE_COM_B03C_R3H_SERVER_VERIFIED_SESSION_REQUIRED');
  return { accessToken };
}

function expectedDescriptors(definitions) {
  const select = definitions.find((item) => item.cmd === 'SELECT');
  const insert = definitions.find((item) => item.cmd === 'INSERT');
  return {
    selectPolicyName: select.policyname,
    insertPolicyName: insert.policyname,
    selectPredicate: select.expression
  };
}

function assertPreSubscribeStructuralGate({ caseId, beforeCase, installed, definitions }) {
  const provisional = r3e.evaluateCaseEvidence({
    caseId,
    beforeCase,
    afterInstallBeforeSubscribe: installed,
    afterCleanup: beforeCase,
    expectedPolicies: expectedDescriptors(definitions)
  });
  if (provisional.evidenceComplete !== true) fail('DOKE_COM_B03C_R3H_PRE_SUBSCRIBE_STRUCTURAL_GATE_FAILED');
  return provisional;
}

async function executeCase({ db, realtime, caseId, context }) {
  const nonce = context.nonceForCase(caseId);
  const definitions = r3f.buildPolicyDefinitions(caseId, {
    userId: context.userId,
    topic: context.topic,
    nonce
  });
  let client = null;
  let join = { subscribed: false, classification: 'not_attempted', rawRemoteErrorExposed: false };
  let beforeCase = [];
  let installed = [];
  let afterCleanup = [];
  let provisional = null;
  let executionFailure = null;

  beforeCase = r3e.normalizeInventory(await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase: 'before_case' }));
  try {
    await db.install({ definitions, statements: r3f.buildInstallStatements(definitions) });
    installed = r3e.normalizeInventory(await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase: 'after_install_before_subscribe' }));
    provisional = assertPreSubscribeStructuralGate({ caseId, beforeCase, installed, definitions });
    client = await realtime.createClient({
      caseId,
      userId: context.userId,
      accessToken: context.accessToken,
      topic: context.topic
    });
    join = await client.subscribePresenceReadJoin();
  } catch (error) {
    executionFailure = safeRemoteFailure(error);
  } finally {
    if (client && typeof client.remove === 'function') await client.remove().catch(() => {});
    await db.drop({ definitions, statements: r3f.buildDropStatements(definitions) }).catch(() => {});
    afterCleanup = r3e.normalizeInventory(await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase: 'after_cleanup' }));
  }

  const structuralEvidence = r3e.evaluateCaseEvidence({
    caseId,
    beforeCase,
    afterInstallBeforeSubscribe: installed,
    afterCleanup,
    expectedPolicies: expectedDescriptors(definitions)
  });
  return {
    caseId,
    expectedPolicies: {
      ...expectedDescriptors(definitions),
      insertPredicate: 'true'
    },
    snapshots: {
      before_case: beforeCase,
      after_install_before_subscribe: installed,
      after_cleanup: afterCleanup
    },
    provisionalPreSubscribeStructuralGate: provisional?.evidenceComplete === true,
    structuralEvidence,
    join: {
      subscribed: join?.subscribed === true,
      classification: String(join?.classification || 'unspecified'),
      rawRemoteErrorExposed: false
    },
    executionFailure,
    rawRemoteErrorExposed: false,
    predicateSemanticsProvenByTextComparison: false,
    joinOutcomeCanPromoteCausality: false,
    exactRootCauseProven: false
  };
}

async function executeCaseMatrix({ db, realtime, context }) {
  const results = [];
  for (const caseId of r3h.CASE_IDS) {
    const result = await executeCase({ db, realtime, caseId, context });
    results.push(result);
    if (result.structuralEvidence.evidenceComplete !== true) fail('DOKE_COM_B03C_R3H_CASE_EVIDENCE_INCOMPLETE');
    if (result.executionFailure) fail(result.executionFailure.code);
  }
  return results;
}

async function identityResidue({ client, rawAdmin, userId }) {
  const rows = await client.query(`select
    (select count(*)::int from public.users where id=$1::uuid) users,
    (select count(*)::int from public.user_profiles where user_id=$1::uuid) user_profiles,
    (select count(*)::int from public.client_profiles where user_id=$1::uuid) client_profiles`, [userId]);
  const row = rows.rows[0] || {};
  const auth = await rawAdmin.auth.admin.getUserById(userId);
  return Number(row.users || 0) + Number(row.user_profiles || 0) + Number(row.client_profiles || 0) + (auth.data?.user?.id === userId ? 1 : 0);
}

async function policyResidue(client) {
  const result = await client.query(`select count(*)::int count
    from pg_policies
    where schemaname='realtime'
      and tablename='messages'
      and left(policyname, length($1)) = $1`, [r3h.POLICY_PREFIX]);
  return Number(result.rows[0]?.count || 0);
}

async function repositorySelfTest() {
  const userId = '11111111-1111-4111-8111-111111111111';
  const topic = 'room:repository-only-r3h';
  const caseResults = r3h.CASE_IDS.map((caseId) => {
    const definitions = r3f.buildPolicyDefinitions(caseId, {
      userId,
      topic,
      nonce: hash(`r3h:${caseId}`).slice(0, 12)
    });
    const installed = definitions.map((item) => ({
      policyname: item.policyname,
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: item.cmd,
      qual: item.cmd === 'SELECT' ? item.expression : null,
      with_check: item.cmd === 'INSERT' ? item.expression : null
    }));
    const structuralEvidence = r3e.evaluateCaseEvidence({
      caseId,
      beforeCase: [],
      afterInstallBeforeSubscribe: installed,
      afterCleanup: [],
      expectedPolicies: expectedDescriptors(definitions)
    });
    return {
      caseId,
      expectedPolicies: { ...expectedDescriptors(definitions), insertPredicate: 'true' },
      snapshots: { before_case: [], after_install_before_subscribe: r3e.normalizeInventory(installed), after_cleanup: [] },
      provisionalPreSubscribeStructuralGate: structuralEvidence.evidenceComplete === true,
      structuralEvidence,
      join: {
        subscribed: caseId !== 'negative_control',
        classification: caseId === 'negative_control' ? 'realtime_rls_authorization_rejected' : 'synthetic_repository_join',
        rawRemoteErrorExposed: false
      },
      executionFailure: null,
      rawRemoteErrorExposed: false,
      predicateSemanticsProvenByTextComparison: false,
      joinOutcomeCanPromoteCausality: false,
      exactRootCauseProven: false
    };
  });
  return {
    validationId: r3h.REPORT_VALIDATION_ID,
    contractId: r3h.CONTRACT_ID,
    environment: 'repository-self-test',
    runAttempt: 0,
    caseCount: caseResults.length,
    caseIds: caseResults.map((item) => item.caseId),
    sameIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    negativeControlPassed: true,
    caseResults,
    cleanup: {
      temporaryPolicyResidue: 0,
      syntheticIdentityResidue: 0,
      zeroResidueProven: true
    },
    remoteEffects: {
      stagingAccessExecuted: false,
      remoteCredentialReadExecuted: false,
      remoteDependencyLoadExecuted: false,
      authIdentityMutationExecuted: false,
      realtimePolicyMutationExecuted: false,
      realtimeSubscriptionExecuted: false
    },
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    productionAuthority: false,
    mergeAuthority: false,
    rawRemoteErrorExposed: false
  };
}

async function executeAuthorizedStaging(env = process.env) {
  const trigger = assertAuthorizationBoundary(env);
  validateAuthorizedCredentials(env);
  const { Pool, createClient } = loadDependencies();
  const pr = await verifyPullRequest(env, trigger);
  const project = await inspectProject(env);
  const keys = await fetchApiKeys(env);
  const connection = await connectDatabase(Pool, project, env.SUPABASE_DB_PASSWORD);
  const db = r3gExecutor.buildPgDbAdapter(connection.client);
  const realtime = r3gExecutor.buildSupabaseRealtimeAdapter({
    createClient,
    url: `https://${r3h.REQUIRED_PROJECT_ID}.supabase.co`,
    publishableKey: keys.publishableKey
  });
  const rawAdmin = createClient(`https://${r3h.REQUIRED_PROJECT_ID}.supabase.co`, keys.secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  let identity = null;
  let caseResults = [];
  let initialCatalog = [];
  let finalCatalog = [];
  let executionFailure = null;
  let cleanup = { temporaryPolicyResidue: null, syntheticIdentityResidue: null, zeroResidueProven: false };

  try {
    await verifyFoundation(connection.client);
    initialCatalog = r3e.normalizeInventory(await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase: 'initial_global_baseline' }));
    const nonce = crypto.randomBytes(10).toString('hex');
    identity = await createSyntheticIdentity({ client: connection.client, rawAdmin, nonce });
    const login = await loginSyntheticIdentity({ createClient, publishableKey: keys.publishableKey, identity });
    const topic = `room:com-b03c-r3h-${nonce}`;
    caseResults = await executeCaseMatrix({
      db,
      realtime,
      context: {
        userId: identity.userId,
        accessToken: login.accessToken,
        topic,
        nonceForCase: (caseId) => hash(`${nonce}:${caseId}`).slice(0, 12)
      }
    });
  } catch (error) {
    executionFailure = safeRemoteFailure(error);
  } finally {
    if (identity) await rawAdmin.auth.admin.deleteUser(identity.userId, false).catch(() => {});
    try {
      finalCatalog = r3e.normalizeInventory(await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase: 'final_global_baseline' }));
      cleanup.temporaryPolicyResidue = await policyResidue(connection.client);
      cleanup.syntheticIdentityResidue = identity ? await identityResidue({ client: connection.client, rawAdmin, userId: identity.userId }) : 0;
      cleanup.zeroResidueProven =
        cleanup.temporaryPolicyResidue === 0 &&
        cleanup.syntheticIdentityResidue === 0 &&
        r3e.inventoryFingerprint(initialCatalog) === r3e.inventoryFingerprint(finalCatalog);
    } catch (error) {
      if (!executionFailure) executionFailure = safeRemoteFailure(error);
    }
    connection.client.release();
    await connection.pool.end().catch(() => {});
  }

  const negative = caseResults.find((item) => item.caseId === 'negative_control');
  const report = {
    validationId: r3h.REPORT_VALIDATION_ID,
    contractId: r3h.CONTRACT_ID,
    environment: 'staging',
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    authorization: {
      singleUse: true,
      consumed: true,
      reusableAfterFailure: false,
      predecessorAuthorizationReusable: false
    },
    target: {
      projectId: r3h.REQUIRED_PROJECT_ID,
      branch: r3h.REQUIRED_BRANCH,
      pullRequest: r3h.REQUIRED_PULL_REQUEST
    },
    pr,
    project: { id: project.id, name: project.name, status: project.status, region: project.region },
    caseCount: caseResults.length,
    caseIds: caseResults.map((item) => item.caseId),
    sameIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    negativeControlPassed: negative?.join?.subscribed === false && negative?.join?.classification === 'realtime_rls_authorization_rejected',
    initialCatalog,
    finalCatalog,
    caseResults,
    cleanup,
    executionFailure,
    remoteEffects: {
      stagingAccessExecuted: true,
      remoteCredentialReadExecuted: true,
      remoteDependencyLoadExecuted: true,
      authIdentityMutationExecuted: identity !== null,
      syntheticAccountMaterializationExecuted: identity !== null,
      realtimePolicyMutationExecuted: caseResults.length > 0,
      realtimeSubscriptionExecuted: caseResults.length > 0,
      generalDomainMutationExecuted: false
    },
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    productionAuthority: false,
    mergeAuthority: false,
    rawRemoteErrorExposed: false
  };
  writeReport(report);
  if (executionFailure) fail(executionFailure.code);
  if (!report.negativeControlPassed) fail('DOKE_COM_B03C_R3H_NEGATIVE_CONTROL_FAILED');
  if (!cleanup.zeroResidueProven) fail('DOKE_COM_B03C_R3H_ZERO_RESIDUE_NOT_PROVEN');
  return report;
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      const report = await repositorySelfTest();
      process.stdout.write(`${JSON.stringify(report)}\n`);
      return;
    }
    await executeAuthorizedStaging(process.env);
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3H_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeRemoteFailure, assertAuthorizationBoundary, validateAuthorizedCredentials, expectedDescriptors,
  assertPreSubscribeStructuralGate, executeCase, executeCaseMatrix, repositorySelfTest, executeAuthorizedStaging
};

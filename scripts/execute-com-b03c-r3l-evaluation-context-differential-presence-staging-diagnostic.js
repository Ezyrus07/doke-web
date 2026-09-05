#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3l = require('../backend/modules/communities/community-realtime-private-auth-r3l');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');
const r3jExecutor = require('./execute-com-b03c-r3j-evaluation-context-differential-harness');
const r3kExecutor = require('./execute-com-b03c-r3k-differential-remote-adapter-lifecycle');

const REPORT_PATH = path.resolve(process.env.COM_B03C_R3L_REPORT_PATH || 'reports/generated/COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING.json');

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3L_REMOTE_FAILURE');
  return { code: /^DOKE_COM_B03C_R3L_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3L_REMOTE_FAILURE', rawRemoteErrorExposed: false };
}
function writeReport(report) { fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true }); fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`); }

function prepareRemoteRuntime({ readCredential, loadDependency }) {
  r3l.assertRemoteBoundaryAbsent();
  const credentials = Object.fromEntries(r3l.CREDENTIAL_NAMES.map((name) => [name, readCredential(name)]));
  const dependencies = Object.fromEntries(r3l.REMOTE_DEPENDENCIES.map((name) => [name, loadDependency(name)]));
  return { credentials, dependencies };
}

function authInput(overrides = {}) {
  return {
    authorizationPhrase: r3l.REQUIRED_AUTHORIZATION_PHRASE,
    authorizationConsumed: false,
    executionAttempted: false,
    singleUse: true,
    reusableAfterFailure: false,
    predecessorAuthorizationReusable: false,
    runAttempt: 1,
    targetEnvironment: 'staging',
    projectId: r3l.REQUIRED_PROJECT_ID,
    branch: r3l.REQUIRED_BRANCH,
    pullRequest: r3l.REQUIRED_PULL_REQUEST,
    differentialProbeCount: 16,
    totalExecutionCaseCount: 17,
    negativeControlId: r3j.NEGATIVE_CONTROL_ID,
    executionCaseIds: [...r3l.EXECUTION_CASE_IDS],
    sameSyntheticIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    freshRealtimeClientPerCase: true,
    exactlyTwoTemporaryPoliciesPerCase: true,
    structuralGateBeforeProbe: true,
    cleanupAfterEveryCase: true,
    syntheticIdentityCleanupFinally: true,
    zeroResidueRequired: true,
    runtimePolicyChangeAuthorized: false,
    productionAuthorized: false,
    mergeAuthorized: false,
    ...overrides
  };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    fail('DOKE_COM_B03C_R3L_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3l.STAGING_AUTHORIZATION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) fail('DOKE_COM_B03C_R3L_PREAUTH_SIDE_EFFECT_DETECTED');
  const predecessor = await r3kExecutor.repositorySelfTest();
  if (predecessor.totalExecutionCaseCount !== 17 || JSON.stringify(predecessor.executionCaseIds) !== JSON.stringify(r3l.EXECUTION_CASE_IDS)) fail('DOKE_COM_B03C_R3L_R3K_SELF_TEST_INVALID');
  const authorization = r3l.evaluateStagingAuthorization(authInput());
  if (authorization.decision !== 'authorized_for_single_bounded_evaluation_context_differential_presence_diagnostic') fail('DOKE_COM_B03C_R3L_AUTH_CONTRACT_INVALID');
  return {
    validationId: 'COM-B03C-R3L-REPOSITORY-SELF-TEST',
    contractId: r3l.CONTRACT_ID,
    differentialProbeCount: 16,
    totalExecutionCaseCount: 17,
    executionCaseIds: [...r3l.EXECUTION_CASE_IDS],
    authorizationContractPositivePathVerified: true,
    credentialReadsBeforeAuthorization: credentialReads,
    dependencyLoadsBeforeAuthorization: dependencyLoads,
    stagingAccess: false,
    networkAccess: false,
    triggerExists: false,
    authorizationPhraseReceived: false,
    authorizationPhraseConsumed: false,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
}

function readTrigger() {
  if (!fs.existsSync(r3l.TRIGGER_PATH)) fail('DOKE_COM_B03C_R3L_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(r3l.TRIGGER_PATH, 'utf8'));
}
function assertAuthorized(env) {
  if (env.COM_B03C_R3L_AUTHORIZATION !== r3l.REQUIRED_AUTHORIZATION_PHRASE) fail(r3l.STAGING_AUTHORIZATION_BLOCK_CODE);
  if (String(env.GITHUB_RUN_ATTEMPT || '') !== '1') fail('DOKE_COM_B03C_R3L_WORKFLOW_RERUN_BLOCKED');
  const trigger = readTrigger();
  if (trigger.contractId !== r3l.TRIGGER_CONTRACT_ID || trigger.status !== r3l.TRIGGER_STATUS) fail('DOKE_COM_B03C_R3L_TRIGGER_CONTRACT_MISMATCH');
  if (trigger.authorization?.phrase !== r3l.REQUIRED_AUTHORIZATION_PHRASE) fail('DOKE_COM_B03C_R3L_TRIGGER_AUTHORIZATION_MISMATCH');
  for (const key of ['received','consumed','executionAttempted','singleUse']) if (trigger.authorization?.[key] !== true) fail('DOKE_COM_B03C_R3L_TRIGGER_AUTHORIZATION_STATE_INVALID');
  if (trigger.authorization?.reusableAfterFailure !== false || trigger.authorization?.predecessorAuthorizationReusable !== false) fail('DOKE_COM_B03C_R3L_TRIGGER_REUSE_INVALID');
  const decision = r3l.evaluateStagingAuthorization(authInput({
    authorizationPhrase: trigger.authorization.phrase,
    targetEnvironment: trigger.target?.environment,
    projectId: trigger.target?.projectId,
    branch: trigger.target?.branch,
    pullRequest: trigger.target?.pullRequest,
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT)
  }));
  if (decision.decision !== 'authorized_for_single_bounded_evaluation_context_differential_presence_diagnostic') fail('DOKE_COM_B03C_R3L_TRIGGER_SCOPE_REJECTED');
  if (!/^[a-f0-9]{40}$/.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03C_R3L_INSTALL_HEAD_INVALID');
  return trigger;
}
function validateCredentials(env) {
  if (!env.SUPABASE_ACCESS_TOKEN || !env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03C_R3L_STAGING_CREDENTIAL_MISSING');
  if (env.SUPABASE_PROJECT_REF !== r3l.REQUIRED_PROJECT_ID) fail('DOKE_COM_B03C_R3L_PROJECT_REF_MISMATCH');
}
async function fetchJson(url, options, code) {
  let response; try { response = await fetch(url, options); } catch { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch { fail(code); }
}
async function inspectProject(token) {
  const p = await fetchJson(`https://api.supabase.com/v1/projects/${r3l.REQUIRED_PROJECT_ID}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, 'DOKE_COM_B03C_R3L_PROJECT_PREFLIGHT_FAILED');
  if (p.id !== r3l.REQUIRED_PROJECT_ID || p.name !== r3l.REQUIRED_PROJECT_NAME || p.status !== 'ACTIVE_HEALTHY') fail('DOKE_COM_B03C_R3L_PROJECT_IDENTITY_MISMATCH');
  return { id: p.id, name: p.name, status: p.status, region: String(p.region || '').toLowerCase(), directHost: p.database?.host || null };
}
async function fetchKeys(token) {
  const data = await fetchJson(`https://api.supabase.com/v1/projects/${r3l.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }, 'DOKE_COM_B03C_R3L_API_KEYS_FAILED');
  const rows = Array.isArray(data) ? data : (data?.data || []);
  const value = (x) => String(x?.api_key || x?.key || x?.value || '').trim();
  const label = (x) => `${x?.name || ''} ${x?.type || ''} ${x?.id || ''}`.toLowerCase();
  const publishableKey = value(rows.find((x) => label(x).includes('publishable') || label(x).includes('anon')));
  const secretKey = value(rows.find((x) => label(x).includes('secret') || label(x).includes('service_role') || value(x).startsWith('sb_secret_')));
  if (!publishableKey || !secretKey || publishableKey === secretKey) fail('DOKE_COM_B03C_R3L_API_KEY_BOUNDARY_FAILED');
  return { publishableKey, secretKey };
}
async function connectDatabase(Pool, project, password) {
  const hosts = [...new Set([`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean))];
  for (const host of hosts) {
    const direct = host === project.directHost;
    const pool = new Pool({ host, port: 5432, user: direct ? 'postgres' : `postgres.${r3l.REQUIRED_PROJECT_ID}`, password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000, application_name: 'doke-com-b03c-r3l' });
    try { const client = await pool.connect(); await client.query('select 1'); return { pool, client }; } catch { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03C_R3L_DATABASE_CONNECTION_FAILED');
}
async function createIdentity({ createClient, secretKey }) {
  const admin = createClient(`https://${r3l.REQUIRED_PROJECT_ID}.supabase.co`, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const nonce = crypto.randomBytes(10).toString('hex');
  const email = `com-b03c-r3l-${nonce}@doke.invalid`;
  const password = `${crypto.randomBytes(32).toString('base64url')}Aa1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { role: 'client', purpose: 'com-b03c-r3l-diagnostic' } });
  if (created.error || !created.data?.user?.id) fail('DOKE_COM_B03C_R3L_EPHEMERAL_AUTH_CREATE_FAILED');
  return { admin, userId: created.data.user.id, email, password, nonce };
}
async function loginIdentity({ createClient, publishableKey, identity }) {
  const client = createClient(`https://${r3l.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const result = await client.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || result.data?.user?.id !== identity.userId || !result.data?.session?.access_token) fail('DOKE_COM_B03C_R3L_EPHEMERAL_LOGIN_FAILED');
  return result.data.session.access_token;
}

async function executeCase({ db, realtime, caseId, context }) {
  const nonce = r3j.nonceForCase(context.nonceSeed, caseId);
  const definitions = r3j.buildPolicyDefinitions(caseId, { userId: context.userId, topic: context.topic, nonce });
  const select = definitions.find((x) => x.cmd === 'SELECT');
  const insert = definitions.find((x) => x.cmd === 'INSERT');
  const expectedPolicies = { selectPolicyName: select.policyname, insertPolicyName: insert.policyname, selectPredicate: select.expression, insertPredicate: insert.expression };
  const before = r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase: 'before_case' }));
  let installed = [], afterCleanup = [], client = null, probe = { subscribed: false, classification: 'not_attempted' }, executionFailure = null;
  try {
    await db.install({ definitions, statements: r3j.buildInstallStatements(definitions) });
    installed = r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase: 'after_install_before_probe' }));
    const pre = r3jExecutor.evaluateStructuralEvidence({ caseId, beforeCase: before, afterInstallBeforeProbe: installed, afterCleanup: before, expectedPolicies });
    if (pre.evidenceComplete !== true) fail('DOKE_COM_B03C_R3L_PRE_PROBE_STRUCTURAL_GATE_FAILED');
    client = await realtime.createClient({ caseId, userId: context.userId, accessToken: context.accessToken, topic: context.topic });
    probe = await client.subscribePresenceReadJoin();
  } catch (error) { executionFailure = safeFailure(error); }
  finally {
    if (client) await client.remove().catch(() => {});
    await db.drop({ definitions, statements: r3j.buildDropStatements(definitions) }).catch(() => {});
    afterCleanup = r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase: 'after_cleanup' }));
  }
  const structuralEvidence = r3jExecutor.evaluateStructuralEvidence({ caseId, beforeCase: before, afterInstallBeforeProbe: installed, afterCleanup, expectedPolicies });
  return { caseId, surface: caseId === r3j.NEGATIVE_CONTROL_ID ? 'negative_control' : r3j.CASES.find(([id]) => id === caseId)?.[1], expectedPolicies, structuralEvidence, probe: { subscribed: probe?.subscribed === true, classification: String(probe?.classification || 'unspecified'), rawRemoteErrorExposed: false }, executionFailure, rawRemoteErrorExposed: false, exactRootCauseProven: false };
}

async function executeAuthorizedStaging(env) {
  const trigger = assertAuthorized(env);
  validateCredentials(env);
  const { Pool } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const project = await inspectProject(env.SUPABASE_ACCESS_TOKEN);
  const keys = await fetchKeys(env.SUPABASE_ACCESS_TOKEN);
  const connection = await connectDatabase(Pool, project, env.SUPABASE_DB_PASSWORD);
  const db = r3gExecutor.buildPgDbAdapter(connection.client);
  const realtime = r3gExecutor.buildSupabaseRealtimeAdapter({ createClient, url: `https://${r3l.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey: keys.publishableKey });
  let identity = null, caseResults = [], executionFailure = null;
  const initialCatalog = r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase: 'initial_global_baseline' }));
  try {
    identity = await createIdentity({ createClient, secretKey: keys.secretKey });
    const accessToken = await loginIdentity({ createClient, publishableKey: keys.publishableKey, identity });
    const context = { userId: identity.userId, accessToken, topic: `room:com-b03c-r3l-${identity.nonce}`, nonceSeed: crypto.createHash('sha256').update(identity.nonce).digest('hex') };
    for (const caseId of r3l.EXECUTION_CASE_IDS) {
      const result = await executeCase({ db, realtime, caseId, context });
      caseResults.push(result);
      if (result.structuralEvidence.evidenceComplete !== true || result.executionFailure) fail(result.executionFailure?.code || 'DOKE_COM_B03C_R3L_CASE_EVIDENCE_INCOMPLETE');
    }
  } catch (error) { executionFailure = safeFailure(error); }
  finally { if (identity) await identity.admin.auth.admin.deleteUser(identity.userId, false).catch(() => {}); }
  const finalCatalog = r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase: 'final_global_baseline' }));
  const policyCount = Number((await connection.client.query("select count(*)::int count from pg_policies where schemaname='realtime' and tablename='messages' and left(policyname,$1)=$2", [r3j.POLICY_PREFIX.length, r3j.POLICY_PREFIX])).rows[0]?.count || 0);
  const identityCount = identity ? Number((await connection.client.query('select count(*)::int count from auth.users where id=$1::uuid', [identity.userId])).rows[0]?.count || 0) : 0;
  connection.client.release(); await connection.pool.end().catch(() => {});
  const zeroResidueProven = policyCount === 0 && identityCount === 0 && r3e.inventoryFingerprint(initialCatalog) === r3e.inventoryFingerprint(finalCatalog);
  const report = {
    validationId: 'COM-B03C-R3L-EVALUATION-CONTEXT-DIFFERENTIAL-PRESENCE-STAGING-REPORT',
    contractId: r3l.CONTRACT_ID,
    environment: 'staging',
    runAttempt: Number(env.GITHUB_RUN_ATTEMPT),
    headSha: String(env.GITHUB_SHA || ''),
    workflowInstallHead: trigger.workflowInstallHead,
    differentialProbeCount: 16,
    totalExecutionCaseCount: 17,
    executionCaseIds: [...r3l.EXECUTION_CASE_IDS],
    structuralGateCount: caseResults.filter((x) => x.structuralEvidence?.evidenceComplete === true).length,
    caseResults,
    policyResidue: { count: policyCount, zeroResidue: policyCount === 0 },
    identityResidue: { count: identityCount, zeroResidue: identityCount === 0 },
    zeroResidueProven,
    executionFailure,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
  writeReport(report);
  if (executionFailure) fail(executionFailure.code);
  if (!zeroResidueProven) fail('DOKE_COM_B03C_R3L_ZERO_RESIDUE_NOT_PROVEN');
  return report;
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
    else await executeAuthorizedStaging(process.env);
  })().catch((error) => { process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3L_FAILURE')}\n`); process.exitCode = 2; });
}
module.exports = { prepareRemoteRuntime, repositorySelfTest, executeCase, executeAuthorizedStaging };

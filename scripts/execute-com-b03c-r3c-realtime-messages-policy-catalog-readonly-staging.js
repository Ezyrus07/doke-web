#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const r = require('../backend/modules/communities/community-realtime-private-auth-r3c');

const REPORT = path.resolve(process.env.COM_B03C_R3C_REPORT_PATH || 'reports/generated/COM-B03C-R3C-REALTIME-MESSAGES-POLICY-CATALOG-STAGING.json');
const REPO = 'Ezyrus07/doke-web';
const PROJECT_NAME = 'doke-web-staging';
const SHA40 = /^[a-f0-9]{40}$/;
const AUTH_BLOCK = 'DOKE_COM_B03C_R3C_STAGING_AUTHORIZATION_REQUIRED';
let Pool;

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function safeError(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3C_UNEXPECTED_FAILURE');
  const code = /^(DOKE|COM)_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3C_UNEXPECTED_FAILURE';
  return { code, message: code, rawRemoteErrorExposed: false, rawMessageSha256: hash(raw) };
}
function writeReport(value) { fs.mkdirSync(path.dirname(REPORT), { recursive: true }); fs.writeFileSync(REPORT, `${JSON.stringify(value, null, 2)}\n`); }
function loadDeps() { ({ Pool } = require('pg')); }
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch { fail(code); }
}
function validateAuthorizationEnvironment(env) {
  if (env.COM_B03C_R3C_AUTHORIZATION !== r.REQUIRED_AUTHORIZATION_PHRASE) fail(AUTH_BLOCK);
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03C_R3C_WORKFLOW_RERUN_BLOCKED');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03C_R3C_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03C_R3C_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, r.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3C_ENV_PROJECT_MISMATCH');
}
function readTrigger() {
  if (!fs.existsSync(r.TRIGGER_PATH)) fail('DOKE_COM_B03C_R3C_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(r.TRIGGER_PATH, 'utf8'));
}
function validateEnvelope(trigger, env) {
  exact(trigger.contractId, r.TRIGGER_CONTRACT_ID, 'DOKE_COM_B03C_R3C_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03C_R3C_TRIGGER_NOT_PENDING');
  for (const [key, value] of [['phrase', r.REQUIRED_AUTHORIZATION_PHRASE], ['received', true], ['consumed', true], ['executionAttempted', true], ['singleUse', true], ['reusableAfterFailure', false], ['predecessorAuthorizationReusable', false]]) exact(trigger.authorization?.[key], value, 'DOKE_COM_B03C_R3C_AUTHORIZATION_BOUNDARY_FAILED');
  if (!SHA40.test(String(trigger.workflowInstallHead || '')) || !SHA40.test(String(env.GITHUB_SHA || '')) || trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03C_R3C_INSTALL_HEAD_INVALID');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03C_R3C_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, r.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3C_PROJECT_MISMATCH');
  exact(trigger.target?.branch, r.REQUIRED_BRANCH, 'DOKE_COM_B03C_R3C_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, r.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03C_R3C_PR_MISMATCH');
  const decision = r.evaluateStagingAuthorization({ authorizationPhrase: trigger.authorization.phrase, targetEnvironment: trigger.target.environment, projectId: trigger.target.projectId, branch: trigger.target.branch, pullRequest: trigger.target.pullRequest, authorizationConsumed: false, executionAttempted: false, predecessorAuthorizationReusable: false, ...trigger.inspection });
  exact(decision.decision, 'authorized_for_single_read_only_realtime_messages_policy_catalog_inspection', 'DOKE_COM_B03C_R3C_CONTRACT_AUTHORIZATION_REJECTED');
}
async function verifyPR(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03c-r3c' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pr = await fetchJson(`https://api.github.com/repos/${REPO}/pulls/${r.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03C_R3C_PR_PREFLIGHT_FAILED');
  exact(pr.state, 'open', 'DOKE_COM_B03C_R3C_PR_NOT_OPEN'); exact(pr.draft, true, 'DOKE_COM_B03C_R3C_PR_NOT_DRAFT'); exact(pr.merged, false, 'DOKE_COM_B03C_R3C_PR_ALREADY_MERGED'); exact(pr.auto_merge, null, 'DOKE_COM_B03C_R3C_AUTO_MERGE_ENABLED'); exact(pr.head?.ref, r.REQUIRED_BRANCH, 'DOKE_COM_B03C_R3C_PR_BRANCH_MISMATCH'); exact(pr.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03C_R3C_PR_SHA_MISMATCH');
  return { number: pr.number, state: pr.state, draft: pr.draft, merged: pr.merged, headSha: pr.head.sha, installHead: trigger.workflowInstallHead };
}
async function project(env) {
  const data = await fetchJson(`https://api.supabase.com/v1/projects/${r.REQUIRED_PROJECT_ID}`, { headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json' } }, 'DOKE_COM_B03C_R3C_PROJECT_PREFLIGHT_FAILED');
  exact(data.id, r.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R3C_PROJECT_ID_MISMATCH'); exact(data.name, PROJECT_NAME, 'DOKE_COM_B03C_R3C_PROJECT_NAME_MISMATCH'); exact(data.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03C_R3C_PROJECT_NOT_HEALTHY');
  const region = String(data.region || '').toLowerCase(); if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03C_R3C_PROJECT_REGION_INVALID');
  return { id: data.id, name: data.name, status: data.status, region, directHost: data.database?.host || null };
}
async function connect(projectInfo, password) {
  for (const host of [...new Set([`aws-0-${projectInfo.region}.pooler.supabase.com`, `aws-1-${projectInfo.region}.pooler.supabase.com`, projectInfo.directHost].filter(Boolean))]) {
    const direct = host === projectInfo.directHost;
    const pool = new Pool({ host, port: 5432, user: direct ? 'postgres' : `postgres.${r.REQUIRED_PROJECT_ID}`, password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1, connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000, application_name: 'doke-com-b03c-r3c' });
    try { const client = await pool.connect(); await client.query('select 1'); return { pool, client, hostClass: direct ? 'direct' : 'pooler' }; } catch { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03C_R3C_DATABASE_CONNECTION_FAILED');
}
async function inspectCatalog(db) {
  if (!/^\s*select\b/i.test(r.POLICY_INVENTORY_SQL) || /;\s*\S/.test(r.POLICY_INVENTORY_SQL)) fail('DOKE_COM_B03C_R3C_POLICY_QUERY_NOT_SINGLE_SELECT');
  await db.query('begin transaction read only');
  try {
    const mode = await db.query('show transaction_read_only'); exact(String(mode.rows[0]?.transaction_read_only || '').toLowerCase(), 'on', 'DOKE_COM_B03C_R3C_TRANSACTION_NOT_READ_ONLY');
    const foundation = await db.query(`select to_regclass('realtime.messages') is not null as messages_present,
      (select relrowsecurity from pg_class where oid=to_regclass('realtime.messages')) as messages_rls_enabled`);
    exact(foundation.rows[0]?.messages_present, true, 'DOKE_COM_B03C_R3C_REALTIME_MESSAGES_MISSING'); exact(foundation.rows[0]?.messages_rls_enabled, true, 'DOKE_COM_B03C_R3C_REALTIME_MESSAGES_RLS_DISABLED');
    const before = await db.query('select txid_current_if_assigned()::text as xid');
    const result = await db.query(r.POLICY_INVENTORY_SQL);
    const after = await db.query('select txid_current_if_assigned()::text as xid');
    const rows = result.rows.map((row) => r.normalizePolicyRow(row)); const classification = r.classifyPolicyInventory(result.rows);
    await db.query('rollback');
    return { transactionReadOnly: true, transactionIdAssignedBefore: before.rows[0]?.xid != null, transactionIdAssignedAfter: after.rows[0]?.xid != null, queryKind: 'SELECT', source: 'pg_policies', schema: 'realtime', table: 'messages', columns: [...r.REQUIRED_POLICY_COLUMNS], rows, classification, completeInventoryObserved: true };
  } catch (error) { await db.query('rollback').catch(() => {}); throw error; }
}
function commonEffects() { return { remoteMutationExecuted: false, writeOperationsAttempted: false, realtimePolicyMutationExecuted: false, realtimeSubscriptionOpened: false, syntheticAuthIdentityCreated: false, syntheticDomainRowsCreated: false, communityPostsExecuted: false, channelMessagesExecuted: false, publicationMutationExecuted: false, runtimeDeployed: false, productionChanged: false, pullRequestMerged: false, realUserMutationExecuted: false }; }
async function main() {
  const env = process.env; validateAuthorizationEnvironment(env); const trigger = readTrigger(); validateEnvelope(trigger, env); loadDeps();
  let pool; let client; let pr; let projectInfo;
  try {
    pr = await verifyPR(env, trigger); projectInfo = await project(env); const connection = await connect(projectInfo, env.SUPABASE_DB_PASSWORD); pool = connection.pool; client = connection.client; const inventory = await inspectCatalog(client);
    writeReport({ validationId: r.REPORT_VALIDATION_ID, contractId: r.CONTRACT_ID, status: 'staging_read_only_policy_catalog_observed_no_mutation_performed', sanitized: true, checkpoint: { branch: r.REQUIRED_BRANCH, pullRequest: r.REQUIRED_PULL_REQUEST, headSha: env.GITHUB_SHA, workflowInstallHead: trigger.workflowInstallHead, runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1) }, authorization: { phraseSha256: hash(r.REQUIRED_AUTHORIZATION_PHRASE), received: true, consumed: true, executionAttempted: true, singleUse: true, reusableAfterFailure: false, predecessorAuthorizationReusable: false, rawPhraseExposed: false }, target: { environment: 'staging', projectId: r.REQUIRED_PROJECT_ID, projectName: projectInfo.name }, pr, readOnlyProof: { transactionReadOnly: inventory.transactionReadOnly, queryKind: inventory.queryKind, writeOperationsAttempted: false }, policyInventory: { source: inventory.source, schema: inventory.schema, table: inventory.table, columns: inventory.columns, rows: inventory.rows, completeInventoryObserved: inventory.completeInventoryObserved }, classification: inventory.classification, conclusion: { restrictivePolicyInterferenceExcluded: inventory.classification.restrictiveAuthenticatedSelectPresent === false, otherActivePolicyCompositionExcluded: inventory.classification.authenticatedSelectPolicyCount <= 1, exactRootCauseProven: false, runtimeChangeAuthorized: false, independentFollowupRequiredBeforeRuntimeChange: true }, authority: { stagingReadAuthorityConsumed: true, stagingMutationAuthority: false, realtimePolicyMutationAuthority: false, realtimeSubscriptionAuthority: false, authIdentityLifecycleAuthority: false, domainMutationAuthority: false, publicationMutationAuthority: false, runtimeDeployAuthority: false, productionAuthority: false, pullRequestMergeAuthority: false }, effects: commonEffects(), rawRemoteErrorExposed: false });
  } catch (error) {
    writeReport({ validationId: r.REPORT_VALIDATION_ID, contractId: r.CONTRACT_ID, status: 'staging_read_only_policy_catalog_inspection_failed_sanitized', sanitized: true, checkpoint: { branch: r.REQUIRED_BRANCH, pullRequest: r.REQUIRED_PULL_REQUEST, headSha: env.GITHUB_SHA || null, runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1) }, authorization: { received: true, consumed: true, executionAttempted: true, singleUse: true, reusableAfterFailure: false, predecessorAuthorizationReusable: false }, error: safeError(error), conclusion: { exactRootCauseProven: false, runtimeChangeAuthorized: false }, effects: commonEffects(), rawRemoteErrorExposed: false });
    throw error;
  } finally { if (client) client.release(); if (pool) await pool.end().catch(() => {}); }
}
main().catch((error) => { const code = error?.code || error?.message || 'DOKE_COM_B03C_R3C_UNEXPECTED_FAILURE'; process.stderr.write(`${code}\n`); process.exitCode = code === AUTH_BLOCK ? 2 : 1; });

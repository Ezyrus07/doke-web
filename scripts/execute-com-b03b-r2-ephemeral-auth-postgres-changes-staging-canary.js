#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const scalePolicy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const recovery = require('../backend/modules/communities/community-realtime-ephemeral-auth-recovery');

const TRIGGER_PATH = 'config/com-b03b-r2-ephemeral-auth-staging-trigger.json';
const EXPECTED_TRIGGER_CONTRACT = 'com-b03b-r2-ephemeral-auth-staging-trigger-v1';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const REPORT_PATH = path.resolve(process.env.COM_B03B_R2_REPORT_PATH ||
  'reports/generated/COM-B03B-R2-EPHEMERAL-AUTH-POSTGRES-CHANGES-STAGING-CANARY.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function stableArray(value) { return Array.isArray(value) ? [...value].map(String).sort() : []; }
function safeError(error) {
  const code = String(error?.code || error?.message || 'DOKE_COM_B03B_R2_UNEXPECTED_FAILURE');
  return /^(DOKE|COM)_[A-Z0-9_]+$/.test(code)
    ? { code, message: code }
    : { code: 'DOKE_COM_B03B_R2_UNEXPECTED_FAILURE', message: 'COM-B03B-R2 staging canary failed closed.' };
}
function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}
function readTrigger() {
  if (!fs.existsSync(TRIGGER_PATH)) fail('DOKE_COM_B03B_R2_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER_PATH, 'utf8'));
}
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch (_) { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch (_) { fail(code); }
}
function requireEnvironment(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03B_R2_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03B_R2_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R2_ENV_PROJECT_MISMATCH');
  exact(env.COM_B03B_R2_AUTHORIZATION, recovery.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_R2_ENV_AUTHORIZATION_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03B_R2_WORKFLOW_RERUN_BLOCKED');
  if (env.DOKE_STAGING_CLIENT_PASSWORD) fail('DOKE_COM_B03B_R2_SHARED_CANARY_CREDENTIAL_PROHIBITED');
}
function verifyEnvelope(trigger, env) {
  exact(trigger.contractId, EXPECTED_TRIGGER_CONTRACT, 'DOKE_COM_B03B_R2_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03B_R2_TRIGGER_NOT_PENDING');
  exact(trigger.authorization?.phrase, recovery.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_R2_AUTHORIZATION_MISMATCH');
  exact(trigger.authorization?.received, true, 'DOKE_COM_B03B_R2_AUTHORIZATION_NOT_RECEIVED');
  exact(trigger.authorization?.consumed, true, 'DOKE_COM_B03B_R2_AUTHORIZATION_NOT_CONSUMED');
  exact(trigger.authorization?.executionAttempted, true, 'DOKE_COM_B03B_R2_EXECUTION_ATTEMPT_REQUIRED');
  exact(trigger.authorization?.singleUse, true, 'DOKE_COM_B03B_R2_SINGLE_USE_REQUIRED');
  exact(trigger.authorization?.reusableAfterFailure, false, 'DOKE_COM_B03B_R2_REUSE_PROHIBITED');
  exact(trigger.authorization?.r1AuthorizationReusable, false, 'DOKE_COM_B03B_R2_R1_REUSE_PROHIBITED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03B_R2_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || ''))) fail('DOKE_COM_B03B_R2_TRIGGER_HEAD_INVALID');
  if (trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03B_R2_TRIGGER_HEAD_NOT_DISTINCT');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03B_R2_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R2_PROJECT_MISMATCH');
  exact(trigger.target?.branch, recovery.REQUIRED_BRANCH, 'DOKE_COM_B03B_R2_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, recovery.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03B_R2_PR_MISMATCH');
  assert.deepEqual(stableArray(trigger.canary?.scope), stableArray(recovery.ALLOWED_SCOPE), 'DOKE_COM_B03B_R2_SCOPE_MISMATCH');
  assert.deepEqual(stableArray(trigger.canary?.excludedTopics), stableArray(recovery.BLOCKED_TOPICS), 'DOKE_COM_B03B_R2_EXCLUDED_SCOPE_MISMATCH');
  exact(trigger.canary?.ephemeralAuthIdentityLifecycleAllowed, true, 'DOKE_COM_B03B_R2_EPHEMERAL_AUTH_REQUIRED');
  exact(trigger.canary?.authIdentityCleanupRequired, true, 'DOKE_COM_B03B_R2_AUTH_CLEANUP_REQUIRED');
  exact(trigger.canary?.sharedCanaryCredentialAllowed, false, 'DOKE_COM_B03B_R2_SHARED_CREDENTIAL_PROHIBITED');
  exact(trigger.canary?.publicationVerificationRequired, true, 'DOKE_COM_B03B_R2_PUBLICATION_VERIFY_REQUIRED');
  exact(trigger.canary?.publicationMutationAllowed, false, 'DOKE_COM_B03B_R2_PUBLICATION_MUTATION_PROHIBITED');
  exact(trigger.canary?.syntheticDomainFixtureLifecycleAllowed, true, 'DOKE_COM_B03B_R2_SYNTHETIC_FIXTURE_REQUIRED');
  exact(trigger.canary?.syntheticDomainCleanupRequired, true, 'DOKE_COM_B03B_R2_SYNTHETIC_CLEANUP_REQUIRED');
  exact(trigger.canary?.persistentResidueAllowed, false, 'DOKE_COM_B03B_R2_RESIDUE_PROHIBITED');
  exact(trigger.canary?.privateBroadcastPresenceChannelsOnly, true, 'DOKE_COM_B03B_R2_PRIVATE_EPHEMERAL_REQUIRED');
  exact(trigger.canary?.serverVerifiedSessionRequired, true, 'DOKE_COM_B03B_R2_SERVER_SESSION_REQUIRED');
  exact(trigger.canary?.publicRealtimeChannelAllowed, false, 'DOKE_COM_B03B_R2_PUBLIC_CHANNEL_PROHIBITED');
  if (stableArray(trigger.canary?.scope).includes('channel_messages')) fail('DOKE_COM_B03B_R2_CHANNEL_MESSAGES_PROHIBITED');
}
async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03b-r2-staging-canary' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pull = await fetchJson(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${recovery.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03B_R2_PR_PREFLIGHT_FAILED');
  exact(pull.state, 'open', 'DOKE_COM_B03B_R2_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B03B_R2_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B03B_R2_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B03B_R2_AUTO_MERGE_ENABLED');
  exact(pull.head?.ref, recovery.REQUIRED_BRANCH, 'DOKE_COM_B03B_R2_PR_BRANCH_MISMATCH');
  exact(pull.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03B_R2_PR_SHA_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha, installHead: trigger.workflowInstallHead };
}
async function verifyProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${recovery.REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-r2-staging-canary' }
  }, 'DOKE_COM_B03B_R2_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R2_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B03B_R2_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03B_R2_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03B_R2_PROJECT_REGION_INVALID');
  const directHost = project.database?.host || null;
  if (directHost && directHost !== `db.${recovery.REQUIRED_PROJECT_ID}.supabase.co`) fail('DOKE_COM_B03B_R2_DATABASE_HOST_MISMATCH');
  return { id: project.id, name: project.name, status: project.status, region, directHost };
}
async function loadApiKeys(env) {
  const keys = await fetchJson(`https://api.supabase.com/v1/projects/${recovery.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-r2-staging-canary' }
  }, 'DOKE_COM_B03B_R2_API_KEYS_PREFLIGHT_FAILED');
  const list = Array.isArray(keys) ? keys : Array.isArray(keys?.data) ? keys.data : [];
  const valueOf = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
  const labelOf = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
  const publishable = list.find((item) => {
    const label = labelOf(item);
    return label.includes('publishable') || label.includes('anon');
  });
  const admin = list.find((item) => {
    const label = labelOf(item);
    const value = valueOf(item);
    return label.includes('secret') || label.includes('service_role') || label.includes('service role') || value.startsWith('sb_secret_');
  });
  const publishableKey = valueOf(publishable);
  const adminKey = valueOf(admin);
  if (!publishableKey) fail('DOKE_COM_B03B_R2_PUBLISHABLE_KEY_NOT_FOUND');
  if (!adminKey) fail('DOKE_COM_B03B_R2_ADMIN_KEY_NOT_FOUND');
  if (publishableKey === adminKey) fail('DOKE_COM_B03B_R2_KEY_ROLE_SEPARATION_REQUIRED');
  return { publishableKey, adminKey };
}
async function connect(project, password) {
  const candidates = [`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean);
  for (const host of [...new Set(candidates)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host, port: 5432, user: direct ? 'postgres' : `postgres.${recovery.REQUIRED_PROJECT_ID}`,
      password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000,
      application_name: 'doke-com-b03b-r2-ephemeral-auth-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03B_R2_DATABASE_CONNECTION_FAILED');
}
async function verifyFoundation(db) {
  const result = await db.query(`select
    to_regclass('realtime.messages') is not null as messages_present,
    to_regprocedure('realtime.topic()') is not null as topic_function_present,
    case when to_regclass('realtime.messages') is not null then
      (select relrowsecurity from pg_class where oid = to_regclass('realtime.messages')) else false end as messages_rls_enabled,
    exists(select 1 from pg_publication where pubname = 'supabase_realtime') as publication_present,
    to_regclass('public.community_posts') is not null as community_posts_present,
    case when to_regclass('public.community_posts') is not null then
      (select relrowsecurity from pg_class where oid = to_regclass('public.community_posts')) else false end as community_posts_rls_enabled,
    exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts') as community_posts_published`);
  const row = result.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B03B_R2_REALTIME_FOUNDATION_FAILED');
  return row;
}
function makeAdminClient(adminKey) {
  return createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
async function createEphemeralIdentity(db, admin, nonce) {
  const email = `com-b03b-r2-${nonce}@doke.local`;
  const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: {
      role: 'client',
      name: 'COM-B03B-R2 Canary',
      purpose: 'com-b03b-r2-ephemeral-realtime-canary'
    }
  });
  if (created.error || !created.data?.user?.id) fail('DOKE_COM_B03B_R2_EPHEMERAL_AUTH_CREATE_FAILED');
  const userId = created.data.user.id;
  const materialized = await db.query(`select u.role, u.status,
    exists(select 1 from public.user_profiles up where up.user_id = u.id) as user_profile_present,
    exists(select 1 from public.client_profiles cp where cp.user_id = u.id) as client_profile_present
    from public.users u where u.id = $1::uuid`, [userId]);
  const row = materialized.rows[0];
  if (!row || row.role !== 'client' || row.status !== 'active' || row.user_profile_present !== true || row.client_profile_present !== true) {
    await admin.auth.admin.deleteUser(userId, false).catch(() => {});
    fail('DOKE_COM_B03B_R2_CANONICAL_ACCOUNT_MATERIALIZATION_REQUIRED');
  }
  return { userId, email, password };
}
async function signInEphemeral(publishableKey, identity) {
  const client = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  const result = await client.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || !result.data?.session?.access_token || result.data?.user?.id !== identity.userId) fail('DOKE_COM_B03B_R2_EPHEMERAL_LOGIN_FAILED');
  const verified = await client.auth.getUser(result.data.session.access_token);
  if (verified.error || verified.data?.user?.id !== identity.userId) fail('DOKE_COM_B03B_R2_SERVER_VERIFIED_SESSION_REQUIRED');
  await client.realtime.setAuth(result.data.session.access_token);
  return { client, userId: identity.userId };
}
function policyIdentifier(prefix, nonce) { return `${prefix}_${nonce.replace(/[^a-f0-9]/g, '').slice(0, 24)}`; }
function quoteLiteral(value) { return `'${String(value).replace(/'/g, "''")}'`; }
async function installRealtimePolicies(db, userId, topics, nonce) {
  if (!/^[0-9a-f-]{36}$/i.test(String(userId))) fail('DOKE_COM_B03B_R2_POLICY_USER_ID_INVALID');
  if (!topics.every((topic) => /^com:v1:[a-z_]+:[a-f0-9]{32}$/.test(String(topic)))) fail('DOKE_COM_B03B_R2_POLICY_TOPIC_INVALID');
  const readPolicy = policyIdentifier('com_b03b_r2_read', nonce);
  const writePolicy = policyIdentifier('com_b03b_r2_write', nonce);
  const topicSql = topics.map(quoteLiteral).join(', ');
  const userSql = quoteLiteral(userId);
  await db.query(`create policy ${readPolicy} on realtime.messages for select to authenticated using (
    auth.uid() = ${userSql}::uuid and realtime.topic() in (${topicSql}) and realtime.messages.extension in ('broadcast','presence')
  )`);
  try {
    await db.query(`create policy ${writePolicy} on realtime.messages for insert to authenticated with check (
      auth.uid() = ${userSql}::uuid and realtime.topic() in (${topicSql}) and realtime.messages.extension in ('broadcast','presence')
    )`);
  } catch (error) {
    await db.query(`drop policy if exists ${readPolicy} on realtime.messages`).catch(() => {});
    throw error;
  }
  return { readPolicy, writePolicy };
}
async function dropRealtimePolicies(db, policies) {
  if (!db || !policies) return;
  await db.query(`drop policy if exists ${policies.readPolicy} on realtime.messages`).catch(() => {});
  await db.query(`drop policy if exists ${policies.writePolicy} on realtime.messages`).catch(() => {});
}
async function realtimePoliciesGone(db, policies) {
  if (!db || !policies) return true;
  const result = await db.query(`select count(*)::int as count from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = any($1::text[])`, [[policies.readPolicy, policies.writePolicy]]);
  return Number(result.rows[0]?.count || 0) === 0;
}
function waitForSubscription(channel, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R2_SUBSCRIPTION_TIMEOUT'), { code: 'DOKE_COM_B03B_R2_SUBSCRIPTION_TIMEOUT' })), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(status); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        reject(Object.assign(new Error('DOKE_COM_B03B_R2_SUBSCRIPTION_FAILED'), { code: 'DOKE_COM_B03B_R2_SUBSCRIPTION_FAILED', cause: error }));
      }
    });
  });
}
function waitForDeniedPrivateSubscription(channel, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('denied_timeout'), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        reject(Object.assign(new Error('DOKE_COM_B03B_R2_ANON_PRIVATE_SUBSCRIPTION_ALLOWED'), { code: 'DOKE_COM_B03B_R2_ANON_PRIVATE_SUBSCRIPTION_ALLOWED' }));
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); resolve(status); }
    });
  });
}
function waitForPostgresInsert(channel, postId, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R2_POSTGRES_CHANGES_TIMEOUT'), { code: 'DOKE_COM_B03B_R2_POSTGRES_CHANGES_TIMEOUT' })), timeoutMs);
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, (payload) => {
      if (String(payload?.new?.id || '') === String(postId)) { clearTimeout(timer); resolve(payload); }
    });
  });
}
function waitForBroadcast(channel, event, matcher, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R2_BROADCAST_TIMEOUT'), { code: 'DOKE_COM_B03B_R2_BROADCAST_TIMEOUT' })), timeoutMs);
    channel.on('broadcast', { event }, (payload) => {
      if (!matcher || matcher(payload)) { clearTimeout(timer); resolve(payload); }
    });
  });
}
function waitForPresence(channel, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R2_PRESENCE_TIMEOUT'), { code: 'DOKE_COM_B03B_R2_PRESENCE_TIMEOUT' })), timeoutMs);
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (state && Object.keys(state).length > 0) { clearTimeout(timer); resolve(state); }
    });
  });
}
async function removeChannel(client, channel) {
  if (client && channel) await client.removeChannel(channel).catch(() => {});
}
async function createSyntheticFixture(db, userId, nonce) {
  const communityId = crypto.randomUUID();
  const postId = crypto.randomUUID();
  const slug = `com-b03b-r2-${nonce}`;
  await db.query(`insert into public.communities(id, owner_id, name, slug, description, visibility)
    values($1::uuid, $2::uuid, $3::text, $4::text, $5::text, 'private')`,
    [communityId, userId, 'COM-B03B-R2 Canary', slug, 'Ephemeral staging-only Realtime fixture']);
  return { communityId, postId };
}
async function insertSyntheticPost(db, fixture, userId) {
  await db.query(`insert into public.community_posts(id, community_id, author_id, title, body, status)
    values($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, 'published')`,
    [fixture.postId, fixture.communityId, userId, 'COM-B03B-R2 Canary', 'Ephemeral staging-only Postgres Changes event']);
}
async function cleanupSyntheticFixture(db, fixture) {
  if (!db || !fixture) return;
  await db.query('delete from public.community_posts where id = $1::uuid', [fixture.postId]).catch(() => {});
  await db.query('delete from public.communities where id = $1::uuid', [fixture.communityId]).catch(() => {});
}
async function domainResidue(db, fixture) {
  if (!db || !fixture) return { post: 0, community: 0, membership: 0, total: 0 };
  const result = await db.query(`select
    (select count(*)::int from public.community_posts where id = $1::uuid) as post,
    (select count(*)::int from public.communities where id = $2::uuid) as community,
    (select count(*)::int from public.community_members where community_id = $2::uuid) as membership`,
    [fixture.postId, fixture.communityId]);
  const row = result.rows[0] || {};
  const values = { post: Number(row.post || 0), community: Number(row.community || 0), membership: Number(row.membership || 0) };
  return { ...values, total: values.post + values.community + values.membership };
}
async function cleanupIdentity(admin, identity, strict = true) {
  if (!identity || !admin) return;
  const result = await admin.auth.admin.deleteUser(identity.userId, false);
  if (result.error && strict) fail('DOKE_COM_B03B_R2_EPHEMERAL_AUTH_CLEANUP_FAILED');
}
async function identityResidue(db, admin, identity) {
  if (!identity) return { publicUser: 0, userProfile: 0, clientProfile: 0, authUser: 0, total: 0 };
  let publicUser = -1;
  let userProfile = -1;
  let clientProfile = -1;
  let authUser = -1;
  if (db) {
    const result = await db.query(`select
      (select count(*)::int from public.users where id = $1::uuid) as public_user,
      (select count(*)::int from public.user_profiles where user_id = $1::uuid) as user_profile,
      (select count(*)::int from public.client_profiles where user_id = $1::uuid) as client_profile`, [identity.userId]);
    const row = result.rows[0] || {};
    publicUser = Number(row.public_user || 0);
    userProfile = Number(row.user_profile || 0);
    clientProfile = Number(row.client_profile || 0);
  }
  if (admin) {
    const result = await admin.auth.admin.getUserById(identity.userId);
    authUser = result.data?.user?.id === identity.userId ? 1 : 0;
  }
  return { publicUser, userProfile, clientProfile, authUser, total: publicUser + userProfile + clientProfile + authUser };
}

async function run() {
  const env = process.env;
  const baseReport = {
    validationId: 'COM-B03B-R2-EPHEMERAL-AUTH-POSTGRES-CHANGES-STAGING-CANARY',
    contractId: recovery.CONTRACT_ID,
    status: 'failed_closed',
    authorization: { consumed: true, singleUse: true, reusableAfterFailure: false, r1AuthorizationReusable: false },
    scope: recovery.ALLOWED_SCOPE,
    excludedTopics: recovery.BLOCKED_TOPICS,
    effects: {
      stagingRealtimePublicationMutationExecuted: false,
      publicTrafficEnabled: false,
      runtimeDeployed: false,
      productionChanged: false,
      pullRequestMerged: false
    }
  };
  let dbConnection = null;
  let admin = null;
  let auth = null;
  let identity = null;
  let policies = null;
  let fixture = null;
  const channels = [];
  try {
    requireEnvironment(env);
    const trigger = readTrigger();
    verifyEnvelope(trigger, env);
    const authorization = recovery.evaluateStagingRecoveryAuthorization({
      authorizationPhrase: trigger.authorization.phrase,
      targetEnvironment: trigger.target.environment,
      projectId: trigger.target.projectId,
      branch: trigger.target.branch,
      pullRequest: trigger.target.pullRequest,
      authorizationConsumed: false,
      executionAttempted: false,
      r1AuthorizationReusable: trigger.authorization.r1AuthorizationReusable,
      ephemeralAuthIdentityLifecycleAllowed: trigger.canary.ephemeralAuthIdentityLifecycleAllowed,
      authIdentityCleanupRequired: trigger.canary.authIdentityCleanupRequired,
      sharedCanaryCredentialAllowed: trigger.canary.sharedCanaryCredentialAllowed,
      publicationVerificationRequired: trigger.canary.publicationVerificationRequired,
      publicationMutationAllowed: trigger.canary.publicationMutationAllowed,
      syntheticDomainFixtureLifecycleAllowed: trigger.canary.syntheticDomainFixtureLifecycleAllowed,
      syntheticDomainCleanupRequired: trigger.canary.syntheticDomainCleanupRequired,
      persistentResidueAllowed: trigger.canary.persistentResidueAllowed,
      privateBroadcastPresenceChannelsOnly: trigger.canary.privateBroadcastPresenceChannelsOnly,
      serverVerifiedSessionRequired: trigger.canary.serverVerifiedSessionRequired,
      publicRealtimeChannelAllowed: trigger.canary.publicRealtimeChannelAllowed,
      scope: trigger.canary.scope
    });
    exact(authorization.decision, 'authorized_for_single_bounded_r2_staging_canary', 'DOKE_COM_B03B_R2_CONTRACT_AUTHORIZATION_REJECTED');

    const pullRequest = await verifyPullRequest(env, trigger);
    const project = await verifyProject(env);
    const keys = await loadApiKeys(env);
    dbConnection = await connect(project, env.SUPABASE_DB_PASSWORD);
    const foundation = await verifyFoundation(dbConnection.client);
    admin = makeAdminClient(keys.adminKey);

    const nonce = crypto.randomBytes(10).toString('hex');
    identity = await createEphemeralIdentity(dbConnection.client, admin, nonce);
    auth = await signInEphemeral(keys.publishableKey, identity);

    const channelId = `canary-${crypto.randomBytes(8).toString('hex')}`;
    const ephemeralTopics = {
      channel_presence: scalePolicy.buildChannelKey({ communityId: crypto.randomUUID(), channelId, topic: 'channel_presence' }),
      channel_typing: scalePolicy.buildChannelKey({ communityId: crypto.randomUUID(), channelId, topic: 'channel_typing' })
    };
    policies = await installRealtimePolicies(dbConnection.client, identity.userId, Object.values(ephemeralTopics), nonce);
    fixture = await createSyntheticFixture(dbConnection.client, identity.userId, nonce);

    let anonymousPostObserved = false;
    const postsChannel = auth.client.channel(`com-b03b-r2-post-${nonce}`);
    const postPromise = waitForPostgresInsert(postsChannel, fixture.postId);
    channels.push({ client: auth.client, channel: postsChannel });
    await waitForSubscription(postsChannel);

    const anonClient = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, keys.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonPostsChannel = anonClient.channel(`com-b03b-r2-anon-post-${nonce}`);
    anonPostsChannel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'community_posts', filter: `community_id=eq.${fixture.communityId}`
    }, (payload) => {
      if (String(payload?.new?.id || '') === fixture.postId) anonymousPostObserved = true;
    });
    channels.push({ client: anonClient, channel: anonPostsChannel });
    await waitForSubscription(anonPostsChannel);

    await insertSyntheticPost(dbConnection.client, fixture, identity.userId);
    await postPromise;
    await sleep(1500);
    exact(anonymousPostObserved, false, 'DOKE_COM_B03B_R2_ANON_PRIVATE_COMMUNITY_POST_DELIVERED');

    const presenceChannel = auth.client.channel(ephemeralTopics.channel_presence, { config: { private: true, presence: { key: hash(identity.userId).slice(0, 16) } } });
    channels.push({ client: auth.client, channel: presenceChannel });
    const presencePromise = waitForPresence(presenceChannel);
    await waitForSubscription(presenceChannel);
    const trackResult = await presenceChannel.track({ canary: true, actor: hash(identity.userId).slice(0, 16), at: new Date().toISOString() });
    if (trackResult !== 'ok') fail('DOKE_COM_B03B_R2_PRESENCE_TRACK_FAILED');
    await presencePromise;

    const typingChannel = auth.client.channel(ephemeralTopics.channel_typing, { config: { private: true, broadcast: { self: true, ack: true } } });
    channels.push({ client: auth.client, channel: typingChannel });
    const typingEventId = crypto.randomUUID();
    const typingPromise = waitForBroadcast(typingChannel, 'typing_started', (payload) => JSON.stringify(payload).includes(typingEventId));
    await waitForSubscription(typingChannel);
    const sendResult = await typingChannel.send({ type: 'broadcast', event: 'typing_started', payload: { source: 'ephemeral_server_verified_session', eventId: typingEventId, actor: hash(identity.userId).slice(0, 16) } });
    if (sendResult !== 'ok') fail('DOKE_COM_B03B_R2_TYPING_BROADCAST_FAILED');
    await typingPromise;

    const anonPrivateClient = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, keys.publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonTypingChannel = anonPrivateClient.channel(ephemeralTopics.channel_typing, { config: { private: true } });
    const anonPrivateDecision = await waitForDeniedPrivateSubscription(anonTypingChannel);
    await removeChannel(anonPrivateClient, anonTypingChannel);

    for (const entry of channels.splice(0)) await removeChannel(entry.client, entry.channel);
    await auth.client.auth.signOut().catch(() => {});
    await cleanupSyntheticFixture(dbConnection.client, fixture);
    const dResidue = await domainResidue(dbConnection.client, fixture);
    exact(dResidue.total, 0, 'DOKE_COM_B03B_R2_DOMAIN_RESIDUE_DETECTED');
    await dropRealtimePolicies(dbConnection.client, policies);
    const policiesRemoved = await realtimePoliciesGone(dbConnection.client, policies);
    exact(policiesRemoved, true, 'DOKE_COM_B03B_R2_POLICY_CLEANUP_FAILED');
    await cleanupIdentity(admin, identity, true);
    const iResidue = await identityResidue(dbConnection.client, admin, identity);
    exact(iResidue.total, 0, 'DOKE_COM_B03B_R2_IDENTITY_RESIDUE_DETECTED');

    writeReport({
      ...baseReport,
      status: 'ephemeral_authenticated_postgres_changes_and_private_ephemeral_realtime_canary_passed',
      execution: { triggerHead: env.GITHUB_SHA, workflowInstallHead: trigger.workflowInstallHead, runId: Number(env.GITHUB_RUN_ID || 0), runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1), result: 'success' },
      pullRequest,
      project: { id: project.id, name: project.name, status: project.status, region: project.region },
      connection: { transport: 'postgres_tls', hostClass: dbConnection.hostClass, credentialsExposed: false },
      identity: { source: 'com_owned_ephemeral_supabase_auth_identity', role: 'client', userIdSha256: hash(identity.userId), emailSha256: hash(identity.email), rawIdentifierExposed: false, rawCredentialExposed: false },
      foundation: {
        broadcastPresence: { messagesPresent: foundation.messages_present, topicFunctionPresent: foundation.topic_function_present, messagesRlsEnabled: foundation.messages_rls_enabled },
        postgresChanges: { publicationPresent: foundation.publication_present, communityPostsPresent: foundation.community_posts_present, communityPostsRlsEnabled: foundation.community_posts_rls_enabled, communityPostsPublished: foundation.community_posts_published, publicationMutationExecuted: false }
      },
      result: {
        exactScopeEnforced: true,
        channelMessagesExcluded: true,
        communityPosts: { transport: 'authenticated_postgres_changes', authenticatedSubscription: true, insertDelivered: true, anonymousPrivateCommunityDeliverySuppressed: true },
        channelPresence: { transport: 'private_presence', authenticatedPrivateSubscription: true, tracked: true, syncObserved: true },
        channelTyping: { transport: 'private_broadcast', authenticatedPrivateSubscription: true, sent: true, received: true },
        anonymousPrivateBroadcastSubscriptionDenied: true,
        anonymousPrivateDecision: anonPrivateDecision,
        temporaryPoliciesRemoved: true,
        channelsRemoved: true,
        syntheticDomainFixtureRemoved: true,
        ephemeralAuthIdentityRemoved: true,
        publicUserRemoved: true,
        persistentDomainResidue: dResidue.total,
        persistentIdentityResidue: iResidue.total
      },
      effects: {
        stagingRealtimePublicationMutationExecuted: false,
        ephemeralAuthIdentityLifecycleExecuted: true,
        authenticatedPostgresChangesSubscriptionCreated: true,
        privateEphemeralRealtimeChannelsCreated: true,
        temporarySyntheticDomainMutationExecuted: true,
        persistentResidue: false,
        publicTrafficEnabled: false,
        runtimeDeployed: false,
        productionChanged: false,
        pullRequestMerged: false
      }
    });
  } catch (error) {
    for (const entry of channels.splice(0)) await removeChannel(entry.client, entry.channel);
    if (auth?.client) await auth.client.auth.signOut().catch(() => {});
    if (dbConnection?.client && fixture) await cleanupSyntheticFixture(dbConnection.client, fixture);
    const dResidue = dbConnection?.client && fixture ? await domainResidue(dbConnection.client, fixture).catch(() => ({ total: -1 })) : { total: 0 };
    if (dbConnection?.client && policies) await dropRealtimePolicies(dbConnection.client, policies);
    const policiesRemoved = dbConnection?.client && policies ? await realtimePoliciesGone(dbConnection.client, policies).catch(() => false) : true;
    if (identity && admin) await cleanupIdentity(admin, identity, false);
    const iResidue = identity ? await identityResidue(dbConnection?.client, admin, identity).catch(() => ({ total: -1 })) : { total: 0 };
    writeReport({
      ...baseReport,
      error: safeError(error),
      cleanup: {
        temporaryPoliciesRemoved: policiesRemoved,
        syntheticDomainFixtureRemoved: dResidue.total === 0,
        persistentDomainResidue: dResidue.total,
        ephemeralAuthIdentityRemoved: iResidue.total === 0,
        persistentIdentityResidue: iResidue.total
      },
      effects: {
        ...baseReport.effects,
        ephemeralAuthIdentityLifecycleMayHaveExecuted: Boolean(identity),
        temporarySyntheticDomainMutationMayHaveExecuted: Boolean(fixture)
      }
    });
    throw error;
  } finally {
    if (dbConnection?.client) dbConnection.client.release();
    if (dbConnection?.pool) await dbConnection.pool.end().catch(() => {});
  }
}

run().catch((error) => {
  console.error(safeError(error).code);
  process.exitCode = 1;
});

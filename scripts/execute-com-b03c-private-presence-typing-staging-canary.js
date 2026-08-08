#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const scalePolicy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const readiness = require('../backend/modules/communities/community-realtime-private-presence-typing-readiness');

const TRIGGER_PATH = 'config/com-b03c-private-presence-typing-staging-trigger.json';
const EXPECTED_TRIGGER_CONTRACT = 'com-b03c-private-presence-typing-staging-trigger-v1';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const REPORT_PATH = path.resolve(process.env.COM_B03C_REPORT_PATH ||
  'reports/generated/COM-B03C-PRIVATE-PRESENCE-TYPING-STAGING-CANARY.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function safeError(error) {
  const code = String(error?.code || error?.message || 'DOKE_COM_B03C_UNEXPECTED_FAILURE');
  return /^(DOKE|COM)_[A-Z0-9_]+$/.test(code)
    ? { code, message: code }
    : { code: 'DOKE_COM_B03C_UNEXPECTED_FAILURE', message: 'COM-B03C staging canary failed closed.' };
}
function stableArray(value) { return Array.isArray(value) ? [...value].map(String).sort() : []; }
function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}
function readTrigger() {
  if (!fs.existsSync(TRIGGER_PATH)) fail('DOKE_COM_B03C_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER_PATH, 'utf8'));
}
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch (_) { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch (_) { fail(code); }
}
function requireEnvironment(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03C_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03C_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, readiness.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_ENV_PROJECT_MISMATCH');
  exact(env.COM_B03C_AUTHORIZATION, readiness.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03C_ENV_AUTHORIZATION_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03C_WORKFLOW_RERUN_BLOCKED');
  if (env.DOKE_STAGING_CLIENT_PASSWORD) fail('DOKE_COM_B03C_SHARED_CANARY_CREDENTIAL_PROHIBITED');
}
function verifyEnvelope(trigger, env) {
  exact(trigger.contractId, EXPECTED_TRIGGER_CONTRACT, 'DOKE_COM_B03C_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03C_TRIGGER_NOT_PENDING');
  exact(trigger.authorization?.phrase, readiness.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03C_AUTHORIZATION_MISMATCH');
  exact(trigger.authorization?.received, true, 'DOKE_COM_B03C_AUTHORIZATION_NOT_RECEIVED');
  exact(trigger.authorization?.consumed, true, 'DOKE_COM_B03C_AUTHORIZATION_NOT_CONSUMED');
  exact(trigger.authorization?.executionAttempted, true, 'DOKE_COM_B03C_EXECUTION_ATTEMPT_REQUIRED');
  exact(trigger.authorization?.singleUse, true, 'DOKE_COM_B03C_SINGLE_USE_REQUIRED');
  exact(trigger.authorization?.reusableAfterFailure, false, 'DOKE_COM_B03C_REUSE_PROHIBITED');
  exact(trigger.authorization?.r3AuthorizationReusable, false, 'DOKE_COM_B03C_R3_REUSE_PROHIBITED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03C_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || ''))) fail('DOKE_COM_B03C_TRIGGER_HEAD_INVALID');
  if (trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03C_TRIGGER_HEAD_NOT_DISTINCT');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03C_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, readiness.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_PROJECT_MISMATCH');
  exact(trigger.target?.branch, readiness.REQUIRED_BRANCH, 'DOKE_COM_B03C_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, readiness.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03C_PR_MISMATCH');
  assert.deepEqual(stableArray(trigger.canary?.scope), stableArray(readiness.ALLOWED_SCOPE), 'DOKE_COM_B03C_SCOPE_MISMATCH');
  exact(trigger.canary?.ephemeralAuthIdentityLifecycleAllowed, true, 'DOKE_COM_B03C_EPHEMERAL_AUTH_REQUIRED');
  exact(trigger.canary?.authIdentityCleanupRequired, true, 'DOKE_COM_B03C_AUTH_CLEANUP_REQUIRED');
  exact(trigger.canary?.realtimeMessagesPolicyLifecycleAllowed, true, 'DOKE_COM_B03C_REALTIME_POLICY_REQUIRED');
  exact(trigger.canary?.realtimePolicyCleanupRequired, true, 'DOKE_COM_B03C_REALTIME_POLICY_CLEANUP_REQUIRED');
  exact(trigger.canary?.exactTopicAndExtensionPoliciesRequired, true, 'DOKE_COM_B03C_EXACT_POLICY_REQUIRED');
  exact(trigger.canary?.privateChannelsOnly, true, 'DOKE_COM_B03C_PRIVATE_CHANNELS_REQUIRED');
  exact(trigger.canary?.serverVerifiedSessionRequired, true, 'DOKE_COM_B03C_SERVER_SESSION_REQUIRED');
  exact(trigger.canary?.anonymousDenialRequired, true, 'DOKE_COM_B03C_ANON_DENIAL_REQUIRED');
  exact(trigger.canary?.communityPostsExecutionAllowed, false, 'DOKE_COM_B03C_POSTS_REEXECUTION_PROHIBITED');
  exact(trigger.canary?.channelMessagesExecutionAllowed, false, 'DOKE_COM_B03C_CHANNEL_MESSAGES_PROHIBITED');
  exact(trigger.canary?.domainMutationAllowed, false, 'DOKE_COM_B03C_DOMAIN_MUTATION_PROHIBITED');
  exact(trigger.canary?.publicationMutationAllowed, false, 'DOKE_COM_B03C_PUBLICATION_MUTATION_PROHIBITED');
  exact(trigger.canary?.persistentResidueAllowed, false, 'DOKE_COM_B03C_RESIDUE_PROHIBITED');
}
async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03c-staging-canary' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pull = await fetchJson(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${readiness.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03C_PR_PREFLIGHT_FAILED');
  exact(pull.state, 'open', 'DOKE_COM_B03C_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B03C_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B03C_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B03C_AUTO_MERGE_ENABLED');
  exact(pull.head?.ref, readiness.REQUIRED_BRANCH, 'DOKE_COM_B03C_PR_BRANCH_MISMATCH');
  exact(pull.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03C_PR_SHA_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha, installHead: trigger.workflowInstallHead };
}
async function verifyProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${readiness.REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03c-staging-canary' }
  }, 'DOKE_COM_B03C_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, readiness.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B03C_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03C_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03C_PROJECT_REGION_INVALID');
  const directHost = project.database?.host || null;
  if (directHost && directHost !== `db.${readiness.REQUIRED_PROJECT_ID}.supabase.co`) fail('DOKE_COM_B03C_DATABASE_HOST_MISMATCH');
  return { id: project.id, name: project.name, status: project.status, region, directHost };
}
async function loadApiKeys(env) {
  const keys = await fetchJson(`https://api.supabase.com/v1/projects/${readiness.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03c-staging-canary' }
  }, 'DOKE_COM_B03C_API_KEYS_PREFLIGHT_FAILED');
  const list = Array.isArray(keys) ? keys : Array.isArray(keys?.data) ? keys.data : [];
  const valueOf = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
  const labelOf = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
  const publishable = list.find((item) => labelOf(item).includes('publishable') || labelOf(item).includes('anon'));
  const admin = list.find((item) => labelOf(item).includes('secret') || labelOf(item).includes('service_role') || valueOf(item).startsWith('sb_secret_'));
  const publishableKey = valueOf(publishable);
  const adminKey = valueOf(admin);
  if (!publishableKey) fail('DOKE_COM_B03C_PUBLISHABLE_KEY_NOT_FOUND');
  if (!adminKey) fail('DOKE_COM_B03C_ADMIN_KEY_NOT_FOUND');
  if (publishableKey === adminKey) fail('DOKE_COM_B03C_KEY_ROLE_SEPARATION_REQUIRED');
  return { publishableKey, adminKey };
}
async function connect(project, password) {
  const candidates = [`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean);
  for (const host of [...new Set(candidates)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host, port: 5432, user: direct ? 'postgres' : `postgres.${readiness.REQUIRED_PROJECT_ID}`,
      password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000,
      application_name: 'doke-com-b03c-private-presence-typing-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03C_DATABASE_CONNECTION_FAILED');
}
async function verifyFoundation(db) {
  const result = await db.query(`select
    to_regclass('realtime.messages') is not null as messages_present,
    to_regprocedure('realtime.topic()') is not null as topic_function_present,
    case when to_regclass('realtime.messages') is not null then
      (select relrowsecurity from pg_class where oid = to_regclass('realtime.messages')) else false end as messages_rls_enabled`);
  const row = result.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B03C_REALTIME_FOUNDATION_FAILED');
  return row;
}
function makeAdminClient(adminKey) {
  return createClient(`https://${readiness.REQUIRED_PROJECT_ID}.supabase.co`, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
async function createEphemeralIdentity(db, admin, nonce) {
  const email = `com-b03c-${nonce}@doke.local`;
  const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: 'client', name: 'COM-B03C Canary', purpose: 'private-presence-typing-canary' }
  });
  if (created.error || !created.data?.user?.id) fail('DOKE_COM_B03C_EPHEMERAL_AUTH_CREATE_FAILED');
  const userId = created.data.user.id;
  const materialized = await db.query(`select u.role, u.status,
    exists(select 1 from public.user_profiles up where up.user_id = u.id) as user_profile_present,
    exists(select 1 from public.client_profiles cp where cp.user_id = u.id) as client_profile_present
    from public.users u where u.id = $1::uuid`, [userId]);
  const row = materialized.rows[0];
  if (!row || row.role !== 'client' || row.status !== 'active' || row.user_profile_present !== true || row.client_profile_present !== true) {
    await admin.auth.admin.deleteUser(userId, false).catch(() => {});
    fail('DOKE_COM_B03C_CANONICAL_ACCOUNT_MATERIALIZATION_REQUIRED');
  }
  return { userId, email, password };
}
async function signInEphemeral(publishableKey, identity) {
  const client = createClient(`https://${readiness.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  const result = await client.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || !result.data?.session?.access_token || result.data?.user?.id !== identity.userId) fail('DOKE_COM_B03C_EPHEMERAL_LOGIN_FAILED');
  const token = result.data.session.access_token;
  const verified = await client.auth.getUser(token);
  if (verified.error || verified.data?.user?.id !== identity.userId) fail('DOKE_COM_B03C_SERVER_VERIFIED_SESSION_REQUIRED');
  await client.realtime.setAuth(token);
  return { client, accessToken: token, userId: identity.userId };
}
function policyIdentifier(prefix, nonce) { return `${prefix}_${nonce.replace(/[^a-f0-9]/g, '').slice(0, 24)}`; }
function quoteLiteral(value) { return `'${String(value).replace(/'/g, "''")}'`; }
async function installRealtimePolicies(db, userId, topics, nonce) {
  if (!/^[0-9a-f-]{36}$/i.test(String(userId))) fail('DOKE_COM_B03C_POLICY_USER_ID_INVALID');
  const presenceTopic = String(topics.channel_presence || '');
  const typingTopic = String(topics.channel_typing || '');
  const topicPattern = /^com:v1:(channel_presence|channel_typing):[a-f0-9]{32}$/;
  if (!topicPattern.test(presenceTopic) || !topicPattern.test(typingTopic) || presenceTopic === typingTopic) fail('DOKE_COM_B03C_POLICY_TOPIC_INVALID');
  const readPolicy = policyIdentifier('com_b03c_read', nonce);
  const writePolicy = policyIdentifier('com_b03c_write', nonce);
  const userSql = quoteLiteral(userId);
  const presenceSql = quoteLiteral(presenceTopic);
  const typingSql = quoteLiteral(typingTopic);
  const expression = `auth.uid() = ${userSql}::uuid and (
    (realtime.topic() = ${presenceSql} and realtime.messages.extension = 'presence') or
    (realtime.topic() = ${typingSql} and realtime.messages.extension = 'broadcast')
  )`;
  await db.query(`create policy ${readPolicy} on realtime.messages for select to authenticated using (${expression})`);
  try {
    await db.query(`create policy ${writePolicy} on realtime.messages for insert to authenticated with check (${expression})`);
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
  const result = await db.query(`select count(*)::int as count from pg_policies
    where schemaname = 'realtime' and tablename = 'messages' and policyname = any($1::text[])`,
  [[policies.readPolicy, policies.writePolicy]]);
  return Number(result.rows[0]?.count || 0) === 0;
}
function waitForSubscription(channel, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03C_SUBSCRIPTION_TIMEOUT'), { code: 'DOKE_COM_B03C_SUBSCRIPTION_TIMEOUT' })), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(status); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        reject(Object.assign(new Error('DOKE_COM_B03C_SUBSCRIPTION_FAILED'), { code: 'DOKE_COM_B03C_SUBSCRIPTION_FAILED', cause: error }));
      }
    });
  });
}
function waitForDeniedPrivateSubscription(channel, code, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('denied_timeout'), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timer);
        reject(Object.assign(new Error(code), { code }));
      }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        resolve(status);
      }
    });
  });
}
function waitForPresence(channel, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03C_PRESENCE_TIMEOUT'), { code: 'DOKE_COM_B03C_PRESENCE_TIMEOUT' })), timeoutMs);
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (state && Object.keys(state).length > 0) { clearTimeout(timer); resolve(state); }
    });
  });
}
function waitForBroadcast(channel, event, eventId, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03C_BROADCAST_TIMEOUT'), { code: 'DOKE_COM_B03C_BROADCAST_TIMEOUT' })), timeoutMs);
    channel.on('broadcast', { event }, (payload) => {
      if (JSON.stringify(payload).includes(eventId)) { clearTimeout(timer); resolve(payload); }
    });
  });
}
async function removeChannel(client, channel) { if (client && channel) await client.removeChannel(channel).catch(() => {}); }
async function cleanupIdentity(admin, identity, strict = true) {
  if (!identity || !admin) return;
  const result = await admin.auth.admin.deleteUser(identity.userId, false);
  if (result.error && strict) fail('DOKE_COM_B03C_EPHEMERAL_AUTH_CLEANUP_FAILED');
}
async function identityResidue(db, admin, identity) {
  if (!identity) return { publicUser: 0, userProfile: 0, clientProfile: 0, authUser: 0, total: 0 };
  let publicUser = -1; let userProfile = -1; let clientProfile = -1; let authUser = -1;
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
    validationId: 'COM-B03C-PRIVATE-PRESENCE-TYPING-STAGING-CANARY',
    contractId: readiness.CONTRACT_ID,
    status: 'failed_closed',
    authorization: { consumed: true, singleUse: true, reusableAfterFailure: false, r3AuthorizationReusable: false },
    scope: readiness.ALLOWED_SCOPE,
    blockedTopics: readiness.BLOCKED_TOPICS,
    effects: {
      communityPostsReexecuted: false,
      channelMessagesExecuted: false,
      domainMutationExecuted: false,
      publicationMutationExecuted: false,
      publicTrafficEnabled: false,
      runtimeDeployed: false,
      productionChanged: false,
      pullRequestMerged: false
    }
  };
  let dbConnection = null; let admin = null; let auth = null; let identity = null; let policies = null;
  const channels = [];
  try {
    requireEnvironment(env);
    const trigger = readTrigger();
    verifyEnvelope(trigger, env);
    const authorization = readiness.evaluateStagingAuthorization({
      authorizationPhrase: trigger.authorization.phrase,
      targetEnvironment: trigger.target.environment,
      projectId: trigger.target.projectId,
      branch: trigger.target.branch,
      pullRequest: trigger.target.pullRequest,
      authorizationConsumed: false,
      executionAttempted: false,
      r3AuthorizationReusable: trigger.authorization.r3AuthorizationReusable,
      scope: trigger.canary.scope,
      ephemeralAuthIdentityLifecycleAllowed: trigger.canary.ephemeralAuthIdentityLifecycleAllowed,
      authIdentityCleanupRequired: trigger.canary.authIdentityCleanupRequired,
      realtimeMessagesPolicyLifecycleAllowed: trigger.canary.realtimeMessagesPolicyLifecycleAllowed,
      realtimePolicyCleanupRequired: trigger.canary.realtimePolicyCleanupRequired,
      exactTopicAndExtensionPoliciesRequired: trigger.canary.exactTopicAndExtensionPoliciesRequired,
      privateChannelsOnly: trigger.canary.privateChannelsOnly,
      serverVerifiedSessionRequired: trigger.canary.serverVerifiedSessionRequired,
      anonymousDenialRequired: trigger.canary.anonymousDenialRequired,
      communityPostsExecutionAllowed: trigger.canary.communityPostsExecutionAllowed,
      channelMessagesExecutionAllowed: trigger.canary.channelMessagesExecutionAllowed,
      domainMutationAllowed: trigger.canary.domainMutationAllowed,
      publicationMutationAllowed: trigger.canary.publicationMutationAllowed,
      persistentResidueAllowed: trigger.canary.persistentResidueAllowed
    });
    exact(authorization.decision, 'authorized_for_single_bounded_private_presence_typing_staging_canary', 'DOKE_COM_B03C_CONTRACT_AUTHORIZATION_REJECTED');

    const pullRequest = await verifyPullRequest(env, trigger);
    const project = await verifyProject(env);
    const keys = await loadApiKeys(env);
    dbConnection = await connect(project, env.SUPABASE_DB_PASSWORD);
    const foundation = await verifyFoundation(dbConnection.client);
    admin = makeAdminClient(keys.adminKey);

    const nonce = crypto.randomBytes(10).toString('hex');
    identity = await createEphemeralIdentity(dbConnection.client, admin, nonce);
    auth = await signInEphemeral(keys.publishableKey, identity);

    const communityId = crypto.randomUUID();
    const channelId = `canary-${crypto.randomBytes(8).toString('hex')}`;
    const topics = {
      channel_presence: scalePolicy.buildChannelKey({ communityId, channelId, topic: 'channel_presence' }),
      channel_typing: scalePolicy.buildChannelKey({ communityId, channelId, topic: 'channel_typing' })
    };
    policies = await installRealtimePolicies(dbConnection.client, identity.userId, topics, nonce);

    const presenceChannel = auth.client.channel(topics.channel_presence, {
      config: { private: true, presence: { key: hash(identity.userId).slice(0, 16) } }
    });
    channels.push({ client: auth.client, channel: presenceChannel });
    const presencePromise = waitForPresence(presenceChannel);
    await waitForSubscription(presenceChannel);
    const trackResult = await presenceChannel.track({ canary: true, actor: hash(identity.userId).slice(0, 16), at: new Date().toISOString() });
    exact(trackResult, 'ok', 'DOKE_COM_B03C_PRESENCE_TRACK_FAILED');
    await presencePromise;

    const typingChannel = auth.client.channel(topics.channel_typing, {
      config: { private: true, broadcast: { self: true, ack: true } }
    });
    channels.push({ client: auth.client, channel: typingChannel });
    const typingEventId = crypto.randomUUID();
    const typingPromise = waitForBroadcast(typingChannel, 'typing_started', typingEventId);
    await waitForSubscription(typingChannel);
    const sendResult = await typingChannel.send({
      type: 'broadcast', event: 'typing_started',
      payload: { source: 'ephemeral_server_verified_session', eventId: typingEventId, actor: hash(identity.userId).slice(0, 16) }
    });
    exact(sendResult, 'ok', 'DOKE_COM_B03C_TYPING_BROADCAST_FAILED');
    await typingPromise;

    const anonClient = createClient(`https://${readiness.REQUIRED_PROJECT_ID}.supabase.co`, keys.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    const anonPresence = anonClient.channel(topics.channel_presence, { config: { private: true, presence: { key: 'anonymous-canary' } } });
    const anonPresenceDecision = await waitForDeniedPrivateSubscription(anonPresence, 'DOKE_COM_B03C_ANON_PRIVATE_PRESENCE_ALLOWED');
    await removeChannel(anonClient, anonPresence);
    const anonTyping = anonClient.channel(topics.channel_typing, { config: { private: true } });
    const anonTypingDecision = await waitForDeniedPrivateSubscription(anonTyping, 'DOKE_COM_B03C_ANON_PRIVATE_TYPING_ALLOWED');
    await removeChannel(anonClient, anonTyping);

    for (const entry of channels.splice(0)) await removeChannel(entry.client, entry.channel);
    await auth.client.auth.signOut().catch(() => {});
    await dropRealtimePolicies(dbConnection.client, policies);
    const policiesRemoved = await realtimePoliciesGone(dbConnection.client, policies);
    exact(policiesRemoved, true, 'DOKE_COM_B03C_POLICY_CLEANUP_FAILED');
    await cleanupIdentity(admin, identity, true);
    const iResidue = await identityResidue(dbConnection.client, admin, identity);
    exact(iResidue.total, 0, 'DOKE_COM_B03C_IDENTITY_RESIDUE_DETECTED');

    writeReport({
      ...baseReport,
      status: 'authenticated_private_presence_and_typing_canary_passed',
      execution: { triggerHead: env.GITHUB_SHA, workflowInstallHead: trigger.workflowInstallHead, runId: Number(env.GITHUB_RUN_ID || 0), runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1), result: 'success' },
      pullRequest,
      project: { id: project.id, name: project.name, status: project.status, region: project.region },
      connection: { transport: 'postgres_tls', hostClass: dbConnection.hostClass, credentialsExposed: false },
      identity: { source: 'com_owned_ephemeral_supabase_auth_identity', role: 'client', userIdSha256: hash(identity.userId), emailSha256: hash(identity.email), rawIdentifierExposed: false, rawCredentialExposed: false },
      foundation: { messagesPresent: foundation.messages_present, topicFunctionPresent: foundation.topic_function_present, messagesRlsEnabled: foundation.messages_rls_enabled },
      result: {
        exactScopeEnforced: true,
        communityPostsNotReexecuted: true,
        channelMessagesExcluded: true,
        channelPresence: { transport: 'private_presence', authenticatedPrivateSubscription: true, tracked: true, syncObserved: true, anonymousPrivateSubscriptionDenied: true, anonymousDecision: anonPresenceDecision },
        channelTyping: { transport: 'private_broadcast', authenticatedPrivateSubscription: true, sent: true, received: true, anonymousPrivateSubscriptionDenied: true, anonymousDecision: anonTypingDecision },
        exactTopicAndExtensionPoliciesApplied: true,
        temporaryPoliciesRemoved: true,
        channelsRemoved: true,
        ephemeralAuthIdentityRemoved: true,
        persistentIdentityResidue: iResidue.total,
        persistentDomainResidue: 0
      },
      effects: {
        communityPostsReexecuted: false,
        channelMessagesExecuted: false,
        domainMutationExecuted: false,
        publicationMutationExecuted: false,
        ephemeralAuthIdentityLifecycleExecuted: true,
        temporaryRealtimePolicyLifecycleExecuted: true,
        privateEphemeralRealtimeChannelsCreated: true,
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
    if (dbConnection?.client && policies) await dropRealtimePolicies(dbConnection.client, policies);
    const policiesRemoved = dbConnection?.client && policies ? await realtimePoliciesGone(dbConnection.client, policies).catch(() => false) : true;
    if (identity && admin) await cleanupIdentity(admin, identity, false);
    const iResidue = identity ? await identityResidue(dbConnection?.client, admin, identity).catch(() => ({ total: -1 })) : { total: 0 };
    writeReport({
      ...baseReport,
      error: safeError(error),
      cleanup: { temporaryPoliciesRemoved: policiesRemoved, ephemeralAuthIdentityRemoved: iResidue.total === 0, persistentIdentityResidue: iResidue.total, persistentDomainResidue: 0 },
      effects: { ...baseReport.effects, ephemeralAuthIdentityLifecycleMayHaveExecuted: Boolean(identity), temporaryRealtimePolicyLifecycleMayHaveExecuted: Boolean(policies) }
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

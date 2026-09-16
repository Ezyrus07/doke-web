#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const scalePolicy = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const readiness = require('../backend/modules/communities/community-realtime-publication-subscription-readiness');

const TRIGGER_PATH = 'config/com-b03b-realtime-publication-authenticated-subscription-staging-trigger.json';
const EXPECTED_TRIGGER_CONTRACT = 'com-b03b-realtime-publication-authenticated-subscription-staging-trigger-v1';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const EXPECTED_BRANCH = 'com/com-001-baseline-audit';
const EXPECTED_PR = 61;
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_EMAIL = 'cliente@doke.local';
const REQUIRED_SCOPE = Object.freeze(['community_posts', 'channel_presence', 'channel_typing']);
const EXCLUDED_SCOPE = Object.freeze(['channel_messages']);
const REPORT_PATH = path.resolve(process.env.COM_B03B_REPORT_PATH ||
  'reports/generated/COM-B03B-REALTIME-PUBLICATION-AUTHENTICATED-SUBSCRIPTION-STAGING-CANARY.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function stableArray(value) { return Array.isArray(value) ? [...value].map(String).sort() : []; }
function safeError(error) {
  const code = String(error?.code || error?.message || 'DOKE_COM_B03B_UNEXPECTED_FAILURE');
  return /^(DOKE|COM)_[A-Z0-9_]+$/.test(code)
    ? { code, message: code }
    : { code: 'DOKE_COM_B03B_UNEXPECTED_FAILURE', message: 'COM-B03B staging Realtime canary failed closed.' };
}
function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}
function readTrigger() {
  if (!fs.existsSync(TRIGGER_PATH)) fail('DOKE_COM_B03B_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER_PATH, 'utf8'));
}
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch (_) { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch (_) { fail(code); }
}
function requireEnvironment(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03B_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03B_DB_PASSWORD_MISSING');
  if (!env.DOKE_STAGING_CLIENT_PASSWORD) fail('DOKE_COM_B03B_CANARY_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_ENV_PROJECT_MISMATCH');
  exact(env.COM_B03B_AUTHORIZATION, readiness.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_ENV_AUTHORIZATION_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03B_WORKFLOW_RERUN_BLOCKED');
}
function verifyEnvelope(trigger, env) {
  exact(trigger.contractId, EXPECTED_TRIGGER_CONTRACT, 'DOKE_COM_B03B_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03B_TRIGGER_NOT_PENDING');
  exact(trigger.authorization?.phrase, readiness.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_AUTHORIZATION_MISMATCH');
  exact(trigger.authorization?.received, true, 'DOKE_COM_B03B_AUTHORIZATION_NOT_RECEIVED');
  exact(trigger.authorization?.consumed, true, 'DOKE_COM_B03B_AUTHORIZATION_NOT_CONSUMED');
  exact(trigger.authorization?.singleUse, true, 'DOKE_COM_B03B_SINGLE_USE_REQUIRED');
  exact(trigger.authorization?.reusableAfterFailure, false, 'DOKE_COM_B03B_REUSE_PROHIBITED');
  exact(trigger.authorization?.executionAttempted, true, 'DOKE_COM_B03B_EXECUTION_ATTEMPT_REQUIRED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03B_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || ''))) fail('DOKE_COM_B03B_TRIGGER_HEAD_INVALID');
  if (trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03B_TRIGGER_HEAD_NOT_DISTINCT');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03B_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_PROJECT_MISMATCH');
  exact(trigger.target?.branch, EXPECTED_BRANCH, 'DOKE_COM_B03B_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, EXPECTED_PR, 'DOKE_COM_B03B_PR_MISMATCH');
  assert.deepEqual(stableArray(trigger.canary?.scope), stableArray(REQUIRED_SCOPE), 'DOKE_COM_B03B_SCOPE_MISMATCH');
  assert.deepEqual(stableArray(trigger.canary?.excludedTopics), stableArray(EXCLUDED_SCOPE), 'DOKE_COM_B03B_EXCLUDED_SCOPE_MISMATCH');
  exact(trigger.canary?.privateChannelsOnly, true, 'DOKE_COM_B03B_PRIVATE_CHANNELS_REQUIRED');
  exact(trigger.canary?.serverVerifiedSessionRequired, true, 'DOKE_COM_B03B_SERVER_VERIFIED_SESSION_REQUIRED');
  exact(trigger.canary?.publicRealtimeChannelAllowed, false, 'DOKE_COM_B03B_PUBLIC_CHANNEL_PROHIBITED');
  exact(trigger.canary?.persistentDomainMutationAllowed, false, 'DOKE_COM_B03B_DOMAIN_MUTATION_PROHIBITED');
  if (stableArray(trigger.canary?.scope).includes('channel_messages')) fail('DOKE_COM_B03B_CHANNEL_MESSAGES_PROHIBITED');
}
async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03b-staging-canary' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pull = await fetchJson(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${EXPECTED_PR}`, { headers }, 'DOKE_COM_B03B_PR_PREFLIGHT_FAILED');
  exact(pull.state, 'open', 'DOKE_COM_B03B_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B03B_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B03B_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B03B_AUTO_MERGE_ENABLED');
  exact(pull.head?.ref, EXPECTED_BRANCH, 'DOKE_COM_B03B_PR_BRANCH_MISMATCH');
  exact(pull.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03B_PR_SHA_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha, installHead: trigger.workflowInstallHead };
}
async function verifyProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-staging-canary' }
  }, 'DOKE_COM_B03B_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B03B_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03B_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03B_PROJECT_REGION_INVALID');
  const directHost = project.database?.host || null;
  if (directHost && directHost !== `db.${REQUIRED_PROJECT_ID}.supabase.co`) fail('DOKE_COM_B03B_DATABASE_HOST_MISMATCH');
  return { id: project.id, name: project.name, status: project.status, region, directHost };
}
async function loadPublishableKey(env) {
  const keys = await fetchJson(`https://api.supabase.com/v1/projects/${REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-staging-canary' }
  }, 'DOKE_COM_B03B_API_KEYS_PREFLIGHT_FAILED');
  const list = Array.isArray(keys) ? keys : Array.isArray(keys?.data) ? keys.data : [];
  const candidate = list.find((item) => {
    const label = `${item?.name || ''} ${item?.type || ''}`.toLowerCase();
    return label.includes('publishable') || label.includes('anon');
  });
  const key = String(candidate?.api_key || candidate?.key || candidate?.value || '').trim();
  if (!key) fail('DOKE_COM_B03B_PUBLISHABLE_KEY_NOT_FOUND');
  return key;
}
async function connect(project, password) {
  const candidates = [`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean);
  for (const host of [...new Set(candidates)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host, port: 5432, user: direct ? 'postgres' : `postgres.${REQUIRED_PROJECT_ID}`,
      password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000,
      application_name: 'doke-com-b03b-realtime-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03B_DATABASE_CONNECTION_FAILED');
}
async function verifyRealtimeFoundation(client) {
  const result = await client.query(`select
    to_regclass('realtime.messages') is not null as messages_present,
    to_regprocedure('realtime.topic()') is not null as topic_function_present,
    to_regprocedure('realtime.send(jsonb,text,text,boolean)') is not null as send_function_present,
    exists(select 1 from pg_publication_tables where schemaname = 'realtime' and tablename = 'messages') as messages_published,
    (select relrowsecurity from pg_class where oid = 'realtime.messages'::regclass) as messages_rls_enabled`);
  const row = result.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B03B_REALTIME_FOUNDATION_GATE_FAILED');
  return row;
}
async function signInCanary(publishableKey, password) {
  const client = createClient(`https://${REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  const result = await client.auth.signInWithPassword({ email: REQUIRED_EMAIL, password });
  if (result.error || !result.data?.session?.access_token || !result.data?.user?.id) fail('DOKE_COM_B03B_SYNTHETIC_LOGIN_FAILED');
  const verified = await client.auth.getUser(result.data.session.access_token);
  if (verified.error || verified.data?.user?.id !== result.data.user.id) fail('DOKE_COM_B03B_SERVER_VERIFIED_SESSION_REQUIRED');
  await client.realtime.setAuth(result.data.session.access_token);
  return { client, userId: result.data.user.id, accessToken: result.data.session.access_token };
}
async function verifyCanonicalActor(db, userId) {
  const result = await db.query(`select u.status, u.role from public.users u where u.id = $1::uuid`, [userId]);
  const row = result.rows[0];
  if (!row || row.status !== 'active') fail('DOKE_COM_B03B_ACTIVE_CANARY_ACTOR_REQUIRED');
  return { status: row.status, role: row.role || 'client' };
}
function policyIdentifier(prefix, nonce) { return `${prefix}_${nonce.replace(/[^a-f0-9]/g, '').slice(0, 24)}`; }
function quoteLiteral(value) { return `'${String(value).replace(/'/g, "''")}'`; }
async function installPolicies(db, userId, topics, nonce) {
  if (!/^[0-9a-f-]{36}$/i.test(String(userId))) fail('DOKE_COM_B03B_POLICY_USER_ID_INVALID');
  if (!topics.every((topic) => /^com:v1:[a-z_]+:[a-f0-9]{32}$/.test(String(topic)))) fail('DOKE_COM_B03B_POLICY_TOPIC_INVALID');
  const readPolicy = policyIdentifier('com_b03b_canary_read', nonce);
  const writePolicy = policyIdentifier('com_b03b_canary_write', nonce);
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
async function dropPolicies(db, policies) {
  if (!db || !policies) return;
  await db.query(`drop policy if exists ${policies.readPolicy} on realtime.messages`).catch(() => {});
  await db.query(`drop policy if exists ${policies.writePolicy} on realtime.messages`).catch(() => {});
}
async function policiesGone(db, policies) {
  if (!db || !policies) return true;
  const result = await db.query(`select count(*)::int as count from pg_policies where schemaname = 'realtime' and tablename = 'messages' and policyname = any($1::text[])`, [[policies.readPolicy, policies.writePolicy]]);
  return Number(result.rows[0]?.count || 0) === 0;
}
function waitForSubscription(channel, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_SUBSCRIPTION_TIMEOUT'), { code: 'DOKE_COM_B03B_SUBSCRIPTION_TIMEOUT' })), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(status); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer); reject(Object.assign(new Error('DOKE_COM_B03B_PRIVATE_SUBSCRIPTION_FAILED'), { code: 'DOKE_COM_B03B_PRIVATE_SUBSCRIPTION_FAILED', cause: error }));
      }
    });
  });
}
function waitForDeniedSubscription(channel, timeoutMs = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve('denied_timeout'), timeoutMs);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); reject(Object.assign(new Error('DOKE_COM_B03B_ANON_PRIVATE_SUBSCRIPTION_UNEXPECTEDLY_ALLOWED'), { code: 'DOKE_COM_B03B_ANON_PRIVATE_SUBSCRIPTION_UNEXPECTEDLY_ALLOWED' })); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); resolve(status); }
    });
  });
}
function waitForBroadcast(channel, event, matcher, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_BROADCAST_TIMEOUT'), { code: 'DOKE_COM_B03B_BROADCAST_TIMEOUT' })), timeoutMs);
    channel.on('broadcast', { event }, (payload) => {
      if (!matcher || matcher(payload)) { clearTimeout(timer); resolve(payload); }
    });
  });
}
function waitForPresence(channel, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_PRESENCE_TIMEOUT'), { code: 'DOKE_COM_B03B_PRESENCE_TIMEOUT' })), timeoutMs);
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (state && Object.keys(state).length > 0) { clearTimeout(timer); resolve(state); }
    });
  });
}
async function removeChannel(client, channel) { if (client && channel) await client.removeChannel(channel).catch(() => {}); }
async function run() {
  const env = process.env;
  const baseReport = {
    validationId: 'COM-B03B-REALTIME-PUBLICATION-AUTHENTICATED-SUBSCRIPTION-STAGING-CANARY',
    contractId: readiness.CONTRACT_ID,
    status: 'failed_closed',
    authorization: { consumed: true, singleUse: true, reusableAfterFailure: false },
    scope: REQUIRED_SCOPE,
    excludedTopics: EXCLUDED_SCOPE,
    effects: { publicTrafficEnabled: false, runtimeDeployed: false, productionChanged: false, pullRequestMerged: false }
  };
  let dbConnection = null;
  let auth = null;
  let policies = null;
  const channels = [];
  let topics = null;
  try {
    requireEnvironment(env); // No staging/network calls occur before secret/config fail-closed checks.
    const trigger = readTrigger();
    verifyEnvelope(trigger, env);
    const authorization = readiness.evaluateStagingCanaryAuthorization({
      authorizationPhrase: trigger.authorization.phrase,
      targetEnvironment: trigger.target.environment,
      projectId: trigger.target.projectId,
      branch: trigger.target.branch,
      pullRequest: trigger.target.pullRequest,
      authorizationConsumed: false,
      executionAttempted: false,
      privateChannelsOnly: trigger.canary.privateChannelsOnly,
      serverVerifiedSessionRequired: trigger.canary.serverVerifiedSessionRequired,
      publicRealtimeChannelAllowed: trigger.canary.publicRealtimeChannelAllowed,
      persistentDomainMutationAllowed: trigger.canary.persistentDomainMutationAllowed,
      scope: trigger.canary.scope
    });
    exact(authorization.decision, 'authorized_for_single_bounded_staging_canary', 'DOKE_COM_B03B_CONTRACT_AUTHORIZATION_REJECTED');
    const pullRequest = await verifyPullRequest(env, trigger);
    const project = await verifyProject(env);
    const publishableKey = await loadPublishableKey(env);
    dbConnection = await connect(project, env.SUPABASE_DB_PASSWORD);
    const foundation = await verifyRealtimeFoundation(dbConnection.client);
    auth = await signInCanary(publishableKey, env.DOKE_STAGING_CLIENT_PASSWORD);
    const actor = await verifyCanonicalActor(dbConnection.client, auth.userId);

    const syntheticCommunityId = crypto.randomUUID();
    const syntheticPostId = crypto.randomUUID();
    const channelId = `canary-${crypto.randomBytes(8).toString('hex')}`;
    const nonce = crypto.randomBytes(12).toString('hex');
    topics = {
      community_posts: scalePolicy.buildChannelKey({ communityId: syntheticCommunityId, channelId: null, topic: 'community_posts' }),
      channel_presence: scalePolicy.buildChannelKey({ communityId: syntheticCommunityId, channelId, topic: 'channel_presence' }),
      channel_typing: scalePolicy.buildChannelKey({ communityId: syntheticCommunityId, channelId, topic: 'channel_typing' })
    };
    if (Object.keys(topics).some((key) => key === 'channel_messages') || Object.values(topics).some((topic) => /channel_messages/.test(topic))) fail('DOKE_COM_B03B_CHANNEL_MESSAGES_PROHIBITED');

    const beforeDomain = await dbConnection.client.query('select count(*)::int as count from public.community_posts where id = $1::uuid', [syntheticPostId]);
    exact(Number(beforeDomain.rows[0]?.count || 0), 0, 'DOKE_COM_B03B_SYNTHETIC_POST_COLLISION');
    policies = await installPolicies(dbConnection.client, auth.userId, Object.values(topics), nonce);

    const postsChannel = auth.client.channel(topics.community_posts, { config: { private: true } });
    channels.push(postsChannel);
    const postEventId = crypto.randomUUID();
    const postPromise = waitForBroadcast(postsChannel, 'INSERT', (payload) => {
      const value = payload?.payload || payload;
      return String(value?.record?.id || value?.new?.id || value?.id || '') === syntheticPostId || JSON.stringify(value).includes(postEventId);
    });
    await waitForSubscription(postsChannel);
    await dbConnection.client.query(`select realtime.send($1::jsonb, 'INSERT', $2::text, true)`, [{
      source: 'server_authoritative_event', eventId: postEventId, topic: 'community_posts', type: 'post_published', sequence: 1,
      communityRevision: 1, schema: 'public', table: 'community_posts', operation: 'INSERT',
      record: { id: syntheticPostId, community_id: syntheticCommunityId, author_id: auth.userId, status: 'published' }
    }, topics.community_posts]);
    await postPromise;

    const presenceChannel = auth.client.channel(topics.channel_presence, { config: { private: true, presence: { key: hash(auth.userId).slice(0, 16) } } });
    channels.push(presenceChannel);
    const presencePromise = waitForPresence(presenceChannel);
    await waitForSubscription(presenceChannel);
    const trackResult = await presenceChannel.track({ canary: true, actor: hash(auth.userId).slice(0, 16), at: new Date().toISOString() });
    if (trackResult !== 'ok') fail('DOKE_COM_B03B_PRESENCE_TRACK_FAILED');
    await presencePromise;

    const typingChannel = auth.client.channel(topics.channel_typing, { config: { private: true, broadcast: { self: true, ack: true } } });
    channels.push(typingChannel);
    const typingEventId = crypto.randomUUID();
    const typingPromise = waitForBroadcast(typingChannel, 'typing_started', (payload) => JSON.stringify(payload).includes(typingEventId));
    await waitForSubscription(typingChannel);
    const sendResult = await typingChannel.send({ type: 'broadcast', event: 'typing_started', payload: { source: 'server_verified_session', eventId: typingEventId, actor: hash(auth.userId).slice(0, 16) } });
    if (sendResult !== 'ok') fail('DOKE_COM_B03B_TYPING_BROADCAST_FAILED');
    await typingPromise;

    const anonClient = createClient(`https://${REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const anonChannel = anonClient.channel(topics.channel_typing, { config: { private: true } });
    const anonDecision = await waitForDeniedSubscription(anonChannel);
    await removeChannel(anonClient, anonChannel);

    const afterDomain = await dbConnection.client.query('select count(*)::int as count from public.community_posts where id = $1::uuid', [syntheticPostId]);
    exact(Number(afterDomain.rows[0]?.count || 0), 0, 'DOKE_COM_B03B_PERSISTENT_DOMAIN_MUTATION_DETECTED');

    for (const channel of channels.splice(0)) await removeChannel(auth.client, channel);
    await auth.client.auth.signOut().catch(() => {});
    await dropPolicies(dbConnection.client, policies);
    const cleanupPassed = await policiesGone(dbConnection.client, policies);
    exact(cleanupPassed, true, 'DOKE_COM_B03B_POLICY_CLEANUP_FAILED');

    const report = {
      ...baseReport,
      status: 'authenticated_private_realtime_canary_passed',
      execution: { triggerHead: env.GITHUB_SHA, workflowInstallHead: trigger.workflowInstallHead, runId: Number(env.GITHUB_RUN_ID || 0), runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1), result: 'success' },
      pullRequest,
      project: { id: project.id, name: project.name, status: project.status, region: project.region },
      connection: { transport: 'postgres_tls', hostClass: dbConnection.hostClass, credentialsExposed: false },
      actor: { source: 'server_verified_authenticated_session', role: actor.role, status: actor.status, actorSha256: hash(auth.userId), rawIdentifierExposed: false },
      foundation,
      result: {
        exactScopeEnforced: true,
        channelMessagesExcluded: true,
        communityPosts: { transport: 'private_broadcast_from_database', databaseOriginated: true, privateSubscriptionAuthenticated: true, delivered: true, domainRowsPersisted: 0 },
        channelPresence: { transport: 'private_presence', privateSubscriptionAuthenticated: true, tracked: true, syncObserved: true },
        channelTyping: { transport: 'private_broadcast', privateSubscriptionAuthenticated: true, sent: true, received: true },
        anonymousPrivateSubscriptionDenied: true,
        anonymousDecision: anonDecision,
        temporaryPoliciesRemoved: true,
        channelsRemoved: true,
        persistentDomainMutation: false,
        realtimeTransportMessagesManagedByPlatformRetention: true
      },
      topicFingerprints: Object.fromEntries(Object.entries(topics).map(([key, value]) => [key, hash(value)])),
      effects: { stagingRealtimeAuthorizationTemporarilyChanged: true, realtimePrivateChannelsCreated: true, databaseBroadcastExecuted: true, persistentDomainMutationExecuted: false, publicTrafficEnabled: false, runtimeDeployed: false, productionChanged: false, pullRequestMerged: false }
    };
    writeReport(report);
  } catch (error) {
    if (auth?.client) {
      for (const channel of channels.splice(0)) await removeChannel(auth.client, channel);
      await auth.client.auth.signOut().catch(() => {});
    }
    if (dbConnection?.client && policies) await dropPolicies(dbConnection.client, policies);
    const cleanupPassed = dbConnection?.client && policies ? await policiesGone(dbConnection.client, policies).catch(() => false) : true;
    writeReport({ ...baseReport, error: safeError(error), cleanup: { temporaryPoliciesRemoved: cleanupPassed }, topicFingerprints: topics ? Object.fromEntries(Object.entries(topics).map(([key, value]) => [key, hash(value)])) : null });
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

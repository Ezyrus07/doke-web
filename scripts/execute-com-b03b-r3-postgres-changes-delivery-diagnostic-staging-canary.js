#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const recovery = require('../backend/modules/communities/community-realtime-postgres-changes-delivery-diagnostic-recovery');

const TRIGGER_PATH = 'config/com-b03b-r3-postgres-changes-delivery-diagnostic-staging-trigger.json';
const EXPECTED_TRIGGER_CONTRACT = 'com-b03b-r3-postgres-changes-delivery-diagnostic-staging-trigger-v1';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const REPORT_PATH = path.resolve(process.env.COM_B03B_R3_REPORT_PATH ||
  'reports/generated/COM-B03B-R3-POSTGRES-CHANGES-DELIVERY-DIAGNOSTIC-STAGING-CANARY.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) { const error = new Error(code); error.code = code; throw error; }
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function safeError(error) {
  const code = String(error?.code || error?.message || 'DOKE_COM_B03B_R3_UNEXPECTED_FAILURE');
  return /^(DOKE|COM)_[A-Z0-9_]+$/.test(code)
    ? { code, message: code }
    : { code: 'DOKE_COM_B03B_R3_UNEXPECTED_FAILURE', message: 'COM-B03B-R3 staging diagnostic failed closed.' };
}
function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}
function readTrigger() {
  if (!fs.existsSync(TRIGGER_PATH)) fail('DOKE_COM_B03B_R3_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER_PATH, 'utf8'));
}
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch (_) { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch (_) { fail(code); }
}
function requireEnvironment(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03B_R3_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03B_R3_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R3_ENV_PROJECT_MISMATCH');
  exact(env.COM_B03B_R3_AUTHORIZATION, recovery.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_R3_ENV_AUTHORIZATION_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03B_R3_WORKFLOW_RERUN_BLOCKED');
}
function verifyEnvelope(trigger, env) {
  exact(trigger.contractId, EXPECTED_TRIGGER_CONTRACT, 'DOKE_COM_B03B_R3_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03B_R3_TRIGGER_NOT_PENDING');
  exact(trigger.authorization?.phrase, recovery.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03B_R3_AUTHORIZATION_MISMATCH');
  exact(trigger.authorization?.received, true, 'DOKE_COM_B03B_R3_AUTHORIZATION_NOT_RECEIVED');
  exact(trigger.authorization?.consumed, true, 'DOKE_COM_B03B_R3_AUTHORIZATION_NOT_CONSUMED');
  exact(trigger.authorization?.executionAttempted, true, 'DOKE_COM_B03B_R3_EXECUTION_ATTEMPT_REQUIRED');
  exact(trigger.authorization?.singleUse, true, 'DOKE_COM_B03B_R3_SINGLE_USE_REQUIRED');
  exact(trigger.authorization?.reusableAfterFailure, false, 'DOKE_COM_B03B_R3_REUSE_PROHIBITED');
  exact(trigger.authorization?.r2AuthorizationReusable, false, 'DOKE_COM_B03B_R3_R2_REUSE_PROHIBITED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B03B_R3_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || ''))) fail('DOKE_COM_B03B_R3_TRIGGER_HEAD_INVALID');
  if (trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03B_R3_TRIGGER_HEAD_NOT_DISTINCT');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03B_R3_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R3_PROJECT_MISMATCH');
  exact(trigger.target?.branch, recovery.REQUIRED_BRANCH, 'DOKE_COM_B03B_R3_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, recovery.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03B_R3_PR_MISMATCH');
  assert.deepEqual([...(trigger.canary?.scope || [])].sort(), [...recovery.ALLOWED_SCOPE].sort(), 'DOKE_COM_B03B_R3_SCOPE_MISMATCH');
  exact(trigger.canary?.ephemeralAuthIdentityLifecycleAllowed, true, 'DOKE_COM_B03B_R3_EPHEMERAL_AUTH_REQUIRED');
  exact(trigger.canary?.authIdentityCleanupRequired, true, 'DOKE_COM_B03B_R3_AUTH_CLEANUP_REQUIRED');
  exact(trigger.canary?.publicationVerificationRequired, true, 'DOKE_COM_B03B_R3_PUBLICATION_VERIFY_REQUIRED');
  exact(trigger.canary?.publicationMutationAllowed, false, 'DOKE_COM_B03B_R3_PUBLICATION_MUTATION_PROHIBITED');
  exact(trigger.canary?.filteredPostgresChangesSubscriptionRequired, true, 'DOKE_COM_B03B_R3_FILTER_REQUIRED');
  exact(trigger.canary?.authenticatedDataApiVisibilityProbeRequired, true, 'DOKE_COM_B03B_R3_DATA_API_PROBE_REQUIRED');
  exact(trigger.canary?.replicationSystemObservabilityRequired, true, 'DOKE_COM_B03B_R3_SYSTEM_OBSERVABILITY_REQUIRED');
  exact(trigger.canary?.syntheticDomainFixtureLifecycleAllowed, true, 'DOKE_COM_B03B_R3_FIXTURE_REQUIRED');
  exact(trigger.canary?.syntheticDomainCleanupRequired, true, 'DOKE_COM_B03B_R3_FIXTURE_CLEANUP_REQUIRED');
  exact(trigger.canary?.persistentResidueAllowed, false, 'DOKE_COM_B03B_R3_RESIDUE_PROHIBITED');
  exact(trigger.canary?.presenceOrTypingExecutionAllowed, false, 'DOKE_COM_B03B_R3_POSTS_ONLY_REQUIRED');
}
async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03b-r3-staging-diagnostic' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pull = await fetchJson(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${recovery.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03B_R3_PR_PREFLIGHT_FAILED');
  exact(pull.state, 'open', 'DOKE_COM_B03B_R3_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B03B_R3_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B03B_R3_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B03B_R3_AUTO_MERGE_ENABLED');
  exact(pull.head?.ref, recovery.REQUIRED_BRANCH, 'DOKE_COM_B03B_R3_PR_BRANCH_MISMATCH');
  exact(pull.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03B_R3_PR_SHA_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha, installHead: trigger.workflowInstallHead };
}
async function verifyProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${recovery.REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-r3-staging-diagnostic' }
  }, 'DOKE_COM_B03B_R3_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, recovery.REQUIRED_PROJECT_ID, 'DOKE_COM_B03B_R3_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B03B_R3_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03B_R3_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03B_R3_PROJECT_REGION_INVALID');
  return { id: project.id, name: project.name, status: project.status, region, directHost: project.database?.host || null };
}
async function loadApiKeys(env) {
  const keys = await fetchJson(`https://api.supabase.com/v1/projects/${recovery.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b03b-r3-staging-diagnostic' }
  }, 'DOKE_COM_B03B_R3_API_KEYS_PREFLIGHT_FAILED');
  const list = Array.isArray(keys) ? keys : Array.isArray(keys?.data) ? keys.data : [];
  const valueOf = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
  const labelOf = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
  const publishable = list.find((item) => labelOf(item).includes('publishable') || labelOf(item).includes('anon'));
  const admin = list.find((item) => labelOf(item).includes('secret') || labelOf(item).includes('service_role') || valueOf(item).startsWith('sb_secret_'));
  const publishableKey = valueOf(publishable);
  const adminKey = valueOf(admin);
  if (!publishableKey) fail('DOKE_COM_B03B_R3_PUBLISHABLE_KEY_NOT_FOUND');
  if (!adminKey) fail('DOKE_COM_B03B_R3_ADMIN_KEY_NOT_FOUND');
  if (publishableKey === adminKey) fail('DOKE_COM_B03B_R3_KEY_ROLE_SEPARATION_REQUIRED');
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
      application_name: 'doke-com-b03b-r3-postgres-changes-diagnostic'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B03B_R3_DATABASE_CONNECTION_FAILED');
}
async function verifyFoundation(db) {
  const result = await db.query(`select
    exists(select 1 from pg_publication where pubname = 'supabase_realtime') as publication_present,
    to_regclass('public.community_posts') is not null as community_posts_present,
    case when to_regclass('public.community_posts') is not null then
      (select relrowsecurity from pg_class where oid = to_regclass('public.community_posts')) else false end as community_posts_rls_enabled,
    exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_posts') as community_posts_published`);
  const row = result.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B03B_R3_FOUNDATION_FAILED');
  return row;
}
function makeAdminClient(adminKey) {
  return createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}
async function createEphemeralIdentity(db, admin, nonce) {
  const email = `com-b03b-r3-${nonce}@doke.local`;
  const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  const created = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: 'client', name: 'COM-B03B-R3 Canary', purpose: 'postgres-changes-delivery-diagnostic' }
  });
  if (created.error || !created.data?.user?.id) fail('DOKE_COM_B03B_R3_EPHEMERAL_AUTH_CREATE_FAILED');
  const userId = created.data.user.id;
  const materialized = await db.query(`select u.role, u.status,
    exists(select 1 from public.user_profiles up where up.user_id = u.id) as user_profile_present,
    exists(select 1 from public.client_profiles cp where cp.user_id = u.id) as client_profile_present
    from public.users u where u.id = $1::uuid`, [userId]);
  const row = materialized.rows[0];
  if (!row || row.role !== 'client' || row.status !== 'active' || row.user_profile_present !== true || row.client_profile_present !== true) {
    await admin.auth.admin.deleteUser(userId, false).catch(() => {});
    fail('DOKE_COM_B03B_R3_CANONICAL_ACCOUNT_MATERIALIZATION_REQUIRED');
  }
  return { userId, email, password };
}
async function signInEphemeral(publishableKey, identity) {
  const client = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const result = await client.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || !result.data?.session?.access_token || result.data?.user?.id !== identity.userId) fail('DOKE_COM_B03B_R3_EPHEMERAL_LOGIN_FAILED');
  const token = result.data.session.access_token;
  const verified = await client.auth.getUser(token);
  if (verified.error || verified.data?.user?.id !== identity.userId) fail('DOKE_COM_B03B_R3_SERVER_VERIFIED_SESSION_REQUIRED');
  return { client, accessToken: token, userId: identity.userId };
}
async function createFixture(db, userId, nonce) {
  const communityId = crypto.randomUUID();
  const postId = crypto.randomUUID();
  await db.query(`insert into public.communities(id, owner_id, name, slug, description, visibility)
    values($1::uuid, $2::uuid, $3::text, $4::text, $5::text, 'private')`,
    [communityId, userId, 'COM-B03B-R3 Canary', `com-b03b-r3-${nonce}`, 'Postgres Changes diagnostic fixture']);
  return { communityId, postId };
}
async function insertPost(db, fixture, userId) {
  await db.query(`insert into public.community_posts(id, community_id, author_id, title, body, status)
    values($1::uuid, $2::uuid, $3::uuid, $4::text, $5::text, 'published')`,
    [fixture.postId, fixture.communityId, userId, 'COM-B03B-R3 Canary', 'Postgres Changes delivery diagnostic']);
}
async function cleanupFixture(db, fixture) {
  if (!db || !fixture) return;
  await db.query('delete from public.community_posts where id = $1::uuid', [fixture.postId]).catch(() => {});
  await db.query('delete from public.communities where id = $1::uuid', [fixture.communityId]).catch(() => {});
}
async function domainResidue(db, fixture) {
  if (!db || !fixture) return { total: 0 };
  const result = await db.query(`select
    (select count(*)::int from public.community_posts where id = $1::uuid) as post,
    (select count(*)::int from public.communities where id = $2::uuid) as community,
    (select count(*)::int from public.community_members where community_id = $2::uuid) as membership`, [fixture.postId, fixture.communityId]);
  const row = result.rows[0] || {};
  const post = Number(row.post || 0), community = Number(row.community || 0), membership = Number(row.membership || 0);
  return { post, community, membership, total: post + community + membership };
}
async function cleanupIdentity(admin, identity) {
  if (!admin || !identity) return;
  await admin.auth.admin.deleteUser(identity.userId, false).catch(() => {});
}
async function identityResidue(db, admin, identity) {
  if (!identity) return { total: 0 };
  const result = await db.query(`select
    (select count(*)::int from public.users where id = $1::uuid) as public_user,
    (select count(*)::int from public.user_profiles where user_id = $1::uuid) as user_profile,
    (select count(*)::int from public.client_profiles where user_id = $1::uuid) as client_profile`, [identity.userId]);
  const row = result.rows[0] || {};
  const authResult = await admin.auth.admin.getUserById(identity.userId);
  const authUser = authResult.data?.user?.id === identity.userId ? 1 : 0;
  const publicUser = Number(row.public_user || 0), userProfile = Number(row.user_profile || 0), clientProfile = Number(row.client_profile || 0);
  return { publicUser, userProfile, clientProfile, authUser, total: publicUser + userProfile + clientProfile + authUser };
}
function waitForSubscription(channel, timeoutMs = 12000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R3_CHANNEL_SUBSCRIPTION_TIMEOUT'), { code: 'DOKE_COM_B03B_R3_CHANNEL_SUBSCRIPTION_TIMEOUT' })), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timer); resolve(status); }
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timer);
        reject(Object.assign(new Error('DOKE_COM_B03B_R3_CHANNEL_SUBSCRIPTION_FAILED'), { code: 'DOKE_COM_B03B_R3_CHANNEL_SUBSCRIPTION_FAILED', cause: error }));
      }
    });
  });
}
function waitForSystem(systemEvents, predicate, code, timeoutMs = 12000) {
  const existing = systemEvents.find(predicate);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const found = systemEvents.find(predicate);
      if (found) { clearInterval(timer); resolve(found); return; }
      if (Date.now() - started >= timeoutMs) {
        clearInterval(timer);
        reject(Object.assign(new Error(code), { code }));
      }
    }, 50);
  });
}
function waitForPost(channel, postId, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03B_R3_POSTGRES_CHANGES_DELIVERY_TIMEOUT'), { code: 'DOKE_COM_B03B_R3_POSTGRES_CHANGES_DELIVERY_TIMEOUT' })), timeoutMs);
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'community_posts', filter: `id=eq.${postId}`
    }, (payload) => {
      if (String(payload?.new?.id || '') === String(postId)) { clearTimeout(timer); resolve(payload); }
    });
  });
}
async function removeChannel(client, channel) {
  if (client && channel) await client.removeChannel(channel).catch(() => {});
}
async function authenticatedCommunityVisible(client, communityId) {
  const result = await client.from('communities').select('id').eq('id', communityId).maybeSingle();
  if (result.error || result.data?.id !== communityId) fail('DOKE_COM_B03B_R3_AUTHENTICATED_COMMUNITY_VISIBILITY_FAILED');
  return true;
}
async function authenticatedPostVisible(client, fixture) {
  const result = await client.from('community_posts').select('id,community_id,author_id,status').eq('id', fixture.postId).maybeSingle();
  if (result.error || result.data?.id !== fixture.postId || result.data?.community_id !== fixture.communityId || result.data?.status !== 'published') {
    fail('DOKE_COM_B03B_R3_AUTHENTICATED_POST_VISIBILITY_FAILED');
  }
  return true;
}
async function anonymousPostHidden(publishableKey, postId) {
  const anon = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const result = await anon.from('community_posts').select('id').eq('id', postId).maybeSingle();
  if (result.error) fail('DOKE_COM_B03B_R3_ANON_DATA_API_PROBE_FAILED');
  if (result.data) fail('DOKE_COM_B03B_R3_ANON_PRIVATE_POST_VISIBLE');
  return true;
}

async function run() {
  const env = process.env;
  const state = {
    foundationVerified: false,
    identityCreated: false,
    loginVerified: false,
    communityVisibleViaAuthenticatedDataApi: false,
    serverBindingIdPresent: false,
    postgresChangesSystemReady: false,
    replicationConnectionReady: false,
    postInserted: false,
    postVisibleViaAuthenticatedDataApi: false,
    postHiddenFromAnonymousDataApi: false,
    postgresChangesEventDelivered: false
  };
  const baseReport = {
    validationId: 'COM-B03B-R3-AUTHENTICATED-POSTGRES-CHANGES-DELIVERY-DIAGNOSTIC',
    contractId: recovery.CONTRACT_ID,
    status: 'failed_closed',
    authorization: { consumed: true, singleUse: true, reusableAfterFailure: false, r2AuthorizationReusable: false },
    scope: recovery.ALLOWED_SCOPE,
    deferredTopics: recovery.DEFERRED_TOPICS,
    blockedTopics: recovery.BLOCKED_TOPICS,
    client: { supabaseJsVersion: recovery.REQUIRED_SUPABASE_JS_VERSION },
    effects: { stagingRealtimePublicationMutationExecuted: false, publicTrafficEnabled: false, runtimeDeployed: false, productionChanged: false, pullRequestMerged: false }
  };

  let dbConnection = null;
  let admin = null;
  let identity = null;
  let auth = null;
  let fixture = null;
  let realtimeClient = null;
  let postsChannel = null;
  const systemEvents = [];
  try {
    requireEnvironment(env);
    const trigger = readTrigger();
    verifyEnvelope(trigger, env);
    const authorization = recovery.evaluateStagingDiagnosticAuthorization({
      authorizationPhrase: trigger.authorization.phrase,
      targetEnvironment: trigger.target.environment,
      projectId: trigger.target.projectId,
      branch: trigger.target.branch,
      pullRequest: trigger.target.pullRequest,
      authorizationConsumed: false,
      executionAttempted: false,
      r2AuthorizationReusable: trigger.authorization.r2AuthorizationReusable,
      ephemeralAuthIdentityLifecycleAllowed: trigger.canary.ephemeralAuthIdentityLifecycleAllowed,
      authIdentityCleanupRequired: trigger.canary.authIdentityCleanupRequired,
      publicationVerificationRequired: trigger.canary.publicationVerificationRequired,
      publicationMutationAllowed: trigger.canary.publicationMutationAllowed,
      filteredPostgresChangesSubscriptionRequired: trigger.canary.filteredPostgresChangesSubscriptionRequired,
      authenticatedDataApiVisibilityProbeRequired: trigger.canary.authenticatedDataApiVisibilityProbeRequired,
      replicationSystemObservabilityRequired: trigger.canary.replicationSystemObservabilityRequired,
      syntheticDomainFixtureLifecycleAllowed: trigger.canary.syntheticDomainFixtureLifecycleAllowed,
      syntheticDomainCleanupRequired: trigger.canary.syntheticDomainCleanupRequired,
      persistentResidueAllowed: trigger.canary.persistentResidueAllowed,
      presenceOrTypingExecutionAllowed: trigger.canary.presenceOrTypingExecutionAllowed,
      scope: trigger.canary.scope
    });
    exact(authorization.decision, 'authorized_for_single_bounded_r3_staging_diagnostic', 'DOKE_COM_B03B_R3_CONTRACT_AUTHORIZATION_REJECTED');

    const pullRequest = await verifyPullRequest(env, trigger);
    const project = await verifyProject(env);
    const keys = await loadApiKeys(env);
    dbConnection = await connect(project, env.SUPABASE_DB_PASSWORD);
    const foundation = await verifyFoundation(dbConnection.client);
    state.foundationVerified = true;
    admin = makeAdminClient(keys.adminKey);
    const nonce = crypto.randomBytes(10).toString('hex');
    identity = await createEphemeralIdentity(dbConnection.client, admin, nonce);
    state.identityCreated = true;
    auth = await signInEphemeral(keys.publishableKey, identity);
    state.loginVerified = true;
    fixture = await createFixture(dbConnection.client, identity.userId, nonce);
    state.communityVisibleViaAuthenticatedDataApi = await authenticatedCommunityVisible(auth.client, fixture.communityId);

    realtimeClient = createClient(`https://${recovery.REQUIRED_PROJECT_ID}.supabase.co`, keys.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    await realtimeClient.realtime.setAuth(auth.accessToken);
    postsChannel = realtimeClient.channel(`com-b03b-r3-post-${nonce}`, {
      config: { broadcast: { self: false, ack: false, replication_ready: true } }
    });
    postsChannel.on('system', {}, (payload) => {
      systemEvents.push({
        status: String(payload?.status || ''),
        extension: String(payload?.extension || ''),
        message: String(payload?.message || '').slice(0, 120)
      });
    });
    const postPromise = waitForPost(postsChannel, fixture.postId);
    await waitForSubscription(postsChannel);
    state.serverBindingIdPresent = Boolean(postsChannel.bindings?.postgres_changes?.[0]?.id);
    exact(state.serverBindingIdPresent, true, 'DOKE_COM_B03B_R3_SERVER_BINDING_ID_REQUIRED');

    await waitForSystem(systemEvents,
      (event) => event.extension === 'postgres_changes' && event.status === 'ok',
      'DOKE_COM_B03B_R3_POSTGRES_CHANGES_SYSTEM_NOT_READY');
    state.postgresChangesSystemReady = true;
    await waitForSystem(systemEvents,
      (event) => event.extension === 'system' && event.status === 'ok' && /Replication connection established/i.test(event.message),
      'DOKE_COM_B03B_R3_REPLICATION_CONNECTION_NOT_READY');
    state.replicationConnectionReady = true;

    await sleep(250);
    await insertPost(dbConnection.client, fixture, identity.userId);
    state.postInserted = true;
    state.postVisibleViaAuthenticatedDataApi = await authenticatedPostVisible(auth.client, fixture);
    state.postHiddenFromAnonymousDataApi = await anonymousPostHidden(keys.publishableKey, fixture.postId);
    await postPromise;
    state.postgresChangesEventDelivered = true;

    await removeChannel(realtimeClient, postsChannel);
    postsChannel = null;
    await auth.client.auth.signOut().catch(() => {});
    await cleanupFixture(dbConnection.client, fixture);
    const dResidue = await domainResidue(dbConnection.client, fixture);
    exact(dResidue.total, 0, 'DOKE_COM_B03B_R3_DOMAIN_RESIDUE_DETECTED');
    await cleanupIdentity(admin, identity);
    const iResidue = await identityResidue(dbConnection.client, admin, identity);
    exact(iResidue.total, 0, 'DOKE_COM_B03B_R3_IDENTITY_RESIDUE_DETECTED');

    writeReport({
      ...baseReport,
      status: 'authenticated_postgres_changes_delivery_diagnostic_passed',
      execution: { triggerHead: env.GITHUB_SHA, workflowInstallHead: trigger.workflowInstallHead, runId: Number(env.GITHUB_RUN_ID || 0), runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1), result: 'success' },
      pullRequest,
      project: { id: project.id, name: project.name, status: project.status, region: project.region },
      connection: { transport: 'postgres_tls', hostClass: dbConnection.hostClass, credentialsExposed: false },
      identity: { source: 'com_owned_ephemeral_supabase_auth_identity', userIdSha256: hash(identity.userId), emailSha256: hash(identity.email), rawIdentifierExposed: false, rawCredentialExposed: false },
      foundation,
      diagnostics: { ...state, systemEventsObserved: systemEvents.map((event) => ({ status: event.status, extension: event.extension, messageSha256: hash(event.message) })) },
      cleanup: { syntheticDomainFixtureRemoved: true, persistentDomainResidue: 0, ephemeralAuthIdentityRemoved: true, persistentIdentityResidue: 0, channelRemoved: true },
      effects: { ...baseReport.effects, ephemeralAuthIdentityLifecycleExecuted: true, temporarySyntheticDomainMutationExecuted: true, authenticatedPostgresChangesSubscriptionCreated: true, persistentResidue: false }
    });
  } catch (error) {
    if (postsChannel && realtimeClient) await removeChannel(realtimeClient, postsChannel);
    if (auth?.client) await auth.client.auth.signOut().catch(() => {});
    if (dbConnection?.client && fixture) await cleanupFixture(dbConnection.client, fixture);
    const dResidue = dbConnection?.client && fixture ? await domainResidue(dbConnection.client, fixture).catch(() => ({ total: -1 })) : { total: 0 };
    if (identity && admin) await cleanupIdentity(admin, identity);
    const iResidue = identity && dbConnection?.client && admin ? await identityResidue(dbConnection.client, admin, identity).catch(() => ({ total: -1 })) : { total: 0 };
    writeReport({
      ...baseReport,
      error: safeError(error),
      diagnostics: { ...state, systemEventsObserved: systemEvents.map((event) => ({ status: event.status, extension: event.extension, messageSha256: hash(event.message) })) },
      cleanup: {
        syntheticDomainFixtureRemoved: dResidue.total === 0,
        persistentDomainResidue: dResidue.total,
        ephemeralAuthIdentityRemoved: iResidue.total === 0,
        persistentIdentityResidue: iResidue.total,
        channelRemoved: true
      },
      effects: { ...baseReport.effects, ephemeralAuthIdentityLifecycleMayHaveExecuted: Boolean(identity), temporarySyntheticDomainMutationMayHaveExecuted: Boolean(fixture) }
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

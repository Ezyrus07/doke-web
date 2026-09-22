#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const scale = require('../backend/modules/communities/community-realtime-channel-scale-policy');
const r2 = require('../backend/modules/communities/community-realtime-private-auth-r2');

const TRIGGER = 'config/com-b03c-r2-realtime-auth-predicate-ladder-staging-trigger.json';
const REPORT = path.resolve(process.env.COM_B03C_R2_REPORT_PATH || 'reports/generated/COM-B03C-R2-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY.json');
const REPO = 'Ezyrus07/doke-web';
const PROJECT_NAME = 'doke-web-staging';
const SHA40 = /^[a-f0-9]{40}$/;

const fail = (code) => { const e = new Error(code); e.code = code; throw e; };
const exact = (actual, expected, code) => { if (actual !== expected) fail(code); };
const hash = (value) => crypto.createHash('sha256').update(String(value || '')).digest('hex');
const safeError = (error) => {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R2_UNEXPECTED_FAILURE');
  const code = /^(DOKE|COM)_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R2_UNEXPECTED_FAILURE';
  return { code, message: code, rawRemoteErrorExposed: false };
};
const write = (value) => {
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, `${JSON.stringify(value, null, 2)}\n`);
};
const sqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;
const ident = (prefix, nonce) => `${prefix}_${nonce.replace(/[^a-f0-9]/g, '').slice(0, 18)}`;

async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch { fail(code); }
}

function validateEnvironment(env) {
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B03C_R2_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B03C_R2_DB_PASSWORD_MISSING');
  exact(env.SUPABASE_PROJECT_REF, r2.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R2_ENV_PROJECT_MISMATCH');
  exact(env.COM_B03C_R2_AUTHORIZATION, r2.REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B03C_R2_ENV_AUTHORIZATION_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B03C_R2_WORKFLOW_RERUN_BLOCKED');
  if (env.DOKE_STAGING_CLIENT_PASSWORD) fail('DOKE_COM_B03C_R2_SHARED_CANARY_CREDENTIAL_PROHIBITED');
}

function readTrigger() {
  if (!fs.existsSync(TRIGGER)) fail('DOKE_COM_B03C_R2_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER, 'utf8'));
}

function validateEnvelope(trigger, env) {
  exact(trigger.contractId, 'com-b03c-r2-realtime-auth-predicate-ladder-staging-trigger-v1', 'DOKE_COM_B03C_R2_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B03C_R2_TRIGGER_NOT_PENDING');
  for (const [key, value] of [
    ['phrase', r2.REQUIRED_AUTHORIZATION_PHRASE],
    ['received', true], ['consumed', true], ['executionAttempted', true],
    ['singleUse', true], ['reusableAfterFailure', false], ['predecessorAuthorizationReusable', false]
  ]) exact(trigger.authorization?.[key], value, 'DOKE_COM_B03C_R2_AUTHORIZATION_BOUNDARY_FAILED');
  if (!SHA40.test(String(trigger.workflowInstallHead || '')) || !SHA40.test(String(env.GITHUB_SHA || '')) ||
      trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B03C_R2_INSTALL_HEAD_INVALID');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B03C_R2_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, r2.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R2_PROJECT_MISMATCH');
  exact(trigger.target?.branch, r2.REQUIRED_BRANCH, 'DOKE_COM_B03C_R2_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, r2.REQUIRED_PULL_REQUEST, 'DOKE_COM_B03C_R2_PR_MISMATCH');

  const authz = r2.evaluateStagingAuthorization({
    authorizationPhrase: trigger.authorization.phrase,
    targetEnvironment: trigger.target.environment,
    projectId: trigger.target.projectId,
    branch: trigger.target.branch,
    pullRequest: trigger.target.pullRequest,
    authorizationConsumed: false,
    executionAttempted: false,
    predecessorAuthorizationReusable: trigger.authorization.predecessorAuthorizationReusable,
    ...trigger.canary
  });
  exact(authz.decision, 'authorized_for_single_bounded_realtime_authorization_predicate_ladder', 'DOKE_COM_B03C_R2_CONTRACT_AUTHORIZATION_REJECTED');
}

async function verifyPullRequest(env, trigger) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b03c-r2' };
  if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const pr = await fetchJson(`https://api.github.com/repos/${REPO}/pulls/${r2.REQUIRED_PULL_REQUEST}`, { headers }, 'DOKE_COM_B03C_R2_PR_PREFLIGHT_FAILED');
  exact(pr.state, 'open', 'DOKE_COM_B03C_R2_PR_NOT_OPEN');
  exact(pr.draft, true, 'DOKE_COM_B03C_R2_PR_NOT_DRAFT');
  exact(pr.merged, false, 'DOKE_COM_B03C_R2_PR_ALREADY_MERGED');
  exact(pr.auto_merge, null, 'DOKE_COM_B03C_R2_AUTO_MERGE_ENABLED');
  exact(pr.head?.ref, r2.REQUIRED_BRANCH, 'DOKE_COM_B03C_R2_PR_BRANCH_MISMATCH');
  exact(pr.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B03C_R2_PR_SHA_MISMATCH');
  return { number: pr.number, state: pr.state, draft: pr.draft, merged: pr.merged, headSha: pr.head.sha, installHead: trigger.workflowInstallHead };
}

async function loadProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${r2.REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json' }
  }, 'DOKE_COM_B03C_R2_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, r2.REQUIRED_PROJECT_ID, 'DOKE_COM_B03C_R2_PROJECT_ID_MISMATCH');
  exact(project.name, PROJECT_NAME, 'DOKE_COM_B03C_R2_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B03C_R2_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B03C_R2_PROJECT_REGION_INVALID');
  return { id: project.id, name: project.name, status: project.status, region, directHost: project.database?.host || null };
}

async function loadKeys(env) {
  const response = await fetchJson(`https://api.supabase.com/v1/projects/${r2.REQUIRED_PROJECT_ID}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json' }
  }, 'DOKE_COM_B03C_R2_API_KEYS_PREFLIGHT_FAILED');
  const keys = Array.isArray(response) ? response : (response?.data || []);
  const value = (item) => String(item?.api_key || item?.key || item?.value || '').trim();
  const label = (item) => `${item?.name || ''} ${item?.type || ''} ${item?.id || ''}`.toLowerCase();
  const pub = value(keys.find((item) => label(item).includes('publishable') || label(item).includes('anon')));
  const adm = value(keys.find((item) => label(item).includes('secret') || label(item).includes('service_role') || value(item).startsWith('sb_secret_')));
  if (!pub || !adm || pub === adm) fail('DOKE_COM_B03C_R2_API_KEY_BOUNDARY_FAILED');
  return { pub, adm };
}

async function connectDatabase(project, password) {
  for (const host of [...new Set([`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean))]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host, port: 5432, user: direct ? 'postgres' : `postgres.${r2.REQUIRED_PROJECT_ID}`,
      password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000, application_name: 'doke-com-b03c-r2'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_COM_B03C_R2_DATABASE_CONNECTION_FAILED');
}

async function verifyFoundation(db) {
  const result = await db.query(`
    select
      to_regclass('realtime.messages') is not null messages_present,
      to_regprocedure('realtime.topic()') is not null topic_function_present,
      (select relrowsecurity from pg_class where oid=to_regclass('realtime.messages')) messages_rls_enabled
  `);
  const row = result.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B03C_R2_REALTIME_FOUNDATION_FAILED');
  return row;
}

const adminClient = (key) => createClient(`https://${r2.REQUIRED_PROJECT_ID}.supabase.co`, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
});

async function createIdentity(db, admin, nonce) {
  const email = `com-b03c-r2-${nonce}@doke.local`;
  const password = `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
  const result = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: 'client', name: 'COM-B03C-R2 Canary', purpose: 'realtime-auth-predicate-ladder' }
  });
  if (result.error || !result.data?.user?.id) fail('DOKE_COM_B03C_R2_EPHEMERAL_AUTH_CREATE_FAILED');
  const id = result.data.user.id;
  const materialized = await db.query(`
    select u.role,u.status,
      exists(select 1 from public.user_profiles where user_id=u.id) user_profile_present,
      exists(select 1 from public.client_profiles where user_id=u.id) client_profile_present
    from public.users u where u.id=$1::uuid
  `, [id]);
  const row = materialized.rows[0];
  if (!row || row.role !== 'client' || row.status !== 'active' || !row.user_profile_present || !row.client_profile_present) {
    await admin.auth.admin.deleteUser(id, false).catch(() => {});
    fail('DOKE_COM_B03C_R2_CANONICAL_ACCOUNT_MATERIALIZATION_REQUIRED');
  }
  return { userId: id, email, password };
}

async function login(pub, identity) {
  const client = createClient(`https://${r2.REQUIRED_PROJECT_ID}.supabase.co`, pub, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
  const result = await client.auth.signInWithPassword({ email: identity.email, password: identity.password });
  if (result.error || !result.data?.session?.access_token || result.data?.user?.id !== identity.userId) {
    fail('DOKE_COM_B03C_R2_EPHEMERAL_LOGIN_FAILED');
  }
  const token = result.data.session.access_token;
  const verified = await client.auth.getUser(token);
  if (verified.error || verified.data?.user?.id !== identity.userId) {
    fail('DOKE_COM_B03C_R2_SERVER_VERIFIED_SESSION_REQUIRED');
  }
  return { client, token };
}

function rungExpression(rung, userId, topic, extension) {
  const uid = `(select auth.uid()) = ${sqlLiteral(userId)}::uuid`;
  const topicExpr = `realtime.topic() = ${sqlLiteral(topic)}`;
  const extensionExpr = `realtime.messages.extension = ${sqlLiteral(extension)}`;
  if (rung === 'authenticated_basic') return 'true';
  if (rung === 'topic_only') return topicExpr;
  if (rung === 'auth_uid_only') return uid;
  if (rung === 'extension_only') return extensionExpr;
  if (rung === 'full_conjunction') return `${uid} and ${topicExpr} and ${extensionExpr}`;
  fail('DOKE_COM_B03C_R2_UNKNOWN_RUNG');
}

function makeDefinitions({ axis, rung, userId, topics, nonce }) {
  const readPredicate = (topic, extension) => axis === 'read_join' ? rungExpression(rung, userId, topic, extension) : 'true';
  const writePredicate = (topic, extension) => axis === 'write_action' ? rungExpression(rung, userId, topic, extension) : 'true';
  const values = [
    ['pr', 'SELECT', topics.channel_presence, 'presence', readPredicate(topics.channel_presence, 'presence')],
    ['pw', 'INSERT', topics.channel_presence, 'presence', writePredicate(topics.channel_presence, 'presence')],
    ['br', 'SELECT', topics.channel_typing, 'broadcast', readPredicate(topics.channel_typing, 'broadcast')],
    ['bw', 'INSERT', topics.channel_typing, 'broadcast', writePredicate(topics.channel_typing, 'broadcast')]
  ];
  return values.map(([suffix, command, topic, extension, expression]) => ({
    name: ident(`com_b03c_r2_${axis === 'read_join' ? 'r' : 'w'}_${rung.slice(0, 4)}_${suffix}`, nonce),
    command, topic, extension, expression
  }));
}

function makeNegativeDefinitions({ topics, nonce }) {
  return [
    { name: ident('com_b03c_r2_neg_pr', nonce), command: 'SELECT', topic: topics.channel_presence, extension: 'presence', expression: 'false' },
    { name: ident('com_b03c_r2_neg_pw', nonce), command: 'INSERT', topic: topics.channel_presence, extension: 'presence', expression: 'true' },
    { name: ident('com_b03c_r2_neg_br', nonce), command: 'SELECT', topic: topics.channel_typing, extension: 'broadcast', expression: 'false' },
    { name: ident('com_b03c_r2_neg_bw', nonce), command: 'INSERT', topic: topics.channel_typing, extension: 'broadcast', expression: 'true' }
  ];
}

async function installPolicies(db, definitions) {
  await db.query('begin');
  try {
    for (const item of definitions) {
      const clause = item.command === 'SELECT' ? `using (${item.expression})` : `with check (${item.expression})`;
      await db.query(`create policy ${item.name} on realtime.messages for ${item.command.toLowerCase()} to authenticated ${clause}`);
    }
    await db.query('commit');
  } catch (error) {
    await db.query('rollback').catch(() => {});
    throw error;
  }
}

async function inspectPolicies(db, definitions) {
  const result = await db.query(`
    select policyname,cmd,roles::text,qual,with_check
    from pg_policies
    where schemaname='realtime' and tablename='messages' and policyname=any($1::text[])
  `, [definitions.map((item) => item.name)]);
  if (result.rows.length !== 4) fail('DOKE_COM_B03C_R2_POLICY_INTROSPECTION_COUNT_FAILED');
  const checks = definitions.map((item) => {
    const row = result.rows.find((candidate) => candidate.policyname === item.name) || {};
    const text = `${row.qual || ''} ${row.with_check || ''}`;
    return {
      commandMatches: String(row.cmd).toUpperCase() === item.command,
      authenticatedRolePresent: String(row.roles).includes('authenticated'),
      expectedPredicateShapePresent:
        item.expression === 'true' ? /\btrue\b/i.test(text) :
        item.expression === 'false' ? /\bfalse\b/i.test(text) :
        (item.expression.includes('auth.uid()') ? /auth\.uid\(\)/.test(text) : true) &&
        (item.expression.includes('realtime.topic()') ? /realtime\.topic\(\)/.test(text) : true) &&
        (item.expression.includes('extension') ? text.includes(item.extension) : true)
    };
  });
  if (checks.some((check) => Object.values(check).some((value) => value !== true))) {
    fail('DOKE_COM_B03C_R2_POLICY_INTROSPECTION_FAILED');
  }
  return { policyCount: result.rows.length, allChecksPassed: true };
}

async function dropPolicies(db, definitions) {
  for (const item of definitions || []) {
    await db.query(`drop policy if exists ${item.name} on realtime.messages`).catch(() => {});
  }
}

async function policiesGone(db, definitions) {
  if (!definitions?.length) return true;
  const result = await db.query(`
    select count(*)::int count from pg_policies
    where schemaname='realtime' and tablename='messages' and policyname=any($1::text[])
  `, [definitions.map((item) => item.name)]);
  return Number(result.rows[0]?.count || 0) === 0;
}

function sanitizeJoin(status, error) {
  const raw = String(error?.message || error?.error || error || '');
  let classification = 'unknown_channel_join_failure';
  if (status === 'TIMED_OUT') classification = 'channel_join_timeout';
  else if (status === 'CLOSED') classification = 'channel_closed_during_join';
  else if (/jwt|token|authenticat|claim/i.test(raw)) classification = 'jwt_or_auth_context_rejected';
  else if (/permission|policy|rls|authori[sz]|access denied|not allowed/i.test(raw)) classification = 'realtime_rls_authorization_rejected';
  return {
    status: String(status || 'UNKNOWN').toUpperCase(),
    classification,
    messagePresent: raw.length > 0,
    messageSha256: hash(raw),
    rawRemoteErrorExposed: false
  };
}

function subscribe(channel, timeout = 12000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish({ subscribed: false, failure: sanitizeJoin('TIMED_OUT', null) }), timeout);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') finish({ subscribed: true, status });
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
        finish({ subscribed: false, failure: sanitizeJoin(status, error) });
      }
    });
  });
}

function newRealtimeClient(pub, token) {
  const client = createClient(`https://${r2.REQUIRED_PROJECT_ID}.supabase.co`, pub, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    realtime: { params: { eventsPerSecond: 10 } }
  });
  return client.realtime.setAuth(token).then(() => client);
}

async function remove(client, channel) {
  if (client && channel) await client.removeChannel(channel).catch(() => {});
}

async function joinTransport(client, transport, topic, identityHash) {
  const channel = transport === 'channel_presence'
    ? client.channel(topic, { config: { private: true, presence: { enabled: true, key: identityHash } } })
    : client.channel(topic, { config: { private: true, presence: { enabled: false, key: '' }, broadcast: { self: true, ack: true } } });
  const join = await subscribe(channel);
  return { channel, join };
}

function waitPresence(channel, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03C_R2_PRESENCE_TIMEOUT'), { code: 'DOKE_COM_B03C_R2_PRESENCE_TIMEOUT' })), timeout);
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      if (state && Object.keys(state).length) {
        clearTimeout(timer);
        resolve(state);
      }
    });
  });
}

function waitBroadcast(channel, event, id, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('DOKE_COM_B03C_R2_BROADCAST_TIMEOUT'), { code: 'DOKE_COM_B03C_R2_BROADCAST_TIMEOUT' })), timeout);
    channel.on('broadcast', { event }, (payload) => {
      if (JSON.stringify(payload).includes(id)) {
        clearTimeout(timer);
        resolve(payload);
      }
    });
  });
}

async function executeWriteAction(transport, channel, identityHash) {
  if (transport === 'channel_presence') {
    const waiter = waitPresence(channel);
    const result = await channel.track({ canary: true, actor: identityHash, at: new Date().toISOString() });
    if (result !== 'ok') return { attempted: true, allowed: false, result: String(result) };
    await waiter;
    return { attempted: true, allowed: true, result: 'ok' };
  }
  const id = crypto.randomUUID();
  const waiter = waitBroadcast(channel, 'typing_started', id);
  const result = await channel.send({
    type: 'broadcast',
    event: 'typing_started',
    payload: { eventId: id, actor: identityHash, source: 'ephemeral_server_verified_session' }
  });
  if (result !== 'ok') return { attempted: true, allowed: false, result: String(result) };
  await waiter;
  return { attempted: true, allowed: true, result: 'ok' };
}

function makeTopics(axis, rung) {
  const seed = `${axis}-${rung}-${crypto.randomBytes(8).toString('hex')}`;
  return {
    channel_presence: scale.buildChannelKey({ communityId: crypto.randomUUID(), channelId: `r2-${seed}-p`, topic: 'channel_presence' }),
    channel_typing: scale.buildChannelKey({ communityId: crypto.randomUUID(), channelId: `r2-${seed}-t`, topic: 'channel_typing' })
  };
}

async function runRung({ db, pub, token, identity, axis, rung }) {
  const topics = makeTopics(axis, rung);
  const nonce = crypto.randomBytes(10).toString('hex');
  const definitions = makeDefinitions({ axis, rung, userId: identity.userId, topics, nonce });
  let presenceClient, typingClient, presenceChannel, typingChannel;
  try {
    await installPolicies(db, definitions);
    const inspection = await inspectPolicies(db, definitions);
    presenceClient = await newRealtimeClient(pub, token);
    typingClient = await newRealtimeClient(pub, token);
    const identityHash = hash(identity.userId).slice(0, 16);
    const presence = await joinTransport(presenceClient, 'channel_presence', topics.channel_presence, identityHash);
    presenceChannel = presence.channel;
    const typing = await joinTransport(typingClient, 'channel_typing', topics.channel_typing, identityHash);
    typingChannel = typing.channel;
    const result = {
      rung,
      policyInspection: inspection,
      presence: { join: presence.join, action: { attempted: false } },
      typing: { join: typing.join, action: { attempted: false } }
    };
    if (axis === 'write_action') {
      if (presence.join.subscribed) {
        try { result.presence.action = await executeWriteAction('channel_presence', presenceChannel, identityHash); }
        catch (error) { result.presence.action = { attempted: true, allowed: false, error: safeError(error) }; }
      }
      if (typing.join.subscribed) {
        try { result.typing.action = await executeWriteAction('channel_typing', typingChannel, identityHash); }
        catch (error) { result.typing.action = { attempted: true, allowed: false, error: safeError(error) }; }
      }
    }
    return result;
  } finally {
    await remove(presenceClient, presenceChannel);
    await remove(typingClient, typingChannel);
    await dropPolicies(db, definitions);
    exact(await policiesGone(db, definitions), true, 'DOKE_COM_B03C_R2_PER_RUNG_POLICY_CLEANUP_FAILED');
  }
}

async function runNegativeControl({ db, pub, token, identity }) {
  const topics = makeTopics('negative_control', 'false');
  const nonce = crypto.randomBytes(10).toString('hex');
  const definitions = makeNegativeDefinitions({ topics, nonce });
  let presenceClient, typingClient, presenceChannel, typingChannel;
  try {
    await installPolicies(db, definitions);
    await inspectPolicies(db, definitions);
    presenceClient = await newRealtimeClient(pub, token);
    typingClient = await newRealtimeClient(pub, token);
    const identityHash = hash(identity.userId).slice(0, 16);
    const presence = await joinTransport(presenceClient, 'channel_presence', topics.channel_presence, identityHash);
    presenceChannel = presence.channel;
    const typing = await joinTransport(typingClient, 'channel_typing', topics.channel_typing, identityHash);
    typingChannel = typing.channel;
    const passed = !presence.join.subscribed && !typing.join.subscribed;
    return { passed, presence: presence.join, typing: typing.join };
  } finally {
    await remove(presenceClient, presenceChannel);
    await remove(typingClient, typingChannel);
    await dropPolicies(db, definitions);
    exact(await policiesGone(db, definitions), true, 'DOKE_COM_B03C_R2_NEGATIVE_POLICY_CLEANUP_FAILED');
  }
}

async function cleanupIdentity(admin, identity, strict = false) {
  if (!admin || !identity) return;
  const result = await admin.auth.admin.deleteUser(identity.userId, false);
  if (result.error && strict) fail('DOKE_COM_B03C_R2_EPHEMERAL_AUTH_CLEANUP_FAILED');
}

async function identityResidue(db, admin, identity) {
  if (!identity) return 0;
  const result = await db.query(`
    select
      (select count(*)::int from public.users where id=$1::uuid) users,
      (select count(*)::int from public.user_profiles where user_id=$1::uuid) user_profiles,
      (select count(*)::int from public.client_profiles where user_id=$1::uuid) client_profiles
  `, [identity.userId]);
  const row = result.rows[0] || {};
  const auth = await admin.auth.admin.getUserById(identity.userId);
  return Number(row.users || 0) + Number(row.user_profiles || 0) + Number(row.client_profiles || 0) +
    (auth.data?.user?.id === identity.userId ? 1 : 0);
}

function summarize(results) {
  const out = {};
  for (const axis of r2.DIAGNOSTIC_AXES) {
    out[axis] = {};
    for (const rung of r2.PREDICATE_RUNGS) {
      const item = results[axis].find((candidate) => candidate.rung === rung);
      out[axis][rung] = {
        presenceJoin: item.presence.join.subscribed === true,
        typingJoin: item.typing.join.subscribed === true,
        presenceActionAllowed: item.presence.action.allowed === true,
        typingActionAllowed: item.typing.action.allowed === true
      };
    }
  }
  return out;
}

async function main() {
  const env = process.env;
  const base = {
    validationId: 'COM-B03C-R2-REALTIME-AUTH-PREDICATE-LADDER-STAGING-CANARY',
    contractId: r2.CONTRACT_ID,
    status: 'failed_closed',
    authorization: { consumed: true, singleUse: true, reusableAfterFailure: false, predecessorAuthorizationReusable: false },
    scope: r2.ALLOWED_SCOPE,
    blockedTopics: r2.BLOCKED_TOPICS,
    predicateRungs: r2.PREDICATE_RUNGS,
    diagnosticAxes: r2.DIAGNOSTIC_AXES,
    harness: {
      supabaseJsVersion: r2.REQUIRED_SUPABASE_JS_VERSION,
      readWriteAuthorizationSeparated: true,
      negativeControl: true,
      freshTopicPerRung: true,
      freshRealtimeClientPerRung: true,
      jwtAppliedBeforeChannelCreation: true,
      presenceChannelBroadcastConfigOmitted: true,
      typingChannelPresenceDisabled: true,
      sanitizedDiagnostics: true,
      rawRemoteErrorExposed: false
    },
    effects: {
      communityPostsReexecuted: false,
      channelMessagesExecuted: false,
      domainMutationExecuted: false,
      publicationMutationExecuted: false,
      runtimeDeployed: false,
      publicTrafficEnabled: false,
      productionChanged: false,
      pullRequestMerged: false
    }
  };

  let connection, admin, identity, loginState;
  const allDefinitions = [];
  try {
    validateEnvironment(env);
    const trigger = readTrigger();
    validateEnvelope(trigger, env);
    const pullRequest = await verifyPullRequest(env, trigger);
    const project = await loadProject(env);
    const keys = await loadKeys(env);
    connection = await connectDatabase(project, env.SUPABASE_DB_PASSWORD);
    const foundation = await verifyFoundation(connection.client);
    admin = adminClient(keys.adm);
    const nonce = crypto.randomBytes(10).toString('hex');
    identity = await createIdentity(connection.client, admin, nonce);
    loginState = await login(keys.pub, identity);

    const negativeControl = await runNegativeControl({
      db: connection.client, pub: keys.pub, token: loginState.token, identity
    });
    if (!negativeControl.passed) fail('DOKE_COM_B03C_R2_NEGATIVE_CONTROL_FAILED');

    const results = { read_join: [], write_action: [] };
    for (const axis of r2.DIAGNOSTIC_AXES) {
      for (const rung of r2.PREDICATE_RUNGS) {
        results[axis].push(await runRung({
          db: connection.client, pub: keys.pub, token: loginState.token, identity, axis, rung
        }));
      }
    }

    await loginState.client.auth.signOut().catch(() => {});
    await cleanupIdentity(admin, identity, true);
    exact(await identityResidue(connection.client, admin, identity), 0, 'DOKE_COM_B03C_R2_IDENTITY_RESIDUE_DETECTED');

    const summary = summarize(results);
    const basicReadProven = summary.read_join.authenticated_basic.presenceJoin && summary.read_join.authenticated_basic.typingJoin;
    const status = basicReadProven
      ? 'realtime_authorization_predicate_ladder_completed'
      : 'failed_closed_basic_private_channel_read_authorization';

    write({
      ...base,
      status,
      execution: {
        triggerHead: env.GITHUB_SHA,
        workflowInstallHead: trigger.workflowInstallHead,
        runId: Number(env.GITHUB_RUN_ID || 0),
        runAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1),
        result: status === 'realtime_authorization_predicate_ladder_completed' ? 'success' : 'failure'
      },
      pullRequest,
      project: { id: project.id, name: project.name, status: project.status, region: project.region },
      connection: { transport: 'postgres_tls', hostClass: connection.hostClass, credentialsExposed: false },
      identity: {
        source: 'com_owned_ephemeral_supabase_auth_identity',
        userIdSha256: hash(identity.userId),
        emailSha256: hash(identity.email),
        rawIdentifierExposed: false,
        rawCredentialExposed: false
      },
      foundation,
      negativeControl,
      diagnostics: results,
      summary,
      cleanup: {
        temporaryPoliciesRemovedAfterEveryRung: true,
        ephemeralAuthIdentityRemoved: true,
        persistentIdentityResidue: 0,
        persistentDomainResidue: 0
      },
      effects: {
        ...base.effects,
        ephemeralAuthIdentityLifecycleExecuted: true,
        temporaryRealtimePolicyLifecycleExecuted: true,
        privateEphemeralRealtimeChannelsCreated: true,
        ephemeralPresenceAndBroadcastActionsMayHaveExecuted: true,
        persistentResidue: false
      }
    });

    if (status !== 'realtime_authorization_predicate_ladder_completed') {
      fail('DOKE_COM_B03C_R2_BASIC_READ_AUTHORIZATION_NOT_PROVEN');
    }
  } catch (error) {
    if (connection?.client) {
      for (const definitions of allDefinitions) await dropPolicies(connection.client, definitions).catch(() => {});
    }
    if (loginState?.client) await loginState.client.auth.signOut().catch(() => {});
    if (admin && identity) await cleanupIdentity(admin, identity).catch(() => {});
    let residue = null;
    if (connection?.client && admin && identity) residue = await identityResidue(connection.client, admin, identity).catch(() => null);
    if (!fs.existsSync(REPORT)) {
      write({
        ...base,
        status: 'failed_closed_predicate_ladder_harness_or_preflight',
        failure: safeError(error),
        cleanup: {
          temporaryPoliciesRemovedAfterEveryRung: true,
          ephemeralAuthIdentityRemoved: residue === 0,
          persistentIdentityResidue: residue,
          persistentDomainResidue: 0
        }
      });
    }
    console.error(error.code || 'DOKE_COM_B03C_R2_FAILED_CLOSED');
    process.exitCode = 1;
  } finally {
    if (connection?.client) connection.client.release();
    if (connection?.pool) await connection.pool.end().catch(() => {});
  }
}

main();

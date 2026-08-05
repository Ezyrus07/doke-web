#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const {
  createCommunityStagingCompositionRoot,
  PROBE_COMMUNITY_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID,
  REQUIRED_MIGRATION_VERSION
} = require('../backend/runtime/staging/community-composition-root');

const CONFIG = require('../config/com-b02d-authenticated-read-only-canary-execution.json');
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PULL_REQUEST = 61;
const EXPECTED_BRANCH = 'com/com-001-baseline-audit';
const REPORT_PATH = path.resolve(process.env.COM_B02D_REPORT_PATH || 'reports/generated/COM-B02D-AUTHENTICATED-READ-ONLY-CANARY.json');

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function exact(actual, expected, code) {
  if (actual !== expected) fail(code);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function safeError(error) {
  const code = String(error && error.code || 'DOKE_COM_B02D_UNEXPECTED_FAILURE');
  if (/^DOKE_[A-Z0-9_]+$/.test(code)) return { code, message: code };
  if (/^COM_[A-Z0-9_]+$/.test(code)) return { code, message: code };
  const sqlState = /^[0-9A-Z]{5}$/.test(code) ? code : null;
  return {
    code: 'DOKE_COM_B02D_UNEXPECTED_FAILURE',
    message: 'The authenticated read-only community canary failed closed.',
    diagnosticSqlState: sqlState
  };
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}

async function fetchJson(url, options, code) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (_) {
    fail(code);
  }
  if (!response.ok) fail(code);
  try {
    return await response.json();
  } catch (_) {
    fail(code);
  }
}

function verifyExecutionEnvelope(env) {
  exact(CONFIG.contractId, 'com-b02d-authenticated-read-only-canary-execution-v1', 'DOKE_COM_B02D_EXECUTION_CONTRACT_MISMATCH');
  exact(CONFIG.authorization.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B02D_AUTHORIZATION_PHRASE_MISMATCH');
  exact(CONFIG.authorization.received, true, 'DOKE_COM_B02D_AUTHORIZATION_NOT_RECEIVED');
  exact(CONFIG.authorization.consumed, false, 'DOKE_COM_B02D_AUTHORIZATION_ALREADY_CONSUMED');
  exact(CONFIG.authorization.singleUse, true, 'DOKE_COM_B02D_AUTHORIZATION_NOT_SINGLE_USE');
  exact(CONFIG.authorization.reusableAfterFailure, false, 'DOKE_COM_B02D_AUTHORIZATION_REUSE_ENABLED');
  exact(CONFIG.execution.attempted, false, 'DOKE_COM_B02D_PRIOR_ATTEMPT_REQUIRES_NEW_AUTHORIZATION');
  exact(CONFIG.target.environment, 'staging', 'DOKE_COM_B02D_TARGET_NOT_STAGING');
  exact(CONFIG.target.projectId, REQUIRED_PROJECT_ID, 'DOKE_COM_B02D_PROJECT_MISMATCH');
  exact(CONFIG.target.migrationVersion, REQUIRED_MIGRATION_VERSION, 'DOKE_COM_B02D_MIGRATION_VERSION_MISMATCH');
  exact(CONFIG.target.communityId, PROBE_COMMUNITY_ID, 'DOKE_COM_B02D_PROBE_ID_MISMATCH');
  exact(CONFIG.effects.readOnly, true, 'DOKE_COM_B02D_READ_ONLY_REQUIRED');
  exact(CONFIG.effects.mutationAllowed, false, 'DOKE_COM_B02D_MUTATION_MUST_REMAIN_BLOCKED');
  exact(env.COM_B02D_AUTHORIZATION, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B02D_ENV_AUTHORIZATION_MISMATCH');
  exact(env.SUPABASE_PROJECT_REF, REQUIRED_PROJECT_ID, 'DOKE_COM_B02D_ENV_PROJECT_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B02D_WORKFLOW_RERUN_BLOCKED');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B02D_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B02D_DB_PASSWORD_MISSING');
  return true;
}

async function verifyPullRequest(env) {
  const pull = await fetchJson(
    `https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${EXPECTED_PULL_REQUEST}`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b02d-canary' } },
    'DOKE_COM_B02D_PR_PREFLIGHT_FAILED'
  );
  exact(pull.state, 'open', 'DOKE_COM_B02D_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B02D_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B02D_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B02D_AUTO_MERGE_ENABLED');
  exact(pull.head && pull.head.ref, EXPECTED_BRANCH, 'DOKE_COM_B02D_PR_BRANCH_MISMATCH');
  if (env.GITHUB_SHA) exact(pull.head && pull.head.sha, env.GITHUB_SHA, 'DOKE_COM_B02D_PR_SHA_MISMATCH');
  return Object.freeze({
    number: pull.number,
    state: pull.state,
    draft: pull.draft,
    merged: pull.merged,
    autoMergeEnabled: pull.auto_merge !== null,
    headSha: pull.head.sha
  });
}

async function verifyProject(env) {
  const project = await fetchJson(
    `https://api.supabase.com/v1/projects/${REQUIRED_PROJECT_ID}`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'User-Agent': 'doke-com-b02d-canary'
      }
    },
    'DOKE_COM_B02D_PROJECT_PREFLIGHT_FAILED'
  );
  exact(project.id, REQUIRED_PROJECT_ID, 'DOKE_COM_B02D_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B02D_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B02D_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B02D_PROJECT_REGION_INVALID');
  const directHost = project.database && project.database.host;
  if (directHost && directHost !== `db.${REQUIRED_PROJECT_ID}.supabase.co`) fail('DOKE_COM_B02D_DATABASE_HOST_MISMATCH');
  return Object.freeze({ id: project.id, name: project.name, status: project.status, region, directHost: directHost || null });
}

async function connectStaging(project, password) {
  const candidates = [
    `aws-0-${project.region}.pooler.supabase.com`,
    `aws-1-${project.region}.pooler.supabase.com`,
    project.directHost
  ].filter(Boolean);
  for (const host of [...new Set(candidates)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host,
      port: 5432,
      user: direct ? 'postgres' : `postgres.${REQUIRED_PROJECT_ID}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 1000,
      application_name: 'doke-com-b02d-read-only-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1 as ok');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_COM_B02D_DATABASE_CONNECTION_FAILED');
}

async function loadCounts(client) {
  const response = await client.query(`select
    (select count(*)::int from com_private.community_state) as community_state,
    (select count(*)::int from com_private.community_event) as community_event,
    (select count(*)::int from com_private.command_idempotency) as command_idempotency`);
  return Object.freeze({ ...response.rows[0] });
}

async function verifySchema(client) {
  const response = await client.query({
    name: 'com-b02d-schema-preflight',
    text: `select
      to_regclass('auth.users') is not null as auth_users,
      to_regclass('auth.sessions') is not null as auth_sessions,
      to_regclass('public.users') is not null as app_users,
      to_regclass('com_private.community_state') is not null as community_state,
      to_regclass('com_private.community_event') is not null as community_event,
      to_regclass('com_private.command_idempotency') is not null as command_idempotency,
      to_regprocedure('public.com_load_canonical_state_v1(uuid)') is not null as load_rpc,
      exists (select 1 from supabase_migrations.schema_migrations where version = $1) as migration_present,
      has_function_privilege('service_role', 'public.com_load_canonical_state_v1(uuid)', 'EXECUTE') as service_role_execute,
      not has_function_privilege('authenticated', 'public.com_load_canonical_state_v1(uuid)', 'EXECUTE') as authenticated_blocked,
      not has_function_privilege('anon', 'public.com_load_canonical_state_v1(uuid)', 'EXECUTE') as anon_blocked`,
    values: [REQUIRED_MIGRATION_VERSION]
  });
  const row = response.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B02D_SCHEMA_GATE_FAILED');
  return Object.freeze({ ...row });
}

async function loadAuthenticatedActor(client) {
  const response = await client.query(`select
    session.id as session_id,
    session.user_id,
    session.aal::text as aal,
    app_user.status
  from auth.sessions session
  join auth.users auth_user on auth_user.id = session.user_id
  join public.users app_user on app_user.id = session.user_id
  where (session.not_after is null or session.not_after > pg_catalog.now())
    and auth_user.deleted_at is null
    and (auth_user.banned_until is null or auth_user.banned_until <= pg_catalog.now())
    and app_user.status = 'active'
  order by coalesce(session.refreshed_at::timestamptz, session.updated_at, session.created_at) desc
  limit 1`);
  const row = response.rows[0];
  if (!row) fail('DOKE_COM_B02D_VALID_AUTHENTICATED_SESSION_REQUIRED');
  return Object.freeze({
    rawUserId: row.user_id,
    rawSessionId: row.session_id,
    actor: Object.freeze({ id: row.user_id, authenticated: true, status: row.status }),
    evidence: Object.freeze({
      source: 'server_verified_authenticated_session',
      aal: row.aal,
      actorSha256: hash(row.user_id),
      sessionSha256: hash(row.session_id),
      rawIdentifiersExposed: false
    })
  });
}

function createPgBackedServiceSupabase(client) {
  return Object.freeze({
    async rpc(name, args) {
      if (name !== 'com_load_canonical_state_v1') fail('DOKE_COM_B02D_NON_READ_RPC_REQUESTED');
      const response = await client.query({
        name: 'com-b02d-load-canonical-state',
        text: 'select public.com_load_canonical_state_v1($1::uuid) as data',
        values: [args && args.p_community_id]
      });
      return { data: response.rows[0] ? response.rows[0].data : null, error: null };
    }
  });
}

function assertSameCounts(before, after, code) {
  assert.deepStrictEqual(after, before, code);
}

async function executeCanary(env) {
  verifyExecutionEnvelope(env);
  const startedAt = new Date().toISOString();
  const report = {
    validationId: 'COM-B02D-AUTHENTICATED-READ-ONLY-CANARY',
    contractId: 'com-b02d-authenticated-read-only-canary-execution-v1',
    domain: 'COM-001',
    status: 'execution_started',
    authorization: {
      phrase: REQUIRED_AUTHORIZATION_PHRASE,
      source: 'explicit_user_message',
      receivedAt: CONFIG.authorization.receivedAt,
      singleUse: true,
      consumed: true,
      reusable: false,
      workflowRunAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1)
    },
    target: {
      environment: 'staging',
      projectId: REQUIRED_PROJECT_ID,
      projectName: EXPECTED_PROJECT_NAME,
      migrationVersion: REQUIRED_MIGRATION_VERSION,
      communityId: PROBE_COMMUNITY_ID
    },
    startedAt,
    completedAt: null,
    result: null,
    failure: null,
    effects: {
      networkRequestExecuted: true,
      databaseReadExecuted: true,
      databaseMutationExecuted: false,
      routeRegistered: false,
      runtimeDeployed: false,
      edgeFunctionDeployed: false,
      productionChanged: false,
      pullRequestMerged: false
    }
  };

  let pool;
  let client;
  let transactionOpen = false;
  try {
    report.pullRequest = await verifyPullRequest(env);
    const project = await verifyProject(env);
    report.project = { id: project.id, name: project.name, status: project.status, region: project.region };
    const connection = await connectStaging(project, env.SUPABASE_DB_PASSWORD);
    pool = connection.pool;
    client = connection.client;
    report.connection = { transport: 'postgres_tls', hostClass: connection.hostClass, credentialsExposed: false };

    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    transactionOpen = true;
    const schema = await verifySchema(client);
    const actor = await loadAuthenticatedActor(client);
    const before = await loadCounts(client);
    const probePresence = await client.query({
      name: 'com-b02d-probe-absence',
      text: 'select not exists (select 1 from com_private.community_state where community_id = $1::uuid) as absent',
      values: [PROBE_COMMUNITY_ID]
    });
    exact(probePresence.rows[0] && probePresence.rows[0].absent, true, 'DOKE_COM_B02D_PROBE_ALREADY_EXISTS');

    await client.query('SET LOCAL ROLE service_role');
    const role = await client.query('select current_user as current_user, current_setting(\'transaction_read_only\') as transaction_read_only');
    exact(role.rows[0] && role.rows[0].current_user, 'service_role', 'DOKE_COM_B02D_SERVICE_ROLE_NOT_ACTIVE');
    exact(role.rows[0] && role.rows[0].transaction_read_only, 'on', 'DOKE_COM_B02D_TRANSACTION_NOT_READ_ONLY');

    const root = createCommunityStagingCompositionRoot({
      runtime: 'staging',
      serviceSupabase: createPgBackedServiceSupabase(client)
    });
    const probe = await root.probeCanonicalState({ actor: actor.actor, communityId: PROBE_COMMUNITY_ID });
    exact(probe.readOnly, true, 'DOKE_COM_B02D_ROOT_NOT_READ_ONLY');
    exact(probe.mutationAuthority, false, 'DOKE_COM_B02D_MUTATION_AUTHORITY_PRESENT');
    exact(probe.found, false, 'DOKE_COM_B02D_UNEXPECTED_CANONICAL_STATE');
    exact(probe.state, null, 'DOKE_COM_B02D_UNEXPECTED_CANONICAL_PAYLOAD');

    await client.query('RESET ROLE');
    const after = await loadCounts(client);
    assertSameCounts(before, after, 'DOKE_COM_B02D_COUNTS_CHANGED_INSIDE_READ_ONLY_TRANSACTION');
    await client.query('ROLLBACK');
    transactionOpen = false;

    await client.query('BEGIN READ ONLY');
    transactionOpen = true;
    const postflight = await loadCounts(client);
    assertSameCounts(before, postflight, 'DOKE_COM_B02D_POSTFLIGHT_COUNTS_CHANGED');
    await client.query('ROLLBACK');
    transactionOpen = false;

    report.status = 'authenticated_read_only_canary_passed';
    report.schema = schema;
    report.actor = actor.evidence;
    report.transaction = {
      isolation: 'repeatable_read',
      readOnly: true,
      effectiveRpcRole: 'service_role',
      endedWithRollback: true
    };
    report.result = {
      found: probe.found,
      state: probe.state,
      readOnly: probe.readOnly,
      mutationAuthority: probe.mutationAuthority,
      beforeCounts: before,
      afterCounts: after,
      postflightCounts: postflight,
      countsUnchanged: true,
      domainRowsCreated: 0
    };
    report.completedAt = new Date().toISOString();
    writeReport(report);
    console.log('COM-B02D authenticated read-only canary passed.');
    console.log(JSON.stringify({ status: report.status, actor: report.actor, result: report.result }, null, 2));
  } catch (error) {
    if (client && transactionOpen) await client.query('ROLLBACK').catch(() => {});
    report.status = 'authenticated_read_only_canary_failed';
    report.failure = safeError(error);
    report.completedAt = new Date().toISOString();
    writeReport(report);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(() => {});
  }
}

executeCanary(process.env).catch((error) => {
  const safe = safeError(error);
  console.error(`${safe.code}: ${safe.message}`);
  process.exitCode = 1;
});

#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const moderation = require('../backend/modules/communities/community-moderation-case-authority');
const {
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID,
  createModerationRollbackCanary
} = require('../backend/runtime/staging/community-moderation-rollback-canary');

const CONFIG = require('../config/com-b04e-authenticated-rollback-only-moderation-runtime-canary.json');
const EXPECTED_CONTRACT = 'com-b04e-authenticated-rollback-only-moderation-runtime-composition-canary-v1';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PULL_REQUEST = 61;
const EXPECTED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_MIGRATIONS = Object.freeze(['20260806004634', '20260806004832']);
const REPORT_PATH = path.resolve(
  process.env.COM_B04E_REPORT_PATH ||
  'reports/generated/COM-B04E-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY.json'
);

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
  const code = String(error && error.code || 'DOKE_COM_B04E_UNEXPECTED_FAILURE');
  if (/^(DOKE|COM)_[A-Z0-9_]+$/.test(code)) return { code, message: code };
  return {
    code: 'DOKE_COM_B04E_UNEXPECTED_FAILURE',
    message: 'The authenticated rollback-only moderation canary failed closed.',
    diagnosticSqlState: /^[0-9A-Z]{5}$/.test(code) ? code : null
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
  exact(CONFIG.contractId, EXPECTED_CONTRACT, 'DOKE_COM_B04E_EXECUTION_CONTRACT_MISMATCH');
  exact(CONFIG.status, 'explicit_authorization_received_execution_pending', 'DOKE_COM_B04E_EXECUTION_NOT_PENDING');
  exact(CONFIG.authorization.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B04E_AUTHORIZATION_PHRASE_MISMATCH');
  exact(CONFIG.authorization.received, true, 'DOKE_COM_B04E_AUTHORIZATION_NOT_RECEIVED');
  exact(CONFIG.authorization.consumed, false, 'DOKE_COM_B04E_AUTHORIZATION_ALREADY_CONSUMED');
  exact(CONFIG.authorization.singleUse, true, 'DOKE_COM_B04E_AUTHORIZATION_NOT_SINGLE_USE');
  exact(CONFIG.authorization.reusableAfterFailure, false, 'DOKE_COM_B04E_AUTHORIZATION_REUSE_ENABLED');
  exact(CONFIG.execution.attempted, false, 'DOKE_COM_B04E_PRIOR_ATTEMPT_REQUIRES_NEW_AUTHORIZATION');
  exact(CONFIG.execution.workflowRerunAllowed, false, 'DOKE_COM_B04E_RERUN_MUST_REMAIN_BLOCKED');
  exact(CONFIG.target.environment, 'staging', 'DOKE_COM_B04E_TARGET_NOT_STAGING');
  exact(CONFIG.target.projectId, REQUIRED_PROJECT_ID, 'DOKE_COM_B04E_PROJECT_MISMATCH');
  exact(CONFIG.target.pullRequest, EXPECTED_PULL_REQUEST, 'DOKE_COM_B04E_PR_MISMATCH');
  exact(CONFIG.target.branch, EXPECTED_BRANCH, 'DOKE_COM_B04E_BRANCH_MISMATCH');
  exact(CONFIG.canary.syntheticOnly, true, 'DOKE_COM_B04E_SYNTHETIC_ONLY_REQUIRED');
  exact(CONFIG.canary.rollbackOnly, true, 'DOKE_COM_B04E_ROLLBACK_ONLY_REQUIRED');
  exact(CONFIG.canary.outerIsolation, 'serializable', 'DOKE_COM_B04E_SERIALIZABLE_REQUIRED');
  exact(CONFIG.canary.coreCompositionActivationMode, 'disabled', 'DOKE_COM_B04E_CORE_MUST_REMAIN_DISABLED');
  exact(CONFIG.effects.routeRegistrationAllowed, false, 'DOKE_COM_B04E_ROUTE_REGISTRATION_BLOCKED');
  exact(CONFIG.effects.runtimeDeploymentAllowed, false, 'DOKE_COM_B04E_RUNTIME_DEPLOYMENT_BLOCKED');
  exact(CONFIG.effects.productionAllowed, false, 'DOKE_COM_B04E_PRODUCTION_BLOCKED');
  exact(env.COM_B04E_AUTHORIZATION, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B04E_ENV_AUTHORIZATION_MISMATCH');
  exact(env.SUPABASE_PROJECT_REF, REQUIRED_PROJECT_ID, 'DOKE_COM_B04E_ENV_PROJECT_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B04E_WORKFLOW_RERUN_BLOCKED');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B04E_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B04E_DB_PASSWORD_MISSING');
}

async function verifyPullRequest(env) {
  const pull = await fetchJson(
    `https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${EXPECTED_PULL_REQUEST}`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b04e-canary' } },
    'DOKE_COM_B04E_PR_PREFLIGHT_FAILED'
  );
  exact(pull.state, 'open', 'DOKE_COM_B04E_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B04E_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B04E_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B04E_AUTO_MERGE_ENABLED');
  exact(pull.head && pull.head.ref, EXPECTED_BRANCH, 'DOKE_COM_B04E_PR_BRANCH_MISMATCH');
  if (env.GITHUB_SHA) exact(pull.head && pull.head.sha, env.GITHUB_SHA, 'DOKE_COM_B04E_PR_SHA_MISMATCH');
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
        'User-Agent': 'doke-com-b04e-canary'
      }
    },
    'DOKE_COM_B04E_PROJECT_PREFLIGHT_FAILED'
  );
  exact(project.id, REQUIRED_PROJECT_ID, 'DOKE_COM_B04E_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B04E_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B04E_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B04E_PROJECT_REGION_INVALID');
  const directHost = project.database && project.database.host;
  if (directHost && directHost !== `db.${REQUIRED_PROJECT_ID}.supabase.co`) {
    fail('DOKE_COM_B04E_DATABASE_HOST_MISMATCH');
  }
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
      application_name: 'doke-com-b04e-rollback-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1 as ok');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_COM_B04E_DATABASE_CONNECTION_FAILED');
}

async function loadCounts(client) {
  const response = await client.query(`select
    (select count(*)::int from com_moderation_private.case_projection) as case_projection,
    (select count(*)::int from com_moderation_private.case_event) as case_event,
    (select count(*)::int from com_moderation_private.command_idempotency) as command_idempotency,
    (select count(*)::int from com_moderation_private.evidence_record) as evidence_record,
    (select count(*)::int from com_moderation_private.decision_record) as decision_record,
    (select count(*)::int from com_moderation_private.sanction_event) as sanction_event,
    (select count(*)::int from com_moderation_private.appeal_event) as appeal_event,
    (select count(*)::int from com_moderation_private.media_review_event) as media_review_event`);
  return Object.freeze({ ...response.rows[0] });
}

async function verifySchema(client) {
  const response = await client.query({
    name: 'com-b04e-schema-preflight',
    text: `select
      to_regclass('auth.users') is not null as auth_users,
      to_regclass('auth.sessions') is not null as auth_sessions,
      to_regclass('public.users') is not null as app_users,
      to_regclass('com_moderation_private.case_projection') is not null as case_projection,
      to_regclass('com_moderation_private.case_event') is not null as case_event,
      to_regclass('com_moderation_private.command_idempotency') is not null as command_idempotency,
      to_regclass('com_moderation_private.evidence_record') is not null as evidence_record,
      to_regclass('com_moderation_private.decision_record') is not null as decision_record,
      to_regclass('com_moderation_private.sanction_event') is not null as sanction_event,
      to_regclass('com_moderation_private.appeal_event') is not null as appeal_event,
      to_regclass('com_moderation_private.media_review_event') is not null as media_review_event,
      to_regprocedure('public.com_moderation_load_case_v1(uuid)') is not null as load_rpc,
      to_regprocedure('public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null as commit_rpc,
      (select count(*) = 2 from supabase_migrations.schema_migrations where version = any($1::text[])) as migrations_present,
      has_function_privilege('service_role', 'public.com_moderation_load_case_v1(uuid)', 'EXECUTE') as service_role_load,
      has_function_privilege('service_role', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as service_role_commit,
      not has_function_privilege('authenticated', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as authenticated_commit_blocked,
      not has_function_privilege('anon', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as anon_commit_blocked`,
    values: [REQUIRED_MIGRATIONS]
  });
  const row = response.rows[0] || {};
  if (Object.values(row).some((value) => value !== true)) fail('DOKE_COM_B04E_SCHEMA_GATE_FAILED');
  return Object.freeze({ ...row });
}

async function loadAuthenticatedActor(client) {
  const response = await client.query(`select
    session.id as session_id,
    session.user_id,
    session.aal::text as aal,
    app_user.status,
    app_user.role
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
  if (!row) fail('DOKE_COM_B04E_VALID_AUTHENTICATED_SESSION_REQUIRED');
  if (!['aal1', 'aal2'].includes(row.aal)) fail('DOKE_COM_B04E_SUPPORTED_AAL_REQUIRED');
  return Object.freeze({
    session: Object.freeze({
      verified: true,
      source: 'server_verified_session',
      userId: row.user_id,
      role: row.role || 'client',
      status: row.status,
      aal: row.aal
    }),
    evidence: Object.freeze({
      source: 'server_verified_authenticated_session',
      aal: row.aal,
      role: row.role || 'client',
      actorSha256: hash(row.user_id),
      sessionSha256: hash(row.session_id),
      rawIdentifiersExposed: false
    })
  });
}

function createPgExecutor(client) {
  const allowed = new Set([
    'com_moderation_load_case_v1',
    'com_moderation_commit_case_command_v1'
  ]);
  return Object.freeze({
    authority: 'server_service_role',
    environment: 'staging_rollback_canary',
    async rpc(name, args) {
      if (!allowed.has(name)) fail('DOKE_COM_B04E_RPC_NOT_ALLOWLISTED');
      try {
        if (name === 'com_moderation_load_case_v1') {
          const response = await client.query({
            name: 'com-b04e-load-canonical-case',
            text: 'select public.com_moderation_load_case_v1($1::uuid) as data',
            values: [args && args.p_case_id]
          });
          return { data: response.rows[0] ? response.rows[0].data : null, error: null };
        }
        const response = await client.query({
          name: 'com-b04e-commit-case-command',
          text: `select public.com_moderation_commit_case_command_v1(
            $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::text,$7::bigint,
            $8::text,$9::text,$10::text,$11::text,$12::text,$13::timestamptz,
            $14::text,$15::text,$16::uuid,$17::text,$18::uuid,
            $19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb
          ) as data`,
          values: [
            args.p_case_id,
            args.p_community_id,
            args.p_actor_id,
            args.p_client_request_id,
            args.p_idempotency_key,
            args.p_intent_fingerprint,
            args.p_expected_revision,
            args.p_event_id,
            args.p_event_action,
            args.p_event_hash,
            args.p_previous_event_hash,
            args.p_policy_fingerprint,
            args.p_occurred_at,
            args.p_case_kind,
            args.p_case_state,
            args.p_reporter_id,
            args.p_target_type,
            args.p_target_id,
            JSON.stringify(args.p_projection || {}),
            JSON.stringify(args.p_event_details || {}),
            args.p_evidence_record ? JSON.stringify(args.p_evidence_record) : null,
            args.p_decision_record ? JSON.stringify(args.p_decision_record) : null,
            args.p_sanction_event ? JSON.stringify(args.p_sanction_event) : null,
            args.p_appeal_event ? JSON.stringify(args.p_appeal_event) : null,
            args.p_media_review_event ? JSON.stringify(args.p_media_review_event) : null
          ]
        });
        return { data: response.rows[0] ? response.rows[0].data : null, error: null };
      } catch (error) {
        return { error: { code: String(error && error.message || error && error.code || 'RPC_FAILURE') } };
      }
    }
  });
}

function createTransactionGuard(client) {
  return Object.freeze({
    authority: 'staging_outer_transaction_guard',
    environment: 'staging',
    isolation: 'serializable',
    rollbackOnly: true,
    mutationScope: 'synthetic_moderation_canary',
    async assertActive() {
      const response = await client.query(`select
        current_user as current_user,
        current_setting('transaction_isolation') as isolation,
        current_setting('transaction_read_only') as read_only`);
      const row = response.rows[0] || {};
      exact(row.current_user, 'service_role', 'DOKE_COM_B04E_SERVICE_ROLE_NOT_ACTIVE');
      exact(row.isolation, 'serializable', 'DOKE_COM_B04E_TRANSACTION_NOT_SERIALIZABLE');
      exact(row.read_only, 'off', 'DOKE_COM_B04E_TRANSACTION_MUST_ALLOW_ROLLBACK_SCOPED_WRITE');
      return true;
    }
  });
}

function createCanonicalContext(actorId) {
  return Object.freeze({
    source: 'canonical_server_context',
    complete: true,
    community: Object.freeze({
      id: CONFIG.synthetic.communityId,
      status: 'active',
      source: 'canonical_server',
      complete: true,
      revision: 1
    }),
    authorization: Object.freeze({
      actorId,
      source: 'canonical_server',
      complete: true,
      revision: 1,
      capabilities: Object.freeze({})
    }),
    policy: Object.freeze({
      status: 'approved',
      version: '2026.08.05-com-b04e-canary',
      fingerprint: moderation.sha256('com-b04e-approved-canary-policy'),
      automaticEnforcementAllowed: false,
      reportCountCreatesSanction: false,
      scanResultCreatesFinalDecision: false
    }),
    target: Object.freeze({
      id: CONFIG.synthetic.targetId,
      communityId: CONFIG.synthetic.communityId,
      ownerId: CONFIG.synthetic.targetOwnerId,
      type: 'community_post',
      state: 'published',
      source: 'canonical_server',
      complete: true,
      revision: 1
    })
  });
}

function assertCountDelta(before, inside) {
  const expected = {
    case_projection: 1,
    case_event: 1,
    command_idempotency: 1,
    evidence_record: 1,
    decision_record: 0,
    sanction_event: 0,
    appeal_event: 0,
    media_review_event: 0
  };
  for (const [key, delta] of Object.entries(expected)) {
    exact(inside[key] - before[key], delta, `DOKE_COM_B04E_COUNT_DELTA_${key.toUpperCase()}_INVALID`);
  }
  return expected;
}

function assertSameCounts(before, after, code) {
  assert.deepStrictEqual(after, before, code);
}

async function executeCanary(env) {
  verifyExecutionEnvelope(env);
  const report = {
    validationId: 'COM-B04E-AUTHENTICATED-ROLLBACK-ONLY-MODERATION-RUNTIME-CANARY',
    contractId: EXPECTED_CONTRACT,
    domain: 'COM-001',
    status: 'execution_started',
    authorization: {
      phraseSha256: hash(REQUIRED_AUTHORIZATION_PHRASE),
      source: 'explicit_user_message',
      receivedAt: CONFIG.authorization.receivedAt,
      singleUse: true,
      consumed: true,
      reusableAfterFailure: false,
      workflowRunAttempt: Number(env.GITHUB_RUN_ATTEMPT || 1)
    },
    target: {
      environment: 'staging',
      projectId: REQUIRED_PROJECT_ID,
      projectName: EXPECTED_PROJECT_NAME,
      migrationVersions: REQUIRED_MIGRATIONS
    },
    startedAt: new Date().toISOString(),
    completedAt: null,
    result: null,
    failure: null,
    effects: {
      networkRequestExecuted: false,
      databaseReadExecuted: false,
      rollbackScopedMutationExecuted: false,
      persistentMutationExecuted: false,
      routeRegistered: false,
      runtimeDeployed: false,
      productionChanged: false,
      pullRequestMerged: false
    }
  };

  let pool;
  let client;
  let transactionOpen = false;
  let baselineCounts = null;
  let caseId = null;

  try {
    report.pullRequest = await verifyPullRequest(env);
    report.effects.networkRequestExecuted = true;

    const project = await verifyProject(env);
    report.project = { id: project.id, name: project.name, status: project.status, region: project.region };

    const connection = await connectStaging(project, env.SUPABASE_DB_PASSWORD);
    pool = connection.pool;
    client = connection.client;
    report.connection = { transport: 'postgres_tls', hostClass: connection.hostClass, credentialsExposed: false };

    await verifySchema(client);
    const authenticated = await loadAuthenticatedActor(client);
    report.actor = authenticated.evidence;
    baselineCounts = await loadCounts(client);
    report.effects.databaseReadExecuted = true;

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE');
    transactionOpen = true;
    const clockResponse = await client.query("select to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as now");
    const serverNow = clockResponse.rows[0] && clockResponse.rows[0].now;
    if (!serverNow || !Number.isFinite(Date.parse(serverNow))) fail('DOKE_COM_B04E_SERVER_CLOCK_REQUIRED');

    await client.query('SET LOCAL ROLE service_role');
    const executor = createPgExecutor(client);
    const canary = createModerationRollbackCanary({
      authorization: CONFIG.authorization,
      transactionGuard: createTransactionGuard(client),
      executor,
      sessionVerifier: Object.freeze({
        authority: 'server_verified_session_boundary',
        async verify() { return authenticated.session; }
      }),
      contextLoader: Object.freeze({
        authority: 'canonical_server_context_loader',
        async load({ actorId }) { return createCanonicalContext(actorId); }
      }),
      clock: Object.freeze({
        authority: 'server_utc_clock',
        async now() { return serverNow; }
      })
    });

    const request = {
      headers: Object.freeze({}),
      requestId: 'com-b04e-authenticated-rollback-only-canary',
      envelope: Object.freeze({
        command: 'open_case',
        clientRequestId: CONFIG.synthetic.clientRequestId,
        expectedRevision: 0,
        payload: Object.freeze({
          kind: 'content_report',
          initialEvidenceKind: 'report_statement',
          initialEvidenceRef: CONFIG.synthetic.initialEvidenceReference,
          initialEvidenceDigest: moderation.sha256(CONFIG.synthetic.initialEvidenceDigestSeed)
        })
      })
    };

    const canaryResult = await canary.execute(request);
    caseId = canaryResult.caseIdSha256;
    report.effects.rollbackScopedMutationExecuted = true;

    await client.query('RESET ROLE');
    const insideCounts = await loadCounts(client);
    const countDelta = assertCountDelta(baselineCounts, insideCounts);
    const rows = await client.query({
      name: 'com-b04e-inside-transaction-evidence',
      text: `select
        projection.revision,
        projection.ledger_head_hash,
        evidence.evidence_kind,
        evidence.opaque_reference,
        evidence.digest
      from com_moderation_private.case_projection projection
      join com_moderation_private.evidence_record evidence on evidence.case_id = projection.case_id
      where encode(digest(projection.case_id::text, 'sha256'), 'hex') = $1`,
      values: [canaryResult.caseIdSha256]
    });
    const row = rows.rows[0];
    if (!row) fail('DOKE_COM_B04E_ROLLBACK_SCOPED_ROWS_MISSING');
    exact(Number(row.revision), 1, 'DOKE_COM_B04E_REVISION_INVALID');
    exact(row.ledger_head_hash, canaryResult.eventHash, 'DOKE_COM_B04E_LEDGER_HASH_INVALID');
    exact(row.evidence_kind, 'report_statement', 'DOKE_COM_B04E_EVIDENCE_KIND_INVALID');
    exact(row.opaque_reference, CONFIG.synthetic.initialEvidenceReference, 'DOKE_COM_B04E_EVIDENCE_REFERENCE_INVALID');
    exact(row.digest, moderation.sha256(CONFIG.synthetic.initialEvidenceDigestSeed), 'DOKE_COM_B04E_EVIDENCE_DIGEST_INVALID');

    await client.query('ROLLBACK');
    transactionOpen = false;

    const postflightCounts = await loadCounts(client);
    assertSameCounts(baselineCounts, postflightCounts, 'DOKE_COM_B04E_PERSISTENT_COUNTS_CHANGED');
    const residue = await client.query({
      name: 'com-b04e-postflight-residue',
      text: `select
        not exists (select 1 from com_moderation_private.case_projection where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as case_absent,
        not exists (select 1 from com_moderation_private.case_event where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as event_absent,
        not exists (select 1 from com_moderation_private.command_idempotency where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as command_absent,
        not exists (select 1 from com_moderation_private.evidence_record where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as evidence_absent`,
      values: [canaryResult.caseIdSha256]
    });
    if (Object.values(residue.rows[0] || {}).some((value) => value !== true)) {
      fail('DOKE_COM_B04E_PERSISTENT_RESIDUE_DETECTED');
    }

    report.status = 'authenticated_rollback_only_canary_passed';
    report.result = {
      authenticatedSessionVerified: true,
      actorSource: authenticated.evidence.source,
      assuranceLevel: authenticated.evidence.aal,
      coreCompositionActivationMode: canaryResult.coreCompositionActivationMode,
      coreLivePathBlocked: canaryResult.coreLivePathBlocked,
      domainDecision: canaryResult.decision,
      domainReason: canaryResult.reason,
      transactionIsolation: 'serializable',
      transactionRolledBack: true,
      atomicRpcBoundary: canaryResult.transactionBoundary,
      revisionObservedInsideTransaction: canaryResult.revision,
      eventHash: canaryResult.eventHash,
      caseIdSha256: canaryResult.caseIdSha256,
      initialEvidenceMaterialized: canaryResult.initialEvidenceMaterialized,
      countDeltaInsideTransaction: countDelta,
      countsRestoredAfterRollback: true,
      persistentResidue: false,
      rawIdentifiersExposed: false
    };
    report.effects.persistentMutationExecuted = false;
    report.completedAt = new Date().toISOString();
    writeReport(report);
    console.log('COM-B04E authenticated rollback-only moderation runtime canary passed.');
    console.log(JSON.stringify({
      status: report.status,
      projectId: REQUIRED_PROJECT_ID,
      actorSha256: authenticated.evidence.actorSha256,
      caseIdSha256: canaryResult.caseIdSha256,
      revision: canaryResult.revision,
      rollback: true,
      persistentResidue: false
    }));
  } catch (error) {
    if (transactionOpen && client) {
      await client.query('ROLLBACK').catch(() => {});
      transactionOpen = false;
    }
    report.status = 'failed_closed';
    report.failure = safeError(error);
    report.result = {
      transactionRolledBack: true,
      authorizationConsumed: true,
      caseIdSha256: caseId,
      persistentMutationExecuted: false
    };
    report.effects.persistentMutationExecuted = false;
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
  console.error(safe.code);
  process.exit(1);
});

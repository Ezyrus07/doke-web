#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const moderation = require('../backend/modules/communities/community-moderation-case-authority');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const {
  ATTEMPT_CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID,
  REQUIRED_RPC_ALLOWLIST,
  createModerationAttempt3StagingLiveRouteCanary
} = require('../backend/runtime/staging/community-moderation-live-route-canary-attempt-3');

const TRIGGER_PATH = 'config/com-b04i-r2-attempt-3-staging-trigger.json';
const EXPECTED_TRIGGER_CONTRACT = 'com-b04i-r2-attempt-3-staging-trigger-v1';
const EXPECTED_REPOSITORY = 'Ezyrus07/doke-web';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const EXPECTED_BRANCH = 'com/com-001-baseline-audit';
const EXPECTED_PR = 61;
const REQUIRED_MIGRATIONS = Object.freeze(['20260806004634', '20260806004832']);
const REPORT_PATH = path.resolve(process.env.COM_B04I_R2_ATTEMPT3_REPORT_PATH ||
  'reports/generated/COM-B04I-R2-ATTEMPT-3-STAGING-LIVE-COMPOSITION-ROUTE-CANARY.json');
const SHA40 = /^[a-f0-9]{40}$/;

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}
function exact(actual, expected, code) { if (actual !== expected) fail(code); }
function hash(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function safeError(error) {
  const code = String(error?.code || error?.message || 'DOKE_COM_B04I_R2_ATTEMPT3_UNEXPECTED_FAILURE');
  return /^(DOKE|COM)_[A-Z0-9_]+$/.test(code)
    ? { code, message: code }
    : { code: 'DOKE_COM_B04I_R2_ATTEMPT3_UNEXPECTED_FAILURE', message: 'COM-B04I-R2 attempt 3 failed closed.' };
}
function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
}
function readTrigger() {
  if (!fs.existsSync(TRIGGER_PATH)) fail('DOKE_COM_B04I_R2_ATTEMPT3_TRIGGER_MISSING');
  return JSON.parse(fs.readFileSync(TRIGGER_PATH, 'utf8'));
}
async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); } catch (_) { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); } catch (_) { fail(code); }
}

function verifyEnvelope(trigger, env) {
  exact(trigger.contractId, EXPECTED_TRIGGER_CONTRACT, 'DOKE_COM_B04I_R2_ATTEMPT3_TRIGGER_CONTRACT_MISMATCH');
  exact(trigger.status, 'authorization_consumed_execution_pending', 'DOKE_COM_B04I_R2_ATTEMPT3_TRIGGER_NOT_PENDING');
  exact(trigger.authorization?.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B04I_R2_ATTEMPT3_AUTHORIZATION_MISMATCH');
  exact(trigger.authorization?.received, true, 'DOKE_COM_B04I_R2_ATTEMPT3_AUTHORIZATION_NOT_RECEIVED');
  exact(trigger.authorization?.consumed, true, 'DOKE_COM_B04I_R2_ATTEMPT3_AUTHORIZATION_NOT_CONSUMED');
  exact(trigger.authorization?.singleUse, true, 'DOKE_COM_B04I_R2_ATTEMPT3_SINGLE_USE_REQUIRED');
  exact(trigger.authorization?.reusableAfterFailure, false, 'DOKE_COM_B04I_R2_ATTEMPT3_REUSE_PROHIBITED');
  exact(trigger.authorization?.executionAttempted, true, 'DOKE_COM_B04I_R2_ATTEMPT3_ATTEMPT_REQUIRED');
  if (!SHA40.test(String(trigger.workflowInstallHead || ''))) fail('DOKE_COM_B04I_R2_ATTEMPT3_INSTALL_HEAD_INVALID');
  if (!SHA40.test(String(env.GITHUB_SHA || ''))) fail('DOKE_COM_B04I_R2_ATTEMPT3_TRIGGER_HEAD_INVALID');
  if (trigger.workflowInstallHead === env.GITHUB_SHA) fail('DOKE_COM_B04I_R2_ATTEMPT3_TRIGGER_HEAD_NOT_DISTINCT');
  exact(trigger.target?.environment, 'staging', 'DOKE_COM_B04I_R2_ATTEMPT3_TARGET_NOT_STAGING');
  exact(trigger.target?.projectId, REQUIRED_PROJECT_ID, 'DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_MISMATCH');
  exact(trigger.target?.branch, EXPECTED_BRANCH, 'DOKE_COM_B04I_R2_ATTEMPT3_BRANCH_MISMATCH');
  exact(trigger.target?.pullRequest, EXPECTED_PR, 'DOKE_COM_B04I_R2_ATTEMPT3_PR_MISMATCH');
  exact(trigger.canary?.processLocalActivation, true, 'DOKE_COM_B04I_R2_ATTEMPT3_PROCESS_LOCAL_REQUIRED');
  exact(trigger.canary?.publicTrafficEnabled, false, 'DOKE_COM_B04I_R2_ATTEMPT3_PUBLIC_TRAFFIC_PROHIBITED');
  exact(trigger.canary?.syntheticOnly, true, 'DOKE_COM_B04I_R2_ATTEMPT3_SYNTHETIC_ONLY_REQUIRED');
  exact(trigger.canary?.rollbackOnly, true, 'DOKE_COM_B04I_R2_ATTEMPT3_ROLLBACK_ONLY_REQUIRED');
  exact(trigger.canary?.outerIsolation, 'serializable', 'DOKE_COM_B04I_R2_ATTEMPT3_SERIALIZABLE_REQUIRED');
  assert.deepStrictEqual(trigger.canary?.rpcAllowlist, REQUIRED_RPC_ALLOWLIST, 'DOKE_COM_B04I_R2_ATTEMPT3_RPC_ALLOWLIST_MISMATCH');
  if (!/^opaque:[A-Za-z0-9:_-]+$/.test(String(trigger.synthetic?.initialEvidenceReference || '')) ||
      String(trigger.synthetic.initialEvidenceReference).includes('/')) {
    fail('DOKE_COM_B04I_R2_ATTEMPT3_CANONICAL_OPAQUE_REFERENCE_REQUIRED');
  }
  exact(env.COM_B04I_R2_ATTEMPT3_AUTHORIZATION, REQUIRED_AUTHORIZATION_PHRASE, 'DOKE_COM_B04I_R2_ATTEMPT3_ENV_AUTHORIZATION_MISMATCH');
  exact(env.SUPABASE_PROJECT_REF, REQUIRED_PROJECT_ID, 'DOKE_COM_B04I_R2_ATTEMPT3_ENV_PROJECT_MISMATCH');
  exact(String(env.GITHUB_RUN_ATTEMPT || '1'), '1', 'DOKE_COM_B04I_R2_ATTEMPT3_WORKFLOW_RERUN_BLOCKED');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_COM_B04I_R2_ATTEMPT3_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_COM_B04I_R2_ATTEMPT3_DB_PASSWORD_MISSING');
}

async function verifyPullRequest(env, trigger) {
  const pull = await fetchJson(`https://api.github.com/repos/${EXPECTED_REPOSITORY}/pulls/${EXPECTED_PR}`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-com-b04i-r2-attempt3' } },
    'DOKE_COM_B04I_R2_ATTEMPT3_PR_PREFLIGHT_FAILED');
  exact(pull.state, 'open', 'DOKE_COM_B04I_R2_ATTEMPT3_PR_NOT_OPEN');
  exact(pull.draft, true, 'DOKE_COM_B04I_R2_ATTEMPT3_PR_NOT_DRAFT');
  exact(pull.merged, false, 'DOKE_COM_B04I_R2_ATTEMPT3_PR_ALREADY_MERGED');
  exact(pull.auto_merge, null, 'DOKE_COM_B04I_R2_ATTEMPT3_AUTO_MERGE_ENABLED');
  exact(pull.head?.ref, EXPECTED_BRANCH, 'DOKE_COM_B04I_R2_ATTEMPT3_PR_BRANCH_MISMATCH');
  exact(pull.head?.sha, env.GITHUB_SHA, 'DOKE_COM_B04I_R2_ATTEMPT3_PR_SHA_MISMATCH');
  exact(trigger.workflowInstallHead, env.COM_B04I_R2_ATTEMPT3_WORKFLOW_INSTALL_HEAD, 'DOKE_COM_B04I_R2_ATTEMPT3_PARENT_BINDING_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha };
}

async function verifyProject(env) {
  const project = await fetchJson(`https://api.supabase.com/v1/projects/${REQUIRED_PROJECT_ID}`, {
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, Accept: 'application/json', 'User-Agent': 'doke-com-b04i-r2-attempt3' }
  }, 'DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_PREFLIGHT_FAILED');
  exact(project.id, REQUIRED_PROJECT_ID, 'DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_ID_MISMATCH');
  exact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_NAME_MISMATCH');
  exact(project.status, 'ACTIVE_HEALTHY', 'DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_NOT_HEALTHY');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_COM_B04I_R2_ATTEMPT3_PROJECT_REGION_INVALID');
  const directHost = project.database?.host || null;
  if (directHost && directHost !== `db.${REQUIRED_PROJECT_ID}.supabase.co`) fail('DOKE_COM_B04I_R2_ATTEMPT3_DATABASE_HOST_MISMATCH');
  return { id: project.id, name: project.name, status: project.status, region, directHost };
}

async function connect(project, password) {
  const candidates = [`aws-0-${project.region}.pooler.supabase.com`, `aws-1-${project.region}.pooler.supabase.com`, project.directHost].filter(Boolean);
  for (const host of [...new Set(candidates)]) {
    const direct = host === project.directHost;
    const pool = new Pool({
      host, port: 5432, user: direct ? 'postgres' : `postgres.${REQUIRED_PROJECT_ID}`,
      password, database: 'postgres', ssl: { rejectUnauthorized: false }, max: 1,
      connectionTimeoutMillis: 8000, idleTimeoutMillis: 1000,
      application_name: 'doke-com-b04i-r2-attempt3-route-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1');
      return { pool, client, hostClass: direct ? 'direct' : 'pooler' };
    } catch (_) { await pool.end().catch(() => {}); }
  }
  fail('DOKE_COM_B04I_R2_ATTEMPT3_DATABASE_CONNECTION_FAILED');
}

async function verifySchema(client) {
  const result = await client.query({
    name: 'com-b04i-r2-attempt3-schema-preflight',
    text: `select
      to_regclass('auth.sessions') is not null as auth_sessions,
      to_regclass('public.users') is not null as app_users,
      to_regclass('com_moderation_private.case_projection') is not null as case_projection,
      to_regclass('com_moderation_private.case_event') is not null as case_event,
      to_regclass('com_moderation_private.command_idempotency') is not null as command_idempotency,
      to_regclass('com_moderation_private.evidence_record') is not null as evidence_record,
      to_regprocedure('public.com_moderation_load_case_v1(uuid)') is not null as load_rpc,
      to_regprocedure('public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)') is not null as commit_rpc,
      (select count(*) = 2 from supabase_migrations.schema_migrations where version = any($1::text[])) as migrations_present,
      has_function_privilege('service_role', 'public.com_moderation_load_case_v1(uuid)', 'EXECUTE') as service_role_load,
      has_function_privilege('service_role', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as service_role_commit,
      not has_function_privilege('authenticated', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as authenticated_commit_blocked,
      not has_function_privilege('anon', 'public.com_moderation_commit_case_command_v1(uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') as anon_commit_blocked`,
    values: [REQUIRED_MIGRATIONS]
  });
  if (Object.values(result.rows[0] || {}).some((value) => value !== true)) fail('DOKE_COM_B04I_R2_ATTEMPT3_SCHEMA_GATE_FAILED');
}

async function loadActor(client) {
  const result = await client.query(`select session.id as session_id, session.user_id, session.aal::text as aal, app_user.status, app_user.role
    from auth.sessions session
    join auth.users auth_user on auth_user.id = session.user_id
    join public.users app_user on app_user.id = session.user_id
    where (session.not_after is null or session.not_after > pg_catalog.now())
      and auth_user.deleted_at is null
      and (auth_user.banned_until is null or auth_user.banned_until <= pg_catalog.now())
      and app_user.status = 'active'
    order by coalesce(session.refreshed_at::timestamptz, session.updated_at, session.created_at) desc limit 1`);
  const row = result.rows[0];
  if (!row || !['aal1', 'aal2'].includes(row.aal)) fail('DOKE_COM_B04I_R2_ATTEMPT3_VALID_AUTHENTICATED_SESSION_REQUIRED');
  return {
    session: Object.freeze({ verified: true, source: 'server_verified_session', userId: row.user_id, role: row.role || 'client', status: row.status, aal: row.aal }),
    evidence: { source: 'server_verified_authenticated_session', aal: row.aal, role: row.role || 'client', actorSha256: hash(row.user_id), sessionSha256: hash(row.session_id), rawIdentifiersExposed: false }
  };
}

async function counts(client) {
  const result = await client.query(`select
    (select count(*)::int from com_moderation_private.case_projection) as case_projection,
    (select count(*)::int from com_moderation_private.case_event) as case_event,
    (select count(*)::int from com_moderation_private.command_idempotency) as command_idempotency,
    (select count(*)::int from com_moderation_private.evidence_record) as evidence_record,
    (select count(*)::int from com_moderation_private.decision_record) as decision_record,
    (select count(*)::int from com_moderation_private.sanction_event) as sanction_event,
    (select count(*)::int from com_moderation_private.appeal_event) as appeal_event,
    (select count(*)::int from com_moderation_private.media_review_event) as media_review_event`);
  return { ...result.rows[0] };
}

function createExecutor(client) {
  return Object.freeze({
    authority: 'server_service_role',
    environment: 'staging_rollback_route_canary_attempt_3',
    rpcAllowlist: REQUIRED_RPC_ALLOWLIST,
    async rpc(name, args) {
      if (!REQUIRED_RPC_ALLOWLIST.includes(name)) fail('DOKE_COM_B04I_R2_ATTEMPT3_RPC_NOT_ALLOWLISTED');
      try {
        if (name === 'com_moderation_load_case_v1') {
          const result = await client.query('select public.com_moderation_load_case_v1($1::uuid) as data', [args.p_case_id]);
          return { data: result.rows[0]?.data || null, error: null };
        }
        const result = await client.query({
          name: 'com-b04i-r2-attempt3-commit-case-command',
          text: `select public.com_moderation_commit_case_command_v1(
            $1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::text,$6::text,$7::bigint,$8::text,$9::text,$10::text,
            $11::text,$12::text,$13::timestamptz,$14::text,$15::text,$16::uuid,$17::text,$18::uuid,
            $19::jsonb,$20::jsonb,$21::jsonb,$22::jsonb,$23::jsonb,$24::jsonb,$25::jsonb) as data`,
          values: [
            args.p_case_id,args.p_community_id,args.p_actor_id,args.p_client_request_id,args.p_idempotency_key,
            args.p_intent_fingerprint,args.p_expected_revision,args.p_event_id,args.p_event_action,args.p_event_hash,
            args.p_previous_event_hash,args.p_policy_fingerprint,args.p_occurred_at,args.p_case_kind,args.p_case_state,
            args.p_reporter_id,args.p_target_type,args.p_target_id,JSON.stringify(args.p_projection || {}),
            JSON.stringify(args.p_event_details || {}),args.p_evidence_record ? JSON.stringify(args.p_evidence_record) : null,
            args.p_decision_record ? JSON.stringify(args.p_decision_record) : null,args.p_sanction_event ? JSON.stringify(args.p_sanction_event) : null,
            args.p_appeal_event ? JSON.stringify(args.p_appeal_event) : null,args.p_media_review_event ? JSON.stringify(args.p_media_review_event) : null
          ]
        });
        return { data: result.rows[0]?.data || null, error: null };
      } catch (error) {
        return { error: { code: String(error?.message || error?.code || 'RPC_FAILURE') } };
      }
    }
  });
}

function canonicalContext(actorId, trigger) {
  return Object.freeze({
    source: 'canonical_server_context', complete: true,
    community: Object.freeze({ id: trigger.synthetic.communityId, status: 'active', source: 'canonical_server', complete: true, revision: 1 }),
    authorization: Object.freeze({ actorId, source: 'canonical_server', complete: true, revision: 1, capabilities: Object.freeze({}) }),
    policy: Object.freeze({
      status: 'approved', version: '2026.08.06-com-b04i-attempt3-canary',
      fingerprint: moderation.sha256('com-b04i-r2-attempt3-approved-canary-policy'),
      automaticEnforcementAllowed: false, reportCountCreatesSanction: false, scanResultCreatesFinalDecision: false
    }),
    target: Object.freeze({
      id: trigger.synthetic.targetId, communityId: trigger.synthetic.communityId, ownerId: actorId,
      type: 'community_post', state: 'published', source: 'canonical_server', complete: true, revision: 1
    })
  });
}

function assertDelta(before, inside) {
  const expected = { case_projection:1, case_event:1, command_idempotency:1, evidence_record:1, decision_record:0, sanction_event:0, appeal_event:0, media_review_event:0 };
  for (const [key, delta] of Object.entries(expected)) {
    exact(inside[key] - before[key], delta, `DOKE_COM_B04I_R2_ATTEMPT3_COUNT_DELTA_${key.toUpperCase()}_INVALID`);
  }
  return expected;
}

async function run(env) {
  const trigger = readTrigger();
  const report = {
    validationId: 'COM-B04I-R2-ATTEMPT-3-STAGING-LIVE-COMPOSITION-ROUTE-CANARY',
    contractId: ATTEMPT_CONTRACT_ID,
    domain: 'COM-001',
    status: 'execution_started',
    authorization: { phraseSha256: hash(REQUIRED_AUTHORIZATION_PHRASE), consumed: true, singleUse: true, reusableAfterFailure: false },
    target: { environment: 'staging', projectId: REQUIRED_PROJECT_ID },
    startedAt: new Date().toISOString(), completedAt: null, result: null, failure: null,
    effects: { networkRequestExecuted:false, databaseReadExecuted:false, rollbackScopedMutationExecuted:false, persistentMutationExecuted:false, processLocalRuntimeActivated:false, publicTrafficEnabled:false, runtimeDeployed:false, productionChanged:false, pullRequestMerged:false }
  };
  let pool; let client; let open = false; let baseline = null; let caseHash = null;
  try {
    verifyEnvelope(trigger, env);
    report.pullRequest = await verifyPullRequest(env, trigger);
    report.effects.networkRequestExecuted = true;
    const project = await verifyProject(env);
    report.project = { id: project.id, name: project.name, status: project.status, region: project.region };
    const connection = await connect(project, env.SUPABASE_DB_PASSWORD);
    pool = connection.pool; client = connection.client;
    report.connection = { transport: 'postgres_tls', hostClass: connection.hostClass, credentialsExposed: false };
    await verifySchema(client);
    const authenticated = await loadActor(client);
    report.actor = authenticated.evidence;
    baseline = await counts(client);
    report.effects.databaseReadExecuted = true;

    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE');
    open = true;
    const clock = await client.query("select to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') as now");
    const serverNow = clock.rows[0]?.now;
    if (!serverNow || !Number.isFinite(Date.parse(serverNow))) fail('DOKE_COM_B04I_R2_ATTEMPT3_SERVER_CLOCK_REQUIRED');
    await client.query('SET LOCAL ROLE service_role');

    const transactionGuard = Object.freeze({
      authority: 'staging_outer_transaction_guard', environment: 'staging', isolation: 'serializable', rollbackOnly: true, publicTrafficEnabled: false,
      async assertActive() {
        const result = await client.query("select current_user, current_setting('transaction_isolation') as isolation, current_setting('transaction_read_only') as read_only");
        exact(result.rows[0]?.current_user, 'service_role', 'DOKE_COM_B04I_R2_ATTEMPT3_SERVICE_ROLE_NOT_ACTIVE');
        exact(result.rows[0]?.isolation, 'serializable', 'DOKE_COM_B04I_R2_ATTEMPT3_TRANSACTION_NOT_SERIALIZABLE');
        exact(result.rows[0]?.read_only, 'off', 'DOKE_COM_B04I_R2_ATTEMPT3_TRANSACTION_READ_ONLY_INVALID');
        return true;
      }
    });

    const runtime = createModerationAttempt3StagingLiveRouteCanary({
      authorization: Object.freeze({
        phrase: trigger.authorization.phrase,
        received: true,
        consumed: true,
        singleUse: true,
        reusableAfterFailure: false,
        executionAttempted: true,
        workflowInstallHead: trigger.workflowInstallHead,
        triggerHead: env.GITHUB_SHA
      }),
      transactionGuard,
      executor: createExecutor(client),
      sessionVerifier: Object.freeze({ authority: 'server_verified_session_boundary', async verify() { return authenticated.session; } }),
      contextLoader: Object.freeze({ authority: 'canonical_server_context_loader', async load({ actorId }) { return canonicalContext(actorId, trigger); } }),
      clock: Object.freeze({ authority: 'server_utc_clock', async now() { return serverNow; } })
    });
    const handler = routeHandlers.createStagingCanaryModerationCommandHandler({ runtime });
    report.effects.processLocalRuntimeActivated = true;

    const response = await handler({
      headers: Object.freeze({}),
      requestId: 'com-b04i-r2-attempt3-staging-live-route-canary',
      envelope: Object.freeze({
        command: 'open_case',
        clientRequestId: trigger.synthetic.clientRequestId,
        expectedRevision: 0,
        payload: Object.freeze({
          kind: 'content_report', initialEvidenceKind: 'report_statement',
          initialEvidenceRef: trigger.synthetic.initialEvidenceReference,
          initialEvidenceDigest: moderation.sha256(trigger.synthetic.initialEvidenceDigestSeed)
        })
      })
    });
    exact(response.status, 200, 'DOKE_COM_B04I_R2_ATTEMPT3_ROUTE_STATUS_INVALID');
    exact(response.body.contractId, ATTEMPT_CONTRACT_ID, 'DOKE_COM_B04I_R2_ATTEMPT3_RESPONSE_CONTRACT_INVALID');
    exact(response.body.activationMode, 'staging_authenticated_server_runtime', 'DOKE_COM_B04I_R2_ATTEMPT3_ACTIVATION_MODE_INVALID');
    exact(response.body.authenticatedSessionVerified, true, 'DOKE_COM_B04I_R2_ATTEMPT3_SESSION_NOT_VERIFIED');
    exact(response.body.rawIdentifiersExposed, false, 'DOKE_COM_B04I_R2_ATTEMPT3_RAW_IDENTIFIER_EXPOSURE');
    caseHash = response.body.caseIdSha256;
    report.effects.rollbackScopedMutationExecuted = true;

    await client.query('RESET ROLE');
    const inside = await counts(client);
    const delta = assertDelta(baseline, inside);
    const evidence = await client.query({
      name: 'com-b04i-r2-attempt3-inside-transaction-evidence',
      text: `select projection.revision, projection.ledger_head_hash, evidence.evidence_kind, evidence.opaque_reference, evidence.digest
        from com_moderation_private.case_projection projection
        join com_moderation_private.evidence_record evidence on evidence.case_id = projection.case_id
        where encode(digest(projection.case_id::text, 'sha256'), 'hex') = $1`,
      values: [caseHash]
    });
    const row = evidence.rows[0];
    if (!row) fail('DOKE_COM_B04I_R2_ATTEMPT3_ROLLBACK_SCOPED_ROWS_MISSING');
    exact(Number(row.revision), 1, 'DOKE_COM_B04I_R2_ATTEMPT3_REVISION_INVALID');
    exact(row.ledger_head_hash, response.body.eventHash, 'DOKE_COM_B04I_R2_ATTEMPT3_LEDGER_HASH_INVALID');
    exact(row.evidence_kind, 'report_statement', 'DOKE_COM_B04I_R2_ATTEMPT3_EVIDENCE_KIND_INVALID');
    exact(row.opaque_reference, trigger.synthetic.initialEvidenceReference, 'DOKE_COM_B04I_R2_ATTEMPT3_EVIDENCE_REFERENCE_INVALID');
    exact(row.digest, moderation.sha256(trigger.synthetic.initialEvidenceDigestSeed), 'DOKE_COM_B04I_R2_ATTEMPT3_EVIDENCE_DIGEST_INVALID');

    await client.query('ROLLBACK');
    open = false;
    const after = await counts(client);
    assert.deepStrictEqual(after, baseline, 'DOKE_COM_B04I_R2_ATTEMPT3_PERSISTENT_COUNTS_CHANGED');
    const residue = await client.query({
      name: 'com-b04i-r2-attempt3-postflight-residue',
      text: `select
        not exists (select 1 from com_moderation_private.case_projection where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as case_absent,
        not exists (select 1 from com_moderation_private.case_event where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as event_absent,
        not exists (select 1 from com_moderation_private.command_idempotency where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as command_absent,
        not exists (select 1 from com_moderation_private.evidence_record where encode(digest(case_id::text, 'sha256'), 'hex') = $1) as evidence_absent`,
      values: [caseHash]
    });
    if (Object.values(residue.rows[0] || {}).some((value) => value !== true)) fail('DOKE_COM_B04I_R2_ATTEMPT3_PERSISTENT_RESIDUE_DETECTED');

    report.status = 'authenticated_process_local_live_route_canary_passed';
    report.result = {
      authenticatedSessionVerified:true,
      actorSource:authenticated.evidence.source,
      assuranceLevel:authenticated.evidence.aal,
      routeName:response.body.routeName,
      routeStatus:response.status,
      activationMode:response.body.activationMode,
      workflowInstallHead:trigger.workflowInstallHead,
      triggerHead:env.GITHUB_SHA,
      domainDecision:response.body.decision,
      transactionIsolation:'serializable',
      transactionRolledBack:true,
      revisionObservedInsideTransaction:response.body.revision,
      eventHash:response.body.eventHash,
      caseIdSha256:caseHash,
      countDeltaInsideTransaction:delta,
      countsRestoredAfterRollback:true,
      persistentResidue:false,
      rawIdentifiersExposed:false,
      publicTrafficEnabled:false,
      runtimeDeployed:false
    };
    report.effects.persistentMutationExecuted = false;
    report.completedAt = new Date().toISOString();
    writeReport(report);
    console.log('COM-B04I-R2 attempt-3 authenticated process-local live composition route canary passed.');
    console.log(JSON.stringify({ status:report.status, projectId:REQUIRED_PROJECT_ID, actorSha256:authenticated.evidence.actorSha256, caseIdSha256:caseHash, rollback:true, persistentResidue:false }));
  } catch (error) {
    if (open && client) await client.query('ROLLBACK').catch(() => {});
    report.status = 'failed_closed';
    report.failure = safeError(error);
    report.result = { authorizationConsumed:true, transactionRolledBack:true, caseIdSha256:caseHash, persistentMutationExecuted:false };
    report.effects.persistentMutationExecuted = false;
    report.completedAt = new Date().toISOString();
    writeReport(report);
    throw error;
  } finally {
    if (client) client.release();
    if (pool) await pool.end().catch(() => {});
  }
}

run(process.env).catch((error) => {
  console.error(safeError(error).code);
  process.exit(1);
});

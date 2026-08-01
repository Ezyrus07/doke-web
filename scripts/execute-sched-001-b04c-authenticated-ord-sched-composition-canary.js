#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const schedulingContract = require('../backend/modules/scheduling/scheduling-contract');
const {
  createSchedulingCompositionRoot,
  evaluateSchedulingRuntimeActivation
} = require('../backend/modules/scheduling/scheduling-composition-root');
const {
  readScheduleProjection,
  assertStartScheduleAuthority,
  assertGenericCancellationAllowed
} = require('../backend/modules/orders/order-scheduling-authority');
const { assertTransition } = require('../backend/modules/orders/order-state-machine');
const { createTransactionPort } = require('../backend/modules/scheduling/scheduling-postgres-repository');

const CONFIG = require('../config/sched-001-b04c-authenticated-ord-sched-composition-canary-execution.json');
const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const CANARY_PREFIX = 'sched-b04c-canary:';
const CANARY_SUBLOT = 'SCHED-B04C';
const FIXED_NOW = '2035-08-13T11:50:00.000Z';
const REPORT_PATH = path.resolve('reports/generated/sched-001-b04c-authenticated-ord-sched-composition-canary-report.json');
const MODES = new Set(['--preflight', '--execute']);

function fail(code, message, details) {
  const error = new Error(message || code);
  error.code = code;
  if (details) error.details = details;
  throw error;
}

function requireExact(value, expected, code) {
  if (value !== expected) fail(code, code);
}

function safeError(error) {
  const code = String(error && error.code || 'DOKE_SCHED_B04C_UNEXPECTED_FAILURE');
  const message = String(error && error.message || '');
  const safeDetails = error && error.details && typeof error.details === 'object'
    ? Object.freeze({
        expectedCode: String(error.details.expectedCode || ''),
        actualCode: error.details.actualCode == null ? null : String(error.details.actualCode)
      })
    : null;
  if (/^DOKE_[A-Z0-9_]+$/.test(message)) {
    return safeDetails ? { code: message, message, details: safeDetails } : { code: message, message };
  }
  if (code.startsWith('DOKE_')) {
    return safeDetails ? { code, message: code, details: safeDetails } : { code, message: code };
  }
  const diagnosticClasses = Object.freeze({
    '22007': 'invalid_datetime',
    '22P02': 'invalid_text_representation',
    '23502': 'not_null_violation',
    '23503': 'foreign_key_violation',
    '23505': 'unique_violation',
    '23514': 'check_violation',
    '25P02': 'transaction_aborted',
    '42501': 'insufficient_privilege',
    '42601': 'syntax_error',
    '42P18': 'indeterminate_datatype',
    '42703': 'undefined_column',
    '42883': 'undefined_function',
    'P0001': 'raised_exception',
    ERR_ASSERTION: 'runtime_assertion'
  });
  return {
    code: 'DOKE_SCHED_B04C_UNEXPECTED_FAILURE',
    message: 'The authenticated ORD/SCHED staging composition canary failed closed.',
    diagnosticClass: diagnosticClasses[code] || 'unclassified',
    diagnosticSqlState: /^[0-9A-Z]{5}$/.test(code) ? code : null
  };
}

async function fetchJson(url, options, code) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (_) {
    fail(code, code);
  }
  if (!response.ok) fail(code, code);
  try {
    return await response.json();
  } catch (_) {
    fail(code, code);
  }
}

async function verifyPullRequestGate(env) {
  const pull = await fetchJson(
    `https://api.github.com/repos/${CONFIG.target.repository}/pulls/${CONFIG.target.pullRequest}`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-sched-b04c-canary' } },
    'DOKE_SCHED_B04C_PR_PREFLIGHT_FAILED'
  );
  requireExact(pull.state, 'open', 'DOKE_SCHED_B04C_PR_NOT_OPEN');
  requireExact(pull.draft, true, 'DOKE_SCHED_B04C_PR_NOT_DRAFT');
  requireExact(pull.merged, false, 'DOKE_SCHED_B04C_PR_ALREADY_MERGED');
  requireExact(pull.auto_merge, null, 'DOKE_SCHED_B04C_AUTO_MERGE_ENABLED');
  requireExact(pull.head && pull.head.ref, CONFIG.target.branch, 'DOKE_SCHED_B04C_PR_HEAD_MISMATCH');
  if (!env.SCHED_B04C_EXPECTED_HEAD_SHA) fail('DOKE_SCHED_B04C_EXPECTED_HEAD_SHA_MISSING');
  requireExact(pull.head && pull.head.sha, env.SCHED_B04C_EXPECTED_HEAD_SHA, 'DOKE_SCHED_B04C_EXPECTED_HEAD_SHA_MISMATCH');
  if (env.GITHUB_SHA) requireExact(pull.head && pull.head.sha, env.GITHUB_SHA, 'DOKE_SCHED_B04C_WORKFLOW_SHA_MISMATCH');
  return Object.freeze({
    number: pull.number,
    state: pull.state,
    draft: pull.draft,
    merged: pull.merged,
    autoMergeEnabled: pull.auto_merge !== null,
    head: pull.head.ref,
    headSha: pull.head.sha
  });
}

async function verifyProjectGate(env) {
  requireExact(env.SUPABASE_PROJECT_REF, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B04C_PROJECT_REF_MISMATCH');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_SCHED_B04C_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_SCHED_B04C_DB_PASSWORD_MISSING');
  const project = await fetchJson(
    `https://api.supabase.com/v1/projects/${EXPECTED_PROJECT_REF}`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'User-Agent': 'doke-sched-b04c-canary'
      }
    },
    'DOKE_SCHED_B04C_PROJECT_PREFLIGHT_FAILED'
  );
  requireExact(project.id, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B04C_PROJECT_ID_MISMATCH');
  requireExact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_SCHED_B04C_PROJECT_NAME_MISMATCH');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_SCHED_B04C_PROJECT_REGION_INVALID');
  const directHost = project.database && project.database.host;
  if (directHost && directHost !== `db.${EXPECTED_PROJECT_REF}.supabase.co`) {
    fail('DOKE_SCHED_B04C_DATABASE_HOST_MISMATCH');
  }
  return Object.freeze({ id: project.id, name: project.name, region, directHost: directHost || null });
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
      user: direct ? 'postgres' : `postgres.${EXPECTED_PROJECT_REF}`,
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 1000,
      application_name: 'doke-sched-b04c-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1 as ok, current_database() as database_name, current_user as database_user');
      return { pool, client };
    } catch (_) {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_SCHED_B04C_DATABASE_CONNECTION_FAILED');
}

async function verifySchemaGate(client) {
  const response = await client.query(`select
    to_regclass('auth.users') is not null as auth_users,
    to_regclass('public.users') is not null as users,
    to_regclass('public.user_profiles') is not null as user_profiles,
    to_regclass('public.client_profiles') is not null as client_profiles,
    to_regclass('public.services') is not null as services,
    to_regclass('public.service_versions') is not null as service_versions,
    to_regclass('public.orders') is not null as orders,
    to_regclass('public.order_status_history') is not null as order_status_history,
    to_regclass('private.order_domain_events') is not null as order_domain_events,
    to_regclass('private.order_metric_events') is not null as order_metric_events,
    to_regclass('public.notifications') is not null as notifications,
    to_regclass('public.schedule_availability_rules') is not null as rules,
    to_regclass('public.schedule_reservations') is not null as reservations,
    to_regclass('private.schedule_command_idempotency') is not null as idempotency,
    to_regclass('private.schedule_domain_events') is not null as schedule_events,
    exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'orders' and column_name = 'schedule_reservation_id') as order_reservation_reference,
    exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'orders' and column_name = 'scheduled_at') as order_time_projection`);
  if (!response.rows[0] || Object.values(response.rows[0]).some((value) => value !== true)) {
    fail('DOKE_SCHED_B04C_SCHEMA_GATE_FAILED');
  }
  return Object.freeze({ requiredRelations: Object.keys(response.rows[0]).length, passed: true });
}

async function loadAuthorityCounts(client) {
  const response = await client.query(`select
    (select count(*)::int from public.schedule_availability_rules) as schedule_availability_rules,
    (select count(*)::int from public.schedule_reservations) as schedule_reservations,
    (select count(*)::int from private.schedule_command_idempotency) as schedule_command_idempotency,
    (select count(*)::int from private.schedule_domain_events) as schedule_domain_events,
    (select count(*)::int from public.orders where schedule_reservation_id is not null) as orders_with_reservation,
    (select count(*)::int from public.orders where status = 'scheduled') as scheduled_orders,
    (select count(*)::int from private.order_domain_events) as order_domain_events,
    (select count(*)::int from public.order_status_history) as order_status_history`);
  return Object.freeze({ ...response.rows[0] });
}

async function loadResidueCounts(client) {
  const response = await client.query({
    name: 'sched-b04c-residue-counts',
    text: `select
      (select count(*)::int from auth.users where lower(email) like $1) as auth_users,
      (select count(*)::int from public.users where lower(email) like $1) as users,
      (select count(*)::int from public.user_profiles profile join public.users app_user on app_user.id = profile.user_id where lower(app_user.email) like $1) as user_profiles,
      (select count(*)::int from public.client_profiles profile join public.users app_user on app_user.id = profile.user_id where lower(app_user.email) like $1) as client_profiles,
      (select count(*)::int from public.services where external_id like $2) as services,
      (select count(*)::int from public.service_versions version join public.services service on service.id = version.service_id where service.external_id like $2) as service_versions,
      (select count(*)::int from public.orders where metadata ->> 'canarySublot' = $3) as orders,
      (select count(*)::int from public.order_status_history history join public.orders order_row on order_row.id = history.order_id where order_row.metadata ->> 'canarySublot' = $3) as order_status_history,
      (select count(*)::int from private.order_domain_events event join public.orders order_row on order_row.id = event.order_id where order_row.metadata ->> 'canarySublot' = $3) as order_domain_events,
      (select count(*)::int from private.order_metric_events event join public.orders order_row on order_row.id = event.order_id where order_row.metadata ->> 'canarySublot' = $3) as order_metric_events,
      (select count(*)::int from public.notifications where order_id in (select id from public.orders where metadata ->> 'canarySublot' = $3)) as notifications,
      (select count(*)::int from public.schedule_availability_rules where rule ->> 'canarySublot' = $3) as schedule_availability_rules,
      (select count(*)::int from public.schedule_reservations where idempotency_key like $2) as schedule_reservations,
      (select count(*)::int from private.schedule_command_idempotency where idempotency_key like $2) as schedule_command_idempotency,
      (select count(*)::int from private.schedule_domain_events where payload #>> '{_eventMeta,correlationId}' like $2) as schedule_domain_events`,
    values: ['sched-b04c-canary-%@example.invalid', `${CANARY_PREFIX}%`, CANARY_SUBLOT]
  });
  return Object.freeze({ ...response.rows[0] });
}

function assertZeroCounts(counts, code) {
  if (Object.values(counts).some((value) => Number(value) !== 0)) fail(code, code, counts);
}

function assertEqualCounts(before, after, code) {
  if (JSON.stringify(before) !== JSON.stringify(after)) fail(code, code, { before, after });
}

async function runReadOnlyPreflight(client, env) {
  const activation = evaluateSchedulingRuntimeActivation(env);
  requireExact(activation.enabled, true, 'DOKE_SCHED_B04C_COMPOSITION_ROOT_DISABLED');
  const schema = await verifySchemaGate(client);
  const residue = await loadResidueCounts(client);
  assertZeroCounts(residue, 'DOKE_SCHED_B04C_PREFLIGHT_RESIDUE_PRESENT');
  return Object.freeze({ activation, schema, residue, authorityCounts: await loadAuthorityCounts(client) });
}

function createTransactionalCanaryPool(client) {
  let savepointSequence = 0;
  return Object.freeze({
    async connect() {
      const savepoint = `sched_b04c_command_${++savepointSequence}`;
      let active = false;
      return Object.freeze({
        async query(...args) {
          const statement = typeof args[0] === 'string' ? args[0] : args[0] && args[0].text;
          const normalized = String(statement || '').trim().toLowerCase();
          if (normalized.startsWith('begin isolation level ')) {
            if (active) fail('DOKE_SCHED_B04C_SAVEPOINT_ALREADY_ACTIVE');
            await client.query(`savepoint ${savepoint}`);
            active = true;
            return { rows: [], rowCount: 0 };
          }
          if (normalized === 'commit') {
            if (!active) fail('DOKE_SCHED_B04C_SAVEPOINT_NOT_ACTIVE');
            await client.query(`release savepoint ${savepoint}`);
            active = false;
            return { rows: [], rowCount: 0 };
          }
          if (normalized === 'rollback') {
            if (active) {
              await client.query(`rollback to savepoint ${savepoint}`);
              await client.query(`release savepoint ${savepoint}`);
              active = false;
            }
            return { rows: [], rowCount: 0 };
          }
          return client.query(...args);
        },
        release() {
          if (active) fail('DOKE_SCHED_B04C_SAVEPOINT_RELEASED_WHILE_ACTIVE');
        }
      });
    }
  });
}

async function provisionTransactionalFixtures(client) {
  const personas = Object.freeze({
    client: Object.freeze({ id: 'b04c0000-0000-4000-8000-000000000101', role: 'client' }),
    professional: Object.freeze({ id: 'b04c0000-0000-4000-8000-000000000102', role: 'professional' }),
    support: Object.freeze({ id: 'b04c0000-0000-4000-8000-000000000103', role: 'support' }),
    admin: Object.freeze({ id: 'b04c0000-0000-4000-8000-000000000104', role: 'admin' })
  });
  const entries = Object.entries(personas);
  await client.query({
    name: 'sched-b04c-insert-transactional-auth-personas',
    text: `insert into auth.users (
             id, aud, role, email, encrypted_password, email_confirmed_at,
             raw_app_meta_data, raw_user_meta_data, created_at, updated_at
           )
           select source.id, 'authenticated', 'authenticated', source.email, '', pg_catalog.now(),
                  jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
                  jsonb_build_object('name', source.name), pg_catalog.now(), pg_catalog.now()
           from unnest($1::uuid[], $2::text[], $3::text[]) as source(id, email, name)`,
    values: [
      entries.map(([, persona]) => persona.id),
      entries.map(([name]) => `sched-b04c-canary-${name}@example.invalid`),
      entries.map(([name]) => `SCHED-B04C ${name}`)
    ]
  });
  await client.query({
    name: 'sched-b04c-materialize-transactional-personas',
    text: `update public.users app_user
           set role = source.role, status = 'active', onboarding_status = 'completed', updated_at = pg_catalog.now()
           from unnest($1::uuid[], $2::text[]) as source(id, role)
           where app_user.id = source.id`,
    values: [entries.map(([, persona]) => persona.id), entries.map(([, persona]) => persona.role)]
  });

  const service = Object.freeze({ id: 'b04c0000-0000-4000-8000-000000000201', professionalId: personas.professional.id });
  const versionId = 'b04c0000-0000-4000-8000-000000000202';
  await client.query({
    name: 'sched-b04c-insert-transactional-service',
    text: `insert into public.services (
             id, professional_id, title, slug, description, price_mode, price_cents,
             currency, status, city, state, external_id, metadata, moderation_status
           ) values (
             $1::uuid, $2::uuid, 'SCHED-B04C synthetic service', 'sched-b04c-canary-service',
             'Transaction-scoped synthetic service for the SCHED-B04C composition canary.',
             'fixed', 10000, 'BRL', 'published', 'Salvador', 'BA', $3, $4::jsonb, 'published'
           )`,
    values: [service.id, service.professionalId, `${CANARY_PREFIX}service`, JSON.stringify({ canarySublot: CANARY_SUBLOT, synthetic: true })]
  });
  await client.query({
    name: 'sched-b04c-insert-transactional-service-version',
    text: `insert into public.service_versions (
             id, service_id, professional_id, version_number, source, change_class,
             review_status, snapshot, change_summary, submitted_at, reviewed_at,
             risk_flags, classification_reasons, visibility_action
           ) values (
             $1::uuid, $2::uuid, $3::uuid, 1, 'create', 'critical', 'approved',
             $4::jsonb, '{}'::jsonb, pg_catalog.now(), pg_catalog.now(),
             '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'
           )`,
    values: [versionId, service.id, service.professionalId, JSON.stringify({ id: `${CANARY_PREFIX}service`, title: 'SCHED-B04C synthetic service', priceValue: 100, priceLabel: 'R$ 100', images: [], providerName: 'SCHED-B04C synthetic professional' })]
  });
  await client.query("select set_config('doke.service_moderation_apply', 'on', true)");
  await client.query({
    name: 'sched-b04c-approve-transactional-service',
    text: `update public.services set approved_version_id = $1::uuid, status = 'published', moderation_status = 'published' where id = $2::uuid`,
    values: [versionId, service.id]
  });
  await client.query("select set_config('doke.service_moderation_apply', 'off', true)");

  const orders = Object.freeze({
    main: 'b04c0000-0000-4000-8000-000000001001',
    replacement: 'b04c0000-0000-4000-8000-000000001002',
    partial: 'b04c0000-0000-4000-8000-000000001003'
  });
  const baseMetadata = { canarySublot: CANARY_SUBLOT, synthetic: true };
  await client.query({
    name: 'sched-b04c-insert-transactional-orders',
    text: `insert into public.orders (
             id, client_id, professional_id, service_id, title, description, status, metadata
           ) values
             ($1::uuid, $4::uuid, $5::uuid, $6::uuid, 'SCHED-B04C main order', $7, 'accepted', $8::jsonb),
             ($2::uuid, $4::uuid, $5::uuid, $6::uuid, 'SCHED-B04C replacement order', $7, 'accepted', $9::jsonb),
             ($3::uuid, $4::uuid, $5::uuid, $6::uuid, 'SCHED-B04C partial rollback order', $7, 'requested', $10::jsonb)`,
    values: [
      orders.main,
      orders.replacement,
      orders.partial,
      personas.client.id,
      personas.professional.id,
      service.id,
      'Transaction-scoped synthetic order for the SCHED-B04C canary.',
      JSON.stringify({ ...baseMetadata, schedulePreference: { requestedAt: '2035-08-13T12:00:00.000Z', authority: 'client_intent' } }),
      JSON.stringify(baseMetadata),
      JSON.stringify(baseMetadata)
    ]
  });
  return Object.freeze({ personas, service, orders });
}

function commandContext(actor, idempotencySuffix, payload, correlationId) {
  return Object.freeze({
    actor: Object.freeze({ ...actor }),
    idempotencyKey: `${CANARY_PREFIX}${idempotencySuffix}`,
    correlationId,
    causationId: `${CANARY_PREFIX}root`,
    payload: Object.freeze({ ...payload })
  });
}

function range(startHour, endHour) {
  const clock = (hour) => `${String(hour).padStart(2, '0')}:00:00`;
  return Object.freeze({
    startsAt: `2035-08-13T${clock(startHour + 3)}.000Z`,
    endsAt: `2035-08-13T${clock(endHour + 3)}.000Z`,
    timezone: 'America/Bahia',
    localStart: `2035-08-13T${clock(startHour)}`,
    localEnd: `2035-08-13T${clock(endHour)}`,
    resolvedOffsetMinutes: -180
  });
}

async function expectCode(operation, expectedCode) {
  let caught = null;
  try {
    await operation();
  } catch (error) {
    caught = error;
  }
  if (!caught || caught.code !== expectedCode) {
    fail('DOKE_SCHED_B04C_EXPECTED_FAILURE_MISSING', 'DOKE_SCHED_B04C_EXPECTED_FAILURE_MISSING', {
      expectedCode,
      actualCode: caught && caught.code || null
    });
  }
  return expectedCode;
}

async function readOrder(client, orderId) {
  const response = await client.query({
    name: 'sched-b04c-read-order',
    text: `select id::text, status, scheduled_at, schedule_reservation_id::text, metadata
           from public.orders where id = $1::uuid`,
    values: [orderId]
  });
  if (!response.rows[0]) fail('DOKE_SCHED_B04C_ORDER_NOT_FOUND');
  return response.rows[0];
}

async function readReservation(client, reservationId) {
  const response = await client.query({
    name: 'sched-b04c-read-reservation',
    text: `select id::text, order_id::text, status, starts_at, ends_at, version
           from public.schedule_reservations where id = $1::uuid`,
    values: [reservationId]
  });
  return response.rows[0] || null;
}

function assertOrderProjection(order, reservation, expectedStatus) {
  requireExact(order.status, expectedStatus, 'DOKE_SCHED_B04C_ORDER_STATUS_MISMATCH');
  requireExact(order.schedule_reservation_id, reservation.id, 'DOKE_SCHED_B04C_ORDER_RESERVATION_REFERENCE_MISMATCH');
  requireExact(new Date(order.scheduled_at).toISOString(), new Date(reservation.startsAt).toISOString(), 'DOKE_SCHED_B04C_ORDER_TIME_PROJECTION_MISMATCH');
  const projection = readScheduleProjection(order);
  requireExact(projection.canonical, true, 'DOKE_SCHED_B04C_ORDER_AUTHORITY_NOT_CANONICAL');
}

async function assertOrderEventProjection(client, orderId, expectedStatus) {
  const eventResponse = await client.query({
    name: 'sched-b04c-read-latest-order-event',
    text: `select event_type, previous_status, next_status, actor_role, action
           from private.order_domain_events where order_id = $1::uuid
           order by sequence_no desc limit 1`,
    values: [orderId]
  });
  const historyResponse = await client.query({
    name: 'sched-b04c-read-latest-order-history',
    text: `select old_status, new_status, action
           from public.order_status_history where order_id = $1::uuid
           order by sequence_no desc nulls last, created_at desc limit 1`,
    values: [orderId]
  });
  const event = eventResponse.rows[0];
  const history = historyResponse.rows[0];
  if (!event || !history) fail('DOKE_SCHED_B04C_ORDER_EVENT_PROJECTION_MISSING');
  requireExact(event.next_status, expectedStatus, 'DOKE_SCHED_B04C_ORDER_EVENT_STATUS_MISMATCH');
  requireExact(history.new_status, expectedStatus, 'DOKE_SCHED_B04C_ORDER_HISTORY_STATUS_MISMATCH');
  return Object.freeze({ eventType: event.event_type, actorRole: event.actor_role, action: event.action });
}

async function assertScheduleCorrelation(client, reservationId, correlationId) {
  const response = await client.query({
    name: 'sched-b04c-read-schedule-correlations',
    text: `select distinct payload #>> '{_eventMeta,correlationId}' as correlation_id
           from private.schedule_domain_events
           where reservation_id = $1::uuid order by correlation_id`,
    values: [reservationId]
  });
  const observed = response.rows.map((row) => row.correlation_id).filter(Boolean);
  if (!observed.length || observed.some((value) => value !== correlationId)) {
    fail('DOKE_SCHED_B04C_CORRELATION_MISMATCH', 'DOKE_SCHED_B04C_CORRELATION_MISMATCH', { observed, correlationId });
  }
  return Object.freeze(observed);
}

async function runCompositionCanary(client, fixtures, env) {
  const generatedIds = Array.from({ length: 32 }, (_, index) =>
    `b04c0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  let nextId = 0;
  const root = createSchedulingCompositionRoot({
    env,
    pool: createTransactionalCanaryPool(client),
    now: () => new Date(FIXED_NOW),
    idFactory: () => generatedIds[nextId++],
    holdTtlSeconds: 600
  });
  requireExact(root.enabled, true, 'DOKE_SCHED_B04C_COMPOSITION_ROOT_DISABLED');

  const actors = Object.freeze({
    client: { id: fixtures.personas.client.id, role: 'client_order_participant' },
    professional: { id: fixtures.personas.professional.id, role: 'professional_owner' },
    support: { id: fixtures.personas.support.id, role: 'support' },
    admin: { id: fixtures.personas.admin.id, role: 'admin' }
  });
  const correlationId = `${CANARY_PREFIX}ord-sched-flow`;
  const rulePayload = {
    professionalId: fixtures.personas.professional.id,
    timezone: 'America/Bahia',
    rule: { weekdays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '18:00' }], canarySublot: CANARY_SUBLOT },
    status: 'active'
  };
  await root.upsertAvailabilityRule(commandContext(actors.professional, 'availability', rulePayload, correlationId));

  const initialOrder = await readOrder(client, fixtures.orders.main);
  requireExact(initialOrder.status, 'accepted', 'DOKE_SCHED_B04C_MAIN_ORDER_NOT_ACCEPTED');
  requireExact(initialOrder.schedule_reservation_id, null, 'DOKE_SCHED_B04C_MAIN_ORDER_PREBOUND');
  requireExact(initialOrder.scheduled_at, null, 'DOKE_SCHED_B04C_MAIN_ORDER_PREPROJECTED');
  requireExact(initialOrder.metadata.schedulePreference.authority, 'client_intent', 'DOKE_SCHED_B04C_PREFERENCE_AUTHORITY_MISMATCH');

  const holdPayload = {
    orderId: fixtures.orders.main,
    professionalId: fixtures.personas.professional.id,
    ...range(9, 10)
  };
  const mainHold = await root.createScheduleHold(commandContext(actors.client, 'main-hold', holdPayload, correlationId));
  assert.deepStrictEqual(
    await root.createScheduleHold(commandContext(actors.client, 'main-hold', holdPayload, correlationId)),
    mainHold
  );
  await expectCode(
    () => root.createScheduleHold(commandContext(actors.client, 'main-hold', { ...holdPayload, ...range(10, 11) }, correlationId)),
    schedulingContract.ERROR_CODES.idempotencyConflict
  );
  const orderAfterHold = await readOrder(client, fixtures.orders.main);
  requireExact(orderAfterHold.status, 'accepted', 'DOKE_SCHED_B04C_HOLD_CHANGED_ORDER_STATUS');
  requireExact(orderAfterHold.schedule_reservation_id, null, 'DOKE_SCHED_B04C_HOLD_PROJECTED_REFERENCE');
  requireExact(orderAfterHold.scheduled_at, null, 'DOKE_SCHED_B04C_HOLD_PROJECTED_TIME');

  await expectCode(
    () => root.confirmScheduleReservation(commandContext(actors.client, 'client-confirm-forbidden', {
      reservationId: mainHold.reservation.id,
      expectedVersion: 1
    }, correlationId)),
    schedulingContract.ERROR_CODES.actorForbidden
  );
  await expectCode(
    () => Promise.resolve(assertTransition({
      currentStatus: 'accepted',
      nextStatus: 'scheduled',
      actorRole: 'professional',
      action: 'updateStatus'
    })),
    'DOKE_ORDER_SCHEDULE_AUTHORITY_REQUIRED'
  );
  assertTransition({ currentStatus: 'requested', nextStatus: 'accepted', actorRole: 'professional', action: 'accept' });

  const confirmed = await root.confirmScheduleReservation(commandContext(actors.support, 'main-confirm', {
    reservationId: mainHold.reservation.id,
    expectedVersion: 1
  }, correlationId));
  let canonicalOrder = await readOrder(client, fixtures.orders.main);
  assertOrderProjection(canonicalOrder, confirmed.reservation, 'scheduled');
  const confirmOrderEvent = await assertOrderEventProjection(client, fixtures.orders.main, 'scheduled');

  const authorityContext = {
    schedulingAuthority: {
      getReservation: async (reservationId) => readReservation(client, reservationId)
    }
  };
  const startAuthority = await assertStartScheduleAuthority(authorityContext, canonicalOrder);
  requireExact(startAuthority.required, true, 'DOKE_SCHED_B04C_START_AUTHORITY_NOT_REQUIRED');
  await expectCode(
    () => Promise.resolve(assertGenericCancellationAllowed(canonicalOrder)),
    'DOKE_ORDER_SCHEDULE_CANCELLATION_COMPOSITION_REQUIRED'
  );
  await expectCode(
    () => assertStartScheduleAuthority(authorityContext, { ...canonicalOrder, scheduled_at: new Date(Date.parse(canonicalOrder.scheduled_at) + 60000).toISOString() }),
    'DOKE_ORDER_SCHEDULE_PROJECTION_MISMATCH'
  );
  await expectCode(
    () => assertStartScheduleAuthority(authorityContext, { ...canonicalOrder, scheduled_at: null }),
    'DOKE_ORDER_SCHEDULE_PROJECTION_INVALID'
  );

  const rescheduled = await root.rescheduleReservation(commandContext(actors.support, 'main-reschedule', {
    reservationId: mainHold.reservation.id,
    expectedVersion: 2,
    ...range(10, 11)
  }, correlationId));
  canonicalOrder = await readOrder(client, fixtures.orders.main);
  assertOrderProjection(canonicalOrder, rescheduled.reservation, 'scheduled');
  requireExact(rescheduled.reservation.id, confirmed.reservation.id, 'DOKE_SCHED_B04C_RESCHEDULE_REPLACED_RESERVATION');

  const replacementA = await root.createScheduleHold(commandContext(actors.support, 'replacement-a-hold', {
  orderId: fixtures.orders.replacement,
  professionalId: fixtures.personas.professional.id,
  ...range(12, 13)
}, correlationId));
const replacementAConfirmed = await root.confirmScheduleReservation(commandContext(actors.support, 'replacement-a-confirm', {
  reservationId: replacementA.reservation.id,
  expectedVersion: 1
}, correlationId));
const replacementOrderBeforeGuard = await readOrder(client, fixtures.orders.replacement);
assertOrderProjection(replacementOrderBeforeGuard, replacementAConfirmed.reservation, 'scheduled');
const directTransactionPort = createTransactionPort(client);
await expectCode(
  () => directTransactionPort.projectOrderSchedule(
    fixtures.orders.replacement,
    mainHold.reservation.id,
    mainHold.reservation.startsAt
  ),
  'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED'
);
const replacementOrder = await readOrder(client, fixtures.orders.replacement);
requireExact(replacementOrder.schedule_reservation_id, replacementA.reservation.id, 'DOKE_SCHED_B04C_REPLACEMENT_OVERWROTE_REFERENCE');
requireExact(
  new Date(replacementOrder.scheduled_at).toISOString(),
  new Date(replacementAConfirmed.reservation.startsAt).toISOString(),
  'DOKE_SCHED_B04C_REPLACEMENT_CHANGED_TIME'
);

  await root.cancelScheduleReservation(commandContext(actors.support, 'main-cancel', {
  reservationId: mainHold.reservation.id,
  expectedVersion: 3,
  reason: 'Synthetic SCHED-B04C cancellation.'
}, correlationId));
const cancelledOrder = await readOrder(client, fixtures.orders.main);
requireExact(cancelledOrder.status, 'accepted', 'DOKE_SCHED_B04C_CANCEL_DID_NOT_RESTORE_ACCEPTED');
requireExact(cancelledOrder.schedule_reservation_id, null, 'DOKE_SCHED_B04C_CANCEL_DID_NOT_CLEAR_REFERENCE');
requireExact(cancelledOrder.scheduled_at, null, 'DOKE_SCHED_B04C_CANCEL_DID_NOT_CLEAR_TIME');
const cancelOrderEvent = await assertOrderEventProjection(client, fixtures.orders.main, 'accepted');
const correlations = await assertScheduleCorrelation(client, mainHold.reservation.id, correlationId);

const partialHold = await root.createScheduleHold(commandContext(actors.client, 'partial-hold', {
  orderId: fixtures.orders.partial,
  professionalId: fixtures.personas.professional.id,
  ...range(14, 15)
}, correlationId));
const primedPartial = await client.query({
  name: 'sched-b04c-prime-partial-projection-conflict',
  text: `update public.orders
         set status = 'accepted',
             schedule_reservation_id = $2::uuid,
             scheduled_at = $3::timestamptz,
             updated_at = pg_catalog.now()
         where id = $1::uuid and status = 'requested'
         returning id`,
  values: [
    fixtures.orders.partial,
    mainHold.reservation.id,
    rescheduled.reservation.startsAt
  ]
});
requireExact(primedPartial.rowCount, 1, 'DOKE_SCHED_B04C_PARTIAL_CONFLICT_FIXTURE_FAILED');
const partialBeforeFailure = await readOrder(client, fixtures.orders.partial);
requireExact(partialBeforeFailure.status, 'accepted', 'DOKE_SCHED_B04C_PARTIAL_FIXTURE_NOT_ACCEPTED');
requireExact(
  partialBeforeFailure.schedule_reservation_id,
  mainHold.reservation.id,
  'DOKE_SCHED_B04C_PARTIAL_FIXTURE_REFERENCE_MISMATCH'
);
requireExact(
  new Date(partialBeforeFailure.scheduled_at).toISOString(),
  new Date(rescheduled.reservation.startsAt).toISOString(),
  'DOKE_SCHED_B04C_PARTIAL_FIXTURE_TIME_MISMATCH'
);

await expectCode(
  () => root.confirmScheduleReservation(commandContext(actors.admin, 'partial-confirm', {
    reservationId: partialHold.reservation.id,
    expectedVersion: 1
  }, correlationId)),
  'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED'
);
const partialStored = await readReservation(client, partialHold.reservation.id);
requireExact(partialStored.status, 'held', 'DOKE_SCHED_B04C_PARTIAL_FAILURE_DID_NOT_ROLL_BACK');
requireExact(partialStored.version, 1, 'DOKE_SCHED_B04C_PARTIAL_FAILURE_CHANGED_VERSION');
const partialOrder = await readOrder(client, fixtures.orders.partial);
requireExact(partialOrder.status, 'accepted', 'DOKE_SCHED_B04C_PARTIAL_FAILURE_CHANGED_ORDER');
requireExact(
  partialOrder.schedule_reservation_id,
  mainHold.reservation.id,
  'DOKE_SCHED_B04C_PARTIAL_FAILURE_CHANGED_REFERENCE'
);
requireExact(
  new Date(partialOrder.scheduled_at).toISOString(),
  new Date(rescheduled.reservation.startsAt).toISOString(),
  'DOKE_SCHED_B04C_PARTIAL_FAILURE_CHANGED_TIME'
);

  return Object.freeze({
    client: {
      preferenceRemainedIntent: true,
      holdAllowed: true,
      confirmationForbidden: true,
      idempotentReplay: true,
      divergentPayloadRejected: true
    },
    professional: {
      acceptTransitionAllowed: true,
      manualScheduledTransitionForbidden: true,
      startRequiresCanonicalAuthority: true
    },
    support: {
      confirmationProjectedAtomically: true,
      reschedulePreservedReservationId: true,
      cancellationClearedProjection: true,
      genericCancellationBlocked: true
    },
    admin: {
      differentReservationReplacementRejected: true,
      partialProjectionRolledBack: true,
      incompleteProjectionRejected: true
    },
    orderEvents: { confirm: confirmOrderEvent, cancel: cancelOrderEvent },
    sharedCorrelationId: correlationId,
    observedScheduleCorrelations: correlations,
    reservationId: mainHold.reservation.id
  });
}

function writeReport(report, reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const mode = argv.find((arg) => MODES.has(arg));
  if (!mode || argv.filter((arg) => MODES.has(arg)).length !== 1) fail('DOKE_SCHED_B04C_MODE_REQUIRED');
  requireExact(env.SCHED_B04C_AUTHORIZATION, CONFIG.authorization.exactPhrase, 'DOKE_SCHED_B04C_AUTHORIZATION_MISSING');
  requireExact(env.DOKE_SCHEDULING_RUNTIME_ENABLED, 'true', 'DOKE_SCHED_B04C_RUNTIME_FLAG_MISMATCH');
  requireExact(env.DOKE_RUNTIME_ENVIRONMENT, 'staging', 'DOKE_SCHED_B04C_RUNTIME_ENVIRONMENT_MISMATCH');
  requireExact(env.SUPABASE_PROJECT_REF, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B04C_PROJECT_REF_MISMATCH');
  if (String(env.NODE_ENV || '').toLowerCase() === 'production') fail('DOKE_SCHED_B04C_PRODUCTION_BLOCKED');

  const pullRequest = await verifyPullRequestGate(env);
  const project = await verifyProjectGate(env);
  const connection = await connectStaging(project, env.SUPABASE_DB_PASSWORD);
  const reportPath = path.resolve(env.SCHED_B04C_REPORT_PATH || REPORT_PATH);
  let outerTransactionOpen = false;
  const report = {
    schemaVersion: 1,
    domain: 'SCHED-001',
    dependentDomain: 'ORD-001',
    sublot: 'SCHED-B04C',
    contractVersion: CONFIG.contractVersion,
    mode: mode.slice(2),
    result: 'running',
    observedAt: new Date().toISOString(),
    pullRequest,
    staging: { projectRef: project.id, projectName: project.name },
    productionAccess: 0,
    migrationsApplied: 0,
    deployments: 0,
    cronActivations: 0,
    workerActivations: 0,
    frontendConnections: 0,
    billingChanges: 0,
    infrastructureChanges: 0,
    mergePerformed: false,
    autoMergeEnabled: false
  };

  try {
    const preflight = await runReadOnlyPreflight(connection.client, env);
    report.preflight = {
      compositionRootEnabled: preflight.activation.enabled,
      schema: preflight.schema,
      preExistingCanaryResidue: preflight.residue,
      authorityCountsBefore: preflight.authorityCounts
    };
    if (mode === '--preflight') {
      report.result = 'preflight_passed_read_only';
      report.stagingReads = true;
      report.stagingMutations = 0;
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    await connection.client.query('begin isolation level serializable');
    outerTransactionOpen = true;
    await connection.client.query("set local search_path = pg_catalog, public, private, auth, extensions");
    await connection.client.query("set local lock_timeout = '5s'");
    await connection.client.query("set local statement_timeout = '45s'");
    report.executionStage = 'transactional_fixture_provisioning';
    const fixtures = await provisionTransactionalFixtures(connection.client);
    report.transactionalFixtures = { personas: 4, publishedServices: 1, orders: 3, persistentRowsAllowed: 0 };
    report.executionStage = 'ord_sched_composition_canary';
    report.assertions = await runCompositionCanary(connection.client, fixtures, env);
    report.transaction = {
      opened: true,
      isolation: 'SERIALIZABLE',
      commandSavepoints: true,
      finalStatement: 'ROLLBACK',
      committed: false
    };
    await connection.client.query('rollback');
    outerTransactionOpen = false;
    report.transaction.rolledBack = true;

    const residue = await loadResidueCounts(connection.client);
    const authorityCountsAfter = await loadAuthorityCounts(connection.client);
    assertZeroCounts(residue, 'DOKE_SCHED_B04C_POST_ROLLBACK_RESIDUE_PRESENT');
    assertEqualCounts(preflight.authorityCounts, authorityCountsAfter, 'DOKE_SCHED_B04C_AUTHORITY_COUNT_DRIFT');
    report.residue = residue;
    report.authorityCountsAfter = authorityCountsAfter;
    report.authorityCountDeltaZero = true;
    report.executionStage = 'completed';
    report.result = 'authenticated_ord_sched_composition_canary_passed';
    writeReport(report, reportPath);
    console.log(JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    if (outerTransactionOpen) {
      try {
        await connection.client.query('rollback');
        report.transaction = { opened: true, finalStatement: 'ROLLBACK', committed: false, rolledBack: true };
      } catch (_) {
        report.transaction = { opened: true, finalStatement: 'ROLLBACK', committed: false, rolledBack: false };
      }
      outerTransactionOpen = false;
    }
    report.result = 'failed_closed';
    report.failure = safeError(error);
    if (mode === '--execute') {
      try {
        const residue = await loadResidueCounts(connection.client);
        const authorityCountsAfter = await loadAuthorityCounts(connection.client);
        assertZeroCounts(residue, 'DOKE_SCHED_B04C_POST_ROLLBACK_RESIDUE_PRESENT');
        if (report.preflight) {
          assertEqualCounts(report.preflight.authorityCountsBefore, authorityCountsAfter, 'DOKE_SCHED_B04C_AUTHORITY_COUNT_DRIFT');
        }
        report.residue = residue;
        report.authorityCountsAfter = authorityCountsAfter;
        report.authorityCountDeltaZero = true;
        report.postRollbackVerification = 'passed';
      } catch (verificationError) {
        report.postRollbackVerification = 'failed';
        report.rollbackVerificationFailure = safeError(verificationError);
      }
      writeReport(report, reportPath);
      console.log(JSON.stringify(report, null, 2));
    }
    throw error;
  } finally {
    connection.client.release();
    await connection.pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    const safe = safeError(error);
    console.error(`${safe.code}: ${safe.message}`);
    process.exitCode = 1;
  });
}

module.exports = Object.freeze({
  EXPECTED_PROJECT_REF,
  CANARY_PREFIX,
  createTransactionalCanaryPool,
  safeError,
  main
});

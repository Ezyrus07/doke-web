#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const contract = require('../backend/modules/scheduling/scheduling-contract');
const {
  createSchedulingCompositionRoot,
  evaluateSchedulingRuntimeActivation
} = require('../backend/modules/scheduling/scheduling-composition-root');

const CONFIG = require('../config/sched-001-b02b-authenticated-composition-canary-execution.json');
const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const EXPECTED_PROJECT_NAME = 'doke-web-staging';
const CANARY_PREFIX = 'sched-b02b-canary:';
const CANARY_SUBLOT = 'SCHED-B02B';
const FIXED_NOW = '2035-08-06T11:50:00.000Z';
const REPORT_PATH = path.resolve('reports/generated/sched-001-b02b-authenticated-composition-canary-report.json');
const MODES = new Set(['--preflight', '--execute']);

function fail(code, message) {
  const error = new Error(message || code);
  error.code = code;
  throw error;
}

function requireExact(value, expected, code) {
  if (value !== expected) fail(code, code);
}

function safeError(error) {
  const known = String(error && error.code || 'DOKE_SCHED_B02B_UNEXPECTED_FAILURE');
  return {
    code: known.startsWith('DOKE_') ? known : 'DOKE_SCHED_B02B_UNEXPECTED_FAILURE',
    message: known.startsWith('DOKE_') ? known : 'The authenticated staging composition canary failed closed.'
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
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-sched-b02b-canary' } },
    'DOKE_SCHED_B02B_PR_PREFLIGHT_FAILED'
  );
  requireExact(pull.state, 'open', 'DOKE_SCHED_B02B_PR_NOT_OPEN');
  requireExact(pull.draft, true, 'DOKE_SCHED_B02B_PR_NOT_DRAFT');
  requireExact(pull.merged, false, 'DOKE_SCHED_B02B_PR_ALREADY_MERGED');
  requireExact(pull.auto_merge, null, 'DOKE_SCHED_B02B_AUTO_MERGE_ENABLED');
  requireExact(pull.head && pull.head.ref, CONFIG.target.branch, 'DOKE_SCHED_B02B_PR_HEAD_MISMATCH');
  if (env.GITHUB_SHA) requireExact(pull.head && pull.head.sha, env.GITHUB_SHA, 'DOKE_SCHED_B02B_PR_SHA_MISMATCH');
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
  requireExact(env.SUPABASE_PROJECT_REF, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B02B_PROJECT_REF_MISMATCH');
  if (!env.SUPABASE_ACCESS_TOKEN) fail('DOKE_SCHED_B02B_ACCESS_TOKEN_MISSING');
  if (!env.SUPABASE_DB_PASSWORD) fail('DOKE_SCHED_B02B_DB_PASSWORD_MISSING');
  const project = await fetchJson(
    `https://api.supabase.com/v1/projects/${EXPECTED_PROJECT_REF}`,
    {
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        Accept: 'application/json',
        'User-Agent': 'doke-sched-b02b-canary'
      }
    },
    'DOKE_SCHED_B02B_PROJECT_PREFLIGHT_FAILED'
  );
  requireExact(project.id, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B02B_PROJECT_ID_MISMATCH');
  requireExact(project.name, EXPECTED_PROJECT_NAME, 'DOKE_SCHED_B02B_PROJECT_NAME_MISMATCH');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_SCHED_B02B_PROJECT_REGION_INVALID');
  const directHost = project.database && project.database.host;
  if (directHost && directHost !== `db.${EXPECTED_PROJECT_REF}.supabase.co`) fail('DOKE_SCHED_B02B_DATABASE_HOST_MISMATCH');
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
      application_name: 'doke-sched-b02b-canary'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1 as ok, current_database() as database_name, current_user as database_user');
      return { pool, client };
    } catch (_) {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_SCHED_B02B_DATABASE_CONNECTION_FAILED');
}

async function verifySchemaGate(client) {
  const tables = await client.query(`select
    to_regclass('auth.users') is not null as auth_users,
    to_regclass('public.users') is not null as users,
    to_regclass('public.services') is not null as services,
    to_regclass('public.service_versions') is not null as service_versions,
    to_regclass('public.schedule_availability_rules') is not null as rules,
    to_regclass('public.schedule_reservations') is not null as reservations,
    to_regclass('private.schedule_command_idempotency') is not null as idempotency,
    to_regclass('private.schedule_domain_events') is not null as events,
    exists (select 1 from information_schema.columns where table_schema = 'public'
      and table_name = 'orders' and column_name = 'schedule_reservation_id') as order_projection`);
  if (!tables.rows[0] || Object.values(tables.rows[0]).some((value) => value !== true)) fail('DOKE_SCHED_B02B_SCHEMA_GATE_FAILED');
  const history = await client.query({
    name: 'sched-b02b-preflight-migration-history',
    text: `select version from supabase_migrations.schema_migrations
           where version = any($1::text[]) order by version`,
    values: [['20260731123000', '20260731151000', '20260731141315', '20260731141349']]
  });
  assert.deepStrictEqual(history.rows.map((row) => row.version), ['20260731123000', '20260731151000'], 'DOKE_SCHED_B02B_MIGRATION_HISTORY_MISMATCH');
  return Object.freeze({ canonicalMigrationsApplied: 2, generatedMigrationsApplied: 0 });
}

async function loadAuthorityCounts(client) {
  const response = await client.query(`select
    (select count(*)::int from public.schedule_availability_rules) as schedule_availability_rules,
    (select count(*)::int from public.schedule_reservations) as schedule_reservations,
    (select count(*)::int from private.schedule_command_idempotency) as schedule_command_idempotency,
    (select count(*)::int from private.schedule_domain_events) as schedule_domain_events,
    (select count(*)::int from public.orders where schedule_reservation_id is not null) as orders_with_reservation`);
  return Object.freeze({ ...response.rows[0] });
}

async function loadResidueCounts(client) {
  const response = await client.query({
    name: 'sched-b02b-residue-counts',
    text: `select
      (select count(*)::int from public.schedule_availability_rules where rule ->> 'canarySublot' = $1) as schedule_availability_rules,
      (select count(*)::int from public.schedule_reservations where idempotency_key like $2) as schedule_reservations,
      (select count(*)::int from private.schedule_command_idempotency where idempotency_key like $2) as schedule_command_idempotency,
      (select count(*)::int from private.schedule_domain_events where payload #>> '{_eventMeta,correlationId}' like $2) as schedule_domain_events,
      (select count(*)::int from public.orders where metadata ->> 'canarySublot' = $1) as orders,
      (select count(*)::int from auth.users where lower(email) like $3) as auth_users,
      (select count(*)::int from public.users where lower(email) like $3) as users,
      (select count(*)::int from public.user_profiles profile join public.users app_user on app_user.id = profile.user_id where lower(app_user.email) like $3) as user_profiles,
      (select count(*)::int from public.client_profiles profile join public.users app_user on app_user.id = profile.user_id where lower(app_user.email) like $3) as client_profiles,
      (select count(*)::int from public.services where external_id like $2) as services,
      (select count(*)::int from public.service_versions version join public.services service on service.id = version.service_id where service.external_id like $2) as service_versions`,
    values: [CANARY_SUBLOT, `${CANARY_PREFIX}%`, 'sched-b02b-canary-%@example.invalid']
  });
  return Object.freeze({ ...response.rows[0] });
}

function assertZeroCounts(counts, code) {
  if (Object.values(counts).some((value) => Number(value) !== 0)) fail(code, code);
}

function assertEqualCounts(before, after, code) {
  if (JSON.stringify(before) !== JSON.stringify(after)) fail(code, code);
}

async function runReadOnlyPreflight(client, env) {
  const activation = evaluateSchedulingRuntimeActivation(env);
  requireExact(activation.enabled, true, 'DOKE_SCHED_B02B_COMPOSITION_ROOT_DISABLED');
  const schema = await verifySchemaGate(client);
  const residue = await loadResidueCounts(client);
  assertZeroCounts(residue, 'DOKE_SCHED_B02B_PREFLIGHT_RESIDUE_PRESENT');
  return Object.freeze({ activation, schema, residue, authorityCounts: await loadAuthorityCounts(client) });
}

async function provisionTransactionalFixtures(client) {
  const personas = Object.freeze({
    client: Object.freeze({ id: 'b02b0000-0000-4000-8000-000000000101', role: 'client' }),
    professional: Object.freeze({ id: 'b02b0000-0000-4000-8000-000000000102', role: 'professional' }),
    support: Object.freeze({ id: 'b02b0000-0000-4000-8000-000000000103', role: 'support' }),
    admin: Object.freeze({ id: 'b02b0000-0000-4000-8000-000000000104', role: 'admin' })
  });
  const entries = Object.entries(personas);
  await client.query({
    name: 'sched-b02b-insert-transactional-auth-personas',
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
      entries.map(([name]) => `sched-b02b-canary-${name}@example.invalid`),
      entries.map(([name]) => `SCHED-B02B ${name}`)
    ]
  });
  await client.query({
    name: 'sched-b02b-materialize-transactional-personas',
    text: `update public.users app_user
           set role = source.role, status = 'active', onboarding_status = 'completed', updated_at = pg_catalog.now()
           from unnest($1::uuid[], $2::text[]) as source(id, role)
           where app_user.id = source.id`,
    values: [entries.map(([, persona]) => persona.id), entries.map(([, persona]) => persona.role)]
  });
  const service = Object.freeze({ id: 'b02b0000-0000-4000-8000-000000000201', professional_id: personas.professional.id });
  const versionId = 'b02b0000-0000-4000-8000-000000000202';
  await client.query({
    name: 'sched-b02b-insert-transactional-service',
    text: `insert into public.services (
             id, professional_id, title, slug, description, price_mode, price_cents,
             currency, status, city, state, external_id, metadata, moderation_status
           ) values (
             $1::uuid, $2::uuid, 'SCHED-B02B synthetic service', 'sched-b02b-canary-service',
             'Transaction-scoped synthetic service for the SCHED-B02B composition canary.',
             'fixed', 10000, 'BRL', 'published', 'Salvador', 'BA', $3, $4::jsonb, 'published'
           )`,
    values: [service.id, service.professional_id, `${CANARY_PREFIX}service`, JSON.stringify({ canarySublot: CANARY_SUBLOT, synthetic: true })]
  });
  await client.query({
    name: 'sched-b02b-insert-transactional-service-version',
    text: `insert into public.service_versions (
             id, service_id, professional_id, version_number, source, change_class,
             review_status, snapshot, change_summary, submitted_at, reviewed_at,
             risk_flags, classification_reasons, visibility_action
           ) values (
             $1::uuid, $2::uuid, $3::uuid, 1, 'create', 'critical', 'approved',
             $4::jsonb, '{}'::jsonb, pg_catalog.now(), pg_catalog.now(),
             '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'
           )`,
    values: [versionId, service.id, service.professional_id, JSON.stringify({ id: `${CANARY_PREFIX}service`, title: 'SCHED-B02B synthetic service', priceValue: 100, priceLabel: 'R$ 100', images: [], providerName: 'SCHED-B02B synthetic professional' })]
  });
  await client.query("select set_config('doke.service_moderation_apply', 'on', true)");
  await client.query({
    name: 'sched-b02b-approve-transactional-service',
    text: `update public.services set approved_version_id = $1::uuid, status = 'published', moderation_status = 'published' where id = $2::uuid`,
    values: [versionId, service.id]
  });
  await client.query("select set_config('doke.service_moderation_apply', 'off', true)");
  return Object.freeze({ personas, service });
}

function createTransactionalCanaryPool(client) {
  let savepointSequence = 0;
  return Object.freeze({
    async connect() {
      const savepoint = `sched_b02b_command_${++savepointSequence}`;
      let active = false;
      return Object.freeze({
        async query(...args) {
          const statement = typeof args[0] === 'string' ? args[0] : args[0] && args[0].text;
          const normalized = String(statement || '').trim().toLowerCase();
          if (normalized.startsWith('begin isolation level ')) {
            if (active) fail('DOKE_SCHED_B02B_SAVEPOINT_ALREADY_ACTIVE');
            await client.query(`savepoint ${savepoint}`);
            active = true;
            return { rows: [], rowCount: 0 };
          }
          if (normalized === 'commit') {
            if (!active) fail('DOKE_SCHED_B02B_SAVEPOINT_NOT_ACTIVE');
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
          if (active) fail('DOKE_SCHED_B02B_SAVEPOINT_RELEASED_WHILE_ACTIVE');
        }
      });
    }
  });
}

function context(actor, suffix, payload) {
  return Object.freeze({
    actor: Object.freeze({ ...actor }),
    idempotencyKey: `${CANARY_PREFIX}${suffix}`,
    correlationId: `${CANARY_PREFIX}${suffix}`,
    causationId: `${CANARY_PREFIX}root`,
    payload: Object.freeze({ ...payload })
  });
}

function range(startHour, endHour, startMinute = 0, endMinute = 0) {
  const clock = (hour, minute) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  return Object.freeze({
    startsAt: `2035-08-06T${clock(startHour + 3, startMinute)}.000Z`,
    endsAt: `2035-08-06T${clock(endHour + 3, endMinute)}.000Z`,
    timezone: 'America/Bahia',
    localStart: `2035-08-06T${clock(startHour, startMinute)}`,
    localEnd: `2035-08-06T${clock(endHour, endMinute)}`,
    resolvedOffsetMinutes: -180
  });
}

async function expectCode(operation, expectedCode) {
  let caught = null;
  try { await operation(); } catch (error) { caught = error; }
  if (!caught || caught.code !== expectedCode) fail('DOKE_SCHED_B02B_EXPECTED_DENIAL_MISSING');
  return expectedCode;
}

async function insertSyntheticOrders(client, personas, service) {
  const ids = [
    'b02b0000-0000-4000-8000-000000001001',
    'b02b0000-0000-4000-8000-000000001002',
    'b02b0000-0000-4000-8000-000000001003',
    'b02b0000-0000-4000-8000-000000001004'
  ];
  await client.query({
    name: 'sched-b02b-insert-synthetic-orders',
    text: `insert into public.orders (id, client_id, service_id, title, status, metadata)
           select source.id, $1::uuid, $2::uuid, source.title, 'requested',
                  jsonb_build_object('canarySublot', $3, 'synthetic', true)
           from unnest($4::uuid[], $5::text[]) as source(id, title)`,
    values: [personas.client.id, service.id, CANARY_SUBLOT, ids, ids.map((_, index) => `SCHED-B02B synthetic order ${index + 1}`)]
  });
  return Object.freeze(ids);
}

async function assertOrderProjection(client, orderId, reservation) {
  const response = await client.query({
    name: 'sched-b02b-order-projection',
    text: 'select schedule_reservation_id::text, scheduled_at from public.orders where id = $1::uuid',
    values: [orderId]
  });
  const row = response.rows[0];
  if (!row || row.schedule_reservation_id !== reservation.id
      || new Date(row.scheduled_at).toISOString() !== new Date(reservation.startsAt).toISOString()) {
    fail('DOKE_SCHED_B02B_ORDER_PROJECTION_MISMATCH');
  }
}

async function runCompositionCanary(client, preflight, env) {
  const generatedIds = Array.from({ length: 32 }, (_, index) =>
    `b02b0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`);
  let nextId = 0;
  const root = createSchedulingCompositionRoot({
    env,
    pool: createTransactionalCanaryPool(client),
    now: () => new Date(FIXED_NOW),
    idFactory: () => generatedIds[nextId++],
    holdTtlSeconds: 600
  });
  requireExact(root.enabled, true, 'DOKE_SCHED_B02B_COMPOSITION_ROOT_DISABLED');
  const personas = preflight.personas;
  const actors = Object.freeze({
    client: { id: personas.client.id, role: 'client_order_participant' },
    professional: { id: personas.professional.id, role: 'professional_owner' },
    support: { id: personas.support.id, role: 'support' },
    admin: { id: personas.admin.id, role: 'admin' }
  });
  const orderIds = await insertSyntheticOrders(client, personas, preflight.service);
  const rulePayload = {
    professionalId: personas.professional.id,
    timezone: 'America/Bahia',
    rule: { weekdays: [1, 2, 3, 4, 5], windows: [{ start: '09:00', end: '18:00' }], canarySublot: CANARY_SUBLOT },
    status: 'active'
  };

  const professionalRule = await root.upsertAvailabilityRule(context(actors.professional, 'professional-rule', rulePayload));
  assert.deepStrictEqual(await root.upsertAvailabilityRule(context(actors.professional, 'professional-rule', rulePayload)), professionalRule);
  await expectCode(() => root.upsertAvailabilityRule(context(actors.professional, 'professional-rule', { ...rulePayload, status: 'paused' })), contract.ERROR_CODES.idempotencyConflict);

  const clientHoldPayload = { orderId: orderIds[0], professionalId: personas.professional.id, ...range(9, 10) };
  const clientHold = await root.createScheduleHold(context(actors.client, 'client-hold', clientHoldPayload));
  assert.deepStrictEqual(await root.createScheduleHold(context(actors.client, 'client-hold', clientHoldPayload)), clientHold);
  await expectCode(() => root.createScheduleHold(context(actors.client, 'client-hold', { ...clientHoldPayload, ...range(9, 10, 0, 30) })), contract.ERROR_CODES.idempotencyConflict);
  for (const command of ['confirmScheduleReservation', 'rescheduleReservation', 'expireScheduleHolds']) {
    await expectCode(() => root[command](context(actors.client, `client-forbidden-${command}`, {})), contract.ERROR_CODES.actorForbidden);
  }
  for (const command of ['confirmScheduleReservation', 'expireScheduleHolds']) {
    await expectCode(() => root[command](context(actors.professional, `professional-forbidden-${command}`, {})), contract.ERROR_CODES.actorForbidden);
  }

  const supportRule = await root.upsertAvailabilityRule(context(actors.support, 'support-rule-update', {
    ...rulePayload, ruleId: professionalRule.availabilityRule.id, expectedVersion: 1
  }));
  const supportHold = await root.createScheduleHold(context(actors.support, 'support-hold', {
    orderId: orderIds[1], professionalId: personas.professional.id, ...range(10, 11)
  }));
  const supportConfirmed = await root.confirmScheduleReservation(context(actors.support, 'support-confirm', {
    reservationId: supportHold.reservation.id, expectedVersion: 1
  }));
  await assertOrderProjection(client, orderIds[1], supportConfirmed.reservation);
  const supportRescheduled = await root.rescheduleReservation(context(actors.support, 'support-reschedule', {
    reservationId: supportHold.reservation.id, expectedVersion: 2, ...range(11, 12)
  }));
  await assertOrderProjection(client, orderIds[1], supportRescheduled.reservation);
  await root.cancelScheduleReservation(context(actors.support, 'support-cancel', {
    reservationId: supportHold.reservation.id, expectedVersion: 3, reason: 'Synthetic support boundary canary.'
  }));
  await expectCode(() => root.expireScheduleHolds(context(actors.support, 'support-forbidden-expire', {})), contract.ERROR_CODES.actorForbidden);

  const adminRule = await root.upsertAvailabilityRule(context(actors.admin, 'admin-rule-update', {
    ...rulePayload, ruleId: professionalRule.availabilityRule.id, expectedVersion: 2
  }));
  await expectCode(() => root.createScheduleHold(context(actors.admin, 'admin-overlap', {
    orderId: orderIds[2], professionalId: personas.professional.id, ...range(9, 10, 30, 30)
  })), contract.ERROR_CODES.conflict);
  const adminHold = await root.createScheduleHold(context(actors.admin, 'admin-hold', {
    orderId: orderIds[3], professionalId: personas.professional.id, ...range(12, 13)
  }));
  const adminConfirmed = await root.confirmScheduleReservation(context(actors.admin, 'admin-confirm', {
    reservationId: adminHold.reservation.id, expectedVersion: 1
  }));
  await assertOrderProjection(client, orderIds[3], adminConfirmed.reservation);
  const adminRescheduled = await root.rescheduleReservation(context(actors.admin, 'admin-reschedule', {
    reservationId: adminHold.reservation.id, expectedVersion: 2, ...range(13, 14)
  }));
  await assertOrderProjection(client, orderIds[3], adminRescheduled.reservation);
  await root.cancelScheduleReservation(context(actors.admin, 'admin-cancel', {
    reservationId: adminHold.reservation.id, expectedVersion: 3, reason: 'Synthetic administrator boundary canary.'
  }));
  await expectCode(() => root.expireScheduleHolds(context(actors.admin, 'admin-forbidden-expire', {})), contract.ERROR_CODES.actorForbidden);

  return Object.freeze({
    client: { allowed: ['create_schedule_hold'], forbidden: ['confirm_schedule_reservation', 'reschedule_reservation', 'expire_schedule_holds'], idempotentReplay: true, divergentPayloadRejected: true },
    professional: { allowed: ['upsert_availability_rule'], forbidden: ['confirm_schedule_reservation', 'expire_schedule_holds'], idempotentReplay: true, divergentPayloadRejected: true },
    support: { allowed: ['upsert_availability_rule', 'create_schedule_hold', 'confirm_schedule_reservation', 'reschedule_reservation', 'cancel_schedule_reservation'], forbidden: ['expire_schedule_holds'], orderProjectionValidated: true },
    admin: { allowed: ['upsert_availability_rule', 'create_schedule_hold', 'confirm_schedule_reservation', 'reschedule_reservation', 'cancel_schedule_reservation'], forbidden: ['expire_schedule_holds'], overlapRejected: true, orderProjectionValidated: true },
    ruleVersions: [professionalRule.availabilityRule.version, supportRule.availabilityRule.version, adminRule.availabilityRule.version]
  });
}

function publicPreflight(preflight) {
  return {
    compositionRootEnabled: preflight.activation.enabled,
    migrationHistory: preflight.schema,
    syntheticPersonas: Object.fromEntries(Object.keys(CONFIG.syntheticPersonas.roles).map((name) => [name, 'transaction_scoped'])),
    trustedActorContextSource: 'transaction-scoped auth.users and public.users synthetic projections',
    syntheticPublishedService: 'transaction_scoped',
    preExistingCanaryResidue: preflight.residue,
    authorityCountsBefore: preflight.authorityCounts
  };
}

function writeReport(report, reportPath) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const mode = argv.find((arg) => MODES.has(arg));
  if (!mode || argv.filter((arg) => MODES.has(arg)).length !== 1) fail('DOKE_SCHED_B02B_MODE_REQUIRED');
  requireExact(env.SCHED_B02B_AUTHORIZATION, CONFIG.authorization.exactPhrase, 'DOKE_SCHED_B02B_AUTHORIZATION_MISSING');
  requireExact(env.DOKE_SCHEDULING_RUNTIME_ENABLED, 'true', 'DOKE_SCHED_B02B_RUNTIME_FLAG_MISMATCH');
  requireExact(env.DOKE_RUNTIME_ENVIRONMENT, 'staging', 'DOKE_SCHED_B02B_RUNTIME_ENVIRONMENT_MISMATCH');
  requireExact(env.SUPABASE_PROJECT_REF, EXPECTED_PROJECT_REF, 'DOKE_SCHED_B02B_PROJECT_REF_MISMATCH');
  if (String(env.NODE_ENV || '').toLowerCase() === 'production') fail('DOKE_SCHED_B02B_PRODUCTION_BLOCKED');

  const pullRequest = await verifyPullRequestGate(env);
  const project = await verifyProjectGate(env);
  const connection = await connectStaging(project, env.SUPABASE_DB_PASSWORD);
  const reportPath = path.resolve(env.SCHED_B02B_REPORT_PATH || REPORT_PATH);
  let outerTransactionOpen = false;
  const report = {
    schemaVersion: 1,
    domain: 'SCHED-001',
    sublot: 'SCHED-B02B',
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
    ordWiringChanges: 0,
    billingChanges: 0,
    infrastructureChanges: 0,
    mergePerformed: false,
    autoMergeEnabled: false
  };
  try {
    const preflight = await runReadOnlyPreflight(connection.client, env);
    report.preflight = publicPreflight(preflight);
    if (mode === '--preflight') {
      report.result = 'preflight_passed_read_only';
      report.stagingReads = true;
      report.stagingMutations = 0;
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    await connection.client.query('begin isolation level serializable');
    outerTransactionOpen = true;
    await connection.client.query("set local search_path = pg_catalog, public, private, extensions");
    await connection.client.query("set local lock_timeout = '5s'");
    await connection.client.query("set local statement_timeout = '30s'");
    report.executionStage = 'transactional_fixture_provisioning';
    const fixtures = await provisionTransactionalFixtures(connection.client);
    report.transactionalFixtures = { personas: 4, publishedServices: 1, persistentRowsAllowed: 0 };
    report.executionStage = 'composition_canary';
    report.personas = await runCompositionCanary(connection.client, { ...preflight, ...fixtures }, env);
    report.transaction = { opened: true, commandSavepoints: true, finalStatement: 'rollback', committed: false };
    await connection.client.query('rollback');
    outerTransactionOpen = false;
    report.transaction.rolledBack = true;

    const residue = await loadResidueCounts(connection.client);
    const authorityCountsAfter = await loadAuthorityCounts(connection.client);
    assertZeroCounts(residue, 'DOKE_SCHED_B02B_POST_ROLLBACK_RESIDUE_PRESENT');
    assertEqualCounts(preflight.authorityCounts, authorityCountsAfter, 'DOKE_SCHED_B02B_AUTHORITY_COUNT_DRIFT');
    report.residue = residue;
    report.authorityCountsAfter = authorityCountsAfter;
    report.authorityCountDeltaZero = true;
    report.executionStage = 'completed';
    report.result = 'authenticated_composition_canary_passed';
    writeReport(report, reportPath);
    console.log(JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    if (outerTransactionOpen) {
      try {
        await connection.client.query('rollback');
        report.transaction = { opened: true, finalStatement: 'rollback', committed: false, rolledBack: true };
      } catch (_) {
        report.transaction = { opened: true, finalStatement: 'rollback', committed: false, rolledBack: false };
      }
      outerTransactionOpen = false;
    }
    report.result = 'failed_closed';
    report.failure = safeError(error);
    if (mode === '--execute') {
      try {
        const residue = await loadResidueCounts(connection.client);
        const authorityCountsAfter = await loadAuthorityCounts(connection.client);
        assertZeroCounts(residue, 'DOKE_SCHED_B02B_POST_ROLLBACK_RESIDUE_PRESENT');
        if (report.preflight) assertEqualCounts(report.preflight.authorityCountsBefore, authorityCountsAfter, 'DOKE_SCHED_B02B_AUTHORITY_COUNT_DRIFT');
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

module.exports = Object.freeze({ EXPECTED_PROJECT_REF, CANARY_PREFIX, createTransactionalCanaryPool, safeError, main });

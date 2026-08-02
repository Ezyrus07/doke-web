#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const PROJECT_NAME = 'doke-web-staging';
const REPOSITORY = 'Ezyrus07/doke-web';
const PR_NUMBER = 25;
const BRANCH = 'ord/ord-001-baseline-audit';
const FIXTURE_AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_C01E_SYNTHETIC_ORDER_FIXTURE_LIFECYCLE_ON_DOKE_STAGING';
const BROWSER_AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING';
const SUBLOT = 'SCHED-C01E';
const DOMAIN = 'SCHED-001';
const SCOPE = 'synthetic-order-fixture-lifecycle';
const MODES = new Set(['--preflight', '--provision', '--cleanup', '--verify-clean', '--finalize']);

const ENV = Object.freeze({
  fixtureAuthorization: 'DOKE_SCHED_C01E_AUTHORIZATION',
  browserAuthorization: 'DOKE_SCHED_C01E_BROWSER_AUTHORIZATION',
  expectedHead: 'DOKE_SCHED_C01E_EXPECTED_HEAD_SHA',
  runId: 'DOKE_SCHED_C01E_RUN_ID',
  envelopePath: 'DOKE_SCHED_C01E_AUTHORIZATION_ENVELOPE_PATH',
  envelopeDigest: 'DOKE_SCHED_C01E_AUTHORIZATION_ENVELOPE_SHA256',
  manifestPath: 'DOKE_SCHED_C01E_FIXTURE_MANIFEST_PATH',
  manifestDigest: 'DOKE_SCHED_C01E_FIXTURE_MANIFEST_SHA256',
  statePath: 'DOKE_SCHED_C01E_STATE_PATH',
  reportPath: 'DOKE_SCHED_C01E_REPORT_PATH',
  c01dReportPath: 'DOKE_SCHED_C01D_REPORT_PATH',
  clientEmail: 'DOKE_STAGING_CLIENT_EMAIL',
  professionalEmail: 'DOKE_STAGING_PROFESSIONAL_EMAIL',
  projectRef: 'SUPABASE_PROJECT_REF',
  accessToken: 'SUPABASE_ACCESS_TOKEN',
  dbPassword: 'SUPABASE_DB_PASSWORD'
});

function fail(code, details) {
  const error = new Error(code);
  error.code = code;
  if (details) error.details = details;
  throw error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function exact(name, expected) {
  if (String(process.env[name] || '') !== expected) fail(`DOKE_SCHED_C01E_${name}_MISMATCH`);
}

function safeError(error) {
  const code = String(error && error.code || 'DOKE_SCHED_C01E_UNEXPECTED_FAILURE');
  return {
    code: code.startsWith('DOKE_') ? code : 'DOKE_SCHED_C01E_UNEXPECTED_FAILURE',
    diagnosticClass: /^[0-9A-Z]{5}$/.test(code) ? code : null
  };
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function reportPath() {
  return path.resolve(process.env[ENV.reportPath] || 'reports/generated/sched-001-c01e-synthetic-order-fixture-lifecycle-report.json');
}

function statePath() {
  return path.resolve(process.env[ENV.statePath] || path.join(process.cwd(), '.sched-c01e-state.json'));
}

function loadReport() {
  try { return readJson(reportPath()); }
  catch { return null; }
}

function baseReport(mode) {
  const existing = loadReport();
  return Object.assign({
    schemaVersion: 1,
    contractVersion: 'sched-c01e-synthetic-order-fixture-lifecycle-execution-v1',
    domain: DOMAIN,
    dependentDomains: ['ORD-001', 'MSG-001'],
    sublot: SUBLOT,
    mode,
    result: 'running',
    observedAt: new Date().toISOString(),
    headSha: String(process.env[ENV.expectedHead] || ''),
    projectRef: PROJECT_REF,
    runDigest: sha256(String(process.env[ENV.runId] || '')),
    clientAccountDigest: sha256(normalizeEmail(process.env[ENV.clientEmail])),
    professionalAccountDigest: sha256(normalizeEmail(process.env[ENV.professionalEmail])),
    rawIdentifiersRecorded: false,
    credentialsRecorded: false,
    screenshotsCaptured: 0,
    videosCaptured: 0,
    tracesCaptured: 0,
    productionAccess: 0,
    accountsCreated: 0,
    accountsModified: 0,
    paymentsCreated: 0,
    migrationsApplied: 0,
    deploymentsPerformed: 0,
    mergePerformed: false,
    autoMergeEnabled: false,
    failures: []
  }, existing || {}, { mode, observedAt: new Date().toISOString() });
}

function validateEnvironment() {
  exact(ENV.fixtureAuthorization, FIXTURE_AUTHORIZATION);
  exact(ENV.browserAuthorization, BROWSER_AUTHORIZATION);
  exact(ENV.projectRef, PROJECT_REF);
  if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') fail('DOKE_SCHED_C01E_PRODUCTION_BLOCKED');

  const required = Object.values(ENV);
  for (const name of required) {
    if (!String(process.env[name] || '').trim()) fail(`DOKE_SCHED_C01E_${name}_MISSING`);
  }

  const head = String(process.env[ENV.expectedHead] || '');
  if (!/^[a-f0-9]{40}$/.test(head)) fail('DOKE_SCHED_C01E_HEAD_INVALID');
  const runId = String(process.env[ENV.runId] || '');
  if (!/^sched-c01e-[a-z0-9][a-z0-9-]{5,72}$/.test(runId)) fail('DOKE_SCHED_C01E_RUN_ID_INVALID');
  if (normalizeEmail(process.env[ENV.clientEmail]) === normalizeEmail(process.env[ENV.professionalEmail])) {
    fail('DOKE_SCHED_C01E_PERSONAS_NOT_DISTINCT');
  }

  validateManifestAndEnvelope();
}

function validateManifestAndEnvelope() {
  const manifestFile = path.resolve(process.env[ENV.manifestPath]);
  const envelopeFile = path.resolve(process.env[ENV.envelopePath]);
  const manifestBytes = fs.readFileSync(manifestFile);
  const envelopeBytes = fs.readFileSync(envelopeFile);
  const manifestDigest = sha256(manifestBytes);
  const envelopeDigest = sha256(envelopeBytes);
  if (manifestDigest !== process.env[ENV.manifestDigest]) fail('DOKE_SCHED_C01E_MANIFEST_DIGEST_MISMATCH');
  if (envelopeDigest !== process.env[ENV.envelopeDigest]) fail('DOKE_SCHED_C01E_ENVELOPE_DIGEST_MISMATCH');
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const envelope = JSON.parse(envelopeBytes.toString('utf8'));
  if (manifest.contractVersion !== 'sched-c01e-fixture-manifest-v1') fail('DOKE_SCHED_C01E_MANIFEST_CONTRACT_MISMATCH');
  if (manifest.serviceCount !== 1 || manifest.orderCount !== 2 || manifest.conversationCount !== 2 || manifest.scheduleReservationCount !== 1) {
    fail('DOKE_SCHED_C01E_MANIFEST_SCOPE_MISMATCH');
  }
  if (envelope.contractVersion !== 'sched-c01e-external-authorization-envelope-v1') fail('DOKE_SCHED_C01E_ENVELOPE_CONTRACT_MISMATCH');
  if (envelope.headSha !== process.env[ENV.expectedHead]) fail('DOKE_SCHED_C01E_ENVELOPE_HEAD_MISMATCH');
  if (envelope.projectRef !== PROJECT_REF) fail('DOKE_SCHED_C01E_ENVELOPE_PROJECT_MISMATCH');
  if (envelope.runId !== process.env[ENV.runId]) fail('DOKE_SCHED_C01E_ENVELOPE_RUN_ID_MISMATCH');
  if (envelope.fixtureAuthorizationPhraseDigest !== sha256(FIXTURE_AUTHORIZATION)) fail('DOKE_SCHED_C01E_FIXTURE_AUTHORIZATION_DIGEST_MISMATCH');
  if (envelope.browserAuthorizationPhraseDigest !== sha256(BROWSER_AUTHORIZATION)) fail('DOKE_SCHED_C01E_BROWSER_AUTHORIZATION_DIGEST_MISMATCH');
  if (envelope.clientAccountDigest !== sha256(normalizeEmail(process.env[ENV.clientEmail]))) fail('DOKE_SCHED_C01E_CLIENT_BINDING_MISMATCH');
  if (envelope.professionalAccountDigest !== sha256(normalizeEmail(process.env[ENV.professionalEmail]))) fail('DOKE_SCHED_C01E_PROFESSIONAL_BINDING_MISMATCH');
  if (envelope.fixtureManifestDigest !== manifestDigest) fail('DOKE_SCHED_C01E_MANIFEST_BINDING_MISMATCH');
  const issued = Date.parse(envelope.issuedAt || '');
  const expires = Date.parse(envelope.expiresAt || '');
  const now = Date.now();
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued || expires - issued > 3_600_000) {
    fail('DOKE_SCHED_C01E_ENVELOPE_LIFETIME_INVALID');
  }
  if (now < issued - 60_000 || now > expires) fail('DOKE_SCHED_C01E_ENVELOPE_EXPIRED');
}

async function fetchJson(url, options, code) {
  let response;
  try { response = await fetch(url, options); }
  catch { fail(code); }
  if (!response.ok) fail(code);
  try { return await response.json(); }
  catch { fail(code); }
}

async function verifyPullRequestGate() {
  const pull = await fetchJson(
    `https://api.github.com/repos/${REPOSITORY}/pulls/${PR_NUMBER}`,
    { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'doke-sched-c01e-fixture-lifecycle' } },
    'DOKE_SCHED_C01E_PR_PREFLIGHT_FAILED'
  );
  if (pull.state !== 'open' || pull.draft !== true || pull.merged !== false || pull.auto_merge !== null) fail('DOKE_SCHED_C01E_PR_STATE_INVALID');
  if (!pull.head || pull.head.ref !== BRANCH || pull.head.sha !== process.env[ENV.expectedHead]) fail('DOKE_SCHED_C01E_PR_HEAD_MISMATCH');
  return { number: pull.number, state: pull.state, draft: pull.draft, merged: pull.merged, headSha: pull.head.sha };
}

async function verifyProjectGate() {
  const project = await fetchJson(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}`,
    { headers: { Authorization: `Bearer ${process.env[ENV.accessToken]}`, Accept: 'application/json', 'User-Agent': 'doke-sched-c01e-fixture-lifecycle' } },
    'DOKE_SCHED_C01E_PROJECT_PREFLIGHT_FAILED'
  );
  if (project.id !== PROJECT_REF || project.name !== PROJECT_NAME) fail('DOKE_SCHED_C01E_PROJECT_MISMATCH');
  const region = String(project.region || '').trim().toLowerCase();
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) fail('DOKE_SCHED_C01E_PROJECT_REGION_INVALID');
  const directHost = project.database && project.database.host;
  if (directHost && directHost !== `db.${PROJECT_REF}.supabase.co`) fail('DOKE_SCHED_C01E_DATABASE_HOST_MISMATCH');
  return { id: project.id, name: project.name, region, directHost: directHost || null };
}

async function connectStaging(project) {
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
      user: direct ? 'postgres' : `postgres.${PROJECT_REF}`,
      password: process.env[ENV.dbPassword],
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 8000,
      idleTimeoutMillis: 1000,
      application_name: 'doke-sched-c01e-fixture-lifecycle'
    });
    try {
      const client = await pool.connect();
      await client.query('select 1 as ok');
      return { pool, client };
    } catch {
      await pool.end().catch(() => {});
    }
  }
  fail('DOKE_SCHED_C01E_DATABASE_CONNECTION_FAILED');
}

async function verifySchema(client) {
  const response = await client.query(`select
    to_regclass('auth.users') is not null as auth_users,
    to_regclass('public.users') is not null as users,
    to_regclass('public.services') is not null as services,
    to_regclass('public.service_versions') is not null as service_versions,
    to_regclass('public.orders') is not null as orders,
    to_regclass('public.conversations') is not null as conversations,
    to_regclass('public.messages') is not null as messages,
    to_regclass('public.schedule_reservations') is not null as reservations,
    to_regprocedure('private.apply_order_schedule_projection(uuid,uuid,timestamp with time zone)') is not null as projection,
    to_regprocedure('private.clear_order_schedule_projection(uuid,uuid)') is not null as clear_projection`);
  if (!response.rows[0] || Object.values(response.rows[0]).some((value) => value !== true)) fail('DOKE_SCHED_C01E_SCHEMA_GATE_FAILED');
  return { passed: true, requiredObjects: Object.keys(response.rows[0]).length };
}

async function resolvePersonas(client) {
  const emails = [normalizeEmail(process.env[ENV.clientEmail]), normalizeEmail(process.env[ENV.professionalEmail])];
  const response = await client.query({
    name: 'sched-c01e-resolve-existing-personas',
    text: `select auth_user.id::text, lower(auth_user.email) as email, app_user.role, app_user.status
           from auth.users auth_user
           join public.users app_user on app_user.id = auth_user.id
           where lower(auth_user.email) = any($1::text[])
           order by lower(auth_user.email)`,
    values: [emails]
  });
  if (response.rows.length !== 2) fail('DOKE_SCHED_C01E_EXISTING_PERSONAS_MISSING');
  const byEmail = new Map(response.rows.map((row) => [row.email, row]));
  const clientPersona = byEmail.get(emails[0]);
  const professionalPersona = byEmail.get(emails[1]);
  if (!clientPersona || clientPersona.role !== 'client' || clientPersona.status !== 'active') fail('DOKE_SCHED_C01E_CLIENT_PERSONA_INVALID');
  if (!professionalPersona || professionalPersona.role !== 'professional' || professionalPersona.status !== 'active') fail('DOKE_SCHED_C01E_PROFESSIONAL_PERSONA_INVALID');
  return { client: clientPersona, professional: professionalPersona };
}

async function loadGlobalResidue(client) {
  const response = await client.query(`with marked_services as (
      select id from public.services
      where metadata ->> 'canarySublot' = '${SUBLOT}' or external_id like 'sched-c01e-%'
    ), marked_orders as (
      select id from public.orders
      where metadata ->> 'canarySublot' = '${SUBLOT}' or external_id like 'sched-c01e-%'
    ), marked_order_events as (
      select id from private.order_domain_events where order_id in (select id from marked_orders)
    ), marked_conversations as (
      select id from public.conversations where order_id in (select id from marked_orders)
    )
    select
      (select count(*)::int from marked_services) as services,
      (select count(*)::int from public.service_versions where service_id in (select id from marked_services)) as service_versions,
      (select count(*)::int from marked_orders) as orders,
      (select count(*)::int from marked_conversations) as conversations,
      (select count(*)::int from public.messages where conversation_id in (select id from marked_conversations)) as messages,
      (select count(*)::int from public.notifications where order_id in (select id from marked_orders)) as notifications,
      (select count(*)::int from public.order_status_history where order_id in (select id from marked_orders)) as order_history,
      (select count(*)::int from marked_order_events) as order_events,
      (select count(*)::int from private.order_metric_events where order_id in (select id from marked_orders) or order_event_id in (select id from marked_order_events)) as order_metrics,
      (select count(*)::int from private.order_event_delivery_attempts where order_event_id in (select id from marked_order_events)) as order_delivery_attempts,
      (select count(*)::int from public.schedule_reservations where idempotency_key like 'sched-c01e-%' or order_id in (select id from marked_orders)) as reservations,
      (select count(*)::int from private.schedule_command_idempotency where idempotency_key like 'sched-c01e-%') as schedule_idempotency,
      (select count(*)::int from private.schedule_domain_events where payload #>> '{_eventMeta,correlationId}' like 'sched-c01e-%' or order_id in (select id from marked_orders)) as schedule_events`);
  return response.rows[0];
}

function assertZeroCounts(counts, code) {
  if (Object.values(counts).some((value) => Number(value) !== 0)) fail(code, counts);
}

async function chooseSlot(client, professionalId) {
  const response = await client.query({
    name: 'sched-c01e-choose-non-overlapping-slot',
    text: `with candidates as (
             select candidate as starts_at, candidate + interval '1 hour' as ends_at
             from generate_series(
               date_trunc('day', pg_catalog.now() + interval '180 days') + interval '14 hours',
               date_trunc('day', pg_catalog.now() + interval '240 days') + interval '14 hours',
               interval '1 day'
             ) candidate
             where extract(isodow from candidate) between 1 and 5
           )
           select starts_at, ends_at,
                  starts_at at time zone 'America/Bahia' as local_start,
                  ends_at at time zone 'America/Bahia' as local_end
           from candidates c
           where not exists (
             select 1 from public.schedule_reservations r
             where r.professional_id = $1::uuid
               and r.status in ('held', 'confirmed')
               and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(c.starts_at, c.ends_at, '[)')
           )
           order by starts_at
           limit 1`,
    values: [professionalId]
  });
  if (!response.rows[0]) fail('DOKE_SCHED_C01E_NO_SAFE_SLOT_AVAILABLE');
  return response.rows[0];
}

function createState(personas) {
  const runId = process.env[ENV.runId];
  return {
    runId,
    createdAt: new Date().toISOString(),
    clientId: personas.client.id,
    professionalId: personas.professional.id,
    serviceId: crypto.randomUUID(),
    serviceVersionId: crypto.randomUUID(),
    canonicalOrderId: crypto.randomUUID(),
    alternateOrderId: crypto.randomUUID(),
    canonicalConversationId: crypto.randomUUID(),
    alternateConversationId: crypto.randomUUID(),
    canonicalMessageId: crypto.randomUUID(),
    alternateMessageId: crypto.randomUUID(),
    reservationId: crypto.randomUUID()
  };
}

function markerMetadata(runId, extra = {}) {
  return Object.assign({
    canaryRunId: runId,
    canaryDomain: DOMAIN,
    canarySublot: SUBLOT,
    canaryScope: SCOPE,
    synthetic: true
  }, extra);
}

async function provisionFixtures(client, personas) {
  const state = createState(personas);
  writeJson(statePath(), state);
  const runId = state.runId;
  const slot = await chooseSlot(client, state.professionalId);
  await client.query('begin isolation level serializable');
  try {
    await client.query("set local search_path = pg_catalog, public, private, auth, extensions");
    await client.query("set local lock_timeout = '5s'");
    await client.query("set local statement_timeout = '45s'");

    await client.query({
      name: 'sched-c01e-insert-service',
      text: `insert into public.services (
               id, professional_id, title, slug, description, price_mode, price_cents,
               currency, status, city, state, external_id, metadata, moderation_status
             ) values (
               $1::uuid, $2::uuid, 'C01E serviço sintético de agenda', $3,
               'Fixture sintética e temporária para validar a apresentação canônica da agenda.',
               'fixed', 10000, 'BRL', 'published', 'Salvador', 'BA', $4, $5::jsonb, 'published'
             )`,
      values: [state.serviceId, state.professionalId, `${runId}-service`, `${runId}:service`, JSON.stringify(markerMetadata(runId))]
    });

    await client.query({
      name: 'sched-c01e-insert-service-version',
      text: `insert into public.service_versions (
               id, service_id, professional_id, version_number, source, change_class,
               review_status, snapshot, change_summary, submitted_at, reviewed_at,
               risk_flags, classification_reasons, visibility_action
             ) values (
               $1::uuid, $2::uuid, $3::uuid, 1, 'create', 'critical', 'approved',
               $4::jsonb, '{}'::jsonb, pg_catalog.now(), pg_catalog.now(),
               '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'
             )`,
      values: [state.serviceVersionId, state.serviceId, state.professionalId, JSON.stringify({ id: `${runId}:service`, title: 'C01E serviço sintético de agenda', priceValue: 100, priceLabel: 'R$ 100', images: [], providerName: 'Profissional sintético C01E' })]
    });
    await client.query("select set_config('doke.service_moderation_apply', 'on', true)");
    await client.query({
      name: 'sched-c01e-approve-service',
      text: `update public.services
             set approved_version_id = $1::uuid, status = 'published', moderation_status = 'published'
             where id = $2::uuid`,
      values: [state.serviceVersionId, state.serviceId]
    });
    await client.query("select set_config('doke.service_moderation_apply', 'off', true)");

    await client.query({
      name: 'sched-c01e-insert-orders',
      text: `insert into public.orders (
               id, client_id, professional_id, service_id, title, description, status, external_id, metadata, city, state
             ) values
               ($1::uuid, $3::uuid, $4::uuid, $5::uuid, 'C01E horário confirmado', $6, 'accepted', $7, $8::jsonb, 'Salvador', 'BA'),
               ($2::uuid, $3::uuid, $4::uuid, $5::uuid, 'C01E intenção de horário', $6, 'accepted', $9, $10::jsonb, 'Salvador', 'BA')`,
      values: [
        state.canonicalOrderId,
        state.alternateOrderId,
        state.clientId,
        state.professionalId,
        state.serviceId,
        'Pedido sintético temporário do canário C01E.',
        `${runId}:order:canonical`,
        JSON.stringify(markerMetadata(runId)),
        `${runId}:order:alternate`,
        JSON.stringify(markerMetadata(runId, { desiredDate: new Date(slot.starts_at).toISOString(), schedulePreference: { requestedAt: new Date(slot.starts_at).toISOString(), authority: 'client_intent' } }))
      ]
    });

    await client.query({
      name: 'sched-c01e-insert-conversations',
      text: `insert into public.conversations (id, order_id, client_id, professional_id, status, last_message_at)
             values
               ($1::uuid, $3::uuid, $5::uuid, $6::uuid, 'active', pg_catalog.now()),
               ($2::uuid, $4::uuid, $5::uuid, $6::uuid, 'active', pg_catalog.now())`,
      values: [state.canonicalConversationId, state.alternateConversationId, state.canonicalOrderId, state.alternateOrderId, state.clientId, state.professionalId]
    });

    await client.query({
      name: 'sched-c01e-insert-messages',
      text: `insert into public.messages (id, conversation_id, sender_id, body, status)
             values
               ($1::uuid, $3::uuid, $5::uuid, 'Mensagem sintética do pedido com horário confirmado.', 'sent'),
               ($2::uuid, $4::uuid, $6::uuid, 'Mensagem sintética do pedido com intenção de horário.', 'sent')`,
      values: [state.canonicalMessageId, state.alternateMessageId, state.canonicalConversationId, state.alternateConversationId, state.clientId, state.professionalId]
    });

    await client.query({
      name: 'sched-c01e-insert-confirmed-reservation',
      text: `insert into public.schedule_reservations (
               id, professional_id, order_id, starts_at, ends_at, timezone, local_start, local_end,
               resolved_offset_minutes, status, hold_expires_at, version, idempotency_key, created_by
             ) values (
               $1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::timestamptz, 'America/Bahia',
               $6::timestamp, $7::timestamp, -180, 'confirmed', null, 2, $8, $2::uuid
             )`,
      values: [state.reservationId, state.professionalId, state.canonicalOrderId, slot.starts_at, slot.ends_at, slot.local_start, slot.local_end, `${runId}:reservation`]
    });

    await client.query({
      name: 'sched-c01e-apply-canonical-projection',
      text: `select * from private.apply_order_schedule_projection($1::uuid, $2::uuid, $3::timestamptz)`,
      values: [state.canonicalOrderId, state.reservationId, slot.starts_at]
    });

    await client.query('commit');
    return state;
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function verifyProvisionedGraph(client, state) {
  const response = await client.query({
    name: 'sched-c01e-verify-provisioned-graph',
    text: `select
      (select count(*)::int from public.services where id = $1::uuid and metadata ->> 'canaryRunId' = $11) as services,
      (select count(*)::int from public.service_versions where id = $2::uuid and service_id = $1::uuid) as service_versions,
      (select count(*)::int from public.orders where id = any($3::uuid[]) and metadata ->> 'canaryRunId' = $11) as orders,
      (select count(*)::int from public.conversations where id = any($4::uuid[]) and order_id = any($3::uuid[])) as conversations,
      (select count(*)::int from public.messages where id = any($5::uuid[]) and conversation_id = any($4::uuid[])) as messages,
      (select count(*)::int from public.schedule_reservations where id = $6::uuid and order_id = $7::uuid and status = 'confirmed') as reservations,
      (select count(*)::int from public.orders where id = $7::uuid and status = 'scheduled' and schedule_reservation_id = $6::uuid and scheduled_at is not null) as canonical_orders,
      (select count(*)::int from public.orders where id = $8::uuid and status in ('requested','accepted') and schedule_reservation_id is null and scheduled_at is null and metadata #>> '{schedulePreference,authority}' = 'client_intent') as alternate_orders,
      (select count(*)::int from public.orders where id = any($3::uuid[]) and client_id = $9::uuid and professional_id = $10::uuid) as participant_links`,
    values: [
      state.serviceId,
      state.serviceVersionId,
      [state.canonicalOrderId, state.alternateOrderId],
      [state.canonicalConversationId, state.alternateConversationId],
      [state.canonicalMessageId, state.alternateMessageId],
      state.reservationId,
      state.canonicalOrderId,
      state.alternateOrderId,
      state.clientId,
      state.professionalId,
      state.runId
    ]
  });
  const counts = response.rows[0];
  const expected = { services: 1, service_versions: 1, orders: 2, conversations: 2, messages: 2, reservations: 1, canonical_orders: 1, alternate_orders: 1, participant_links: 2 };
  for (const [key, value] of Object.entries(expected)) {
    if (Number(counts[key]) !== value) fail('DOKE_SCHED_C01E_FIXTURE_GRAPH_MISMATCH', { key, expected: value, actual: counts[key] });
  }
  return counts;
}

async function loadRunTargets(client, runId) {
  const orders = await client.query({
    name: 'sched-c01e-load-run-orders',
    text: `select id::text, service_id::text, schedule_reservation_id::text, status, metadata, external_id
           from public.orders
           where metadata ->> 'canaryRunId' = $1 or external_id like $2
           order by id`,
    values: [runId, `${runId}:%`]
  });
  const strictOrders = orders.rows.filter((row) =>
    row.metadata && row.metadata.canaryRunId === runId && row.metadata.canaryDomain === DOMAIN && row.metadata.canarySublot === SUBLOT && row.metadata.canaryScope === SCOPE && String(row.external_id || '').startsWith(`${runId}:`)
  );
  if (strictOrders.length !== orders.rows.length || strictOrders.length > 2) fail('DOKE_SCHED_C01E_ORDER_MARKER_MISMATCH');

  const services = await client.query({
    name: 'sched-c01e-load-run-services',
    text: `select id::text, metadata, external_id
           from public.services
           where metadata ->> 'canaryRunId' = $1 or external_id like $2
           order by id`,
    values: [runId, `${runId}:%`]
  });
  const strictServices = services.rows.filter((row) =>
    row.metadata && row.metadata.canaryRunId === runId && row.metadata.canaryDomain === DOMAIN && row.metadata.canarySublot === SUBLOT && row.metadata.canaryScope === SCOPE && String(row.external_id || '').startsWith(`${runId}:`)
  );
  if (strictServices.length !== services.rows.length || strictServices.length > 1) fail('DOKE_SCHED_C01E_SERVICE_MARKER_MISMATCH');
  return { orders: strictOrders, services: strictServices };
}

async function assertNoForbiddenDependencies(client, orderIds) {
  if (!orderIds.length) return {};
  const response = await client.query({
    name: 'sched-c01e-forbidden-dependency-counts',
    text: `select
      (select count(*)::int from public.payments where order_id = any($1::uuid[])) as payments,
      (select count(*)::int from public.payment_disputes where order_id = any($1::uuid[])) as payment_disputes,
      (select count(*)::int from public.transactions where order_id = any($1::uuid[])) as transactions,
      (select count(*)::int from public.receipts where order_id = any($1::uuid[])) as receipts,
      (select count(*)::int from public.wallet_receivables where order_id = any($1::uuid[])) as wallet_receivables,
      (select count(*)::int from public.reviews where order_id = any($1::uuid[])) as reviews`,
    values: [orderIds]
  });
  assertZeroCounts(response.rows[0], 'DOKE_SCHED_C01E_FORBIDDEN_DEPENDENCY_PRESENT');
  return response.rows[0];
}

async function cleanupFixtures(client, runId) {
  const targets = await loadRunTargets(client, runId);
  const orderIds = targets.orders.map((row) => row.id);
  const serviceIds = targets.services.map((row) => row.id);
  await assertNoForbiddenDependencies(client, orderIds);
  if (!orderIds.length && !serviceIds.length) return { status: 'already_clean', deleted: {} };

  await client.query('begin isolation level serializable');
  try {
    await client.query("set local search_path = pg_catalog, public, private, auth, extensions");
    for (const order of targets.orders) {
      if (order.schedule_reservation_id) {
        await client.query({
          name: 'sched-c01e-cancel-reservation-for-clear',
          text: `update public.schedule_reservations set status = 'cancelled', hold_expires_at = null, updated_at = pg_catalog.now()
                 where id = $1::uuid and order_id = $2::uuid and status in ('held','confirmed','cancelled')`,
          values: [order.schedule_reservation_id, order.id]
        });
        await client.query({
          name: 'sched-c01e-clear-canonical-projection',
          text: `select * from private.clear_order_schedule_projection($1::uuid, $2::uuid)`,
          values: [order.id, order.schedule_reservation_id]
        });
      }
    }

    const conversationRows = orderIds.length ? await client.query({
      name: 'sched-c01e-load-conversations-for-cleanup',
      text: `select id::text from public.conversations where order_id = any($1::uuid[])`,
      values: [orderIds]
    }) : { rows: [] };
    const conversationIds = conversationRows.rows.map((row) => row.id);

    if (orderIds.length) {
      await client.query({ text: `delete from private.order_event_delivery_attempts attempt using private.order_domain_events event where attempt.order_event_id = event.id and event.order_id = any($1::uuid[])`, values: [orderIds] });
      await client.query({ text: `delete from private.order_metric_events where order_id = any($1::uuid[]) or order_event_id in (select id from private.order_domain_events where order_id = any($1::uuid[]))`, values: [orderIds] });
      await client.query({ text: `delete from private.order_domain_events where order_id = any($1::uuid[])`, values: [orderIds] });
      await client.query({ text: `delete from private.schedule_domain_events where order_id = any($1::uuid[]) or payload #>> '{_eventMeta,correlationId}' like $2`, values: [orderIds, `${runId}%`] });
      await client.query({ text: `delete from private.schedule_command_idempotency where idempotency_key like $1 or reservation_id in (select id from public.schedule_reservations where order_id = any($2::uuid[]))`, values: [`${runId}%`, orderIds] });
      if (conversationIds.length) await client.query({ text: `delete from public.messages where conversation_id = any($1::uuid[])`, values: [conversationIds] });
      await client.query({ text: `delete from public.conversations where order_id = any($1::uuid[])`, values: [orderIds] });
      await client.query({ text: `delete from public.notifications where order_id = any($1::uuid[])`, values: [orderIds] });
      await client.query({ text: `delete from public.order_status_history where order_id = any($1::uuid[])`, values: [orderIds] });
      await client.query({ text: `delete from public.schedule_reservations where order_id = any($1::uuid[]) and idempotency_key like $2`, values: [orderIds, `${runId}%`] });
      await client.query({ text: `delete from public.orders where id = any($1::uuid[])`, values: [orderIds] });
    }
    if (serviceIds.length) {
      await client.query({ text: `delete from public.service_versions where service_id = any($1::uuid[])`, values: [serviceIds] });
      await client.query({ text: `delete from public.services where id = any($1::uuid[])`, values: [serviceIds] });
    }
    await client.query('commit');
    return { status: 'cleaned', deleted: { orders: orderIds.length, services: serviceIds.length, conversations: conversationIds.length } };
  } catch (error) {
    await client.query('rollback').catch(() => {});
    throw error;
  }
}

async function runDatabaseMode(mode) {
  validateEnvironment();
  const pullRequest = await verifyPullRequestGate();
  const project = await verifyProjectGate();
  const connection = await connectStaging(project);
  const report = baseReport(mode.slice(2));
  report.pullRequest = pullRequest;
  report.staging = { projectRef: project.id, projectName: project.name };
  try {
    report.schema = await verifySchema(connection.client);
    report.personas = { resolved: true, roles: ['client', 'professional'] };
    const personas = await resolvePersonas(connection.client);

    if (mode === '--preflight') {
      const residue = await loadGlobalResidue(connection.client);
      assertZeroCounts(residue, 'DOKE_SCHED_C01E_PREFLIGHT_RESIDUE_PRESENT');
      report.preflight = { residue, existingSyntheticPersonas: 2 };
      report.result = 'preflight_passed_read_only';
    } else if (mode === '--provision') {
      const residue = await loadGlobalResidue(connection.client);
      assertZeroCounts(residue, 'DOKE_SCHED_C01E_PREFLIGHT_RESIDUE_PRESENT');
      const state = await provisionFixtures(connection.client, personas);
      const graph = await verifyProvisionedGraph(connection.client, state);
      report.fixtureGraph = {
        services: Number(graph.services),
        serviceVersions: Number(graph.service_versions),
        orders: Number(graph.orders),
        conversations: Number(graph.conversations),
        messages: Number(graph.messages),
        reservations: Number(graph.reservations),
        canonicalConfirmedOrders: Number(graph.canonical_orders),
        alternateOrders: Number(graph.alternate_orders),
        participantLinks: Number(graph.participant_links)
      };
      report.stagingMutationsPerformed = true;
      report.result = 'synthetic_fixture_graph_provisioned';
    } else if (mode === '--cleanup') {
      const cleanup = await cleanupFixtures(connection.client, process.env[ENV.runId]);
      report.cleanup = cleanup;
      report.stagingMutationsPerformed = cleanup.status === 'cleaned';
      report.result = cleanup.status;
    } else if (mode === '--verify-clean') {
      const residue = await loadGlobalResidue(connection.client);
      assertZeroCounts(residue, 'DOKE_SCHED_C01E_POST_CLEANUP_RESIDUE_PRESENT');
      await resolvePersonas(connection.client);
      report.independentCleanupVerification = { status: 'passed', residue };
      report.result = 'zero_residue_verified';
    }
    writeJson(reportPath(), report);
    console.log(JSON.stringify(report, null, 2));
    return report;
  } catch (error) {
    report.result = 'failed_closed';
    report.failures = (report.failures || []).concat([safeError(error)]);
    writeJson(reportPath(), report);
    console.log(JSON.stringify(report, null, 2));
    throw error;
  } finally {
    connection.client.release();
    await connection.pool.end();
  }
}

function finalize() {
  validateEnvironment();
  const report = baseReport('finalize');
  let c01d;
  try { c01d = readJson(path.resolve(process.env[ENV.c01dReportPath])); }
  catch { fail('DOKE_SCHED_C01E_C01D_REPORT_MISSING'); }
  const cleanup = report.independentCleanupVerification;
  const authorities = new Set((c01d.selectedCases || []).map((entry) => entry.authority));
  const allChecksPassed = Array.isArray(c01d.surfaceChecks) && c01d.surfaceChecks.length > 0 && c01d.surfaceChecks.every((entry) => entry.passed === true);
  const passed = c01d.status === 'authenticated_browser_read_only_canary_passed'
    && Number(c01d.browserContextsCreated) === 2
    && Number(c01d.stagingMutationsPerformed) === 0
    && Number(c01d.postLoginMutationRequests) === 0
    && authorities.has('canonical_confirmed')
    && (authorities.has('client_intent') || authorities.has('none'))
    && allChecksPassed
    && cleanup && cleanup.status === 'passed';
  report.c01d = {
    status: c01d.status,
    browserContextsCreated: c01d.browserContextsCreated,
    stagingReadsPerformed: c01d.stagingReadsPerformed,
    stagingMutationsPerformed: c01d.stagingMutationsPerformed,
    postLoginMutationRequests: c01d.postLoginMutationRequests,
    authorities: [...authorities].sort(),
    surfaceChecks: Array.isArray(c01d.surfaceChecks) ? c01d.surfaceChecks.length : 0,
    allSurfaceChecksPassed: allChecksPassed,
    failures: Array.isArray(c01d.failures) ? c01d.failures : []
  };
  report.result = passed ? 'synthetic_fixture_lifecycle_and_bound_c01d_passed' : 'failed_closed';
  if (!passed) report.failures = (report.failures || []).concat([{ code: 'DOKE_SCHED_C01E_FINAL_ASSERTION_FAILED' }]);
  writeJson(reportPath(), report);
  console.log(JSON.stringify(report, null, 2));
  if (!passed) process.exitCode = 1;
}

async function main() {
  const mode = process.argv.slice(2).find((arg) => MODES.has(arg));
  if (!mode || process.argv.slice(2).filter((arg) => MODES.has(arg)).length !== 1) fail('DOKE_SCHED_C01E_MODE_REQUIRED');
  if (mode === '--finalize') return finalize();
  return runDatabaseMode(mode);
}

if (require.main === module) {
  main().catch((error) => {
    const safe = safeError(error);
    console.error(`${safe.code}${safe.diagnosticClass ? ` (${safe.diagnosticClass})` : ''}`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
'use strict';

const { Client } = require('pg');

const EXPECTED_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const CLIENT_ID = '826dde36-c959-4ab6-a26f-586bf82cdb7a';
const PROFESSIONAL_ID = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';
const SERVICE_ID = '77777777-7777-4777-8777-777777777777';
const CREATE_PREFIX = 'orders-write-staging-create-frontend-decline-';
const DECLINE_PREFIX = 'orders-write-staging-decline-frontend-manual-';
const ORDER_TITLE = 'Canary staging order';
const ORDER_DESCRIPTION = 'Pedido de validação controlada do canary de escrita.';
const EXPECTED_FINAL_STATUS = 'cancelled';
const EXECUTE_CONFIRMATION = 'cleanup-orders-write-frontend-manual-decline-canary';
const MULTIPLE_CONFIRMATION = 'cleanup-multiple-orders-write-frontend-manual-decline-canary';
const ALLOWED_ACTIONS = new Set(['orders.create', 'orders.decline']);

const args = new Set(process.argv.slice(2));
const checkEnv = args.has('--check-env');
const dryRun = args.has('--dry-run') || (!args.has('--check-env') && !args.has('--execute'));
const execute = args.has('--execute');

main().catch((error) => {
  console.error(`Orders Write frontend manual decline cleanup failed: ${sanitize(error && error.message)}`);
  process.exitCode = 1;
});

async function main() {
  assertValidMode();
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Orders Write frontend manual decline cleanup environment is valid. No network request or mutation was made.');
    printSafeSummary(config, 'check-env');
    return;
  }

  if (execute) validateExecutionConsent(config);

  const client = new Client({
    connectionString: config.dbUrl,
    ssl: { rejectUnauthorized: false },
    application_name: 'doke-orders-write-frontend-manual-decline-cleanup'
  });

  let transactionOpen = false;
  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;

    const plan = await buildCleanupPlan(client, config);
    if (plan.blockers.length) {
      throw new Error(`Cleanup blocked: ${plan.blockers.join(' ')}`);
    }

    const counts = await deletePlannedRows(client, plan);

    if (dryRun) {
      await client.query('rollback');
      transactionOpen = false;
      console.log('Orders Write frontend manual decline cleanup dry-run passed. Transaction was rolled back; staging data was not changed.');
      printSafeSummary(config, 'dry-run', counts, plan);
      return;
    }

    await client.query('commit');
    transactionOpen = false;
    console.log('Orders Write frontend manual decline cleanup committed successfully.');
    printSafeSummary(config, 'execute', counts, plan);
  } catch (error) {
    if (transactionOpen) await client.query('rollback').catch(() => {});
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function assertValidMode() {
  const explicitModes = [checkEnv, args.has('--dry-run'), execute].filter(Boolean).length;
  if (explicitModes > 1) {
    throw new Error('Choose only one mode: --check-env, --dry-run, or --execute. No mode defaults to --dry-run.');
  }
}

function readConfig() {
  return Object.freeze({
    environment: readEnv('DOKE_ENVIRONMENT'),
    projectRef: readEnv('DOKE_SUPABASE_PROJECT_REF'),
    dbUrl: readEnv('DOKE_SUPABASE_DB_URL'),
    confirmation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_CONFIRM'),
    allowMutation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_ALLOW_MUTATION'),
    allowMultiple: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_ALLOW_MULTIPLE'),
    multipleConfirmation: readEnv('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_MULTIPLE_CONFIRM')
  });
}

function validateConfig(config) {
  if (config.environment !== 'staging') {
    throw new Error('DOKE_ENVIRONMENT must be exactly staging.');
  }
  if (config.projectRef !== EXPECTED_PROJECT_REF) {
    throw new Error(`DOKE_SUPABASE_PROJECT_REF must equal ${EXPECTED_PROJECT_REF}.`);
  }
  if (!config.dbUrl) throw new Error('DOKE_SUPABASE_DB_URL is required.');

  let target;
  try {
    target = new URL(config.dbUrl);
  } catch {
    throw new Error('DOKE_SUPABASE_DB_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('DOKE_SUPABASE_DB_URL must use the postgres or postgresql protocol.');
  }
  if (!matchesExpectedProject(target)) {
    throw new Error(`Database target must belong to Supabase project ${EXPECTED_PROJECT_REF}.`);
  }
}

function validateExecutionConsent(config) {
  if (config.allowMutation !== '1') {
    throw new Error('DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_ALLOW_MUTATION=1 is required for --execute.');
  }
  if (config.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error(`DOKE_ORDERS_WRITE_FRONTEND_MANUAL_DECLINE_CLEANUP_CONFIRM must equal ${EXECUTE_CONFIRMATION}.`);
  }
}

function matchesExpectedProject(target) {
  const host = target.hostname.toLowerCase();
  const username = decodeURIComponent(target.username || '');
  const directHost = `db.${EXPECTED_PROJECT_REF}.supabase.co`;
  const pooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_PROJECT_REF}`;
  return host === directHost || pooler;
}

async function buildCleanupPlan(client, config) {
  const evidence = await readIdempotencyEvidence(client);
  const orderIds = unique(evidence.rows.map((row) => row.order_id).filter(Boolean));
  const orders = await readOrders(client, orderIds);
  const services = await readServices(client, orders.rows);
  const history = await readHistory(client, orderIds);
  const adminAudit = await readAdminAudit(client, evidence.rows);
  const relationCounts = await readRelationCounts(client, orderIds);
  const blockers = [];

  validateEvidenceRows(blockers, evidence.rows);
  validateOrderIds(blockers, evidence.rows, orderIds, orders.rows, config);
  validateOrders(blockers, orders.rows, services.byId);
  validateHistory(blockers, history.rows, orderIds);
  validateAdminAudit(blockers, adminAudit.rows, evidence.rows);
  addRelationBlockers(blockers, relationCounts);

  return Object.freeze({
    orderIds,
    evidenceRows: evidence.rows,
    orders: orders.rows,
    services: services.rows,
    historyRows: history.rows,
    adminAuditRows: adminAudit.rows,
    relationCounts,
    blockers
  });
}

async function readIdempotencyEvidence(client) {
  return client.query(
    `
      select
        idempotency_key,
        action,
        actor_id::text as actor_id,
        status,
        case
          when coalesce(response_body #>> '{order,id}', '') ~
            '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          then (response_body #>> '{order,id}')::uuid
          else null
        end as order_id
      from public.api_idempotency_keys
      where idempotency_key like $1
         or idempotency_key like $2
      order by created_at asc, idempotency_key asc
    `,
    [`${CREATE_PREFIX}%`, `${DECLINE_PREFIX}%`]
  );
}

async function readOrders(client, orderIds) {
  if (!orderIds.length) return { rows: [] };
  return client.query(
    `
      select
        id::text,
        client_id::text,
        professional_id::text,
        service_id::text,
        title,
        description,
        status
      from public.orders
      where id = any($1::uuid[])
      order by created_at asc, id asc
    `,
    [orderIds]
  );
}

async function readServices(client, orderRows) {
  const serviceIds = unique(orderRows.map((row) => row.service_id).filter(Boolean));
  if (!serviceIds.length) return { rows: [], byId: new Map() };
  const result = await client.query(
    `
      select id::text, professional_id::text, status, title
      from public.services
      where id = any($1::uuid[])
        and professional_id = $2::uuid
        and status = 'published'
      order by id asc
    `,
    [serviceIds, PROFESSIONAL_ID]
  );
  return { rows: result.rows, byId: new Map(result.rows.map((row) => [row.id, row])) };
}

async function readHistory(client, orderIds) {
  if (!orderIds.length) return { rows: [] };
  return client.query(
    `
      select order_id::text, old_status, new_status, actor_id::text as actor_id, note
      from public.order_status_history
      where order_id = any($1::uuid[])
      order by created_at asc, id asc
    `,
    [orderIds]
  );
}

async function readAdminAudit(client, evidenceRows) {
  const keys = evidenceRows.map((row) => row.idempotency_key);
  if (!keys.length) return { rows: [] };
  return client.query(
    `
      select id, actor_id::text as actor_id, actor_role, action, entity_type, entity_id::text, idempotency_key
      from public.admin_audit_events
      where idempotency_key = any($1::text[])
      order by created_at asc, id asc
    `,
    [keys]
  );
}

async function readRelationCounts(client, orderIds) {
  const empty = {
    budgets: 0,
    conversations: 0,
    messages: 0,
    transactions: 0,
    receipts: 0,
    notifications: 0,
    unexpectedApiIdempotencyKeys: 0,
    unexpectedAdminAuditEvents: 0
  };
  if (!orderIds.length) return empty;

  const result = await client.query(
    `
      with target_orders as (
        select unnest($1::uuid[]) as order_id
      ),
      target_conversations as (
        select id from public.conversations where order_id in (select order_id from target_orders)
      ),
      allowed_keys as (
        select idempotency_key
        from public.api_idempotency_keys
        where idempotency_key like $2
           or idempotency_key like $3
      )
      select 'budgets' as table_name, count(*)::int as row_count
        from public.budgets where order_id in (select order_id from target_orders)
      union all
      select 'conversations', count(*)::int
        from public.conversations where order_id in (select order_id from target_orders)
      union all
      select 'messages', count(*)::int
        from public.messages where conversation_id in (select id from target_conversations)
      union all
      select 'transactions', count(*)::int
        from public.transactions where order_id in (select order_id from target_orders)
      union all
      select 'receipts', count(*)::int
        from public.receipts where order_id in (select order_id from target_orders)
      union all
      select 'notifications', count(*)::int
        from public.notifications where data ->> 'orderId' in (select order_id::text from target_orders)
      union all
      select 'unexpectedApiIdempotencyKeys', count(*)::int
        from public.api_idempotency_keys
        where idempotency_key not like $2
          and idempotency_key not like $3
          and coalesce(response_body #>> '{order,id}', '') in (select order_id::text from target_orders)
      union all
      select 'unexpectedAdminAuditEvents', count(*)::int
        from public.admin_audit_events
        where coalesce(entity_id::text, '') in (select order_id::text from target_orders)
          and coalesce(idempotency_key, '') not in (select idempotency_key from allowed_keys)
    `,
    [orderIds, `${CREATE_PREFIX}%`, `${DECLINE_PREFIX}%`]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.table_name] = Number(row.row_count);
    return acc;
  }, empty);
}

function validateEvidenceRows(blockers, rows) {
  const createRows = rows.filter((row) => row.idempotency_key.startsWith(CREATE_PREFIX));
  const declineRows = rows.filter((row) => row.idempotency_key.startsWith(DECLINE_PREFIX));

  if (rows.length > 0 && createRows.length !== 1) blockers.push(`expected exactly 1 create idempotency key, found ${createRows.length}.`);
  if (rows.length > 0 && declineRows.length !== 1) blockers.push(`expected exactly 1 decline idempotency key, found ${declineRows.length}.`);

  for (const row of rows) {
    if (!ALLOWED_ACTIONS.has(row.action)) blockers.push(`idempotency key ${row.idempotency_key} has unexpected action ${row.action}.`);
    if (row.status !== 'succeeded') blockers.push(`idempotency key ${row.idempotency_key} did not succeed.`);
    if (!row.order_id) blockers.push(`idempotency key ${row.idempotency_key} does not contain a valid response order id.`);
    if (row.action === 'orders.create' && row.actor_id !== CLIENT_ID) blockers.push(`create idempotency key ${row.idempotency_key} belongs to an unexpected actor.`);
    if (row.action === 'orders.decline' && row.actor_id !== PROFESSIONAL_ID) blockers.push(`decline idempotency key ${row.idempotency_key} belongs to an unexpected actor.`);
    if (row.action === 'orders.create' && !row.idempotency_key.startsWith(CREATE_PREFIX)) blockers.push(`orders.create key ${row.idempotency_key} does not use the frontend decline create prefix.`);
    if (row.action === 'orders.decline' && !row.idempotency_key.startsWith(DECLINE_PREFIX)) blockers.push(`orders.decline key ${row.idempotency_key} does not use the frontend decline prefix.`);
  }
}

function validateOrderIds(blockers, evidenceRows, orderIds, orderRows, config) {
  if (orderIds.length !== new Set(orderIds).size) blockers.push('duplicate order ids were found in frontend create+decline evidence.');
  if (evidenceRows.length > 0 && orderIds.length !== 1) blockers.push(`expected exactly 1 candidate order id, found ${orderIds.length}.`);
  if (orderRows.length !== orderIds.length) blockers.push('one or more frontend create+decline idempotency keys point to a missing order.');
  if (orderRows.length > 1 && !allowsMultipleTargets(config)) {
    blockers.push(`found ${orderRows.length} candidate orders; multiple cleanup requires explicit multiple-target confirmation.`);
  }
}

function validateOrders(blockers, orderRows, serviceById) {
  for (const row of orderRows) {
    if (row.client_id !== CLIENT_ID) blockers.push(`order ${row.id} has unexpected client_id.`);
    if (row.professional_id !== PROFESSIONAL_ID) blockers.push(`order ${row.id} has unexpected professional_id.`);
    if (row.service_id !== SERVICE_ID) blockers.push(`order ${row.id} has unexpected service_id.`);
    if (row.title !== ORDER_TITLE) blockers.push(`order ${row.id} has unexpected title.`);
    if (row.description !== ORDER_DESCRIPTION) blockers.push(`order ${row.id} has unexpected description.`);
    if (row.status !== EXPECTED_FINAL_STATUS) blockers.push(`order ${row.id} has unexpected final status ${row.status}.`);
    if (!serviceById.has(row.service_id)) blockers.push(`order ${row.id} service_id is not a published service owned by the professional canary.`);
  }
}

function validateHistory(blockers, historyRows, orderIds) {
  if (!orderIds.length && !historyRows.length) return;
  if (historyRows.length !== 2) blockers.push(`expected exactly 2 order_status_history rows, found ${historyRows.length}.`);

  const createHistory = historyRows.find((row) => !row.old_status && row.new_status === 'requested' && row.actor_id === CLIENT_ID);
  const declineHistory = historyRows.find((row) => row.old_status === 'requested' && row.new_status === 'cancelled' && row.actor_id === PROFESSIONAL_ID);
  if (!createHistory) blockers.push('missing expected requested/create order_status_history row.');
  if (!declineHistory) blockers.push('missing expected cancelled/decline order_status_history row.');
}

function validateAdminAudit(blockers, auditRows, evidenceRows) {
  const allowedKeys = new Set(evidenceRows.map((row) => row.idempotency_key));
  if (evidenceRows.length > 0 && auditRows.length !== 2) blockers.push(`expected exactly 2 admin_audit_events rows, found ${auditRows.length}.`);

  for (const row of auditRows) {
    if (!allowedKeys.has(row.idempotency_key)) blockers.push(`admin audit event ${row.id} has an unexpected idempotency key.`);
    if (!ALLOWED_ACTIONS.has(row.action)) blockers.push(`admin audit event ${row.id} has unexpected action ${row.action}.`);
    if (row.action === 'orders.create' && row.actor_id !== CLIENT_ID) blockers.push(`admin audit event ${row.id} for create has unexpected actor.`);
    if (row.action === 'orders.decline' && row.actor_id !== PROFESSIONAL_ID) blockers.push(`admin audit event ${row.id} for decline has unexpected actor.`);
  }
}

function addRelationBlockers(blockers, counts) {
  const blockersByTable = [
    ['budgets', 'budgets'],
    ['conversations', 'conversations'],
    ['messages', 'messages'],
    ['transactions', 'transactions'],
    ['receipts', 'receipts'],
    ['notifications', 'notifications outside the frontend create+decline cleanup scope'],
    ['unexpectedApiIdempotencyKeys', 'non-frontend create+decline idempotency evidence'],
    ['unexpectedAdminAuditEvents', 'admin audit events outside the frontend create+decline scope']
  ];

  for (const [key, label] of blockersByTable) {
    if (Number(counts[key] || 0) > 0) blockers.push(`found ${counts[key]} ${label}; refusing cleanup.`);
  }
}

function allowsMultipleTargets(config) {
  return config.allowMultiple === '1' && config.multipleConfirmation === MULTIPLE_CONFIRMATION;
}

async function deletePlannedRows(client, plan) {
  const zeroCounts = [
    'admin_audit_events',
    'api_idempotency_keys',
    'order_status_history',
    'orders'
  ].map((tableName) => Object.freeze({ tableName, deletedCount: 0 }));

  if (!plan.orderIds.length) return zeroCounts;
  const keys = plan.evidenceRows.map((row) => row.idempotency_key);

  const adminAudit = await client.query(
    `
      delete from public.admin_audit_events
      where idempotency_key = any($1::text[])
        and action = any($2::text[])
      returning 1
    `,
    [keys, Array.from(ALLOWED_ACTIONS)]
  );
  const idempotency = await client.query(
    `
      delete from public.api_idempotency_keys
      where idempotency_key = any($1::text[])
        and action = any($2::text[])
        and coalesce(response_body #>> '{order,id}', '') = any($3::text[])
      returning 1
    `,
    [keys, Array.from(ALLOWED_ACTIONS), plan.orderIds]
  );
  const history = await client.query(
    `
      delete from public.order_status_history
      where order_id = any($1::uuid[])
      returning 1
    `,
    [plan.orderIds]
  );
  const orders = await client.query(
    `
      delete from public.orders
      where id = any($1::uuid[])
      returning 1
    `,
    [plan.orderIds]
  );

  return [
    Object.freeze({ tableName: 'admin_audit_events', deletedCount: adminAudit.rowCount }),
    Object.freeze({ tableName: 'api_idempotency_keys', deletedCount: idempotency.rowCount }),
    Object.freeze({ tableName: 'order_status_history', deletedCount: history.rowCount }),
    Object.freeze({ tableName: 'orders', deletedCount: orders.rowCount })
  ];
}

function printSafeSummary(config, mode, counts = [], plan = null) {
  console.log(`- mode: ${mode}`);
  console.log(`- environment: ${config.environment}`);
  console.log(`- project ref: ${config.projectRef}`);
  console.log(`- create selector: idempotency_key LIKE ${CREATE_PREFIX}%`);
  console.log(`- decline selector: idempotency_key LIKE ${DECLINE_PREFIX}%`);
  console.log(`- expected client_id: ${CLIENT_ID}`);
  console.log(`- expected professional_id: ${PROFESSIONAL_ID}`);
  console.log(`- expected service_id: ${SERVICE_ID}`);
  console.log(`- expected final status: ${EXPECTED_FINAL_STATUS}`);
  console.log(`- expected title: ${ORDER_TITLE}`);
  console.log(`- expected description: ${ORDER_DESCRIPTION}`);

  if (plan) {
    console.log(`- candidate idempotency keys: ${plan.evidenceRows.length}`);
    console.log(`- candidate orders: ${plan.orders.length}`);
    console.log(`- proven canary services: ${plan.services.length}`);
    console.log(`- order_status_history: ${plan.historyRows.length} row(s) would be removed`);
    console.log(`- admin_audit_events: ${plan.adminAuditRows.length} candidate row(s)`);
    for (const row of plan.orders) {
      console.log(`- safe candidate order: ${row.id} service_id=${row.service_id || 'null'} status=${row.status}`);
    }
    for (const row of plan.evidenceRows) {
      console.log(`- safe idempotency key: ${row.idempotency_key} action=${row.action} actor_id=${row.actor_id}`);
    }
    for (const [tableName, rowCount] of Object.entries(plan.relationCounts)) {
      console.log(`- relation check ${tableName}: ${rowCount}`);
    }
    console.log(`- blockers: ${plan.blockers.length ? plan.blockers.join(' | ') : 'none'}`);
  }

  counts.forEach((entry) => console.log(`- ${entry.tableName}: ${entry.deletedCount} row(s) would be removed`));
}

function unique(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function sanitize(value) {
  return String(value || 'unknown error')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(?:password|secret|token|key)=\S+/gi, '$1=[redacted]');
}

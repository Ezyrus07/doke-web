#!/usr/bin/env node
'use strict';

const { Client } = require('pg');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute');

const EXPECTED_STAGING_PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_CONFIRMATION = 'clean-staging-auth-canaries';
const TARGET_EMAILS = Object.freeze([
  'cliente@doke.local',
  'profissional@doke.local',
  'suporte@doke.local',
  'admin@doke.local'
]);
const LEGACY_USER_IDS = Object.freeze([
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
]);

main().catch((error) => {
  console.error(`Staging Auth canary cleanup failed: ${formatError(error)}`);
  process.exit(1);
});

async function main() {
  const config = readConfig();
  validateConfig(config);

  if (checkEnv) {
    console.log('Staging Auth cleanup environment is valid. No database connection was opened.');
    console.log(`- target project: ${EXPECTED_STAGING_PROJECT_REF}`);
    console.log('- connection string: present and hidden');
    return;
  }

  if (!dryRun && !execute) {
    throw operatorError('DOKE_AUTH_CLEAN_EXECUTE_REQUIRED', 'Refusing to delete Auth users without --execute.');
  }

  const client = new Client({
    ...buildConnectionOptions(config.dbUrl),
    application_name: 'doke-staging-auth-canary-cleaner',
    connectionTimeoutMillis: 15000,
    query_timeout: 30000
  });
  let transactionOpen = false;

  try {
    await client.connect();
    await client.query('begin');
    transactionOpen = true;
    await client.query("set local lock_timeout = '10s'");
    await client.query("set local statement_timeout = '30s'");

    const candidates = await loadCandidates(client);
    validateCandidates(candidates);
    const transactionBlockers = await loadTransactionBlockers(client, candidates);
    validateTransactionBlockers(transactionBlockers, candidates);
    const receiptBlockers = await loadReceiptBlockers(client, candidates, transactionBlockers);
    validateReceiptBlockers(receiptBlockers, candidates, transactionBlockers);
    printSanitizedPreview(candidates, transactionBlockers, receiptBlockers, dryRun);

    if (dryRun) {
      await detachReceiptBlockers(client, receiptBlockers);
      await detachTransactionBlockers(client, transactionBlockers);
      const simulatedDeleted = await deleteCandidates(client, candidates);
      verifyDeletedSet(candidates, simulatedDeleted);
      await assertNoTargetEmailRemains(client);
      await client.query('rollback');
      transactionOpen = false;
      console.log('Dry-run simulation passed. Transaction rolled back; no change was persisted.');
      return;
    }

    await detachReceiptBlockers(client, receiptBlockers);
    await detachTransactionBlockers(client, transactionBlockers);
    const deleted = await deleteCandidates(client, candidates);
    verifyDeletedSet(candidates, deleted);
    await assertNoTargetEmailRemains(client);
    await client.query('commit');
    transactionOpen = false;

    console.log(`Staging Auth cleanup committed. Deleted ${deleted.length} canary user(s).`);
    deleted.forEach((row) => console.log(`- ${maskEmail(row.email)}; id=${maskUuid(row.id)}`));
  } catch (error) {
    if (transactionOpen) await rollbackQuietly(client);
    throw error;
  } finally {
    await client.end().catch(() => {});
  }
}

function readConfig() {
  return Object.freeze({
    environment: readEnv('DOKE_ENVIRONMENT'),
    confirmation: readEnv('DOKE_STAGING_AUTH_CLEAN_CONFIRM'),
    dbUrl: readEnv('DOKE_SUPABASE_DB_URL')
  });
}

function validateConfig(config) {
  if (config.environment !== 'staging') {
    throw operatorError('DOKE_AUTH_CLEAN_ENVIRONMENT_BLOCKED', 'DOKE_ENVIRONMENT must be exactly staging.');
  }
  if (config.confirmation !== REQUIRED_CONFIRMATION) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_CONFIRMATION_REQUIRED',
      `DOKE_STAGING_AUTH_CLEAN_CONFIRM must equal ${REQUIRED_CONFIRMATION}.`
    );
  }
  if (!config.dbUrl) {
    throw operatorError('DOKE_AUTH_CLEAN_DB_URL_REQUIRED', 'DOKE_SUPABASE_DB_URL is required.');
  }

  const target = parseDbUrl(config.dbUrl);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw operatorError('DOKE_AUTH_CLEAN_DB_PROTOCOL_BLOCKED', 'DOKE_SUPABASE_DB_URL must use postgres or postgresql.');
  }
  if (!['require', 'verify-ca', 'verify-full'].includes(String(target.searchParams.get('sslmode') || '').toLowerCase())) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_TLS_REQUIRED',
      'DOKE_SUPABASE_DB_URL must require TLS with sslmode=require, verify-ca, or verify-full.'
    );
  }
  if (!isExpectedStagingTarget(target)) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_TARGET_BLOCKED',
      `Database target does not match Supabase staging project ${EXPECTED_STAGING_PROJECT_REF}.`
    );
  }
}

function parseDbUrl(value) {
  try {
    return new URL(value);
  } catch (error) {
    throw operatorError('DOKE_AUTH_CLEAN_DB_URL_INVALID', 'DOKE_SUPABASE_DB_URL must be a valid connection URL.');
  }
}

function isExpectedStagingTarget(target) {
  const host = String(target.hostname || '').toLowerCase();
  const username = decodeURIComponent(String(target.username || '')).toLowerCase();
  const directHost = `db.${EXPECTED_STAGING_PROJECT_REF}.supabase.co`;
  const isDirect = host === directHost;
  const isPooler = host.endsWith('.pooler.supabase.com') && username === `postgres.${EXPECTED_STAGING_PROJECT_REF}`;
  return isDirect || isPooler;
}

function buildConnectionOptions(dbUrl) {
  const target = parseDbUrl(dbUrl);
  const sslmode = String(target.searchParams.get('sslmode') || '').toLowerCase();
  if (sslmode !== 'require') return { connectionString: dbUrl };

  target.searchParams.delete('sslmode');
  target.searchParams.delete('uselibpqcompat');
  return {
    connectionString: target.toString(),
    ssl: { rejectUnauthorized: false }
  };
}

async function loadCandidates(client) {
  const result = await client.query({
    name: 'doke-auth-canary-clean-preview',
    text: `
      select
        auth_user.id::text as id,
        auth_user.email,
        exists (
          select 1
          from public.users app_user
          where app_user.id = auth_user.id
        ) as has_public_user,
        (
          select count(*)::int
          from auth.identities identity
          where identity.user_id = auth_user.id
        ) as identity_count
      from auth.users auth_user
      where lower(auth_user.email) = any($1::text[])
         or auth_user.id = any($2::uuid[])
      order by lower(auth_user.email), auth_user.id
      for update of auth_user
    `,
    values: [TARGET_EMAILS, LEGACY_USER_IDS]
  });
  return result.rows;
}

function validateCandidates(candidates) {
  const seenEmails = new Set();

  for (const candidate of candidates) {
    const email = normalizeEmail(candidate.email);
    const domain = email.includes('@') ? email.slice(email.lastIndexOf('@') + 1) : '';
    if (domain !== 'doke.local') {
      throw operatorError(
        'DOKE_AUTH_CLEAN_FOREIGN_DOMAIN_BLOCKED',
        `Legacy target ${maskUuid(candidate.id)} has a non-canary email domain; transaction aborted.`
      );
    }
    if (!TARGET_EMAILS.includes(email)) {
      throw operatorError(
        'DOKE_AUTH_CLEAN_EMAIL_NOT_ALLOWLISTED',
        `User ${maskUuid(candidate.id)} is not one of the four allowlisted canaries; transaction aborted.`
      );
    }
    if (seenEmails.has(email)) {
      throw operatorError(
        'DOKE_AUTH_CLEAN_DUPLICATE_TARGET',
        `More than one Auth user exists for ${maskEmail(email)}; transaction aborted for manual review.`
      );
    }
    seenEmails.add(email);
  }

  if (candidates.length > TARGET_EMAILS.length) {
    throw operatorError('DOKE_AUTH_CLEAN_TARGET_LIMIT_EXCEEDED', 'More than four candidate users were found.');
  }
}

async function loadTransactionBlockers(client, candidates) {
  if (!candidates.length) return [];
  const candidateIds = candidates.map((candidate) => candidate.id);
  const result = await client.query({
    name: 'doke-auth-canary-clean-transaction-blockers',
    text: `
      select
        tx.id::text as id,
        tx.order_id::text as order_id,
        tx.wallet_user_id::text as wallet_user_id,
        orders.client_id::text as client_id,
        orders.professional_id::text as professional_id
      from public.transactions tx
      join public.orders orders on orders.id = tx.order_id
      where orders.client_id = any($1::uuid[])
         or orders.professional_id = any($1::uuid[])
      order by tx.id
      for update of tx, orders
    `,
    values: [candidateIds]
  });
  return result.rows;
}

function validateTransactionBlockers(blockers, candidates) {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  for (const blocker of blockers) {
    const relatedIds = [blocker.wallet_user_id, blocker.client_id, blocker.professional_id].filter(Boolean);
    if (relatedIds.some((id) => !candidateIds.has(id))) {
      throw operatorError(
        'DOKE_AUTH_CLEAN_EXTERNAL_DEPENDENCY_BLOCKED',
        `Transaction ${maskUuid(blocker.id)} links a canary order to a non-canary user; transaction aborted.`
      );
    }
  }
}

async function loadReceiptBlockers(client, candidates, transactionBlockers) {
  const candidateIds = candidates.map((candidate) => candidate.id);
  const transactionIds = transactionBlockers.map((blocker) => blocker.id);
  const orderIds = transactionBlockers.map((blocker) => blocker.order_id);
  const result = await client.query({
    name: 'doke-auth-canary-clean-receipt-blockers',
    text: `
      select
        receipt.id::text as id,
        receipt.transaction_id::text as transaction_id,
        receipt.order_id::text as order_id,
        receipt.user_id::text as user_id
      from public.receipts receipt
      where receipt.user_id = any($1::uuid[])
         or receipt.transaction_id = any($2::uuid[])
         or receipt.order_id = any($3::uuid[])
      order by receipt.id
      for update of receipt
    `,
    values: [candidateIds, transactionIds, orderIds]
  });
  return result.rows;
}

function validateReceiptBlockers(receipts, candidates, transactionBlockers) {
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const transactionIds = new Set(transactionBlockers.map((blocker) => blocker.id));
  const orderIds = new Set(transactionBlockers.map((blocker) => blocker.order_id));
  for (const receipt of receipts) {
    const valid = (
      (!receipt.user_id || candidateIds.has(receipt.user_id)) &&
      (!receipt.transaction_id || transactionIds.has(receipt.transaction_id)) &&
      (!receipt.order_id || orderIds.has(receipt.order_id))
    );
    if (!valid) {
      throw operatorError(
        'DOKE_AUTH_CLEAN_EXTERNAL_RECEIPT_BLOCKED',
        `Receipt ${maskUuid(receipt.id)} links canary data to an external record; transaction aborted.`
      );
    }
  }
}

function printSanitizedPreview(candidates, transactionBlockers, receiptBlockers, isDryRun) {
  console.log(`Staging Auth canary cleanup ${isDryRun ? 'dry-run ' : ''}preview:`);
  console.log(`- matched users: ${candidates.length}`);
  console.log('- delete scope: auth.users rows matching the four exact allowlisted emails');
  console.log('- related rows: only database-declared foreign-key cascades; no manual broad cascade');
  console.log(`- transaction order links to detach: ${transactionBlockers.length}`);
  console.log(`- canary receipt links to detach: ${receiptBlockers.length}`);
  if (!candidates.length) {
    console.log('- no legacy canary users found; execution would be an idempotent no-op');
    return;
  }
  candidates.forEach((candidate) => {
    console.log(
      `- ${maskEmail(candidate.email)}; id=${maskUuid(candidate.id)}; ` +
      `identities=${Number(candidate.identity_count || 0)}; public_user=${Boolean(candidate.has_public_user)}`
    );
  });
}

async function detachReceiptBlockers(client, receipts) {
  if (!receipts.length) return;
  const ids = receipts.map((receipt) => receipt.id);
  const result = await client.query({
    name: 'doke-auth-canary-clean-detach-receipts',
    text: `
      update public.receipts
      set transaction_id = null,
          order_id = null,
          user_id = null
      where id = any($1::uuid[])
      returning id::text as id
    `,
    values: [ids]
  });
  if (result.rows.length !== receipts.length) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_RECEIPT_DETACH_MISMATCH',
      'Detached receipt set did not match the locked canary preview; transaction aborted.'
    );
  }
}

async function detachTransactionBlockers(client, blockers) {
  if (!blockers.length) return;
  const ids = blockers.map((blocker) => blocker.id);
  const result = await client.query({
    name: 'doke-auth-canary-clean-detach-transaction-orders',
    text: `
      update public.transactions
      set order_id = null
      where id = any($1::uuid[])
        and order_id = any($2::uuid[])
      returning id::text as id
    `,
    values: [ids, blockers.map((blocker) => blocker.order_id)]
  });
  if (result.rows.length !== blockers.length) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_TRANSACTION_DETACH_MISMATCH',
      'Detached transaction set did not match the locked canary preview; transaction aborted.'
    );
  }
}

async function deleteCandidates(client, candidates) {
  if (!candidates.length) return [];
  const ids = candidates.map((candidate) => candidate.id);
  const result = await client.query({
    name: 'doke-auth-canary-clean-delete',
    text: `
      delete from auth.users
      where id = any($1::uuid[])
        and lower(email) = any($2::text[])
      returning id::text as id, email
    `,
    values: [ids, TARGET_EMAILS]
  });
  return result.rows;
}

function verifyDeletedSet(candidates, deleted) {
  const expected = new Set(candidates.map((candidate) => candidate.id));
  const actual = new Set(deleted.map((candidate) => candidate.id));
  if (expected.size !== actual.size || [...expected].some((id) => !actual.has(id))) {
    throw operatorError(
      'DOKE_AUTH_CLEAN_DELETE_SET_MISMATCH',
      'Deleted Auth user set did not match the locked preview; transaction aborted.'
    );
  }
}

async function assertNoTargetEmailRemains(client) {
  const result = await client.query({
    name: 'doke-auth-canary-clean-postcondition',
    text: 'select count(*)::int as count from auth.users where lower(email) = any($1::text[])',
    values: [TARGET_EMAILS]
  });
  if (Number(result.rows[0] && result.rows[0].count || 0) !== 0) {
    throw operatorError('DOKE_AUTH_CLEAN_POSTCONDITION_FAILED', 'A target canary email remained after delete.');
  }
}

async function rollbackQuietly(client) {
  try {
    await client.query('rollback');
  } catch (error) {
    console.error(`Rollback attempt failed: ${formatError(error)}`);
  }
}

function operatorError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function formatError(error) {
  const fields = [];
  const code = sanitize(error && error.code);
  const severity = sanitize(error && error.severity);
  const message = sanitize(error && error.message || error || 'Unknown error');
  const detail = sanitize(error && error.detail);
  if (code) fields.push(`code=${code}`);
  if (severity) fields.push(`severity=${severity}`);
  fields.push(`message=${message}`);
  if (detail) fields.push(`detail=${detail}`);
  return fields.join(' ');
}

function sanitize(value) {
  return String(value || '')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted-token]')
    .replace(/(password|passwd|pwd)=([^&\s]+)/gi, '$1=[redacted]')
    .trim();
}

function maskEmail(value) {
  const email = normalizeEmail(value);
  const [local, domain] = email.split('@');
  if (!local || !domain) return '[invalid-email]';
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskUuid(value) {
  const id = String(value || '');
  if (id.length < 13) return '[invalid-id]';
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

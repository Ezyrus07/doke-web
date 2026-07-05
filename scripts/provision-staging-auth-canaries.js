#!/usr/bin/env node
'use strict';

const { createClient } = require('@supabase/supabase-js');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute');

const LEGACY_AUTH_USER_IDS = Object.freeze([
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444'
]);

const CANARIES = Object.freeze([
  canary('client', 'cliente@doke.local', 'Cliente Doke'),
  canary('professional', 'profissional@doke.local', 'Profissional Doke'),
  canary('support', 'suporte@doke.local', 'Suporte Doke'),
  canary('admin', 'admin@doke.local', 'Admin Doke')
]);

main().catch((error) => {
  console.error(`Auth canary provisioning failed: ${formatError(error)}`);
  process.exit(1);
});

async function main() {
  const config = readConfig();
  validateConfig(config, !dryRun);

  if (dryRun) {
    printPlan(config);
    return;
  }

  if (checkEnv) {
    console.log('Staging Auth canary environment is valid. No network request was made.');
    return;
  }

  if (!execute) {
    throw new Error('Refusing to mutate Auth without --execute.');
  }

  const admin = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  if (config.replaceLegacyUsers) {
    await deleteLegacyUsers(admin);
  }

  const existingUsers = await listAllUsers(admin);
  const results = [];

  for (const definition of config.canaries) {
    const existing = existingUsers.find((user) => normalizeEmail(user.email) === definition.email);
    const user = existing
      ? await updateCanary(admin, existing.id, definition)
      : await createCanary(admin, definition);

    assertEmailIdentity(user, definition);
    await verifyPasswordLogin(config, definition, user.id);
    results.push({ role: definition.role, email: definition.email, id: user.id, action: existing ? 'updated' : 'created' });
  }

  console.log('Supabase Auth canaries provisioned and direct password login verified.');
  results.forEach((result) => {
    console.log(`- ${result.role}: ${result.action}; id=${result.id}; email=${result.email}`);
  });
  console.log('Next: apply supabase/seed/002_mvp_controlled_seed.sql, then run the staging Auth/identity canary and E2E validators.');
}

function canary(role, defaultEmail, displayName) {
  return Object.freeze({ role, defaultEmail, displayName });
}

function readConfig() {
  const environment = readEnv('DOKE_ENVIRONMENT');
  const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('DOKE_SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY') || readEnv('DOKE_SUPABASE_SERVICE_ROLE_KEY');
  const projectRef = readEnv('DOKE_SUPABASE_PROJECT_REF');
  const replaceLegacyUsers = readEnv('DOKE_STAGING_AUTH_REPLACE_LEGACY') === '1';
  const confirmation = readEnv('DOKE_STAGING_AUTH_PROVISION_CONFIRM');
  const canaries = CANARIES.map((definition) => {
    const upper = definition.role.toUpperCase();
    return Object.freeze({
      role: definition.role,
      displayName: definition.displayName,
      email: normalizeEmail(readEnv(`DOKE_STAGING_${upper}_EMAIL`) || definition.defaultEmail),
      password: readEnv(`DOKE_STAGING_${upper}_PASSWORD`)
    });
  });

  return Object.freeze({
    environment,
    supabaseUrl: normalizeBaseUrl(supabaseUrl),
    serviceRoleKey,
    projectRef,
    replaceLegacyUsers,
    confirmation,
    canaries
  });
}

function validateConfig(config, requireSecrets) {
  if (!['local', 'staging'].includes(config.environment)) {
    throw new Error('DOKE_ENVIRONMENT must be exactly local or staging.');
  }
  if (!config.supabaseUrl) throw new Error('SUPABASE_URL or DOKE_SUPABASE_URL is required.');

  const target = parseTarget(config.supabaseUrl);
  if (looksProductionLike(target.host)) {
    throw new Error('Production-looking Supabase targets are blocked.');
  }

  if (config.environment === 'staging') {
    if (!config.projectRef) throw new Error('DOKE_SUPABASE_PROJECT_REF is required for staging.');
    if (target.host !== `${config.projectRef}.supabase.co`) {
      throw new Error('Supabase URL host does not match DOKE_SUPABASE_PROJECT_REF.');
    }
  } else if (!['127.0.0.1', 'localhost'].includes(target.hostname)) {
    throw new Error('Local Auth provisioning is restricted to localhost or 127.0.0.1.');
  }

  if (!requireSecrets) return;
  if (!config.serviceRoleKey) throw new Error('A server-only Supabase service role key is required.');
  if (config.confirmation !== 'provision-staging-auth-canaries') {
    throw new Error('DOKE_STAGING_AUTH_PROVISION_CONFIRM must equal provision-staging-auth-canaries.');
  }
  for (const definition of config.canaries) {
    if (!definition.password) {
      throw new Error(`DOKE_STAGING_${definition.role.toUpperCase()}_PASSWORD is required.`);
    }
  }
}

async function deleteLegacyUsers(admin) {
  console.log('Replacing legacy SQL-created Auth users; public rows referencing them may cascade and must be reseeded.');
  for (const userId of LEGACY_AUTH_USER_IDS) {
    const { error } = await admin.auth.admin.deleteUser(userId, false);
    if (error && !isMissingUserError(error)) {
      throw supabaseOperationError(`Admin deleteUser for legacy id ${maskUuid(userId)}`, error);
    }
    console.log(`- legacy user ${userId}: ${error ? 'already absent' : 'deleted'}`);
  }
}

async function listAllUsers(admin) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw supabaseOperationError(`Admin listUsers page ${page}`, error);
    const batch = data && Array.isArray(data.users) ? data.users : [];
    users.push(...batch);
    if (batch.length < perPage) return users;
  }
}

async function createCanary(admin, definition) {
  const { data, error } = await admin.auth.admin.createUser({
    email: definition.email,
    password: definition.password,
    email_confirm: true,
    user_metadata: {
      role: definition.role,
      displayName: definition.displayName
    }
  });
  if (error) throw supabaseOperationError(`Admin createUser for ${definition.email}`, error);
  return requireUser(data, definition);
}

async function updateCanary(admin, userId, definition) {
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    password: definition.password,
    email_confirm: true,
    user_metadata: {
      role: definition.role,
      displayName: definition.displayName
    }
  });
  if (error) {
    const wrapped = supabaseOperationError(`Admin updateUserById for ${definition.email}`, error);
    wrapped.message += (
      ' For SQL-created legacy users, run the database cleanup operator before provisioning.'
    );
    throw wrapped;
  }
  return requireUser(data, definition);
}

function requireUser(data, definition) {
  const user = data && data.user;
  if (!user || !user.id) throw new Error(`Admin API returned no user for ${definition.email}.`);
  return user;
}

function assertEmailIdentity(user, definition) {
  const identities = Array.isArray(user.identities) ? user.identities : [];
  const hasEmailIdentity = identities.some((identity) => {
    return identity && identity.provider === 'email' && String(identity.user_id || '') === user.id;
  });
  if (!hasEmailIdentity) {
    throw new Error(
      `${definition.email} has no GoTrue email identity after provisioning. ` +
      'If this is a legacy SQL-created user, rerun with DOKE_STAGING_AUTH_REPLACE_LEGACY=1.'
    );
  }
}

async function verifyPasswordLogin(config, definition, expectedUserId) {
  const client = createClient(config.supabaseUrl, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: definition.email,
    password: definition.password
  });
  if (error) throw supabaseOperationError(`Direct signInWithPassword for ${definition.email}`, error);
  if (!data || !data.session || !data.session.access_token || !data.user || data.user.id !== expectedUserId) {
    throw new Error(`Direct password login returned an invalid session for ${definition.email}.`);
  }
}

function printPlan(config) {
  console.log('Staging Auth canary provisioning plan (no network request, no mutation):');
  console.log(`- environment: ${config.environment || 'missing'}`);
  console.log(`- target: ${config.supabaseUrl ? parseTarget(config.supabaseUrl).host : 'missing'}`);
  console.log(`- project ref supplied: ${Boolean(config.projectRef)}`);
  console.log(`- replace legacy SQL users: ${config.replaceLegacyUsers}`);
  console.log('- create/update users through Supabase Admin API');
  console.log('- require one email identity per user');
  console.log('- verify direct password login for client, professional, support and admin');
  console.log('- never print passwords, service role keys, sessions or tokens');
}

function parseTarget(value) {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error('Supabase URL must be an absolute URL.');
  }
}

function looksProductionLike(host) {
  const normalized = String(host || '').toLowerCase();
  return /(^|[.-])(prod|production|live)([.-]|$)/.test(normalized);
}

function isMissingUserError(error) {
  const status = Number(error && error.status);
  const message = sanitize(error && error.message || error).toLowerCase();
  return status === 404 || message.includes('user not found');
}

function readEnv(name) {
  return String(process.env[name] || '').trim();
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function supabaseOperationError(operation, error) {
  const wrapped = new Error(`${operation}: ${formatError(error)}`);
  wrapped.code = error && (error.code || error.error_code) || 'DOKE_SUPABASE_ADMIN_API_ERROR';
  wrapped.status = Number(error && error.status) || 0;
  return wrapped;
}

function formatError(error) {
  const fields = [];
  const status = Number(error && error.status) || 0;
  const code = sanitize(error && (error.code || error.error_code));
  const name = sanitize(error && error.name);
  const message = sanitize(error && error.message || error || 'Unknown error');
  if (status) fields.push(`status=${status}`);
  if (code) fields.push(`code=${code}`);
  if (name && name !== 'Error') fields.push(`type=${name}`);
  fields.push(`message=${message}`);
  return fields.join(' ');
}

function sanitize(value) {
  return String(value || '')
    .replace(/eyJ[A-Za-z0-9._-]+/g, '[redacted-token]')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted-connection-string]')
    .replace(/(service[_-]?role|apikey|authorization|password)=([^&\s]+)/gi, '$1=[redacted]')
    .trim();
}

function maskUuid(value) {
  const id = String(value || '');
  return id.length >= 13 ? `${id.slice(0, 8)}…${id.slice(-4)}` : '[invalid-id]';
}

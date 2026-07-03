'use strict';

function readEnv(source, key) {
  return source && Object.prototype.hasOwnProperty.call(source, key) ? source[key] : '';
}

function normalizeBoolean(value) {
  if (value === true || value === 'true' || value === '1' || value === 'on') return true;
  if (value === false || value === 'false' || value === '0' || value === 'off') return false;
  return false;
}

function createStagingRuntimeConfig(input) {
  const source = input && typeof input === 'object' ? input : {};
  const env = source.env || (typeof process !== 'undefined' ? process.env : {}) || {};
  const supabaseUrl = source.supabaseUrl || readEnv(env, 'SUPABASE_URL') || readEnv(env, 'DOKE_SUPABASE_URL');
  const anonKey = source.anonKey || readEnv(env, 'SUPABASE_ANON_KEY') || readEnv(env, 'DOKE_SUPABASE_ANON_KEY');
  const serviceRoleKey = source.serviceRoleKey || readEnv(env, 'SUPABASE_SERVICE_ROLE_KEY') || readEnv(env, 'DOKE_SUPABASE_SERVICE_ROLE_KEY');
  const enableServiceRole = source.enableServiceRole === true || normalizeBoolean(readEnv(env, 'DOKE_ENABLE_SERVICE_ROLE'));

  return Object.freeze({
    runtime: 'staging',
    supabaseUrl: String(supabaseUrl || '').trim(),
    anonKey: String(anonKey || '').trim(),
    serviceRoleKey: String(serviceRoleKey || '').trim(),
    enableServiceRole,
    hasUserClientConfig: Boolean(supabaseUrl && anonKey),
    hasServiceClientConfig: Boolean(supabaseUrl && serviceRoleKey && enableServiceRole),
    allowNetwork: source.allowNetwork === true || normalizeBoolean(readEnv(env, 'DOKE_ENABLE_STAGING_API'))
  });
}

function assertStagingRuntimeConfig(config) {
  if (!config || !config.allowNetwork) throw runtimeConfigError('Staging API runtime is disabled. Set DOKE_ENABLE_STAGING_API=1 in staging only.');
  if (!config.hasUserClientConfig) throw runtimeConfigError('Supabase URL and anon key are required for staging user-scoped requests.');
  return true;
}

function runtimeConfigError(message) {
  const error = new Error(message);
  error.code = 'DOKE_STAGING_RUNTIME_NOT_CONFIGURED';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  createStagingRuntimeConfig,
  assertStagingRuntimeConfig
});

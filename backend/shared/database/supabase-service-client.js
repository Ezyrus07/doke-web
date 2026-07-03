'use strict';

/**
 * Service-role client factory placeholder.
 *
 * Real runtime code must inject the Supabase server client here. This module
 * intentionally does not import Supabase packages so the static frontend project
 * remains installable without backend dependencies.
 */

function createSupabaseServiceClient(options) {
  const config = options || {};
  if (!config.supabaseUrl) throw new Error('supabaseUrl is required for server-side Supabase access.');
  if (!config.serviceRoleKey) throw new Error('serviceRoleKey is required for privileged server actions.');
  if (typeof config.createClient !== 'function') {
    throw new Error('createClient factory must be injected by the backend runtime.');
  }
  return config.createClient(config.supabaseUrl, config.serviceRoleKey, config.clientOptions || {});
}

module.exports = Object.freeze({ createSupabaseServiceClient });

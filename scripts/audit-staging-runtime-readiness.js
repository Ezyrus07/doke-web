#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'backend/runtime/staging/staging-api-runtime.js',
  'backend/runtime/staging/staging-runtime-config.js',
  'backend/runtime/staging/fetch-adapter.js',
  'backend/shared/auth/supabase-actor-resolver.js',
  'backend/shared/http/http-response.js',
  'backend/modules/auth/identity-service.js',
  'backend/modules/auth/route-handlers.js',
  'docs/STAGING-API-RUNTIME.md',
  'docs/SUPABASE-LOCAL-STAGING-VALIDATION.md'
];

const requiredAuthMarkers = [
  'handlers.login = createActionHandler',
  'handlers.session = createActionHandler',
  'handlers.currentUser = createActionHandler',
  'handlers.currentProfile = createActionHandler',
  'handlers.updateCurrentUser = createActionHandler',
  'handlers.updateCurrentProfile = createActionHandler'
];

const runtimeMarkers = [
  'createStagingApiRuntime',
  'assertStagingRuntimeConfig',
  'resolveSupabaseActor',
  'serviceRoleRequired',
  'createUserSupabaseClient',
  'DOKE_ENABLE_STAGING_API'
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function fail(message) {
  console.error(`audit:staging-runtime-readiness failed: ${message}`);
  process.exit(1);
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}

const authHandlers = read('backend/modules/auth/route-handlers.js');
for (const marker of requiredAuthMarkers) {
  if (!authHandlers.includes(marker)) fail(`auth runtime handler marker missing: ${marker}`);
}

const runtime = read('backend/runtime/staging/staging-api-runtime.js') + read('backend/runtime/staging/staging-runtime-config.js');
for (const marker of runtimeMarkers) {
  if (!runtime.includes(marker)) fail(`staging runtime marker missing: ${marker}`);
}

const identity = read('backend/modules/auth/identity-service.js');
for (const table of ['users', 'user_profiles', 'professional_profiles', 'client_profiles']) {
  if (!identity.includes(`from('${table}')`)) fail(`identity service does not read ${table}`);
}

const createAction = read('backend/shared/http/create-action-handler.js');
for (const marker of ['serviceSupabase', 'createUserSupabaseClient']) {
  if (!createAction.includes(marker)) fail(`runtime context does not preserve ${marker}`);
}

const docs = read('docs/STAGING-API-RUNTIME.md') + read('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md');
for (const marker of ['DOKE_ENABLE_STAGING_API', 'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'auth/session', 'users/me', 'profiles/me']) {
  if (!docs.includes(marker)) fail(`documentation missing ${marker}`);
}

console.log('audit:staging-runtime-readiness passed');

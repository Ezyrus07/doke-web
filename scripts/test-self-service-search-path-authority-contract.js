#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync(
  'supabase/migrations/130_self_service_function_search_path_hardening.sql',
  'utf8'
);

const signatures = [
  'public.list_service_moderation_history(uuid, text)',
  'public.reopen_own_professional_identity_verification()',
  'public.save_professional_profile_setup(jsonb, integer, boolean)',
  'public.save_professional_verification_draft(jsonb, integer)',
  'public.submit_service_for_review(text, jsonb, text)'
];

for (const signature of signatures) {
  const escaped = signature.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`alter\\s+function\\s+${escaped}\\s+set\\s+search_path\\s*=\\s*pg_catalog`, 'i');
  assert(pattern.test(migration), `${signature} must pin search_path to pg_catalog.`);
}

assert(migration.includes("notify pgrst, 'reload schema'"), 'PostgREST schema reload notification is required.');
assert(!/search_path\s*=\s*(?:public|auth)(?:\s*,|\s*;)/i.test(migration), 'The hardening migration must not restore exposed schemas to search_path.');

console.log('Self-service search_path authority contract: PASS');

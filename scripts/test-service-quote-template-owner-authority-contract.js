#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const migration = fs.readFileSync('supabase/migrations/126_service_quote_template_owner_authority.sql', 'utf8');
for (const snippet of [
  'service_quote_templates_owner_insert',
  'service_quote_templates_owner_update',
  'service_quote_templates_owner_delete',
  'professional_id = (select auth.uid())',
  "public.current_user_role() = 'professional'",
  'from public.services service',
  'service.id = service_quote_templates.service_id',
  'service.professional_id = (select auth.uid())'
]) {
  assert(migration.includes(snippet), `quote-template ownership authority missing: ${snippet}`);
}
assert(!migration.includes("public.current_user_role() <> 'guest'"), 'Template ownership must require the canonical professional role, not merely a non-guest role.');
console.log('Service quote template owner authority contract: PASS');

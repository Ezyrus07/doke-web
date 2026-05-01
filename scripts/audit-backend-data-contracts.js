const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'supabase/migrations/001_identity_profiles.sql',
  'supabase/migrations/002_marketplace_core.sql',
  'supabase/migrations/003_communication_finance_community.sql',
  'supabase/policies/001_rls_foundation.sql',
  'supabase/seed/001_seed_reference_data.sql',
  'backend/shared/contracts/permissions.json',
  'assets/js/core/api-client.js',
  'assets/js/services/mock-data-service.js',
  'assets/js/services/supabase-contract.js',
  'docs/DATA-BACKEND-CONTRACTS.md'
];

const sqlExpectations = [
  ['supabase/migrations/001_identity_profiles.sql', ['create table if not exists public.users', 'public.audit_logs']],
  ['supabase/migrations/002_marketplace_core.sql', ['public.services', 'public.orders', 'public.budgets', 'public.reviews']],
  ['supabase/migrations/003_communication_finance_community.sql', ['public.conversations', 'public.messages', 'public.wallets', 'public.communities']],
  ['supabase/policies/001_rls_foundation.sql', ['enable row level security', 'create policy', 'auth.uid()']]
];

const failures = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}

for (const [file, snippets] of sqlExpectations) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();
  for (const snippet of snippets) {
    if (!content.includes(snippet.toLowerCase())) {
      failures.push(`Expected snippet not found in ${file}: ${snippet}`);
    }
  }
}

const permissionsPath = path.join(root, 'backend/shared/contracts/permissions.json');
if (fs.existsSync(permissionsPath)) {
  const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
  for (const role of ['guest', 'client', 'professional', 'moderator', 'admin']) {
    if (!permissions.roles.includes(role)) failures.push(`Missing role in permissions contract: ${role}`);
    if (!permissions.permissions[role]) failures.push(`Missing permissions list for role: ${role}`);
  }
}

if (failures.length) {
  console.error('Backend/data contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Backend/data contract audit passed.');
console.log(`Checked files: ${requiredFiles.length}`);

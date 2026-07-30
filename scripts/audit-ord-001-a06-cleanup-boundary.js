'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const required = [
  'supabase/migrations/20260730003500_ord_a06_canary_cleanup_boundary.sql',
  'supabase/migrations/20260730004500_ord_a06_cleanup_explicit_role_precedence.sql',
  'docs/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.md',
  'docs/validation/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.json',
  'scripts/audit-ord-001-a06-cleanup-boundary.js',
  '.github/workflows/ord-001-a06-cleanup-boundary.yml',
  'config/domain-completion-matrix.json',
  'package.json'
];

required.forEach((path) => assert(fs.existsSync(path), `Missing ORD-A06 cleanup asset: ${path}`));

const migration = read('supabase/migrations/20260730004500_ord_a06_cleanup_explicit_role_precedence.sql');
[
  'public.cleanup_order_canary_run',
  "if v_jwt_role <> '' then",
  "if v_jwt_role <> 'service_role' then",
  "session_user not in ('postgres', 'supabase_admin', 'service_role')",
  "^ord-a06-[a-z0-9][a-z0-9-]{5,80}$",
  "metadata ->> 'canaryRunId'",
  "metadata ->> 'canaryDomain' = 'ORD-001'",
  "metadata ->> 'canarySublot' = 'ORD-A06'",
  "metadata ->> 'canaryScope' = 'visual-settlement'",
  "external_id, '') like v_run_id || ':%'",
  "not in ('requested', 'accepted', 'quoted')",
  'DOKE_ORDER_CANARY_MARKER_MISMATCH',
  'DOKE_ORDER_CANARY_SCOPE_AMBIGUOUS',
  'DOKE_ORDER_CANARY_OUT_OF_SCOPE_DEPENDENCY',
  'DOKE_ORDER_CANARY_CLEANUP_RESIDUE',
  'private.order_event_delivery_attempts',
  'private.order_metric_events',
  'private.order_domain_events',
  'public.api_idempotency_keys',
  'public.quote_template_funnel_sessions',
  'private.order_event_operator_actions',
  'revoke all on function public.cleanup_order_canary_run(text) from public, anon, authenticated;',
  'grant execute on function public.cleanup_order_canary_run(text) to service_role;'
].forEach((fragment) => assert(migration.includes(fragment), `Final cleanup migration missing: ${fragment}`));

assert(!migration.includes('grant execute on function public.cleanup_order_canary_run(text) to authenticated'));
assert(!migration.includes("if v_jwt_role <> 'service_role'\n     and session_user"), 'Final migration must not let session_user override an explicit JWT role.');

const evidence = JSON.parse(read('docs/validation/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.json'));
assert.strictEqual(evidence.status, 'cleanup_boundary_complete_real_browser_canary_blocked');
assert.strictEqual(evidence.authority.execute.authenticated, false);
assert.strictEqual(evidence.authority.execute.service_role, true);
assert.strictEqual(evidence.authority.explicitJwtRolePrecedence, true);
assert.strictEqual(evidence.scope.doubleMarkerRequired, true);
assert.strictEqual(evidence.cleanup.outOfScopeDependencyPolicy, 'abort');
assert.strictEqual(evidence.cleanup.idempotentSecondCall, true);
assert.strictEqual(evidence.stagingValidation.transactionRolledBack, true);
assert.strictEqual(evidence.stagingValidation.realRowsPersisted, 0);
assert(evidence.stagingValidation.validated.includes('control_order_survives'));
assert(evidence.stagingValidation.validated.includes('partial_marker_rejected'));

const pkg = JSON.parse(read('package.json'));
assert.strictEqual(
  pkg.scripts['audit:ord-001-a06-cleanup-boundary'],
  'node scripts/audit-ord-001-a06-cleanup-boundary.js'
);

const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
assert.strictEqual(matrix.version, '1.3.18');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 missing from completion matrix.');
[
  'supabase/migrations/20260730003500_ord_a06_canary_cleanup_boundary.sql',
  'supabase/migrations/20260730004500_ord_a06_cleanup_explicit_role_precedence.sql',
  'docs/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.md',
  'docs/validation/ORD-001-A06-CANARY-CLEANUP-BOUNDARY.json',
  'scripts/audit-ord-001-a06-cleanup-boundary.js',
  '.github/workflows/ord-001-a06-cleanup-boundary.yml'
].forEach((path) => assert(ord.requiredPaths.includes(path), `ORD-001 matrix missing required path: ${path}`));
assert(ord.tests.includes('audit:ord-001-a06-cleanup-boundary'));
assert(ord.evidence.some((entry) => entry.includes('service-role-only cleanup boundary')));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B02' && blocker.description.includes('cleanup boundary is now staged')));

console.log('ORD-A06 canary cleanup boundary audit passed.');

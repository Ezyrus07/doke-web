#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const failures = [];
const file = (name) => path.join(root, name);
const exists = (name) => fs.existsSync(file(name));
const read = (name) => fs.readFileSync(file(name), 'utf8');
const assert = (condition, message) => { if (!condition) failures.push(message); };
const requireMarkers = (source, markers, label) => markers.forEach((marker) => {
  assert(source.includes(marker), `${label} marker missing: ${marker}`);
});

const migrations = [
  'supabase/migrations/163_service_search_observability_schema_v2.sql',
  'supabase/migrations/164_service_search_observation_recorder_v2.sql',
  'supabase/migrations/165_service_search_observability_calculator_v2.sql',
  'supabase/migrations/166_service_search_observability_operations_v2.sql',
];
const sqlTests = [
  'supabase/tests/027_service_search_observability_v2_contract_validation.sql',
  'supabase/tests/028_service_search_observation_recorder_v2_runtime_validation.sql',
  'supabase/tests/029_service_search_observability_v2_monitoring_validation.sql',
];
const required = [
  ...migrations,
  ...sqlTests,
  'supabase/functions/search-public-services-v2/index.ts',
  'supabase/functions/search-public-services-v2/operations.mjs',
  'supabase/functions/search-public-services-v2/deno.json',
  'scripts/audit-search-observability-v2.js',
  'scripts/test-search-observability-v2-runtime.mjs',
  'scripts/validate-search-observability-staging-http-canary.mjs',
  'scripts/audit-edge-function-source-closure.js',
  'docs/validation/SEARCH-001-A09-OBSERVABILITY-V2.json',
  'docs/validation/SEARCH-001-A08-RANKED-RPC-V2.json',
  'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  '.github/workflows/search-observability-v2.yml',
  '.github/workflows/search-observability-staging-http-canary.yml',
  'config/domain-completion-matrix.json',
];
required.forEach((name) => assert(exists(name), `required SEARCH-A09 file missing: ${name}`));
assert(!exists('.github/workflows/search-a09-apply.yml'), 'temporary SEARCH-A09 applicator remains');
assert(fs.readdirSync(root).every((name) => !name.startsWith('.search-a09-')), 'temporary SEARCH-A09 chunks remain');
if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const migration = migrations.map(read).join('\n');
requireMarkers(migration, [
  'private.service_search_observability_policies_v2',
  'private.service_search_observations_v2',
  'private.service_search_observability_snapshots_v2',
  'public.record_service_search_observation_v2',
  'private.calculate_service_search_observability_v2',
  'public.get_service_search_observability_v2',
  'public.refresh_service_search_observability_v2',
  'public.prune_service_search_observability_v2',
  "'cursorInvalid'", "'cursorConflict'", "'p50'", "'p95'", "'p99'",
  "'zeroResults'", "'rankingVersionDistribution'", "'enforcement', 'informational'",
  'grant execute on function public.record_service_search_observation_v2(jsonb) to service_role',
], 'migration');
assert(!migration.includes('create or replace function public.search_public_services_v1'), 'SEARCH-A09 replaced RPC v1');
assert(!migration.includes('create or replace function public.search_public_services_v2'), 'SEARCH-A09 embedded telemetry in RPC v2');
assert(!migration.includes('alter table public.services'), 'SEARCH-A09 modified catalog authority');
assert(!migration.includes('service_metric_totals'), 'behavioral metrics entered SEARCH-A09');

const observationTable = read(migrations[0]).split('create table if not exists private.service_search_observations_v2')[1]?.split(');')[0] || '';
[/\bquery\s+(text|jsonb)/i, /\bcursor\s+(text|jsonb)/i, /\bip(_address)?\s+(inet|text)/i,
 /\buser_id\s+uuid/i, /\bactor_id\s+uuid/i, /\brank_score\s+/i].forEach((pattern) => {
  assert(!pattern.test(observationTable), `observation table stores forbidden raw field: ${pattern}`);
});

requireMarkers(read(sqlTests[0]), ['begin;', 'rollback;', 'browser roles can write or read private observability',
  'stores raw search, identity, network or score data', 'incorrectly embedded telemetry writes'], 'SQL 027');
requireMarkers(read(sqlTests[1]), ['begin;', 'rollback;', 'request-id idempotency failed',
  'recorder normalized an invalid observation'], 'SQL 028');
requireMarkers(read(sqlTests[2]), ['begin;', 'rollback;', 'monitoring snapshot does not reflect authoritative observations',
  'zero-result rate must remain informational', 'changed the active ranking version',
  'persisted a ranking activation event', 'modified an existing public search RPC'], 'SQL 029');

const edge = read('supabase/functions/search-public-services-v2/index.ts');
requireMarkers(edge, ['../_shared/http-security.ts', 'enforceActorRateLimit', 'search_public_services_v2',
  'record_service_search_observation_v2', 'performance.now()', 'pseudonymousRateLimitActor',
  'DOKE_EDGE_RATE_LIMIT_SECRET'], 'Edge proxy');
assert(!edge.includes('console.error(error)'), 'Edge proxy logs raw errors');
assert(!edge.includes('rankScore'), 'Edge proxy exposes rank score');

const runtime = read('scripts/test-search-observability-v2-runtime.mjs');
requireMarkers(runtime, ['empty first page must be counted as zero result',
  'empty continuation page cannot inflate first-page zero-result rate',
  'raw query leaked into observation', 'raw cursor leaked into observation'], 'runtime');
const canary = read('scripts/validate-search-observability-staging-http-canary.mjs');
requireMarkers(canary, ['allowed-preflight', 'denied-preflight', 'missing-jwt', 'valid-anon-search',
  'unknown-field', 'invalid-cursor', 'search-rank-v0'], 'HTTP canary');

const a08 = JSON.parse(read('docs/validation/SEARCH-001-A08-RANKED-RPC-V2.json'));
const a05 = JSON.parse(read('docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json'));
const evidence = JSON.parse(read('docs/validation/SEARCH-001-A09-OBSERVABILITY-V2.json'));
assert(a08.status === 'COMPLETE_STAGING_BACKEND_INACTIVE' && a08.authority.browserCutover === false, 'A08 prerequisite invalid');
assert(a05.status === 'COMPLETE' && a05.targetAuthority.rpc === 'public.search_public_services_v1(jsonb)', 'browser RPC changed');
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A09', 'A09 evidence identity invalid');
assert(evidence.authority.browserCutover === false && evidence.authority.activeRankingExpected === 'search-rank-v0', 'A09 activation boundary invalid');
assert(evidence.privacy.rawQueryStored === false && evidence.privacy.rawCursorStored === false
  && evidence.privacy.identityStored === false && evidence.privacy.networkAddressStored === false, 'A09 privacy boundary invalid');
assert(evidence.ranking.observabilitySignalsEnterRanking === false, 'observability entered ranking');
assert(evidence.safety.productionChanged === false && evidence.safety.browserRpcChanged === false
  && evidence.safety.activeRankingChanged === false, 'A09 safety boundary invalid');

const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const search = matrix.domains.find((domain) => domain.id === 'SEARCH-001');
assert(search?.maturity === 3 && search?.userFacingAuthority === 'hybrid' && search?.serverAuthority === 'partial', 'SEARCH matrix authority changed');
assert(search?.securityGate === 'blocked' && search?.productionGate === 'blocked', 'SEARCH gates changed');
assert(JSON.stringify((search?.blockers || []).map((item) => item.id).sort()) === JSON.stringify(['SEARCH-B03']), 'SEARCH-B03 not preserved');
assert(read('scripts/audit-edge-function-source-closure.js').includes("'search-public-services-v2'"), 'Edge closure audit missing new function');

const workflow = read('.github/workflows/search-observability-v2.yml');
[...migrations, ...sqlTests, 'node scripts/audit-search-observability-v2.js',
  'node scripts/test-search-observability-v2-runtime.mjs', 'node scripts/audit-edge-function-source-closure.js']
  .forEach((marker) => assert(workflow.includes(marker), `workflow marker missing: ${marker}`));
const httpWorkflow = read('.github/workflows/search-observability-staging-http-canary.yml');
assert(httpWorkflow.includes('workflow_dispatch') && httpWorkflow.includes('validate-search-observability-staging-http-canary.mjs'), 'controlled HTTP workflow invalid');

if (failures.length) {
  console.error('[SEARCH-A09] Search observability audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[SEARCH-A09] Server-authoritative search observability: PASS');
console.log('[SEARCH-A09] Browser remains on RPC v1 and search-rank-v0 remains active.');

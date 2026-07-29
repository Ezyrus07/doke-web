#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) errors.push(message); };
const same = (actual, expected) => JSON.stringify(actual) === JSON.stringify(expected);

const files = {
  matrix: 'config/domain-completion-matrix.json',
  migration: 'supabase/migrations/162_service_search_ranked_rpc_v2.sql',
  sqlTest: 'supabase/tests/026_service_search_ranked_rpc_v2_validation.sql',
  audit: 'scripts/audit-search-ranked-rpc-v2.js',
  runtime: 'scripts/test-search-ranked-rpc-v2-runtime.js',
  evidence: 'docs/validation/SEARCH-001-A08-RANKED-RPC-V2.json',
  a07Evidence: 'docs/validation/SEARCH-001-A07-RANKING-V1.json',
  a05Evidence: 'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  workflow: '.github/workflows/search-ranked-rpc-v2.yml'
};

Object.values(files).forEach((file) => assert(exists(file), `required SEARCH-A08 file missing: ${file}`));
if (errors.length) {
  console.error('[SEARCH-A08] Required files are missing:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const migration = read(files.migration);
[
  'create table if not exists private.service_search_cursor_keys',
  'extensions.gen_random_bytes(32)',
  'create or replace function private.service_search_request_hash_v2(p_request jsonb)',
  'create or replace function private.encode_service_search_cursor_v2(p_payload jsonb)',
  'create or replace function private.decode_service_search_cursor_v2(p_cursor text)',
  'extensions.hmac(',
  "'sha256'",
  'create or replace function public.search_public_services_v2(p_request jsonb',
  'private.current_service_search_ranking_version()',
  "v_ranking_strategy = 'legacy_updated_at'",
  'private.compute_service_search_ranking_score(',
  "completed_order.status = 'completed'",
  "review.status = 'published'",
  "availability.status = 'available'",
  'coalesce(av.reviewed_at, av.created_at) as approved_at',
  'order by rank_score desc, rank_tiebreak_at desc, id desc',
  "'cursorVersion', 2",
  "'rankingVersion', v_ranking_version",
  "'asOf', v_as_of",
  "'requestHash', v_request_hash",
  "'score', page_meta.last_score",
  "'tiebreakAt', page_meta.last_tiebreak_at",
  "'id', page_meta.last_id",
  'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID',
  'DOKE_SEARCH_CURSOR_REQUEST_MISMATCH',
  'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT',
  'revoke all on function public.search_public_services_v2(jsonb) from public, anon, authenticated',
  'grant execute on function public.search_public_services_v2(jsonb) to anon, authenticated',
  'idx_service_search_ranking_state_active_version',
  'idx_service_search_ranking_events_previous_version',
  'idx_service_search_ranking_events_active_version'
].forEach((marker) => assert(migration.includes(marker), `ranked RPC migration marker missing: ${marker}`));

assert(!migration.includes('create or replace function public.search_public_services_v1'), 'SEARCH-A08 must not replace the proven public search RPC v1');
assert(!migration.includes("'rankScore'"), 'SEARCH-A08 cannot expose rankScore in the public DTO');
assert(!migration.includes("'textSignal'"), 'SEARCH-A08 cannot expose textSignal in the public DTO');
assert(!migration.includes("'reviewSignal'"), 'SEARCH-A08 cannot expose reviewSignal in the public DTO');
assert(!migration.includes("'availabilitySignal'"), 'SEARCH-A08 cannot expose availabilitySignal in the public DTO');
assert(!migration.includes("'recencySignal'"), 'SEARCH-A08 cannot expose recencySignal in the public DTO');

const rankedStart = migration.indexOf('), ranked as (');
const rankedEnd = migration.indexOf('), after_cursor as (', rankedStart);
const rankedSection = migration.slice(rankedStart, rankedEnd);
assert(rankedStart !== -1 && rankedEnd > rankedStart, 'SEARCH-A08 ranked CTE boundary is missing');
['views_count', 'contacts_count', 'budget_count', 'message_count', 'click_through', 'owner_activity', 'paid_boost'].forEach((marker) => {
  assert(!rankedSection.includes(marker), `behavioral signal entered the ranking calculation: ${marker}`);
});

const sqlTest = read(files.sqlTest);
[
  'begin;',
  'rollback;',
  'SEARCH-A08 ranked RPC v2 is missing',
  'SEARCH-A08 private cursor signing authority is exposed to browser roles',
  'SEARCH-A08 signed cursor did not round-trip exactly',
  'SEARCH-A08 accepted a tampered cursor',
  'SEARCH-A08 accepted a cursor from a different normalized request',
  'SEARCH-A08 accepted a cursor created under another ranking version',
  'SEARCH-A08 transactional rollback did not restore ranking v0',
  'SEARCH-A08 modified the already-proven public search RPC v1'
].forEach((marker) => assert(sqlTest.includes(marker), `SEARCH-A08 SQL validation marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  'assertLegacyOrdering',
  'assertRankedOrdering',
  'assertCursorBinding',
  'assertFrozenAsOf',
  'assertNoPublicScoreBreakdown',
  'createHmac',
  'timingSafeEqual',
  'search-rank-v0 must preserve updatedAt/id ordering',
  'search-rank-v1 must sort by score, tiebreak timestamp and id'
].forEach((marker) => assert(runtime.includes(marker), `SEARCH-A08 runtime marker missing: ${marker}`));

const a07 = JSON.parse(read(files.a07Evidence));
assert(a07.status === 'COMPLETE_STAGING_INFRASTRUCTURE_INACTIVE', 'SEARCH-A07 must remain complete and inactive before A08');
assert(a07.activationBoundary && a07.activationBoundary.rankingV1Activated === false, 'SEARCH-A07 ranking v1 must remain inactive');
assert(a07.activationBoundary && a07.activationBoundary.publicSearchRpcIntegrated === false, 'SEARCH-A07 cannot already claim public RPC integration');

const a05 = JSON.parse(read(files.a05Evidence));
assert(a05.status === 'COMPLETE', 'SEARCH-A05 browser activation must remain complete');
assert(a05.targetAuthority && a05.targetAuthority.rpc === 'public.search_public_services_v1(jsonb)', 'SEARCH-A08 cannot silently move the browser from RPC v1');

const evidence = JSON.parse(read(files.evidence));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A08', 'SEARCH-A08 evidence identity is invalid');
assert(['CANDIDATE_IMPLEMENTATION_PENDING_STAGING', 'CANDIDATE_VALIDATION_RUNNING', 'COMPLETE_STAGING_BACKEND_INACTIVE'].includes(evidence.status), 'SEARCH-A08 evidence status is invalid');
assert(evidence.authority && evidence.authority.candidatePublicRpc === 'public.search_public_services_v2(jsonb)', 'SEARCH-A08 candidate RPC is not documented');
assert(evidence.authority && evidence.authority.browserCutover === false, 'SEARCH-A08 cannot cut the browser over before the backend canary');
assert(evidence.cursor && evidence.cursor.integrity === 'hmac_sha256_private_server_key', 'SEARCH-A08 cursor integrity contract is missing');
assert(evidence.cursor && evidence.cursor.rankingVersionBound === true, 'SEARCH-A08 ranking-version cursor binding is missing');
assert(evidence.cursor && evidence.cursor.normalizedRequestBound === true, 'SEARCH-A08 normalized-request cursor binding is missing');
assert(evidence.cursor && evidence.cursor.asOfFrozenAcrossPages === true, 'SEARCH-A08 frozen asOf contract is missing');
assert(evidence.ranking && evidence.ranking.scoreBreakdownPublic === false, 'SEARCH-A08 cannot expose score breakdown');
assert(evidence.ranking && evidence.ranking.behavioralMetricsInScore === false, 'SEARCH-A08 cannot introduce browser behavioral metrics');
assert(evidence.safety && evidence.safety.productionChanged === false, 'SEARCH-A08 cannot change production');
assert(evidence.safety && evidence.safety.activeRankingChanged === false, 'SEARCH-A08 cannot activate ranking v1');
assert(evidence.safety && evidence.safety.browserRpcChanged === false, 'SEARCH-A08 cannot change the browser RPC');

const matrix = JSON.parse(read(files.matrix));
const search = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(search), 'SEARCH-001 is missing from the domain matrix');
assert(search && search.maturity === 3, 'SEARCH-A08 cannot advance maturity before browser cutover and monitoring');
assert(search && search.userFacingAuthority === 'hybrid', 'SEARCH-A08 must preserve hybrid user-facing authority');
assert(search && search.serverAuthority === 'partial', 'SEARCH-A08 must preserve partial server authority');
assert(search && search.stagingEvidence === 'staging_canary', 'SEARCH-A08 must preserve staging canary evidence');
assert(search && search.securityGate === 'blocked', 'SEARCH-A08 security gate must remain blocked');
assert(search && search.productionGate === 'blocked', 'SEARCH-A08 production gate must remain blocked');
assert(same((search && search.blockers || []).map((item) => item.id).sort(), ['SEARCH-B03']), 'SEARCH-B03 must remain the only SEARCH blocker');

const workflow = read(files.workflow);
[
  files.migration,
  files.sqlTest,
  files.audit,
  files.runtime,
  files.evidence,
  'node scripts/audit-search-ranking-v1.js',
  'node scripts/test-search-ranking-v1-runtime.js',
  'node scripts/audit-search-ranked-rpc-v2.js',
  'node scripts/test-search-ranked-rpc-v2-runtime.js'
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A08 workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A08] Ranked RPC v2 audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A08] Version-bound ranked search RPC v2: PASS');
console.log('[SEARCH-A08] Browser remains on public.search_public_services_v1 while v2 is validated in staging.');
console.log('[SEARCH-A08] search-rank-v0 preserves legacy ordering; v1 uses bounded score/tiebreak/id.');
console.log('[SEARCH-A08] HMAC cursor binds rankingVersion, asOf and normalized request.');
console.log('[SEARCH-A08] Behavioral metrics and public score breakdown remain excluded.');

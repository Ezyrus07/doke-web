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
  migration: 'supabase/migrations/160_service_search_ranking_v1.sql',
  reconciliation: 'supabase/migrations/161_service_search_ranking_v1_staging_reconciliation.sql',
  duplicateReconciliation: 'supabase/migrations/161_service_search_ranking_v1_contract_reconciliation.sql',
  sqlTest: 'supabase/tests/024_service_search_ranking_v1_validation.sql',
  reconciliationTest: 'supabase/tests/025_service_search_ranking_v1_reconciliation_validation.sql',
  runtime: 'scripts/test-search-ranking-v1-runtime.js',
  evidence: 'docs/validation/SEARCH-001-A07-RANKING-V1.json',
  a06Evidence: 'docs/validation/SEARCH-001-A06-RANKING-SIGNAL-BASELINE.json',
  workflow: '.github/workflows/search-ranking-v1.yml'
};

[
  files.matrix,
  files.migration,
  files.reconciliation,
  files.sqlTest,
  files.reconciliationTest,
  files.runtime,
  files.evidence,
  files.a06Evidence,
  files.workflow
].forEach((file) => assert(exists(file), `required SEARCH-A07 file missing: ${file}`));
assert(!exists(files.duplicateReconciliation), 'duplicate SEARCH-A07 migration number remains in the repository');
if (errors.length) {
  console.error('[SEARCH-A07] Required files are missing or duplicated:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const migration = read(files.migration);
[
  'create table if not exists private.service_search_ranking_versions',
  'create table if not exists private.service_search_ranking_state',
  'create table if not exists private.service_search_ranking_state_events',
  "strategy in ('legacy_updated_at', 'bounded_quality_v1')",
  'create or replace function private.validate_service_search_ranking_version()',
  'DOKE_SEARCH_RANKING_WEIGHTS_INVALID',
  'DOKE_SEARCH_RANKING_VERSION_IMMUTABLE',
  "'search-rank-v0'",
  "'search-rank-v1'",
  "'text', 0.68",
  "'reviews', 0.20",
  "'availability', 0.07",
  "'recency', 0.05",
  "'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5)",
  "'recencyZeroDays', 120",
  "'behavioralSignalsEnabled', false",
  "values (true, 'search-rank-v0')",
  'create or replace function private.current_service_search_ranking_version()',
  'create or replace function private.activate_service_search_ranking_version(',
  'DOKE_SEARCH_RANKING_VERSION_CONFLICT',
  'insert into private.service_search_ranking_state_events',
  'create or replace function private.compute_service_search_ranking_score(',
  'v_text_raw / (1 + v_text_raw)',
  'v_review_sum + (v_prior_mean * v_prior_weight)',
  'v_availability_signal := case when coalesce(p_has_available_slot, false) then 1 else 0 end',
  'when v_age_days <= v_recency_full then 1',
  'when v_age_days >= v_recency_zero then 0',
  'return pg_catalog.round(least(1, greatest(0, v_score)), v_precision)',
  'grant execute on function private.activate_service_search_ranking_version(text, text, text) to service_role',
  'revoke all on function private.activate_service_search_ranking_version(text, text, text) from public, anon, authenticated'
].forEach((marker) => assert(migration.includes(marker), `ranking migration marker missing: ${marker}`));

assert(!migration.includes('create or replace function public.search_public_services'), 'SEARCH-A07 must not activate or replace the public search RPC');
assert(!migration.includes('pg_catalog.greatest'), 'GREATEST cannot be schema-qualified');
assert(!migration.includes('pg_catalog.least'), 'LEAST cannot be schema-qualified');
assert(!migration.includes('pg_catalog.extract'), 'EXTRACT cannot be schema-qualified');

const scoreStart = migration.indexOf('create or replace function private.compute_service_search_ranking_score(');
const scoreEnd = migration.indexOf('comment on table private.service_search_ranking_versions', scoreStart);
const scoreSection = migration.slice(scoreStart, scoreEnd);
['views_count', 'contacts_count', 'budget_count', 'message_count', 'click_through', 'owner_activity', 'paid_boost'].forEach((marker) => {
  assert(!scoreSection.includes(marker), `forbidden behavioral signal entered ranking score: ${marker}`);
});

const reconciliation = read(files.reconciliation);
[
  'DOKE_SEARCH_RANKING_RECONCILIATION_REQUIRES_V0',
  'DOKE_SEARCH_RANKING_V1_MISSING',
  'DOKE_SEARCH_RANKING_V1_ALREADY_ACTIVATED',
  'DOKE_SEARCH_RANKING_V1_RECONCILIATION_FAILED',
  'DOKE_SEARCH_RANKING_RECONCILIATION_CHANGED_ACTIVE_VERSION',
  "'text', 0.68",
  "'availability', 0.07",
  "'recency', 0.05",
  "'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5)",
  "'recencyZeroDays', 120",
  "previous_version = 'search-rank-v1'",
  "active_version = 'search-rank-v1'",
  'disable trigger trg_reject_service_search_ranking_version_mutation',
  'enable trigger trg_reject_service_search_ranking_version_mutation',
  "private.current_service_search_ranking_version() <> 'search-rank-v0'"
].forEach((marker) => assert(reconciliation.includes(marker), `ranking reconciliation marker missing: ${marker}`));
assert(!reconciliation.includes('activate_service_search_ranking_version('), 'SEARCH-A07 reconciliation cannot activate the candidate ranking');
assert(!reconciliation.includes('create or replace function public.search_public_services'), 'SEARCH-A07 reconciliation cannot change the public search RPC');

const sqlTest = read(files.sqlTest);
[
  'begin;',
  'rollback;',
  'SEARCH-A07 Bayesian smoothing lets one perfect review dominate sustained quality',
  'SEARCH-A07 availability signal is not binary and capped at seven percent',
  'SEARCH-A07 recency contribution exceeds its five-percent cap',
  'SEARCH-A07 immutable ranking version accepted an update',
  'SEARCH-A07 accepted an invalid unbounded configuration',
  'SEARCH-A07 accepted a stale expected ranking version',
  'SEARCH-A07 failed to roll back ranking v1',
  'SEARCH-A07 activation and rollback events were not both recorded'
].forEach((marker) => assert(sqlTest.includes(marker), `ranking SQL validation marker missing: ${marker}`));

const reconciliationTest = read(files.reconciliationTest);
[
  'begin;',
  'rollback;',
  'SEARCH-A07 reconciliation did not preserve ranking v0',
  'SEARCH-A07 canonical ranking v1 config is not installed',
  'SEARCH-A07 immutable ranking trigger was not restored',
  'SEARCH-A07 reconciliation found a persisted v1 activation event',
  'SEARCH-A07 immutable boundary accepted an update after reconciliation'
].forEach((marker) => assert(reconciliationTest.includes(marker), `ranking reconciliation SQL marker missing: ${marker}`));

const runtime = read(files.runtime);
[
  'computeRankingScore',
  'search-rank-v1',
  'behavioralSignalsEnabled',
  'assertScoreBounds',
  'assertBayesianSmoothing',
  'assertAvailabilityCap',
  'assertRecencyCap',
  'assertSourceContract'
].forEach((marker) => assert(runtime.includes(marker), `ranking runtime marker missing: ${marker}`));

const a06 = JSON.parse(read(files.a06Evidence));
assert(a06.status === 'BASELINE_FROZEN', 'SEARCH-A06 baseline must remain frozen');
assert(a06.targetContract && a06.targetContract.rankingAuthority === 'server_only', 'SEARCH-A06 server-only ranking authority was not preserved');
assert(a06.targetContract && a06.targetContract.scoreBreakdownPublic === false, 'SEARCH-A06 public score-breakdown prohibition was not preserved');

const evidence = JSON.parse(read(files.evidence));
assert(evidence.domain === 'SEARCH-001' && evidence.sublot === 'SEARCH-A07', 'SEARCH-A07 evidence identity is invalid');
assert(evidence.status === 'COMPLETE_STAGING_INFRASTRUCTURE_INACTIVE', 'SEARCH-A07 staging infrastructure evidence is not complete');
assert(evidence.ranking && evidence.ranking.activeVersionAfterValidation === 'search-rank-v0', 'SEARCH-A07 must leave legacy ranking active');
assert(evidence.ranking && evidence.ranking.candidateVersion === 'search-rank-v1', 'SEARCH-A07 candidate ranking version is not documented');
assert(evidence.ranking && evidence.ranking.publicRpcChanged === false, 'SEARCH-A07 cannot claim public RPC activation');
assert(evidence.ranking && same(evidence.ranking.weights, {
  textRelevance: 0.68,
  publishedOrderBackedReviewQuality: 0.2,
  futureAvailabilityPresence: 0.07,
  boundedApprovedVersionRecency: 0.05
}), 'SEARCH-A07 documented weights diverge from the frozen contract');
assert(evidence.ranking.reviewSmoothing.priorMean === 4.2, 'SEARCH-A07 Bayesian prior mean diverges from the frozen contract');
assert(evidence.ranking.recency.zeroCreditDays === 120, 'SEARCH-A07 recency boundary diverges from the frozen contract');
assert(evidence.staging && evidence.staging.projectId === 'zwkczgewzbsorbrjuzpb', 'SEARCH-A07 staging project evidence is invalid');
assert(evidence.staging.baseMigration.version === '20260729000300', 'SEARCH-A07 base migration version is not recorded');
assert(evidence.staging.reconciliationMigration.version === '20260729000859', 'SEARCH-A07 reconciliation migration version is not recorded');
assert(evidence.staging.reconciliationMigration.source === files.reconciliation, 'SEARCH-A07 reconciliation source does not match the applied migration name');
assert(evidence.staging.reconciliationMigration.canonicalContractReconciled === true, 'SEARCH-A07 canonical staging contract is not reconciled');
assert(evidence.staging.transactionalValidation.sql024Passed === true, 'SEARCH-A07 SQL 024 staging evidence is missing');
assert(evidence.staging.transactionalValidation.sql025Passed === true, 'SEARCH-A07 SQL 025 staging evidence is missing');
assert(evidence.staging.transactionalValidation.activeVersionAfterTests === 'search-rank-v0', 'SEARCH-A07 staging tests did not preserve v0');
assert(evidence.staging.transactionalValidation.persistentActivationEvents === 0, 'SEARCH-A07 staging validation persisted activation events');
assert(evidence.staging.transactionalValidation.immutableTriggerRestored === true, 'SEARCH-A07 immutable trigger restoration is not documented');
assert(evidence.staging.transactionalValidation.legacyPublicOrderPreserved === true, 'SEARCH-A07 public legacy ordering changed');
assert(evidence.antiManipulation.behavioralMetricsInScore === false, 'SEARCH-A07 behavioral-metric exclusion is not documented');
assert(evidence.rollback.compareAndSwap === true, 'SEARCH-A07 compare-and-swap rollback is not documented');
assert(evidence.activationBoundary.rankingV1Activated === false, 'SEARCH-A07 cannot activate ranking v1');
assert(evidence.activationBoundary.publicSearchRpcIntegrated === false, 'SEARCH-A07 cannot integrate ranking into the public RPC');
assert(evidence.safety.stagingSchemaChanged === true, 'SEARCH-A07 staging schema write is not documented');
assert(evidence.safety.productionChanged === false, 'SEARCH-A07 cannot change production');
assert(evidence.safety.realAccountsChanged === false, 'SEARCH-A07 cannot change real accounts');
assert(evidence.safety.realServicesChanged === false, 'SEARCH-A07 cannot change real services');
assert(evidence.safety.activeRankingChanged === false, 'SEARCH-A07 cannot change the active ranking');
assert(evidence.safety.persistentSyntheticRowsCreated === false, 'SEARCH-A07 cannot leave synthetic rows');

const matrix = JSON.parse(read(files.matrix));
const search = (matrix.domains || []).find((domain) => domain.id === 'SEARCH-001');
assert(Boolean(search), 'SEARCH-001 is missing from the domain matrix');
assert(search && search.maturity === 3, 'SEARCH-A07 cannot advance maturity before RPC ranking activation');
assert(search && search.userFacingAuthority === 'hybrid', 'SEARCH-A07 must preserve hybrid user-facing authority');
assert(search && search.serverAuthority === 'partial', 'SEARCH-A07 must preserve partial server authority');
assert(search && search.stagingEvidence === 'staging_canary', 'SEARCH-A07 must preserve staging canary evidence');
assert(search && search.securityGate === 'blocked', 'SEARCH-A07 security gate must remain blocked');
assert(search && search.productionGate === 'blocked', 'SEARCH-A07 production gate must remain blocked');
assert(same((search && search.blockers || []).map((item) => item.id).sort(), ['SEARCH-B03']), 'SEARCH-B03 must remain the only SEARCH blocker');

const workflow = read(files.workflow);
[
  'node scripts/audit-search-ranking-signal-baseline.js',
  'node scripts/audit-search-ranking-v1.js',
  'node scripts/test-search-ranking-v1-runtime.js',
  files.migration,
  files.reconciliation,
  files.sqlTest,
  files.reconciliationTest
].forEach((marker) => assert(workflow.includes(marker), `SEARCH-A07 workflow marker missing: ${marker}`));

if (errors.length) {
  console.error('[SEARCH-A07] Ranking v1 audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A07] Immutable bounded ranking infrastructure is installed in staging: PASS');
console.log('[SEARCH-A07] Canonical search-rank-v1 is reconciled but remains inactive.');
console.log('[SEARCH-A07] search-rank-v0 and legacy public ordering remain active.');
console.log('[SEARCH-A07] Browser behavioral counters remain excluded from ranking.');
console.log('[SEARCH-A07] Production remains unchanged and SEARCH-B03 remains open.');

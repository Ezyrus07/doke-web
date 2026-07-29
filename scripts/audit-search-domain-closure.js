#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const exists = (file) => fs.existsSync(path.join(root, file));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const requiredFiles = [
  'docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.json',
  'docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json',
  'docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json',
  'docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json',
  'docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json',
  'docs/validation/SEARCH-001-A06-RANKING-SIGNAL-BASELINE.json',
  'docs/validation/SEARCH-001-A07-RANKING-V1.json',
  'docs/validation/SEARCH-001-A08-RANKED-RPC-V2.json',
  'docs/validation/SEARCH-001-A09-OBSERVABILITY-V2.json',
  'docs/validation/SEARCH-001-A10-BROWSER-CUTOVER-V2.json',
  'docs/validation/SEARCH-001-A11-FINAL-RECONCILIATION.json',
  'assets/js/repositories/favorites-repository.js',
  'assets/js/services/favorites-service.js',
  'assets/js/components/service-favorites-controller.js',
  'assets/js/repositories/search-repository.js',
  'assets/js/services/search-service.js',
  'assets/js/pages/search/server-results-surface.js',
  'assets/js/pages/resultados-data-controller.js',
  'supabase/functions/search-public-services-v2/index.ts',
  'supabase/functions/search-public-services-v2/operations.mjs',
  'supabase/migrations/158_service_search_contract.sql',
  'supabase/migrations/159_service_search_approved_snapshot_authority.sql',
  'supabase/migrations/160_service_search_ranking_v1.sql',
  'supabase/migrations/161_service_search_ranking_v1_staging_reconciliation.sql',
  'supabase/migrations/162_service_search_ranked_rpc_v2.sql',
  'supabase/migrations/163_service_search_observability_schema_v2.sql',
  'supabase/migrations/164_service_search_observation_recorder_v2.sql',
  'supabase/migrations/165_service_search_observability_calculator_v2.sql',
  'supabase/migrations/166_service_search_observability_operations_v2.sql',
  'supabase/tests/022_service_search_contract_validation.sql',
  'supabase/tests/023_service_search_approved_snapshot_authority_validation.sql',
  'supabase/tests/024_service_search_ranking_v1_validation.sql',
  'supabase/tests/025_service_search_ranking_v1_reconciliation_validation.sql',
  'supabase/tests/026_service_search_ranked_rpc_v2_validation.sql',
  'supabase/tests/027_service_search_observability_v2_contract_validation.sql',
  'supabase/tests/028_service_search_observation_recorder_v2_runtime_validation.sql',
  'supabase/tests/029_service_search_observability_v2_monitoring_validation.sql',
  '.github/workflows/search-domain-closure.yml',
  'config/domain-completion-matrix.json',
  'docs/DOMAIN-COMPLETION-MATRIX.md',
  'docs/DOKE-ENGINEERING-JOURNAL.md'
];

requiredFiles.forEach((file) => assert(exists(file), `Required SEARCH closure artifact missing: ${file}`));
[
  '.github/workflows/search-a11-closure-applicator.yml',
  'scripts/apply-search-a11-closure.js'
].forEach((file) => assert(!exists(file), `Temporary SEARCH-A11 applicator must not remain: ${file}`));

function successfulLane(lane, expectedHead) {
  return Boolean(
    lane &&
    lane.status === 'success' &&
    Number.isInteger(lane.runId) &&
    Number.isInteger(lane.runNumber) &&
    lane.head === expectedHead
  );
}

if (!errors.length) {
  const a01 = readJson('docs/validation/SEARCH-001-A01-AUTHORITY-BASELINE.json');
  const a02 = readJson('docs/validation/SEARCH-001-A02-FAVORITES-AUTHORITY-RETIREMENT.json');
  const a03 = readJson('docs/validation/SEARCH-001-A03-FAVORITES-SURFACES.json');
  const a04 = readJson('docs/validation/SEARCH-001-A04-SERVER-SEARCH-CONTRACT.json');
  const a05 = readJson('docs/validation/SEARCH-001-A05-SERVER-RESULTS-ACTIVATION.json');
  const a06 = readJson('docs/validation/SEARCH-001-A06-RANKING-SIGNAL-BASELINE.json');
  const a07 = readJson('docs/validation/SEARCH-001-A07-RANKING-V1.json');
  const a08 = readJson('docs/validation/SEARCH-001-A08-RANKED-RPC-V2.json');
  const a09 = readJson('docs/validation/SEARCH-001-A09-OBSERVABILITY-V2.json');
  const a10 = readJson('docs/validation/SEARCH-001-A10-BROWSER-CUTOVER-V2.json');
  const a11 = readJson('docs/validation/SEARCH-001-A11-FINAL-RECONCILIATION.json');
  const matrix = readJson('config/domain-completion-matrix.json');
  const journal = read('docs/DOKE-ENGINEERING-JOURNAL.md');
  const search = (matrix.domains || []).find((domain) => domain && domain.id === 'SEARCH-001');
  const blockers = search && Array.isArray(search.blockers) ? search.blockers : [];
  const expectedHead = a11.technicalHead;
  const runs = a11.validation && a11.validation.technicalHeadRuns || {};

  assert(a01.status === 'baseline_frozen', 'SEARCH-A01 baseline status changed unexpectedly.');
  assert(a02.status === 'COMPLETE', 'SEARCH-A02 must be complete.');
  assert(a03.status === 'COMPLETE', 'SEARCH-A03 must be complete.');
  assert(a04.status === 'COMPLETE', 'SEARCH-A04 must be complete.');
  assert(a05.status === 'COMPLETE', 'SEARCH-A05 must be complete.');
  assert(a06.status === 'BASELINE_FROZEN', 'SEARCH-A06 ranking baseline must remain frozen.');
  assert(a07.status === 'COMPLETE_STAGING_INFRASTRUCTURE_INACTIVE', 'SEARCH-A07 infrastructure must be complete and inactive.');
  assert(a08.status === 'COMPLETE_STAGING_BACKEND_INACTIVE', 'SEARCH-A08 backend must be complete.');
  assert(a09.status === 'COMPLETE_STAGING_BACKEND_INACTIVE', 'SEARCH-A09 observability backend must be complete.');
  assert(a10.status === 'COMPLETE_STAGING_BROWSER_CUTOVER', 'SEARCH-A10 browser cutover must be complete.');
  assert(a11.status === 'COMPLETE_STAGING_GOVERNANCE_RECONCILIATION', 'SEARCH-A11 closure status must be complete.');

  assert(/^[0-9a-f]{40}$/i.test(String(expectedHead || '')), 'SEARCH-A11 requires a full technicalHead.');
  assert(a10.validatedHead === expectedHead, 'SEARCH-A10 and SEARCH-A11 must reference the same technical head.');
  ['searchA01','searchA02','searchA03','searchA04','searchA05','searchA06','searchA07','searchA08','searchA09','searchA10','quality','stagingEdgeHttpCanary']
    .forEach((lane) => assert(successfulLane(runs[lane], expectedHead), `SEARCH-A11 lane ${lane} must be successful on the technical head.`));
  assert(runs.diagnostic && runs.diagnostic.status === 'cancelled_non_blocking', 'Diagnostic disposition must be explicit and non-blocking.');

  const baselineB03 = (a01.blockers || []).find((blocker) => blocker && blocker.id === 'SEARCH-B03');
  assert(baselineB03 && /conversion telemetry/i.test(String(baselineB03.actualProblem || '')), 'SEARCH-B03 baseline must retain the original conversion-telemetry finding.');
  assert(a07.ranking && a07.ranking.activeVersionAfterValidation === 'search-rank-v0', 'SEARCH-A07 must preserve search-rank-v0.');
  assert(a07.antiManipulation && a07.antiManipulation.behavioralMetricsInScore === false, 'Behavioral metrics must remain excluded from ranking.');
  assert(a07.antiManipulation && a07.antiManipulation.paidBoostInScore === false, 'Paid boost must remain excluded from ranking.');
  assert(a08.cursor && a08.cursor.tamperingRejected === true && a08.cursor.rankingVersionBound === true, 'SEARCH-A08 cursor integrity is required.');
  assert(a09.observability && a09.observability.rankingVersionDistribution === true, 'SEARCH-A09 ranking-version observability is required.');
  assert(a09.privacy && a09.privacy.rawQueryStored === false && a09.privacy.identityStored === false, 'SEARCH-A09 privacy boundary regressed.');
  assert(a10.transport && a10.transport.active === 'edge-v2', 'SEARCH-A10 must keep Edge v2 active.');
  assert(a10.transport && a10.transport.rollback === 'rpc-v1', 'SEARCH-A10 must preserve explicit RPC v1 rollback.');
  assert(a10.transport && a10.transport.automaticFallback === false, 'Automatic fallback must remain disabled.');
  assert(a10.e2eIsolation && a10.e2eIsolation.blockingQualityGeneratedSearchObservations === false, 'General E2E must remain isolated from live search.');

  assert(search, 'SEARCH-001 domain entry is missing from the matrix.');
  if (search) {
    const nextActions = Array.isArray(search.nextActions) ? search.nextActions : [];
    const exitCriteria = Array.isArray(search.exitCriteria) ? search.exitCriteria : [];
    const requiredPaths = Array.isArray(search.requiredPaths) ? search.requiredPaths : [];
    assert(search.maturity === 4, 'SEARCH-001 maturity must be staging-operational level 4.');
    assert(search.userFacingAuthority === 'hybrid', 'SEARCH-001 user-facing authority must remain hybrid while non-service pools are explicitly separate.');
    assert(search.serverAuthority === 'canonical', 'SEARCH-001 closed service-search authority must be canonical.');
    assert(search.stagingEvidence === 'staging_operational', 'SEARCH-001 staging evidence must be operational.');
    assert(search.securityGate === 'partial', 'SEARCH-001 security gate must remain partial.');
    assert(search.productionGate === 'blocked', 'SEARCH-001 production gate must remain blocked.');
    assert(blockers.length === 0, 'SEARCH-001 must have no remaining domain blocker after A11.');
    assert(!blockers.some((blocker) => blocker && blocker.id === 'SEARCH-B03'), 'SEARCH-B03 must be removed after cumulative reconciliation.');
    assert(nextActions.some((item) => /ORD-001/i.test(String(item))), 'SEARCH-001 must hand off to ORD-001.');
    assert(nextActions.some((item) => /ANA-001/i.test(String(item))), 'Future conversion telemetry must be governed by ANA-001.');
    assert(nextActions.some((item) => /search-rank-v0/i.test(String(item))), 'Matrix must preserve search-rank-v0.');
    assert(exitCriteria.some((item) => /monitoring and rollback/i.test(String(item))), 'Ranking monitoring and rollback must remain an exit criterion.');
    assert(requiredPaths.includes('scripts/audit-search-domain-closure.js'), 'Permanent closure audit must be matrix-required.');
    assert(requiredPaths.includes('docs/validation/SEARCH-001-A11-FINAL-RECONCILIATION.json'), 'A11 evidence must be matrix-required.');
  }

  assert(a11.closure && a11.closure['SEARCH-B03'] === 'reconciled_removed_by_SEARCH-A11', 'A11 must explicitly reconcile SEARCH-B03.');
  assert(a11.ranking && /ANA_001/.test(String(a11.ranking.conversionTelemetryDisposition || '')), 'Conversion telemetry must be deferred to ANA-001, not silently discarded.');
  assert(a11.ranking && a11.ranking.rankingV1Activated === false, 'A11 cannot activate ranking v1.');
  assert(a11.safety && a11.safety.productionChanged === false, 'A11 cannot change production.');
  assert(a11.safety && a11.safety.realMarketplaceDataMutated === false, 'A11 cannot mutate marketplace data.');
  assert(a11.safety && a11.safety.pullRequestMerged === false, 'A11 cannot claim the PR was merged.');
  assert(a11.safety && a11.safety.pullRequestReadyForReview === false, 'A11 cannot mark the PR ready for review.');
  assert(journal.includes('# 2026-07-29 — SEARCH-A11 / reconciliação final do SEARCH-001'), 'SEARCH-A11 requires an append-only journal entry.');
}

if (errors.length) {
  console.error('[SEARCH-A11-CLOSURE] Domain closure audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[SEARCH-A11-CLOSURE] SEARCH-A01 through SEARCH-A10 evidence is cumulative and internally consistent.');
console.log('[SEARCH-A11-CLOSURE] SEARCH-B03 is reconciled without activating ranking v1 or admitting browser-manipulable metrics.');
console.log('[SEARCH-A11-CLOSURE] SEARCH-001 is staging-operational at maturity 4; production remains blocked.');

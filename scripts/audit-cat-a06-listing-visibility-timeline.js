'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const contract = json('config/cat-a06-listing-visibility-timeline.json');
const moderation = read('supabase/migrations/044_expand_service_moderation_audit_history.sql');
const lifecycle = read('supabase/migrations/149_service_lifecycle_authority.sql');
const searchAuthority = read('supabase/migrations/159_service_search_approved_snapshot_authority.sql');
const a04 = json('config/ana-a04-marketplace-funnel-health-projections.json');
const matrix = json('config/domain-completion-matrix.json');
const ana = matrix.domains.find((item) => item.id === 'ANA-001');

check(contract.contractId === 'cat-a06-listing-visibility-timeline-v1', 'contract id drift');
check(contract.domain === 'CAT-001' && contract.consumerDomain === 'ANA-001', 'ownership drift');
check(contract.scope === 'repository_only', 'CAT-A06 must remain repository-only');
check(contract.status === 'contract_ready_migration_required', 'CAT-A06 status drift');
check(contract.currentHistoryAssessment.reusableAsCanonicalSupplyLedger === false, 'legacy moderation audit must not be promoted to supply authority');
check(contract.plannedLedger.appendOnly === true && contract.plannedLedger.serverOwned === true, 'future ledger must be append-only/server-owned');
check(contract.plannedLedger.idempotency.stateTupleAloneCannotBeIdempotencyKey === true, 'state tuple cannot identify an occurrence');
check(contract.plannedLedger.activationBaseline.historicalInferenceAllowed === false, 'retroactive visibility inference is forbidden');
check(contract.anaConsumption.preLedgerCoverage === 'partial', 'pre-ledger coverage must remain partial');
check(contract.anaConsumption.runtimeProjectionAuthorized === false, 'repository contract cannot authorize ANA runtime projection');
check(Object.values(contract.prohibitedEffects).every((value) => value === false), 'repository-only prohibited effects drift');

check(moderation.includes("v_event_key := 'service:' || new.id::text || ':visibility:' || old.status || ':' || new.status || ':' || coalesce(v_version_id::text, 'none')"), 'legacy visibility event key shape changed; re-evaluate root cause');
check(moderation.includes('on conflict (event_key) do nothing'), 'legacy visibility dedup behavior changed; re-evaluate root cause');
check(moderation.includes('after update of status on public.services'), 'legacy visibility trigger scope changed; re-evaluate version-change gap');
check(moderation.includes("case when v.source = 'resubmit' then 'version_resubmitted' else 'version_submitted' end"), 'version-history backfill marker missing');

check(lifecycle.includes('create or replace function public.transition_owned_service_lifecycle'), 'CAT-A03 lifecycle authority missing');
check(lifecycle.includes('revoke insert, update, delete on table public.services from anon, authenticated'), 'direct browser service writes are not fail-closed');
check(lifecycle.includes("v_action not in ('pause', 'reactivate', 'archive')"), 'CAT-A03 lifecycle action contract drift');

[
  "new.status <> 'published'",
  'new.approved_version_id is null',
  "new.moderation_status not in ('published', 'changes_pending_review', 'changes_required')",
  "version_row.review_status = 'approved'"
].forEach((marker) => check(searchAuthority.includes(marker), 'public eligibility authority marker missing: ' + marker));

const liquidity = a04.metrics.find((metric) => metric.key === 'liquidity.active_service_seconds');
check(liquidity && liquidity.source.includes('CAT-001') && liquidity.definition === 'sum_active_listing_intervals', 'ANA-A04 liquidity ownership drift');
check(a04.invariants.includes('pre-visibility-ledger supply history is partial coverage rather than fabricated complete history'), 'ANA-A04 partial-coverage invariant missing');
check(ana && ana.maturity === 3, 'ANA maturity must remain 3/6');
check(ana && ana.serverAuthority === 'partial', 'ANA server authority must remain partial');
check(ana && ana.evidence.some((item) => item.includes('CAT liquidity remains source-blocked')), 'matrix must preserve CAT liquidity blocker evidence');

if (failures.length) {
  console.error('[CAT-A06] audit failed');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exitCode = 1;
} else {
  console.log('[CAT-A06] existing CAT lifecycle authority confirmed.');
  console.log('[CAT-A06] service_moderation_events is correctly rejected as complete supply history.');
  console.log('[CAT-A06] future CAT ledger contract is repository-only and ANA remains 3/6.');
}

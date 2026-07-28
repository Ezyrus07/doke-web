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
  'docs/validation/CAT-001-A01-AUTHORITY-BASELINE.json',
  'docs/validation/CAT-001-A01-AUTHORITY-BASELINE.md',
  'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json',
  'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.md',
  'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.md',
  'docs/validation/CAT-001-A04-SERVICE-MEDIA-LIFECYCLE-BASELINE.json',
  'docs/validation/CAT-001-A04-IMMUTABLE-UPLOAD-RESERVATION.json',
  'docs/validation/CAT-001-A04-REFERENCE-SAFE-MEDIA-CLEANUP.json',
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json',
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md',
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json',
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md',
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json',
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.md',
  'supabase/migrations/149_service_lifecycle_authority.sql',
  'supabase/migrations/150_service_media_upload_authority.sql',
  'supabase/migrations/155_service_media_reference_safe_cleanup_authority.sql',
  'supabase/migrations/156_order_service_snapshot_authority.sql',
  'supabase/migrations/157_order_service_snapshot_coalesce_fix.sql',
  'supabase/tests/018_service_lifecycle_authority_validation.sql',
  'supabase/tests/019_service_media_upload_authority_validation.sql',
  'supabase/tests/020_service_media_reference_safe_cleanup_validation.sql',
  'supabase/tests/021_order_service_snapshot_authority_validation.sql',
  'config/domain-completion-matrix.json',
  'docs/DOKE-ENGINEERING-JOURNAL.md'
];

requiredFiles.forEach((file) => assert(exists(file), `Required CAT closure artifact missing: ${file}`));

function validLane(lane, expectedHead) {
  return Boolean(
    lane &&
    lane.status === 'success' &&
    Number.isInteger(lane.runId) &&
    Number.isInteger(lane.runNumber) &&
    lane.head === expectedHead
  );
}

if (!errors.length) {
  const a04 = readJson('docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json');
  const b04 = readJson('docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json');
  const a05 = readJson('docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json');
  const matrix = readJson('config/domain-completion-matrix.json');
  const journal = read('docs/DOKE-ENGINEERING-JOURNAL.md');
  const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');
  const blockers = cat && Array.isArray(cat.blockers) ? cat.blockers : [];
  const hasCatB04 = blockers.some((blocker) => blocker && blocker.id === 'CAT-B04');
  const pending = a04.status === 'TECHNICALLY_COMPLETE_CI_PENDING' &&
    b04.status === 'CANDIDATE_VALIDATED_CI_PENDING' &&
    a05.status === 'RECONCILIATION_CANDIDATE_CI_PENDING';
  const complete = a04.status === 'COMPLETE' && b04.status === 'COMPLETE' && a05.status === 'COMPLETE';

  assert(pending || complete, 'CAT-A04, CAT-B04 and CAT-A05 statuses must be consistently pending or complete.');
  assert(cat, 'CAT-001 domain entry is missing from the completion matrix.');

  if (cat) {
    const nextActions = Array.isArray(cat.nextActions) ? cat.nextActions : [];
    const exitCriteria = Array.isArray(cat.exitCriteria) ? cat.exitCriteria : [];
    assert(cat.maturity === 4, 'CAT-001 maturity must remain staging-operational level 4.');
    assert(cat.userFacingAuthority === 'remote', 'CAT-001 user-facing authority must remain remote.');
    assert(cat.serverAuthority === 'canonical', 'CAT-001 server authority must remain canonical.');
    assert(cat.stagingEvidence === 'staging_operational', 'CAT-001 staging evidence must remain operational.');
    assert(cat.securityGate === 'partial', 'CAT-001 security gate must remain partial.');
    assert(cat.productionGate === 'blocked', 'CAT-001 production gate must remain blocked.');
    assert(exitCriteria.some((item) => /order snapshots are immutable/i.test(String(item))), 'CAT-001 exit criteria must require immutable order snapshots.');

    if (pending) {
      assert(hasCatB04, 'CAT-B04 blocker must remain until final CI lanes converge.');
      assert(nextActions.some((item) => /immutable service snapshots/i.test(String(item))), 'Pending CAT-001 next actions must mention immutable service snapshots.');
    }

    if (complete) {
      assert(!hasCatB04, 'CAT-B04 blocker must be removed after verified final closure.');
      assert(nextActions.some((item) => /SEARCH-001/i.test(String(item))), 'Completed CAT-001 must hand off to SEARCH-001.');
    }
  }

  if (pending) {
    assert(a04.validation && a04.validation.quality === 'not_observable_on_final_head', 'Pending CAT-A04 must not claim Quality success.');
    assert(b04.validation && b04.validation.fullCi === 'pending', 'Pending CAT-B04 full CI must remain pending.');
    ['quality', 'blockingE2e', 'visualStructuralGuards', 'canary', 'diagnostic'].forEach((lane) => {
      assert(a05.ci && a05.ci[lane] === 'pending_observable_result', `Pending CAT-A05 lane ${lane} must remain pending.`);
    });
  }

  if (complete) {
    const expectedHead = a05.validatedHead;
    assert(/^[0-9a-f]{40}$/i.test(String(expectedHead || '')), 'Completed CAT-A05 requires a full validatedHead.');
    assert(a04.validatedHead === expectedHead && b04.validatedHead === expectedHead, 'All completed CAT evidence must reference the same validated head.');
    ['quality', 'blockingE2e', 'visualStructuralGuards', 'canary', 'diagnostic'].forEach((lane) => {
      assert(validLane(a05.ci && a05.ci[lane], expectedHead), `Completed CAT-A05 lane ${lane} requires successful run evidence on the validated head.`);
    });
    assert(a04.validation && a04.validation.quality === 'success', 'Completed CAT-A04 requires Quality success.');
    assert(a04.validation && a04.validation.blockingE2e === 'success', 'Completed CAT-A04 requires blocking E2E success.');
    assert(a04.validation && a04.validation.visualStructuralGuards === 'success', 'Completed CAT-A04 requires visual guards success.');
    assert(a04.validation && a04.validation.canary === 'success', 'Completed CAT-A04 requires Canary success.');
    assert(a04.validation && a04.validation.diagnostic === 'success', 'Completed CAT-A04 requires Diagnostic success.');
    assert(b04.validation && b04.validation.fullCi === 'success', 'Completed CAT-B04 requires full CI success.');
    assert(journal.includes('# 2026-07-28 — CAT-A04 / fechamento do ciclo de mídia'), 'Completed CAT-A04 requires an append-only journal entry.');
    assert(journal.includes('# 2026-07-28 — CAT-B04 / snapshot imutável de serviço em pedidos'), 'Completed CAT-B04 requires an append-only journal entry.');
    assert(journal.includes('# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001'), 'Completed CAT-A05 requires an append-only journal entry.');
  }

  assert(a05.safety && a05.safety.productionChanged === false, 'CAT-A05 evidence must preserve production unchanged.');
  assert(a05.safety && a05.safety.prMerged === false, 'CAT-A05 evidence cannot claim the PR was merged.');
  assert(a05.safety && a05.safety.prReadyForReview === false, 'CAT-A05 evidence cannot mark the PR ready for review.');
}

if (errors.length) {
  console.error('[CAT-A05-CLOSURE] Domain closure audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[CAT-A05-CLOSURE] All CAT-001 authority evidence is present and internally consistent.');
console.log('[CAT-A05-CLOSURE] Pending and completed states are both fail-closed and evidence-gated.');
console.log('[CAT-A05-CLOSURE] Maturity 4 and blocked production are preserved.');

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

if (!errors.length) {
  const a04 = readJson('docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json');
  const b04 = readJson('docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json');
  const a05 = readJson('docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json');
  const matrix = readJson('config/domain-completion-matrix.json');
  const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');

  assert(a04.status === 'TECHNICALLY_COMPLETE_CI_PENDING', 'CAT-A04 must remain technically complete and CI pending until final lanes converge.');
  assert(b04.status === 'CANDIDATE_VALIDATED_CI_PENDING', 'CAT-B04 must remain candidate validated and CI pending until final lanes converge.');
  assert(a05.status === 'RECONCILIATION_CANDIDATE_CI_PENDING', 'CAT-A05 must remain a CI-pending reconciliation candidate.');

  assert(a04.validation && a04.validation.quality === 'not_observable_on_final_head', 'CAT-A04 Quality state must not be rewritten as passed without final-head evidence.');
  assert(b04.validation && b04.validation.fullCi === 'pending', 'CAT-B04 full CI must remain pending without final-head evidence.');

  assert(cat, 'CAT-001 domain entry is missing from the completion matrix.');
  if (cat) {
    const blockers = Array.isArray(cat.blockers) ? cat.blockers : [];
    const nextActions = Array.isArray(cat.nextActions) ? cat.nextActions : [];
    const exitCriteria = Array.isArray(cat.exitCriteria) ? cat.exitCriteria : [];

    assert(cat.userFacingAuthority === 'remote', 'CAT-001 user-facing authority must remain remote.');
    assert(cat.serverAuthority === 'canonical', 'CAT-001 server authority must remain canonical.');
    assert(cat.stagingEvidence === 'staging_operational', 'CAT-001 staging evidence must remain operational.');
    assert(cat.productionGate === 'blocked', 'CAT-001 production gate cannot advance before final closure evidence.');
    assert(blockers.some((blocker) => blocker && blocker.id === 'CAT-B04'), 'CAT-B04 blocker must remain until the final CI lanes converge.');
    assert(nextActions.some((item) => /immutable service snapshots/i.test(String(item))), 'CAT-001 next actions must still mention immutable service snapshots.');
    assert(exitCriteria.some((item) => /order snapshots are immutable/i.test(String(item))), 'CAT-001 exit criteria must require immutable order snapshots.');
  }

  const laneNames = ['quality', 'blockingE2e', 'visualStructuralGuards', 'canary', 'diagnostic'];
  laneNames.forEach((lane) => {
    assert(a05.ci && a05.ci[lane] === 'pending_observable_result', `CAT-A05 lane ${lane} must remain pending until an observable final-head result exists.`);
  });

  assert(a05.safety && a05.safety.productionChanged === false, 'CAT-A05 evidence must preserve production unchanged.');
  assert(a05.safety && a05.safety.prMerged === false, 'CAT-A05 evidence cannot claim the PR was merged.');
  assert(a05.safety && a05.safety.prReadyForReview === false, 'CAT-A05 evidence cannot mark the PR ready for review.');
}

if (errors.length) {
  console.error('[CAT-A05-CLOSURE] Reconciliation candidate audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[CAT-A05-CLOSURE] All CAT-001 authority evidence is present.');
console.log('[CAT-A05-CLOSURE] CAT-A04 and CAT-B04 remain explicitly CI pending.');
console.log('[CAT-A05-CLOSURE] CAT-B04 blocker and blocked production gate are preserved.');
console.log('[CAT-A05-CLOSURE] Premature domain closure is structurally prevented.');

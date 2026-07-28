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

const manifestPath = 'docs/validation/CAT-001-A05-FINAL-TRANSITION-MANIFEST.json';
const matrixPath = 'config/domain-completion-matrix.json';
const a04Path = 'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json';
const b04Path = 'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json';
const a05Path = 'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json';

[manifestPath, matrixPath, a04Path, b04Path, a05Path].forEach((file) => {
  assert(exists(file), `Required CAT final-transition artifact missing: ${file}`);
});

if (!errors.length) {
  const manifest = readJson(manifestPath);
  const matrix = readJson(matrixPath);
  const a04 = readJson(a04Path);
  const b04 = readJson(b04Path);
  const a05 = readJson(a05Path);
  const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');

  assert(manifest.schemaVersion === '1.0.0', 'CAT final-transition manifest schema must remain 1.0.0.');
  assert(manifest.domain === 'CAT-001' && manifest.sublot === 'CAT-A05', 'Transition manifest must belong to CAT-001 / CAT-A05.');
  assert(manifest.status === 'PREPARED_CI_GATED_NOT_EXECUTED', 'Transition manifest cannot claim execution before final CI evidence exists.');
  assert(manifest.safety && manifest.safety.manifestExecutesWrites === false, 'Transition manifest must remain non-executable.');

  assert(cat, 'CAT-001 is missing from the domain completion matrix.');
  if (cat) {
    const source = manifest.sourceState || {};
    const blockerIds = (cat.blockers || []).map((blocker) => blocker && blocker.id).filter(Boolean);

    assert(matrix.version === source.matrixVersion, 'Transition manifest source matrix version is stale.');
    assert(cat.maturity === source.maturity, 'Transition manifest source maturity is stale.');
    assert(cat.userFacingAuthority === source.userFacingAuthority, 'Transition manifest source user-facing authority is stale.');
    assert(cat.serverAuthority === source.serverAuthority, 'Transition manifest source server authority is stale.');
    assert(cat.stagingEvidence === source.stagingEvidence, 'Transition manifest source staging evidence is stale.');
    assert(cat.securityGate === source.securityGate, 'Transition manifest source security gate is stale.');
    assert(cat.productionGate === source.productionGate, 'Transition manifest source production gate is stale.');
    assert(JSON.stringify(blockerIds) === JSON.stringify(source.activeBlockers), 'Transition manifest source blockers are stale.');
  }

  assert(a04.status === 'TECHNICALLY_COMPLETE_CI_PENDING', 'CAT-A04 must remain CI pending before transition execution.');
  assert(b04.status === 'CANDIDATE_VALIDATED_CI_PENDING', 'CAT-B04 must remain CI pending before transition execution.');
  assert(a05.status === 'RECONCILIATION_CANDIDATE_CI_PENDING', 'CAT-A05 must remain CI pending before transition execution.');

  const prerequisites = manifest.executionPrerequisites || {};
  const requiredLanes = prerequisites.requiredLanes || [];
  const expectedLanes = ['quality', 'blockingE2e', 'visualStructuralGuards', 'canary', 'diagnostic'];
  assert(JSON.stringify(requiredLanes) === JSON.stringify(expectedLanes), 'Final transition must require exactly the five canonical lanes in canonical order.');
  assert(prerequisites.oneStableHead === true, 'Final transition must require one stable head.');
  assert(prerequisites.allLaneHeadsMustMatch === true, 'All final lane heads must match.');
  assert(prerequisites.runIdentifiersRequired === true && prerequisites.runUrlsRequired === true, 'Final transition must require immutable run identifiers and URLs.');
  assert(prerequisites.requiredConclusion === 'success', 'Every final lane must conclude successfully.');

  const transition = manifest.permittedTransition || {};
  const matrixTransition = transition.matrix || {};
  const preserve = matrixTransition.preserve || {};
  assert(JSON.stringify(matrixTransition.removeBlockerIds || []) === JSON.stringify(['CAT-B04']), 'CAT-A05 may remove only CAT-B04 from CAT-001.');
  assert(preserve.maturity === 4, 'CAT-A05 cannot promote CAT-001 above staging-operational maturity.');
  assert(preserve.userFacingAuthority === 'remote', 'CAT-A05 must preserve remote user-facing authority.');
  assert(preserve.serverAuthority === 'canonical', 'CAT-A05 must preserve canonical server authority.');
  assert(preserve.stagingEvidence === 'staging_operational', 'CAT-A05 must preserve staging-operational evidence.');
  assert(preserve.securityGate === 'partial', 'CAT-A05 cannot rewrite the CAT security gate.');
  assert(preserve.productionGate === 'blocked', 'CAT-A05 cannot unblock production.');

  const statusTransition = transition.evidenceStatuses || {};
  assert(statusTransition['CAT-A04'] === 'COMPLETE', 'CAT-A04 final status must be COMPLETE after verified CI.');
  assert(statusTransition['CAT-B04'] === 'COMPLETE', 'CAT-B04 final status must be COMPLETE after verified CI.');
  assert(statusTransition['CAT-A05'] === 'COMPLETE', 'CAT-A05 final status must be COMPLETE after verified CI.');

  const additions = matrixTransition.requiredPathAdditions || [];
  additions.forEach((file) => assert(exists(file), `Transition manifest references a missing required path: ${file}`));

  const journal = transition.journal || {};
  assert(journal.appendOnly === true, 'Engineering journal transition must remain append-only.');
  assert(JSON.stringify(journal.entries || []) === JSON.stringify(['CAT-A04', 'CAT-B04', 'CAT-A05']), 'Journal transition must append CAT-A04, CAT-B04 and CAT-A05 only.');
  assert(journal.validatedHeadAndRunIdentifiersRequired === true, 'Journal final entries must require validated head and run identifiers.');

  const prohibited = manifest.prohibitedTransition || [];
  assert(prohibited.some((item) => /Do not raise maturity above 4/i.test(String(item))), 'Manifest must prohibit maturity promotion from CI alone.');
  assert(prohibited.some((item) => /Do not change productionGate from blocked/i.test(String(item))), 'Manifest must prohibit production unblocking.');
  assert(prohibited.some((item) => /Do not merge PR 12 or parent PR 11/i.test(String(item))), 'Manifest must prohibit merging both stacked PRs.');
}

if (errors.length) {
  console.error('[CAT-A05-TRANSITION] Final transition manifest audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[CAT-A05-TRANSITION] Final transition manifest is deterministic and current.');
console.log('[CAT-A05-TRANSITION] Five successful lanes on one head remain mandatory.');
console.log('[CAT-A05-TRANSITION] Maturity 4, partial security and blocked production are preserved.');
console.log('[CAT-A05-TRANSITION] No closure write has been executed.');

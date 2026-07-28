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

function validRun(run, expectedHead) {
  return Boolean(
    run &&
    run.status === 'success' &&
    Number.isInteger(run.runId) &&
    Number.isInteger(run.runNumber) &&
    run.head === expectedHead
  );
}

if (!errors.length) {
  const manifest = readJson(manifestPath);
  const matrix = readJson(matrixPath);
  const a04 = readJson(a04Path);
  const b04 = readJson(b04Path);
  const a05 = readJson(a05Path);
  const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');

  assert(manifest.schemaVersion === '1.0.0', 'CAT final-transition manifest schema must remain 1.0.0.');
  assert(manifest.domain === 'CAT-001' && manifest.sublot === 'CAT-A05', 'Transition manifest must belong to CAT-001 / CAT-A05.');
  assert(['PREPARED_CI_GATED_NOT_EXECUTED', 'EXECUTED_CI_VALIDATED'].includes(manifest.status), 'Transition manifest status is invalid.');
  assert(manifest.safety && manifest.safety.manifestExecutesWrites === false, 'Transition manifest must remain non-executable documentation.');

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

  assert(cat, 'CAT-001 is missing from the domain completion matrix.');
  if (cat) {
    const blockerIds = (cat.blockers || []).map((blocker) => blocker && blocker.id).filter(Boolean);
    assert(cat.maturity === preserve.maturity, 'CAT-001 maturity diverged from the permitted transition.');
    assert(cat.userFacingAuthority === preserve.userFacingAuthority, 'CAT-001 user-facing authority diverged from the permitted transition.');
    assert(cat.serverAuthority === preserve.serverAuthority, 'CAT-001 server authority diverged from the permitted transition.');
    assert(cat.stagingEvidence === preserve.stagingEvidence, 'CAT-001 staging evidence diverged from the permitted transition.');
    assert(cat.securityGate === preserve.securityGate, 'CAT-001 security gate diverged from the permitted transition.');
    assert(cat.productionGate === preserve.productionGate, 'CAT-001 production gate diverged from the permitted transition.');

    if (manifest.status === 'PREPARED_CI_GATED_NOT_EXECUTED') {
      const source = manifest.sourceState || {};
      assert(matrix.version === source.matrixVersion, 'Prepared transition source matrix version is stale.');
      assert(JSON.stringify(blockerIds) === JSON.stringify(source.activeBlockers), 'Prepared transition source blockers are stale.');
      assert(a04.status === 'TECHNICALLY_COMPLETE_CI_PENDING', 'Prepared transition requires CAT-A04 pending.');
      assert(b04.status === 'CANDIDATE_VALIDATED_CI_PENDING', 'Prepared transition requires CAT-B04 pending.');
      assert(a05.status === 'RECONCILIATION_CANDIDATE_CI_PENDING', 'Prepared transition requires CAT-A05 pending.');
    }

    if (manifest.status === 'EXECUTED_CI_VALIDATED') {
      const execution = manifest.execution || {};
      const head = execution.validatedHead;
      assert(/^[0-9a-f]{40}$/i.test(String(head || '')), 'Executed transition requires a full validated head.');
      assert(blockerIds.includes('CAT-B04') === false, 'Executed transition must remove CAT-B04 only after CI validation.');
      assert(a04.status === 'COMPLETE' && b04.status === 'COMPLETE' && a05.status === 'COMPLETE', 'Executed transition requires all CAT closure evidence complete.');
      expectedLanes.forEach((lane) => assert(validRun(execution.runs && execution.runs[lane], head), `Executed transition lane ${lane} requires successful immutable run evidence.`));
      assert(a04.validatedHead === head && b04.validatedHead === head && a05.validatedHead === head, 'Executed transition evidence must share the validated head.');
    }
  }
}

if (errors.length) {
  console.error('[CAT-A05-TRANSITION] Final transition manifest audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('[CAT-A05-TRANSITION] Final transition manifest is deterministic and current.');
console.log('[CAT-A05-TRANSITION] Prepared and executed states require the same five-lane boundary.');
console.log('[CAT-A05-TRANSITION] Maturity 4, partial security and blocked production are preserved.');

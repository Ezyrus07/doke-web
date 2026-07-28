#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const validatedHead = '09e77e5236d2bc0c820d73768f0161f326adeefe';
const completedAt = '2026-07-28T09:20:00-03:00';

const runs = {
  quality: {
    status: 'success',
    runId: 30357055694,
    runNumber: 1237,
    head: validatedHead,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30357055694'
  },
  blockingE2e: {
    status: 'success',
    runId: 30357055694,
    runNumber: 1237,
    jobId: 90267805123,
    head: validatedHead,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30357055694/job/90267805123'
  },
  visualStructuralGuards: {
    status: 'success',
    runId: 30357055694,
    runNumber: 1237,
    jobId: 90267805237,
    head: validatedHead,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30357055694/job/90267805237'
  },
  canary: {
    status: 'success',
    runId: 30357055735,
    runNumber: 806,
    head: validatedHead,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30357055735'
  },
  diagnostic: {
    status: 'success',
    runId: 30357055726,
    runNumber: 901,
    head: validatedHead,
    url: 'https://github.com/Ezyrus07/doke-web/actions/runs/30357055726'
  }
};

const absolute = (file) => path.join(root, file);
const read = (file) => fs.readFileSync(absolute(file), 'utf8');
const write = (file, content) => fs.writeFileSync(absolute(file), content);
const readJson = (file) => JSON.parse(read(file));
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);
const unique = (items) => Array.from(new Set(items));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

function appendSection(file, marker, section) {
  const current = read(file);
  if (current.includes(marker)) return;
  write(file, `${current.replace(/\s*$/, '')}\n\n${section.trim()}\n`);
}

function removeCatB04References(node) {
  if (Array.isArray(node)) {
    return node
      .filter((item) => item !== 'CAT-B04' && !(item && typeof item === 'object' && item.id === 'CAT-B04'))
      .map(removeCatB04References);
  }
  if (node && typeof node === 'object') {
    Object.keys(node).forEach((key) => {
      if (key === 'blockers') node[key] = removeCatB04References(node[key]);
      else if (node[key] && typeof node[key] === 'object') removeCatB04References(node[key]);
    });
  }
  return node;
}

// Reconcile the cumulative CAT-A01 gate with the verified empty CAT blocker set.
const baselineAuditPath = 'scripts/audit-service-catalog-authority-baseline.js';
let baselineAudit = read(baselineAuditPath);
const oldBlockerGate = "same(blockerIds, ['CAT-B03', 'CAT-B04']) || same(blockerIds, ['CAT-B04']),";
const newBlockerGate = "same(blockerIds, ['CAT-B03', 'CAT-B04']) || same(blockerIds, ['CAT-B04']) || same(blockerIds, []),";
assert(baselineAudit.includes(oldBlockerGate) || baselineAudit.includes(newBlockerGate), 'CAT-A01 blocker gate marker not found.');
baselineAudit = baselineAudit.replace(oldBlockerGate, newBlockerGate);
write(baselineAuditPath, baselineAudit);

const a04Path = 'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.json';
const a04 = readJson(a04Path);
a04.status = 'COMPLETE';
a04.completedAt = completedAt;
a04.validatedHead = validatedHead;
a04.validation = {
  ...a04.validation,
  quality: 'success',
  blockingE2e: 'success',
  visualStructuralGuards: 'success',
  canary: 'success',
  diagnostic: 'success',
  runs
};
a04.remainingRisks = [
  'The dead historical helper source remains physically present in services-repository.js, but is unreachable from the business service and all remote authorities fail closed.',
  'Production remains blocked by the global security and launch gates.',
  'No destructive validation was executed with a real or persistent synthetic entity.'
];
a04.nextControlledStep = 'Keep CAT-A04 audits cumulative and proceed with SEARCH-001 without changing production.';
writeJson(a04Path, a04);

const b04Path = 'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.json';
const b04 = readJson(b04Path);
b04.status = 'COMPLETE';
b04.completedAt = completedAt;
b04.validatedHead = validatedHead;
b04.validation = {
  ...b04.validation,
  fullCi: 'success',
  runs
};
b04.remaining = [
  'Keep immutable order snapshot audits cumulative in Quality.',
  'Production remains blocked by the global security and launch gates.',
  'Proceed with SEARCH-001 as the next mandatory engineering domain.'
];
writeJson(b04Path, b04);

const a05Path = 'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.json';
const a05 = readJson(a05Path);
a05.status = 'COMPLETE';
a05.completedAt = completedAt;
a05.validatedHead = validatedHead;
a05.evidence = {
  ...a05.evidence,
  catA04: 'complete',
  catB04: 'complete'
};
a05.matrixContract = {
  ...a05.matrixContract,
  catB04BlockerMustRemain: false,
  removalCondition: 'Satisfied by Quality #1237, blocking E2E, 105 visual guards, Canary #806 and Diagnostic #901 on one stable head.'
};
a05.ci = runs;
a05.remaining = [
  'Keep all CAT-001 authority and lifecycle audits cumulative in Quality.',
  'Proceed with SEARCH-001 as the next mandatory engineering domain.',
  'Keep production blocked until the global security and launch gates are satisfied.'
];
a05.nextControlledStep = 'Proceed with SEARCH-001 while preserving CAT-001 regression gates and blocked production.';
writeJson(a05Path, a05);

const manifestPath = 'docs/validation/CAT-001-A05-FINAL-TRANSITION-MANIFEST.json';
const manifest = readJson(manifestPath);
manifest.status = 'EXECUTED_CI_VALIDATED';
manifest.executedAt = completedAt;
manifest.execution = {
  validatedHead,
  runs,
  matrixBlockerRemoved: 'CAT-B04',
  productionGatePreserved: 'blocked',
  maturityPreserved: 4,
  prStatePreserved: 'draft_open_unmerged'
};
writeJson(manifestPath, manifest);

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = readJson(matrixPath);
const cat = (matrix.domains || []).find((domain) => domain && domain.id === 'CAT-001');
assert(cat, 'CAT-001 matrix entry not found.');
matrix.version = '1.3.9';
matrix.updatedAt = completedAt;
cat.requiredPaths = unique([
  ...(cat.requiredPaths || []),
  ...(manifest.permittedTransition.matrix.requiredPathAdditions || []),
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md',
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md',
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.md'
]);
cat.tests = unique([
  ...(cat.tests || []),
  'audit:service-media-upload-authority',
  'test:service-media-upload-authority-runtime',
  'audit:service-media-cleanup-authority',
  'test:service-media-cleanup-authority-runtime',
  'audit:order-service-snapshot-authority',
  'test:order-service-snapshot-authority-runtime',
  'audit:cat-domain-closure-candidate',
  'audit:cat-final-transition-manifest'
]);
cat.evidence = unique([
  ...(cat.evidence || []),
  `CAT-A04 complete: immutable signed uploads and reference-safe cleanup validated on ${validatedHead}.`,
  `CAT-B04 complete: approved service versions and historical order snapshots are immutable on ${validatedHead}.`,
  'CAT-A05 complete: Quality #1237, blocking E2E, 105 guards, Canary #806 and Diagnostic #901 converged on one stable head.'
]);
cat.blockers = (cat.blockers || []).filter((blocker) => blocker && blocker.id !== 'CAT-B04');
cat.nextActions = manifest.permittedTransition.matrix.nextActionsAfterClosure.slice();
cat.exitCriteria = manifest.permittedTransition.matrix.exitCriteriaMustRemain.slice();
removeCatB04References(matrix.criticalFlows || []);
writeJson(matrixPath, matrix);

const runSummary = [
  `- validated head: \`${validatedHead}\`;`,
  '- Quality #1237 / run `30357055694`: success;',
  '- blocking E2E job `90267805123`: success;',
  '- 105 visual structural guards job `90267805237`: success;',
  '- Canary #806 / run `30357055735`: success;',
  '- Diagnostic #901 / run `30357055726`: success;',
  '- production unchanged; PR #12 and parent PR #11 remain draft, open and unmerged.'
].join('\n');

appendSection(
  'docs/validation/CAT-001-A04-FINAL-CLOSURE-CANDIDATE.md',
  '## Final CI closure — COMPLETE',
  `## Final CI closure — COMPLETE\n\n${runSummary}`
);
appendSection(
  'docs/validation/CAT-001-B04-ORDER-SERVICE-SNAPSHOT-AUTHORITY.md',
  '## Final CI closure — COMPLETE',
  `## Final CI closure — COMPLETE\n\n${runSummary}`
);
appendSection(
  'docs/validation/CAT-001-A05-FINAL-RECONCILIATION-CANDIDATE.md',
  '## Final reconciliation — COMPLETE',
  `## Final reconciliation — COMPLETE\n\n${runSummary}\n\nOnly \`CAT-B04\` was removed. Maturity remains 4, security remains partial and production remains blocked.`
);

const journalPath = 'docs/DOKE-ENGINEERING-JOURNAL.md';
appendSection(
  journalPath,
  '# 2026-07-28 — CAT-A04 / fechamento do ciclo de mídia',
  `# 2026-07-28 — CAT-A04 / fechamento do ciclo de mídia\n\nImmutable signed upload reservations, one-time consumption and reference-safe server cleanup were finalized.\n\n${runSummary}`
);
appendSection(
  journalPath,
  '# 2026-07-28 — CAT-B04 / snapshot imutável de serviço em pedidos',
  `# 2026-07-28 — CAT-B04 / snapshot imutável de serviço em pedidos\n\nOrder creation now freezes the approved service version, canonical professional identity and historical snapshot across remote insertion paths.\n\n${runSummary}`
);
appendSection(
  journalPath,
  '# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001',
  `# 2026-07-28 — CAT-A05 / reconciliação final do CAT-001\n\nCAT-001 was reconciled at maturity 4. Only CAT-B04 was removed; security remains partial and production remains blocked. SEARCH-001 is the next mandatory domain.\n\n${runSummary}`
);

console.log('[CAT-A05-FINALIZER] CAT-A04, CAT-B04 and CAT-A05 moved to COMPLETE.');
console.log('[CAT-A05-FINALIZER] CAT-B04 removed; maturity 4 and blocked production preserved.');
console.log('[CAT-A05-FINALIZER] Journal and machine-readable matrix updated deterministically.');

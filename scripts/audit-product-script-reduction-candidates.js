#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT = 'docs/validation/global-cycle-81-product-script-dependency-map-report.json';
const OUTPUT = 'docs/validation/global-cycle-83-product-script-reduction-candidates-report.json';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function candidateType(script) {
  if (script.removalRisk === 'page-owned-review-only') return 'page-cycle-candidate';
  if (script.removalRisk === 'medium-component-review') return 'component-presence-review';
  if (script.src.includes('/pages/home/') && !script.pages.some((page) => page === 'index.html')) return 'cross-page-ownership-review';
  if (script.role === 'domain-service' && script.categoryGroup !== 'all-target-pages') return 'service-scope-review';
  return null;
}

const dependency = readJson(INPUT);
const candidates = (dependency.scripts || [])
  .map((script) => ({ ...script, candidateType: candidateType(script) }))
  .filter((script) => script.candidateType)
  .map((script) => ({
    src: script.src,
    candidateType: script.candidateType,
    role: script.role,
    categoryGroup: script.categoryGroup,
    pageCount: script.pageCount,
    pages: script.pages,
    removalRisk: script.removalRisk,
    recommendation: script.candidateType === 'cross-page-ownership-review'
      ? 'Do not remove automatically; first verify whether the file contains shared drawer behavior that should be moved out of pages/home.'
      : 'Do not remove automatically; validate runtime usage in a page-specific cycle.'
  }))
  .sort((a, b) => a.candidateType.localeCompare(b.candidateType) || a.src.localeCompare(b.src));

const byType = candidates.reduce((acc, candidate) => {
  acc[candidate.candidateType] = (acc[candidate.candidateType] || 0) + 1;
  return acc;
}, {});

const report = {
  cycle: 83,
  name: 'product-script-reduction-candidates',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'read-only reduction candidate classification',
    sourceReport: INPUT,
    removalPerformed: false,
    automaticRemovalAllowed: false
  },
  summary: {
    candidateCount: candidates.length,
    byType,
    safeToRemoveNow: 0,
    requiresRuntimeValidation: candidates.length
  },
  candidates
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');
console.log('[cycle-83] Product script reduction candidates generated.');
console.log(`[cycle-83] Candidates: ${candidates.length}`);
console.log('[cycle-83] Safe automatic removals: 0');
console.log(`[cycle-83] Output: ${OUTPUT}`);

if (candidates.some((candidate) => !candidate.recommendation)) process.exitCode = 1;

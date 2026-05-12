#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const archiveRoot = path.join(docsDir, 'archive', 'historical');
const validationDir = path.join(docsDir, 'validation');
const logPath = path.join(docsDir, 'removals', 'global-cycle-60-docs-archive-obvious.json');

const ACTIVE_EXACT = new Set([
  'README.md',
  'DOCS-REGISTRY.md',
  'DOCS-ACTIVE-HISTORICAL-CLASSIFICATION.md',
  'GLOBAL-ORGANIZATION-PLAN.md',
  'GLOBAL-LAYOUT-CONTRACT.md',
  'GLOBAL-COMPONENTS-BASE-CONTRACT.md',
  'DATA-READY-CONTRACTS.md',
  'MOCK-DATA-BOUNDARIES.md',
  'PAGE-DATA-ORCHESTRATION-MAP.md',
  'ACTIVE-FILES.md',
  'API-CONTRACTS.md',
  'ARCHITECTURE-DECISIONS.md',
  'DATA-BACKEND-CONTRACTS.md',
  'DATA-MODEL-DRAFT.md',
  'DESIGN-SYSTEM-GUIDE.md',
  'FILES-ORGANIZATION.md',
  'FRONTEND-CHANGE-CHECKLIST.md',
  'FRONTEND-GOVERNANCE.md',
  'FRONTEND_COMPONENT_CONTRACTS.md',
  'PERFIL-DATA-READINESS-MAP.md',
  'COMMUNICATION-DATA-READINESS-MAP.md',
  'GLOBAL-CYCLE-60-DOCS-ARCHIVE-OBVIOUS.md'
]);

const OBVIOUS_HISTORICAL_PATTERNS = [
  /^GLOBAL-CYCLE-\d+-.+\.md$/i,
  /PROMPT-?\d*\.md$/i,
  /STAGE\d*\.md$/i,
  /FIX\.md$/i,
  /HOTFIX\.md$/i,
  /FINAL\.md$/i,
  /REFINEMENT\.md$/i,
  /PARITY\.md$/i,
  /NORMALIZATION\.md$/i,
  /REDESIGN\.md$/i,
  /REBUILD\.md$/i,
  /REMOVAL\.md$/i,
  /MIGRATION\.md$/i,
  /COMPLETE\.md$/i,
  /COMPLETION\.md$/i,
  /SUMMARY\.md$/i,
  /^css-cleanup-report/i
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const rel = path.relative(docsDir, full).replace(/\\/g, '/');
      if (rel.startsWith('archive') || rel.startsWith('validation') || rel.startsWith('removals') || rel.startsWith('reports')) return [];
      return walk(full);
    }
    return [full];
  });
}

function isObviousHistorical(file) {
  const base = path.basename(file);
  if (!/\.md$/i.test(base)) return false;
  if (ACTIVE_EXACT.has(base)) return false;
  return OBVIOUS_HISTORICAL_PATTERNS.some((pattern) => pattern.test(base));
}

const remaining = walk(docsDir).filter(isObviousHistorical).map((file) => path.relative(root, file).replace(/\\/g, '/')).sort();
const activeMissing = [];
const logExists = fs.existsSync(logPath);
const archivedCount = fs.existsSync(archiveRoot)
  ? fs.readdirSync(archiveRoot, { recursive: true }).filter((entry) => String(entry).endsWith('.md')).length
  : 0;

const errors = [];
if (remaining.length) errors.push(`${remaining.length} obvious historical doc(s) still remain in docs root.`);
if (!logExists) errors.push('Missing docs/removals/global-cycle-60-docs-archive-obvious.json log.');

fs.mkdirSync(validationDir, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  status: errors.length ? 'failed' : 'passed',
  remainingObviousHistorical: remaining,
  activeMissing,
  archivedCount,
  logExists
};
fs.writeFileSync(path.join(validationDir, 'global-cycle-60-docs-archive-obvious-report.json'), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Docs archive obvious audit passed.');

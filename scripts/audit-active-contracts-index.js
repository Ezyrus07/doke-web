#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const indexPath = path.join(docsDir, 'ACTIVE-CONTRACTS-INDEX.md');
const reportPath = path.join(docsDir, 'validation', 'global-cycle-62-active-contracts-index-report.json');

const requiredDocs = [
  'GLOBAL-ORGANIZATION-PLAN.md',
  'GLOBAL-LAYOUT-CONTRACT.md',
  'GLOBAL-COMPONENTS-BASE-CONTRACT.md',
  'DATA-READY-CONTRACTS.md',
  'MOCK-DATA-BOUNDARIES.md',
  'PAGE-DATA-ORCHESTRATION-MAP.md',
  'FRONTEND-GOVERNANCE.md',
  'FRONTEND-CHANGE-CHECKLIST.md',
  'DESIGN-SYSTEM-GUIDE.md',
  'UI-COMPONENT-CONTRACTS.md',
  'PAGE-ROUTE-MAP.md',
  'PERFORMANCE-SEO-CHECKLIST.md',
  'SECURITY-CHECKLIST.md'
];

const recommendedDocs = [
  'API-CONTRACTS.md',
  'DATA-BACKEND-CONTRACTS.md',
  'LIST-STATE-CONTRACTS.md',
  'PERFIL-DATA-READINESS-MAP.md',
  'COMMUNICATION-DATA-READINESS-MAP.md',
  'GLOBAL-PAGE-ASSET-INVENTORY.md',
  'DOCS-ACTIVE-REVIEW-DECISION-MAP.md'
];

const errors = [];
const warnings = [];

if (!fs.existsSync(indexPath)) {
  errors.push('docs/ACTIVE-CONTRACTS-INDEX.md is missing.');
}

const indexText = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';

for (const doc of requiredDocs) {
  const full = path.join(docsDir, doc);
  if (!fs.existsSync(full)) {
    errors.push(`Required active contract doc is missing: docs/${doc}`);
    continue;
  }
  if (!indexText.includes(`](${doc})`) && !indexText.includes(doc)) {
    errors.push(`Active contracts index does not reference required doc: docs/${doc}`);
  }
}

for (const doc of recommendedDocs) {
  const full = path.join(docsDir, doc);
  if (fs.existsSync(full) && !indexText.includes(`](${doc})`) && !indexText.includes(doc)) {
    warnings.push(`Recommended doc exists but is not referenced by active contracts index: docs/${doc}`);
  }
}

const requiredSections = [
  'Source of truth',
  'Governance',
  'Architecture and layout',
  'Components and design system',
  'Data-ready and backend preparation',
  'Page and route contracts',
  'Quality gates',
  'Rules for future work'
];

for (const section of requiredSections) {
  if (!indexText.includes(section)) {
    errors.push(`Active contracts index is missing section: ${section}`);
  }
}

const bannedAsActive = [/STAGE\d+/i, /HOTFIX/i, /\bFIX\b/i, /FINAL/i, /PROMPT/i, /REBUILD/i, /REDESIGN/i];
const activeTableLines = indexText.split(/\r?\n/).filter((line) => line.trim().startsWith('|') && line.includes('.md'));
for (const line of activeTableLines) {
  for (const pattern of bannedAsActive) {
    if (pattern.test(line)) {
      warnings.push(`Potential historical document referenced in active table: ${line.trim()}`);
      break;
    }
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
const report = {
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  requiredDocs,
  recommendedDocsPresent: recommendedDocs.filter((doc) => fs.existsSync(path.join(docsDir, doc))),
  errors,
  warnings
};
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

if (errors.length) {
  console.error('Active contracts index audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (warnings.length) {
  console.warn('Active contracts index audit passed with warnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
} else {
  console.log('Active contracts index audit passed.');
}

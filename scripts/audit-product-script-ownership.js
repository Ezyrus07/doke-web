#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT = 'docs/validation/global-cycle-81-product-script-dependency-map-report.json';
const OUTPUT = 'docs/validation/global-cycle-82-product-script-ownership-report.json';

const OWNER_BY_ROLE = {
  'core-runtime': 'core/js-foundation',
  'controller-stack': 'controllers/data-boundary',
  'domain-service': 'services/domain-data',
  'state-contract': 'state/data-readiness',
  'ui-runtime': 'ui/mobile-runtime',
  'shared-component': 'components/shared-js',
  'page-behavior': 'pages/local-behavior',
  unknown: 'manual-review'
};

const REQUIRED_ROLE_RULES = {
  'core-runtime': 'Never remove from a page without validating global Doke namespace/runtime boot.',
  'controller-stack': 'Keep ordered after domain services and before controller-bootstrap.',
  'domain-service': 'Remove only after confirming no controller/page reads the resource.',
  'state-contract': 'Keep before page controllers; removal requires backend-state regression review.',
  'ui-runtime': 'Remove only with mobile/desktop interaction regression pass.',
  'shared-component': 'Remove only if the matching component/pattern is absent from the page.',
  'page-behavior': 'Owned by page; consolidate or remove only in a page-specific cycle.',
  unknown: 'Classify manually before touching.'
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

const dependency = readJson(INPUT);
const scripts = (dependency.scripts || []).map((script) => ({
  src: script.src,
  owner: OWNER_BY_ROLE[script.role] || OWNER_BY_ROLE.unknown,
  role: script.role,
  categoryGroup: script.categoryGroup,
  pageCount: script.pageCount,
  pages: script.pages,
  removalRisk: script.removalRisk,
  rule: REQUIRED_ROLE_RULES[script.role] || REQUIRED_ROLE_RULES.unknown
}));

const missingOwner = scripts.filter((script) => !script.owner || script.owner === 'manual-review' && script.role !== 'unknown');
const unknown = scripts.filter((script) => script.role === 'unknown');
const owners = scripts.reduce((acc, script) => {
  acc[script.owner] = (acc[script.owner] || 0) + 1;
  return acc;
}, {});

const report = {
  cycle: 82,
  name: 'product-script-ownership',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'read-only ownership classification',
    sourceReport: INPUT,
    removalPerformed: false
  },
  summary: {
    scriptCount: scripts.length,
    ownerCount: Object.keys(owners).length,
    owners,
    unknownRoleCount: unknown.length,
    missingOwnerCount: missingOwner.length
  },
  scripts,
  rules: REQUIRED_ROLE_RULES
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');
console.log('[cycle-82] Product script ownership audit generated.');
console.log(`[cycle-82] Owners: ${Object.keys(owners).length}`);
console.log(`[cycle-82] Unknown roles: ${unknown.length}`);
console.log(`[cycle-82] Output: ${OUTPUT}`);

if (missingOwner.length > 0 || unknown.length > 0) process.exitCode = 1;

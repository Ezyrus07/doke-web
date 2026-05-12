#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-145-global-final-readiness-report.json');

const checks = [
  { name: 'global-contract-integrity', command: 'npm run audit:global-contract-integrity' },
  { name: 'command-registry', command: 'npm run audit:command-registry' },
  { name: 'essential-asset-imports', command: 'npm run audit:essential-asset-imports' },
  { name: 'global-phase-handoff', command: 'npm run audit:global-phase-handoff' },
  { name: 'global-css-design-system', command: 'npm run audit:global-css-design-system' },
  { name: 'global-state-completion', command: 'npm run audit:global-state-completion' }
];

const results = [];
for (const check of checks) {
  try {
    const output = execSync(check.command, { cwd: ROOT, stdio: 'pipe' }).toString();
    const status = output.includes('passed-with-follow-up') ? 'passed-with-follow-up' : 'passed';
    results.push({ ...check, status });
  } catch (error) {
    results.push({ ...check, status: 'failed', output: `${error.stdout || ''}${error.stderr || ''}`.trim() });
  }
}

const failed = results.filter((result) => result.status === 'failed');
const report = {
  cycle: 145,
  name: 'global final readiness',
  generatedAt: new Date().toISOString(),
  checkCount: checks.length,
  passedCount: results.length - failed.length,
  failedCount: failed.length,
  results,
  status: failed.length ? 'failed' : 'passed-with-known-debt',
  knownDebt: [
    'CSS !important volume remains high and must be reduced only with visual baseline.',
    'CSS import volume remains high and should be consolidated by page/component during desktop work.',
    'Desktop visual reform is not started.',
    'Responsive work is intentionally not started until desktop HTML/CSS is approved.',
    'Some action states need visual refinement during page-level desktop reform.'
  ],
  nextPhaseAllowed: failed.length === 0 ? 'desktop-phase-can-start-with-guardrails' : 'fix-failing-global-checks-first'
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
if (failed.length) {
  console.error('[global-final-readiness] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[global-final-readiness] passed-with-known-debt');

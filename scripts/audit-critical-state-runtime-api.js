const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'assets/js/state/state-contracts.js');
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-131-135-critical-state-runtime-api-report.json');
const content = fs.readFileSync(FILE, 'utf8');
const required = [
  'Doke.stateContracts',
  'setBoundaryState',
  'setActionState',
  'initializeBoundaries',
  'data-state-boundary',
  'data-view-state',
  'aria-busy'
];
const missing = required.filter((token) => !content.includes(token));
const report = {
  cycle: '131-135',
  scope: 'critical-state-runtime-api',
  status: missing.length ? 'failed' : 'passed',
  file: 'assets/js/state/state-contracts.js',
  missing
};
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
if (missing.length) {
  console.error('[audit:critical-state-runtime-api] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[audit:critical-state-runtime-api] passed');

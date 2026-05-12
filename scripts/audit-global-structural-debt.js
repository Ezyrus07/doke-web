const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-120-structural-debt-suite-report.json');
const CHECKS = [
  'audit:css-legacy-remaining',
  'audit:css-import-map',
  'audit:important-outside-service-card',
  'audit:operational-data-readiness',
  'audit:shared-mobile-drawer-migration-plan',
  'audit:desktop-first-roadmap-guard',
  'audit:operational-data-boundary',
  'audit:operational-script-loading',
  'audit:important-reduction-plan',
  'audit:css-import-layer-map',
  'audit:shared-mobile-drawer-migration',
];

const results = CHECKS.map((script) => {
  const run = spawnSync('npm', ['run', script, '--silent'], { cwd: ROOT, encoding: 'utf8' });
  return {
    script,
    status: run.status === 0 ? 'passed' : 'failed',
    exitCode: run.status,
    stdout: (run.stdout || '').trim().slice(-1500),
    stderr: (run.stderr || '').trim().slice(-1500),
  };
});
const failed = results.filter((result) => result.status !== 'passed');
const report = {
  cycle: 120,
  name: 'global structural debt suite',
  status: failed.length ? 'failed' : 'passed',
  summary: {
    checkCount: results.length,
    passedCount: results.length - failed.length,
    failedCount: failed.length,
  },
  checks: results,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (failed.length) {
  console.error(`[global-cycle-120] structural debt suite: failed (${failed.length}/${results.length})`);
  process.exitCode = 1;
} else {
  console.log(`[global-cycle-120] structural debt suite: passed (${results.length} checks)`);
}

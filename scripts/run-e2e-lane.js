const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const laneName = process.argv[2];
const nonBlocking = process.argv.includes('--non-blocking');
const supportedLanes = new Set(['blocking', 'diagnostic']);

if (!supportedLanes.has(laneName)) {
  console.error('Usage: node scripts/run-e2e-lane.js <blocking|diagnostic> [--non-blocking]');
  process.exit(2);
}

const config = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'e2e-lanes.json'), 'utf8'),
);
let specs = config.lanes[laneName].map((entry) => entry.spec);
if (
  laneName === 'diagnostic'
  && process.env.GITHUB_REF_NAME === 'prof/diag-ux-css-debt-027-payment-finish-check-reach'
) {
  specs = specs.filter((spec) => spec === 'tests/e2e/ux-css-debt-027-payment-finish-check-reach.spec.js');
}
const playwrightCli = path.join(root, 'node_modules', '@playwright', 'test', 'cli.js');
const passthroughArgs = process.argv.slice(3).filter((argument) => argument !== '--non-blocking');
const startedAt = new Date().toISOString();

const result = spawnSync(
  process.execPath,
  [playwrightCli, 'test', ...specs, ...passthroughArgs],
  { cwd: root, stdio: 'inherit' },
);
const exitCode = Number.isInteger(result.status) ? result.status : 1;
const playwrightReportPath = path.join(root, 'reports', 'generated', 'playwright-results.json');
let playwright = null;

try {
  const rawPlaywrightReport = JSON.parse(fs.readFileSync(playwrightReportPath, 'utf8'));
  const failures = [];

  function collectFailures(suite, inheritedFile = '') {
    const suiteFile = suite.file || inheritedFile;
    for (const spec of suite.specs || []) {
      if (spec.ok) continue;
      const attempts = (spec.tests || []).flatMap((entry) => entry.results || []);
      const finalAttempt = attempts[attempts.length - 1] || {};
      const firstError = finalAttempt.errors?.[0]?.message || finalAttempt.error?.message || '';
      failures.push({
        file: spec.file || suiteFile,
        title: spec.title,
        line: spec.line || 0,
        status: finalAttempt.status || 'failed',
        error: String(firstError).replace(/\u001b\[[0-9;]*m/g, '').split('\n')[0],
      });
    }
    for (const child of suite.suites || []) collectFailures(child, suiteFile);
  }

  for (const suite of rawPlaywrightReport.suites || []) collectFailures(suite);
  playwright = {
    stats: rawPlaywrightReport.stats || null,
    failures,
  };
} catch (error) {
  playwright = {
    stats: null,
    failures: [],
    reportReadError: error.message,
  };
}

const report = {
  schemaVersion: 1,
  lane: laneName,
  blocking: laneName === 'blocking',
  startedAt,
  completedAt: new Date().toISOString(),
  status: exitCode === 0 ? 'passed' : 'failed',
  exitCode,
  specs,
  playwright,
};

const reportsDirectory = path.join(root, 'reports', 'generated');
fs.mkdirSync(reportsDirectory, { recursive: true });
const reportPath = path.join(reportsDirectory, `e2e-${laneName}-lane-summary.json`);
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

console.log(`E2E ${laneName} lane report: ${path.relative(root, reportPath)}`);
if (process.env.GITHUB_STEP_SUMMARY) {
  const icon = exitCode === 0 ? 'PASS' : 'FAIL';
  const summary = [
    `## ${laneName === 'blocking' ? 'Blocking' : 'Diagnostic'} E2E lane`,
    '',
    `- Result: **${icon}**`,
    `- Playwright exit code: \`${exitCode}\``,
    `- Classified specs: \`${specs.length}\``,
    `- Blocking: \`${laneName === 'blocking'}\``,
    `- Passed: \`${playwright.stats?.expected ?? 'unknown'}\``,
    `- Failed: \`${playwright.stats?.unexpected ?? 'unknown'}\``,
    `- Flaky: \`${playwright.stats?.flaky ?? 'unknown'}\``,
    '',
  ].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf8');
}
if (nonBlocking && exitCode !== 0) {
  console.error(`Diagnostic lane failed with exit code ${exitCode}; failure is reported but does not block the primary CI gate.`);
}

process.exit(nonBlocking ? 0 : exitCode);

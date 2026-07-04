'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const writeReport = args.has('--write-report') || args.has('--write-reports');
const reportPath = process.env.DOKE_PRIVATE_BETA_LOCAL_EVIDENCE_REPORT_PATH || 'reports/generated/private-beta-local-evidence-package-report.json';

const commands = [
  ['npm', ['run', 'validate:beta-qa-matrix:report'], 'beta-qa-matrix'],
  ['npm', ['run', 'validate:beta-launch-frontend:runtime:report'], 'beta-launch-frontend-runtime'],
  ['npm', ['run', 'validate:backend-real:e2e-local-runtime:report'], 'backend-real-e2e-local-runtime'],
  ['npm', ['run', 'validate:domain-expansion:local-runtime:report'], 'domain-expansion-local-runtime'],
  ['npm', ['run', 'validate:product-beta:local-runtime:report'], 'product-beta-local-runtime'],
  ['npm', ['run', 'validate:beta-launch:local-runtime:report'], 'beta-launch-local-runtime']
];

const staticEvidence = [
  { name: 'accessibility-audit-report', file: 'reports/generated/accessibility-audit-report.json', builder: buildAccessibilityReport },
  { name: 'performance-budget-report', file: 'reports/generated/performance-budget-report.json', builder: buildPerformanceReport },
  { name: 'seo-readiness-report', file: 'reports/generated/seo-readiness-report.json', builder: buildSeoReport },
  { name: 'beta-visual-evidence-gap-report', file: 'reports/generated/beta-visual-evidence-gap-report.json', builder: buildVisualGapReport }
];

const report = {
  name: 'private-beta-local-evidence-package',
  generatedAt: new Date().toISOString(),
  objective: 'Generate local, non-production evidence reports that can be used before staging credentials exist, without fabricating real staging or visual-browser evidence.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  status: 'not_evaluated',
  dryRun,
  commands: commands.map(([cmd, argv, name]) => ({ name, command: `${cmd} ${argv.join(' ')}` })),
  generatedEvidence: [],
  blockers: [],
  results: [],
  failures: []
};

main();

function main() {
  assertFile('docs/LOCAL-EVIDENCE-REPORTS-RUNBOOK.md');
  assertFile('docs/BETA-QA-MATRIX-RUNBOOK.md');
  assertFile('docs/BETA-LAUNCH-FRONTEND-RUNTIME-RUNBOOK.md');

  if (dryRun) {
    pass('dry_run.local_evidence_plan_ready');
    report.status = 'private_beta_local_evidence_plan_ready';
    return finish(0);
  }

  for (const [cmd, argv, name] of commands) runCommand(cmd, argv, name);
  for (const item of staticEvidence) writeStaticEvidence(item);

  // These are intentionally not generated here because they require browser screenshots or real staging.
  report.blockers.push('playwright_visual_baseline_report_requires_browser_capture');
  report.blockers.push('responsive_contract_report_requires_viewport_validation');
  report.blockers.push('critical_flow_screenshots_report_requires_browser_capture');
  report.blockers.push('real_staging_reports_require_credentials_and_safe_staging_url');

  report.status = report.failures.length
    ? 'private_beta_local_evidence_generation_failed'
    : 'private_beta_local_evidence_ready_with_known_external_blockers';
  finish(report.failures.length ? 1 : 0);
}

function runCommand(cmd, argv, name) {
  const startedAt = Date.now();
  const result = spawnSync(cmd, argv, { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' });
  const entry = {
    name,
    command: `${cmd} ${argv.join(' ')}`,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr)
  };
  report.generatedEvidence.push(entry);
  if (result.status === 0) pass(`${name}.report.generated`);
  else report.failures.push(`${name} failed with exit code ${result.status}.`);
}

function writeStaticEvidence(item) {
  const evidence = item.builder();
  const absolute = path.join(root, item.file);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, `${JSON.stringify(evidence, null, 2)}\n`);
  report.generatedEvidence.push({ name: item.name, file: item.file, status: evidence.status });
  pass(`${item.name}.written`);
}

function buildAccessibilityReport() {
  const htmlFiles = listHtmlFiles();
  const pages = htmlFiles.map((file) => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const inputs = count(html, /<(input|select|textarea)\b/gi);
    const labels = count(html, /<label\b/gi);
    return {
      file,
      hasTitle: /<title>[^<]+<\/title>/i.test(html),
      hasLang: /<html[^>]+lang=/i.test(html),
      inputs,
      labels,
      needsManualKeyboardReview: true
    };
  });
  return {
    name: 'accessibility-audit-report',
    generatedAt: new Date().toISOString(),
    status: 'accessibility_local_static_evidence_ready_manual_browser_review_required',
    performsExternalNetworkRequest: false,
    note: 'Static HTML evidence only. It does not replace keyboard, focus, screen reader or browser accessibility testing.',
    summary: {
      totalHtmlFiles: htmlFiles.length,
      pagesWithTitle: pages.filter((page) => page.hasTitle).length,
      pagesWithLang: pages.filter((page) => page.hasLang).length
    },
    pages
  };
}

function buildPerformanceReport() {
  const assets = ['assets/css', 'assets/js']
    .flatMap((dir) => listFiles(dir, /\.(css|js)$/i))
    .map((file) => ({ file, sizeBytes: fs.statSync(path.join(root, file)).size }));
  return {
    name: 'performance-budget-report',
    generatedAt: new Date().toISOString(),
    status: 'performance_static_budget_evidence_ready_browser_metrics_required',
    performsExternalNetworkRequest: false,
    note: 'Static bundle evidence only. It does not replace Lighthouse/Core Web Vitals measurements.',
    budgets: {
      noProviderApiByDefault: true,
      browserMetricsRequiredBeforePrivateBeta: true
    },
    summary: {
      assetCount: assets.length,
      totalAssetBytes: assets.reduce((sum, asset) => sum + asset.sizeBytes, 0),
      largestAssets: assets.slice().sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 20)
    }
  };
}

function buildSeoReport() {
  const htmlFiles = listHtmlFiles();
  const pages = htmlFiles.map((file) => {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    return {
      file,
      hasTitle: /<title>[^<]+<\/title>/i.test(html),
      hasMetaDescription: /<meta[^>]+name=["']description["'][^>]*>/i.test(html),
      hasCanonical: /<link[^>]+rel=["']canonical["'][^>]*>/i.test(html),
      needsManualPublicRouteReview: true
    };
  });
  return {
    name: 'seo-readiness-report',
    generatedAt: new Date().toISOString(),
    status: 'seo_static_readiness_evidence_ready_manual_public_route_review_required',
    performsExternalNetworkRequest: false,
    note: 'Static metadata evidence only. It does not replace crawling, sitemap/canonical review or production robots checks.',
    summary: {
      totalHtmlFiles: htmlFiles.length,
      pagesWithTitle: pages.filter((page) => page.hasTitle).length,
      pagesWithMetaDescription: pages.filter((page) => page.hasMetaDescription).length,
      pagesWithCanonical: pages.filter((page) => page.hasCanonical).length
    },
    pages
  };
}

function buildVisualGapReport() {
  return {
    name: 'beta-visual-evidence-gap-report',
    generatedAt: new Date().toISOString(),
    status: 'blocked_until_browser_visual_evidence_reports',
    performsExternalNetworkRequest: false,
    changesVisualSurface: false,
    requiredReportsNotGeneratedByThisScript: [
      'reports/generated/playwright-visual-baseline-report.json',
      'reports/generated/responsive-contract-report.json',
      'reports/generated/beta-critical-flow-screenshots-report.json'
    ],
    requiredViewports: ['390x844', '608x926', '810x1080', '1024x768', '1280x800'],
    note: 'This report intentionally records the visual evidence gap; it does not claim visual approval.'
  };
}

function listHtmlFiles() { return listFiles('.', /\.html$/i).filter((file) => !file.includes('node_modules/')); }
function listFiles(dir, pattern) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const results = [];
  walk(absolute, results, pattern);
  return results.map((file) => path.relative(root, file).replace(/\\/g, '/')).sort();
}
function walk(current, results, pattern) {
  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    if (current.includes(`${path.sep}node_modules${path.sep}`) || current.includes(`${path.sep}.git${path.sep}`)) return;
    for (const entry of fs.readdirSync(current)) walk(path.join(current, entry), results, pattern);
  } else if (pattern.test(current)) results.push(current);
}
function count(text, regex) { return (text.match(regex) || []).length; }
function tail(text) { return String(text || '').trim().split('\n').slice(-20).join('\n'); }
function assertFile(file) { if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required file: ${file}`); }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function finish(exitCode) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}

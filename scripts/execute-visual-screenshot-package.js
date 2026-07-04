'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_VISUAL_SCREENSHOT_PACKAGE_REPORT_PATH || 'reports/generated/visual-screenshot-package-report.json';
const manifestPath = 'tests/visual/visual-regression.manifest.json';
const evidenceDir = process.env.DOKE_VISUAL_EVIDENCE_DIR || 'test-results/visual-evidence';

const report = {
  name: 'visual-screenshot-package',
  generatedAt: new Date().toISOString(),
  objective: 'Validate that real Playwright screenshot evidence exists for every visual manifest entry and is manually reviewed before beta entry.',
  changesVisualSurface: false,
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  dryRun,
  checkEnv,
  status: 'not_evaluated',
  requiredScreenshots: 0,
  foundScreenshots: 0,
  missingScreenshots: [],
  layoutFiles: 0,
  results: [],
  blockers: [],
  failures: []
};

main();

function main() {
  requiredFile(manifestPath);
  requiredFile('tests/visual/doke-visual-evidence.spec.js');
  const entries = loadManifestEntries();
  report.requiredScreenshots = entries.length;
  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'visual_screenshot_package_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  const files = listFiles(evidenceDir);
  const pngs = files.filter((file) => file.toLowerCase().endsWith('.png'));
  const layouts = files.filter((file) => file.toLowerCase().endsWith('.layout.json'));
  report.foundScreenshots = pngs.length;
  report.layoutFiles = layouts.length;
  for (const entry of entries) {
    const token = slug(`${entry.page || entry.url || entry.name}-${entry.viewport || `${entry.width}x${entry.height}`}`);
    const hasPng = pngs.some((file) => slug(path.basename(file)).includes(token) || slug(file).includes(token));
    if (!hasPng) report.missingScreenshots.push({ page: entry.page || entry.url || entry.name, viewport: entry.viewport || `${entry.width}x${entry.height}` });
  }
  report.missingScreenshots.length ? block(`${report.missingScreenshots.length} visual screenshot(s) missing from ${evidenceDir}.`) : pass('visual.screenshots.complete');
  layouts.length >= entries.length ? pass('visual.layout-json.complete') : block(`Expected at least ${entries.length} .layout.json files; found ${layouts.length}.`);

  if (process.env.DOKE_VISUAL_REVIEW_APPROVED !== '1') block('DOKE_VISUAL_REVIEW_APPROVED=1 is required after manual visual review.'); else pass('manual.visual.review.approved', { reviewer: process.env.DOKE_VISUAL_REVIEWER || 'unknown' });
  if (!process.env.DOKE_VISUAL_REVIEWER) block('DOKE_VISUAL_REVIEWER must identify who approved or rejected screenshots.'); else pass('manual.visual.reviewer.present');

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_screenshot_package_environment_has_blockers' : 'visual_screenshot_package_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_screenshot_package_has_blockers' : 'visual_screenshot_package_ready_for_private_beta_entry';
  finish(report.failures.length ? 1 : 0);
}

function loadManifestEntries() {
  const manifest = readJson(manifestPath);
  if (!manifest) return [];
  if (Array.isArray(manifest)) return normalizeEntries(manifest);
  if (Array.isArray(manifest.entries)) return normalizeEntries(manifest.entries);
  if (Array.isArray(manifest.pages) && Array.isArray(manifest.viewports)) {
    return manifest.pages.flatMap((page) => manifest.viewports.map((viewport) => ({ page: page.path || page.url || page.name || page, viewport: viewport.name || `${viewport.width}x${viewport.height}`, width: viewport.width, height: viewport.height })));
  }
  fail(`${manifestPath} has an unsupported shape.`);
  return [];
}
function normalizeEntries(entries) { return entries.map((entry) => typeof entry === 'string' ? { page: entry, viewport: 'unknown' } : entry); }
function listFiles(dir) { const absolute = path.join(root, dir); if (!fs.existsSync(absolute)) return []; const out = []; walk(absolute, out); return out.map((file) => path.relative(root, file)); }
function walk(dir, out) { for (const item of fs.readdirSync(dir)) { const absolute = path.join(dir, item); const stat = fs.statSync(absolute); if (stat.isDirectory()) walk(absolute, out); else out.push(absolute); } }
function slug(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function requiredFile(file) { fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_VISUAL_EVIDENCE_REVIEW_REPORT_PATH || 'reports/generated/visual-evidence-review-package-report.json';
const evidenceRoot = process.env.DOKE_VISUAL_EVIDENCE_OUTPUT_DIR || 'reports/generated/visual-evidence';
const manifestPath = 'tests/visual/visual-regression.manifest.json';

const report = {
  name: 'visual-evidence-review-package',
  generatedAt: new Date().toISOString(),
  objective: 'Package visual evidence screenshots and layout health files for human beta review without updating baseline snapshots.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  changesVisualSurface: false,
  dryRun,
  checkEnv,
  evidenceRoot,
  status: 'not_evaluated',
  results: [],
  blockers: [],
  failures: [],
  evidence: { expectedScreenshots: 0, screenshots: 0, layoutFiles: 0, missingScreenshots: [], missingLayoutFiles: [], byViewport: {} },
  review: { approved: process.env.DOKE_VISUAL_REVIEW_APPROVED === '1', reviewer: process.env.DOKE_VISUAL_REVIEWER || '' }
};

main();

function main() {
  requiredFile(manifestPath);
  requiredFile('docs/VISUAL-EVIDENCE-REVIEW-PACKAGE-RUNBOOK.md');
  const manifest = readJson(manifestPath);
  if (manifest) inspectEvidence(manifest);

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'visual_evidence_review_package_plan_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (checkEnv) {
    report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_evidence_review_package_environment_has_blockers' : 'visual_evidence_review_package_environment_ready';
    return finish(report.failures.length ? 1 : 0);
  }

  if (!report.review.approved) {
    block('DOKE_VISUAL_REVIEW_APPROVED=1 is required after manual screenshot review before GO can proceed.');
  }
  if (!report.review.reviewer) {
    block('DOKE_VISUAL_REVIEWER must identify who reviewed the visual evidence.');
  }

  report.status = report.failures.length ? 'failed' : report.blockers.length ? 'visual_evidence_review_package_has_blockers' : 'visual_evidence_review_package_ready_for_private_beta_go';
  finish(report.failures.length ? 1 : 0);
}

function inspectEvidence(manifest) {
  const viewports = Array.isArray(manifest.viewports) ? manifest.viewports : [];
  const pages = Array.isArray(manifest.pages) ? manifest.pages : [];
  report.evidence.expectedScreenshots = viewports.length * pages.length;
  for (const viewport of viewports) {
    const viewportName = safeName(viewport.name || `${viewport.width}x${viewport.height}`);
    const viewportDir = path.join(root, evidenceRoot, viewportName);
    report.evidence.byViewport[viewportName] = { expected: pages.length, screenshots: 0, layoutFiles: 0, missingScreenshots: [], missingLayoutFiles: [] };
    for (const pageEntry of pages) {
      const pageName = safeName(pageEntry.key);
      const png = path.join(viewportDir, `${pageName}.png`);
      const layout = path.join(viewportDir, `${pageName}.layout.json`);
      if (fs.existsSync(png)) {
        report.evidence.screenshots += 1;
        report.evidence.byViewport[viewportName].screenshots += 1;
      } else {
        const missing = path.relative(root, png);
        report.evidence.missingScreenshots.push(missing);
        report.evidence.byViewport[viewportName].missingScreenshots.push(missing);
      }
      if (fs.existsSync(layout)) {
        report.evidence.layoutFiles += 1;
        report.evidence.byViewport[viewportName].layoutFiles += 1;
        validateLayoutFile(layout);
      } else {
        const missing = path.relative(root, layout);
        report.evidence.missingLayoutFiles.push(missing);
        report.evidence.byViewport[viewportName].missingLayoutFiles.push(missing);
      }
    }
  }
  report.evidence.screenshots === report.evidence.expectedScreenshots ? pass('visual.evidence.screenshots.complete') : block(`Visual evidence screenshots incomplete: ${report.evidence.screenshots}/${report.evidence.expectedScreenshots}.`);
  report.evidence.layoutFiles === report.evidence.expectedScreenshots ? pass('visual.evidence.layout.complete') : block(`Visual evidence layout files incomplete: ${report.evidence.layoutFiles}/${report.evidence.expectedScreenshots}.`);
}

function validateLayoutFile(file) {
  const payload = readJson(path.relative(root, file));
  if (!payload || !payload.layoutHealth) return;
  if (payload.layoutHealth.horizontalOverflow) block(`${path.relative(root, file)} has horizontal overflow.`);
  if (payload.layoutHealth.verticalOverflowLocked) block(`${path.relative(root, file)} has locked vertical overflow.`);
}
function safeName(value) { return String(value).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase(); }
function requiredFile(file) { exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function readJson(file) { const absolute = path.join(root, file); if (!fs.existsSync(absolute)) return null; try { return JSON.parse(fs.readFileSync(absolute, 'utf8')); } catch (error) { fail(`${file} is not valid JSON: ${error.message}`); return null; } }
function writeJson(file, payload) { const absolute = path.join(root, file); fs.mkdirSync(path.dirname(absolute), { recursive: true }); fs.writeFileSync(absolute, `${JSON.stringify(payload, null, 2)}\n`); }
function pass(name, details = {}) { report.results.push({ name, status: 'passed', ...details }); }
function block(message) { report.blockers.push(message); }
function fail(message) { report.failures.push(message); }
function finish(exitCode) { if (writeReport) writeJson(reportPath, report); console.log(JSON.stringify(report, null, 2)); process.exit(exitCode); }

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FILE = 'detalhe-anuncio.html';
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-102-detail-anuncio-data-boundary-report.json');
const text = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
const requiredHooks = [
  'data-detail-page-root',
  'data-detail-page="detalhe-anuncio"',
  'data-detail-layout-state="provisional-reset"',
  'data-detail-entity="service-ad"',
  'data-detail-controller-target="detalhe-anuncio-data-controller"',
  'data-detail-data-boundary',
  'data-detail-service-id',
  'data-detail-provider-id',
  'data-detail-category',
  'data-detail-price',
  'data-detail-rating',
  'data-detail-reviews-count',
  'data-detail-availability',
  'data-detail-location',
  'data-detail-media-list',
  'data-detail-actions',
];
const missingHooks = requiredHooks.filter((hook) => !text.includes(hook));
const scriptTags = [...text.matchAll(/<script\b([^>]*)>/g)].map((match) => match[0]);
const externalScripts = scriptTags.filter((tag) => /\ssrc=/.test(tag));
const blockingExternalScripts = externalScripts.filter((tag) => !/\sdefer\b/.test(tag) && !/\stype="module"/.test(tag));
const hiddenBoundaryPresent = /data-detail-data-boundary[^>]*\bhidden\b/.test(text);
const report = {
  cycle: 102,
  title: 'Detalhe anuncio data boundary',
  file: FILE,
  visualContract: 'provisional-reset-preserved',
  requiredHooks,
  missingHooks,
  externalScriptCount: externalScripts.length,
  blockingExternalScriptCount: blockingExternalScripts.length,
  blockingExternalScripts,
  hiddenBoundaryPresent,
};
report.status = missingHooks.length === 0 && blockingExternalScripts.length === 0 && hiddenBoundaryPresent ? 'passed' : 'failed';
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-102] detalhe-anuncio data boundary: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

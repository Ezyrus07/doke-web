const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FILE = 'detalhe-anuncio.html';
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-102-detail-anuncio-data-boundary-report.json');
const BOUNDARY = 'assets/js/core/preview-e2e-boundary.js';
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
function attribute(tag, name) {
  const match = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i'));
  return match ? match[1] ?? match[2] ?? match[3] : null;
}

function audit(text) {
text = text.replace(/<!--[\s\S]*?-->/g, '');
const missingHooks = requiredHooks.filter((hook) => !text.includes(hook));
const scripts = [...text.matchAll(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi)].map((match) => {
  const tag = match[0].slice(0, match[0].indexOf('>') + 1);
  const src = attribute(tag, 'src');
  const type = (attribute(tag, 'type') || '').trim().toLowerCase();
  return { tag, src, type, executable: !type || /^(?:module|(?:text|application)\/(?:javascript|ecmascript))$/.test(type) };
});
const externalScripts = scripts.filter((script) => script.src !== null);
const boundaries = externalScripts.filter((script) => script.src.split(/[?#]/)[0] === BOUNDARY);
const boundary = boundaries[0];
const boundaryUnique = boundaries.length === 1;
const boundaryFirst = boundaryUnique && externalScripts.filter((script) => script.executable)[0] === boundary;
// An earlier executable inline script could bootstrap Auth or the SDK too.
const boundaryBeforeBootstrap = boundaryFirst && scripts.find((script) => script.executable) === boundary;
const boundarySynchronous = boundaryUnique && boundary.executable && boundary.type !== 'module'
  && !/\s(?:defer|async)(?:\s|=|\/?>)/i.test(boundary.tag);
const blockingExternalScripts = externalScripts.filter((script) => script !== boundary
  && !/\sdefer(?:\s|=|\/?>)/i.test(script.tag) && script.type !== 'module').map((script) => script.tag);
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
  boundaryUnique,
  boundaryFirst,
  boundaryBeforeBootstrap,
  boundarySynchronous,
};
report.status = missingHooks.length === 0 && blockingExternalScripts.length === 0 && hiddenBoundaryPresent
  && boundaryUnique && boundaryFirst && boundaryBeforeBootstrap && boundarySynchronous ? 'passed' : 'failed';
return report;
}

module.exports = { audit };
if (require.main === module) {
const report = audit(fs.readFileSync(path.join(ROOT, FILE), 'utf8'));
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-102] detalhe-anuncio data boundary: ${report.status}`);
if (report.status !== 'passed') process.exit(1);
}

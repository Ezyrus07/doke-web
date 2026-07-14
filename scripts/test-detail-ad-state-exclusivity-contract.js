const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const html = read('detalhe-anuncio.html');
const css = read('assets/css/pages/detalhe-anuncio/page-hydration-states.css');
const controller = read('assets/js/pages/detalhe-anuncio-data-controller.js');
const foundation = read('assets/css/pages/marketplace-detail-foundation.css');

assert(html.includes('data-state-boundary="detalhe-anuncio"'), 'Detail page must expose its lifecycle boundary.');
assert(html.includes('data-detail-hydration-skeleton'), 'Detail page must expose a structural skeleton.');
assert(html.includes('data-detail-hydration-ready hidden'), 'Detail ready surface must start hidden.');
assert(controller.includes('revealReadyOnEmpty: false'), 'Detail hydration must not reveal ready content in empty state.');
assert(css.includes('[data-state-boundary="detalhe-anuncio"] [hidden]'), 'Detail CSS must preserve hidden semantics inside the lifecycle boundary.');
assert(css.includes('display: none;'), 'Detail hidden contract must explicitly remove hidden surfaces from layout.');
assert(foundation.includes('20260714-detail-state-exclusivity-v1'), 'Detail hydration CSS cache version must be updated.');
assert(html.includes('detalhe-anuncio-data-controller.js?v=20260714-detail-state-exclusivity-v1'), 'Detail controller cache version must be updated.');

console.log('Detail ad state exclusivity contract: PASS');

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const router = read('assets/js/core/stable-shell-router.js');
const orders = read('assets/js/pages/pedidos.js');
const wallet = read('assets/js/pages/carteira.js');
const results = read('assets/js/pages/search-results.js');
const detail = read('assets/js/pages/detalhe-anuncio-data-controller.js');

['/pedidos.html', '/carteira.html', '/resultados.html', '/detalhe-anuncio.html'].forEach((route) => {
  assert(router.includes(`'${route}'`), `${route}: missing internal direct hydration route`);
});
[
  ['pedidos', orders],
  ['carteira', wallet],
  ['resultados', results],
  ['detalhe-anuncio', detail]
].forEach(([page, source]) => {
  assert(source.includes('preserveReadyDuringHydration: true'), `${page}: ready surface is not preserved during internal hydration`);
  assert(source.includes("skeletonMode: 'hard-load'"), `${page}: first-document hard-load skeleton contract is missing`);
  assert(!source.includes("skeletonMode: 'route-and-document'"), `${page}: internal-route skeleton policy is still active`);
});
assert(router.includes('hasSkeleton && !shouldCommitHydrationRouteDirect(path)'), 'router: direct hydration bypass is missing');

if (failures.length) {
  console.error('[marketplace-workspace-navigation-hydration-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[marketplace-workspace-navigation-hydration-contract] OK');

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const stableRouter = read('assets/js/core/stable-shell-router.js');
const legacyShell = read('assets/js/core/app.js');

assert(/if \(hasSkeleton\)\s*\{\s*visualMode = 'skeleton';\s*\}\s*else\s*\{\s*await assetsPromise;\s*visualMode = 'direct';/s.test(stableRouter), 'rota com skeleton estrutural deve montar skeleton antes da hydration.');
assert(!/Promise\.race\(\[assetsPromise[^\]]*getRouteVisualDecisionDelay/s.test(stableRouter), 'router não deve decidir rota data-driven por corrida temporal assets vs delay.');

const releaseIndex = stableRouter.indexOf('navigating = false;', stableRouter.indexOf('runInitializers(path)'));
const settlementIndex = stableRouter.indexOf('await waitForRouteSettlement(path)', stableRouter.indexOf('runInitializers(path)'));
assert(releaseIndex !== -1 && settlementIndex !== -1 && releaseIndex < settlementIndex, 'mutex global deve ser liberado antes de aguardar settlement da página.');
assert(/var settlement = await waitForRouteSettlement\(path\);\s*if \(id !== navigationId\) return;/s.test(stableRouter), 'settlement antigo não pode concluir sobre uma navegação mais nova.');
assert(/finally\s*\{[\s\S]*if \(id === navigationId\)\s*\{[\s\S]*navigating = false;/s.test(stableRouter), 'somente a navegação corrente pode limpar o estado global no finally.');
assert(/ROUTE_TRANSIENT_BODY_CLASSES[\s\S]*'is-route-instant-swap'[\s\S]*'is-shell-swapping'/.test(stableRouter), 'stable shell deve limpar classes transitórias legadas de swap.');

assert(/const PRESERVED_BODY_STATE_CLASSES = \[\.\.\.SHELL_STATE_CLASSES\];/.test(legacyShell), 'legacy shell não deve preservar classes transitórias de troca de rota.');
assert(/const ROUTE_TRANSIENT_CLASSES = \[[\s\S]*"is-route-instant-swap"[\s\S]*"is-shell-swapping"/.test(legacyShell), 'legacy shell deve classificar as classes de swap como transitórias.');
assert(/finally\s*\{[\s\S]*body\.classList\.remove\("is-shell-swapping"\);\s*clearRouteTransientState\(\);/s.test(legacyShell), 'legacy shell deve liberar o gate de swap de forma síncrona.');

const productionPages = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html') && file !== 'comunidade-interna.html')
  .filter((file) => {
    const html = read(file);
    return html.includes('assets/js/core/stable-shell-router.js');
  });
productionPages.forEach((file) => {
  const html = read(file);
  assert(/assets\/js\/core\/app\.js\?v=20260714-route-deadlock-v1/.test(html), `${file} deve invalidar cache do app shell corrigido.`);
  assert(/assets\/js\/core\/stable-shell-router\.js\?v=20260714-route-deadlock-v1/.test(html), `${file} deve invalidar cache do stable shell corrigido.`);
});
assert(productionPages.length >= 20, 'correção de cache deve cobrir as superfícies de produção do shell.');

if (failures.length) {
  console.error('Route hydration deadlock contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Route hydration deadlock contract: PASS');

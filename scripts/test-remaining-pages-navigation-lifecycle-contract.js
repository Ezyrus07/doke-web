'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const scriptIndex = (html, src) => html.indexOf(src);

const pages = [
  {
    name: 'carteira',
    html: read('carteira.html'),
    js: read('assets/js/pages/carteira.js'),
    boundary: 'carteira',
    skeleton: 'data-wallet-hydration-skeleton',
    ready: 'data-wallet-hydration-ready',
    pageScript: 'assets/js/pages/carteira.js',
    waitFor: "waitFor: ['dom', 'auth', 'wallet']"
  },
  {
    name: 'notificacoes',
    html: read('notificacoes.html'),
    js: read('assets/js/pages/notificacoes.js'),
    boundary: 'notificacoes',
    skeleton: 'data-notifications-hydration-skeleton',
    ready: 'data-notifications-hydration-ready',
    pageScript: 'assets/js/pages/notificacoes.js',
    waitFor: "waitFor: ['dom', 'auth', 'local-notifications']"
  },
  {
    name: 'orcamento',
    html: read('orcamento.html'),
    js: read('assets/js/pages/orcamento.js'),
    boundary: 'orcamento',
    skeleton: 'data-budget-hydration-skeleton',
    ready: 'data-budget-hydration-ready',
    pageScript: 'assets/js/pages/orcamento.js',
    waitFor: "waitFor: ['dom', 'auth', 'service-context']"
  },
  {
    name: 'avaliacao-profissional',
    html: read('avaliacao-profissional.html'),
    js: read('assets/js/pages/avaliacao-profissional.js'),
    boundary: 'avaliacao-profissional',
    skeleton: 'data-review-hydration-skeleton',
    ready: 'data-review-hydration-ready',
    pageScript: 'assets/js/pages/avaliacao-profissional.js',
    waitFor: "waitFor: ['dom', 'auth', 'review-context']"
  }
];

for (const page of pages) {
  assert(new RegExp(`<[^>]*(?=[^>]*data-state-boundary=[\"']${page.boundary}[\"'])(?=[^>]*data-view-state=[\"']loading[\"'])(?=[^>]*aria-busy=[\"']true[\"'])[^>]*>`).test(page.html), `${page.name} deve iniciar em loading/busy.`);
  assert(new RegExp(`${page.skeleton}(?![^>]*\\shidden(?:\\s|=|>))`).test(page.html), `${page.name} deve exibir skeleton no primeiro frame útil.`);
  assert(new RegExp(`${page.ready}[^>]*\\shidden(?:\\s|=|>)`).test(page.html), `${page.name} deve iniciar o conteúdo real oculto.`);
  assert(scriptIndex(page.html, 'assets/js/core/session.js') < scriptIndex(page.html, 'assets/js/services/account-access-service.js'), `${page.name}: session deve preceder account-access.`);
  assert(scriptIndex(page.html, 'assets/js/services/account-access-service.js') < scriptIndex(page.html, page.pageScript), `${page.name}: account-access deve preceder o controller.`);
  assert(page.js.includes('accountAccess') && page.js.includes('.guardPage'), `${page.name} deve usar o guard autenticado compartilhado.`);
  assert(page.js.includes(page.waitFor), `${page.name} deve separar DOM, auth e contexto da página.`);
  assert(/hydration\?\.mark\(['"]auth['"]\)/.test(page.js), `${page.name} deve liberar auth somente após allow.`);
  assert(!/doke:auth-surface-ready/.test(page.js), `${page.name} não deve tratar auth-surface genérico como autorização.`);
}

const walletJs = pages[0].js;
const notificationsJs = pages[1].js;
const budgetJs = pages[2].js;
const reviewJs = pages[3].js;
const hydrationJs = read('assets/js/core/page-hydration.js');
const routerJs = read('assets/js/core/stable-shell-router.js');

assert(/window\.DokeInitWalletPage = initWalletPage/.test(walletJs), 'carteira deve exportar o initializer esperado pelo stable shell.');
assert(/if \(!walletAccessAllowed\) return;/.test(walletJs), 'carteira não deve consultar saldo antes do guard.');
assert(/return loadWalletState\(\)/.test(walletJs), 'carteira deve aguardar a hidratação financeira essencial.');
assert(/authorizeNotifications/.test(notificationsJs), 'notificações deve possuir autorização explícita.');
assert(!/window\.location\.href\s*=/.test(notificationsJs), 'notificações não deve navegar por location.href.');
assert(!/minimumLoadingTime|loadingDelay/.test(budgetJs), 'orçamento não deve impor atraso artificial.');
assert(!/window\.location\.href\s*=/.test(budgetJs), 'orçamento deve usar a fachada canônica de navegação.');
assert(/if \(!eligibility\?\.conversation\) throw new Error/.test(reviewJs), 'avaliação deve falhar fechada sem contexto válido.');

for (const route of ['/carteira.html', '/notificacoes.html', '/orcamento.html', '/avaliacao-profissional.html']) {
  assert(hydrationJs.includes(`'${route}': Object.freeze`), `${route} deve possuir contrato de skeleton no page-hydration.`);
  assert(routerJs.includes(`'${route}'`), `${route} deve participar do stable shell.`);
}
assert(/'\/carteira\.html': \['DokeInitWalletPage'\]/.test(routerJs), 'stable shell deve chamar DokeInitWalletPage na carteira.');

if (failures.length) {
  console.error('Remaining pages navigation lifecycle contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Remaining pages navigation lifecycle contract: PASS');

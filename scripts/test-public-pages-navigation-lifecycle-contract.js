'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const scriptIndex = (html, src) => html.indexOf(src);

const hydrationJs = read('assets/js/core/page-hydration.js');
const routerJs = read('assets/js/core/stable-shell-router.js');
const newsController = read('assets/js/pages/novidades.js');
const newsExperience = read('assets/js/pages/news-experience.js');
const helpController = read('assets/js/pages/ajuda.js');
const emptyStateCss = read('assets/css/components/states/empty-state-system.css');

const dynamicPages = [
  {
    name: 'resultados',
    route: '/resultados.html',
    html: read('resultados.html'),
    boundary: 'resultados',
    skeleton: 'data-results-hydration-skeleton',
    ready: 'data-results-hydration-ready'
  },
  {
    name: 'detalhe-anuncio',
    route: '/detalhe-anuncio.html',
    html: read('detalhe-anuncio.html'),
    boundary: 'detalhe-anuncio',
    skeleton: 'data-detail-hydration-skeleton',
    ready: 'data-detail-hydration-ready'
  }
];

const staticPages = [
  {
    name: 'novidades',
    route: '/novidades.html',
    html: read('novidades.html'),
    boundary: 'novidades',
    skeleton: 'data-news-hydration-skeleton',
    ready: 'data-news-hydration-ready'
  },
  {
    name: 'ajuda',
    route: '/ajuda.html',
    html: read('ajuda.html'),
    boundary: 'ajuda',
    skeleton: 'data-help-hydration-skeleton',
    ready: 'data-help-hydration-ready'
  }
];

for (const page of dynamicPages) {
  assert(
    new RegExp(`<[^>]*(?=[^>]*data-state-boundary=["']${page.boundary}["'])(?=[^>]*data-view-state=["']loading["'])(?=[^>]*aria-busy=["']true["'])[^>]*>`).test(page.html),
    `${page.name} deve manter boundary inicial loading/busy porque depende de dados.`
  );
  assert(new RegExp(`${page.skeleton}(?![^>]*\\shidden(?:\\s|=|>))`).test(page.html), `${page.name} deve manter skeleton estrutural visível.`);
  assert(new RegExp(`${page.ready}[^>]*\\shidden(?:\\s|=|>)`).test(page.html), `${page.name} deve manter conteúdo dependente de dados inicialmente oculto.`);
  assert(hydrationJs.includes(`'${page.route}': Object.freeze`), `${page.route} deve manter contrato no page-hydration.`);
}

const barrierBlock = routerJs.match(/var HYDRATION_BARRIER_ROUTES = new Set\(\[([\s\S]*?)\]\);/)?.[1] || '';
assert(Boolean(barrierBlock), 'stable-shell-router deve declarar HYDRATION_BARRIER_ROUTES.');

for (const page of dynamicPages) {
  assert(barrierBlock.includes(`'${page.route}'`), `${page.route} deve manter hydration barrier.`);
}

for (const page of staticPages) {
  assert(
    new RegExp(`<[^>]*(?=[^>]*data-state-boundary=["']${page.boundary}["'])(?=[^>]*data-view-state=["']ready["'])(?=[^>]*aria-busy=["']false["'])[^>]*>`).test(page.html),
    `${page.name} deve iniciar com conteúdo editorial pronto.`
  );
  assert(!page.html.includes(page.skeleton), `${page.name} não deve possuir skeleton de página.`);
  assert(!page.html.includes(page.ready), `${page.name} não deve esconder conteúdo real atrás de marcadores de hidratação.`);
  assert(!new RegExp(`data-state-scope=["']${page.boundary}["']`).test(page.html), `${page.name} não deve manter loading/error genérico de bootstrap.`);
  assert(!hydrationJs.includes(`'${page.route}': Object.freeze`), `${page.route} não deve pertencer ao ROUTE_SKELETON_CONTRACTS.`);
  assert(!barrierBlock.includes(`'${page.route}'`), `${page.route} não deve pertencer ao HYDRATION_BARRIER_ROUTES.`);
  assert(scriptIndex(page.html, 'assets/js/core/page-hydration.js') >= 0, `${page.name} deve carregar a autoridade de hidratação para futuras rotas dinâmicas.`);
  assert(scriptIndex(page.html, 'assets/js/core/page-hydration.js') < scriptIndex(page.html, 'assets/js/core/stable-shell-router.js'), `${page.name}: page-hydration deve preceder stable-shell-router.`);
}

assert(/window\.DokeInitNewsPage\s*=\s*initNewsPage/.test(newsController), 'novidades deve exportar DokeInitNewsPage, nome esperado pelo ROUTE_INIT.');
assert(/window\.DokeInitHelpCenter\s*=\s*initHelpCenter/.test(helpController), 'ajuda deve exportar DokeInitHelpCenter, nome esperado pelo ROUTE_INIT.');
assert(!/begin\(\)\s*\{[\s\S]*?setState\(['"]loading['"]\)/.test(newsExperience), 'news-experience.begin não deve fabricar loading para conteúdo editorial local.');
assert(/begin\(\)\s*\{[\s\S]*?setState\(['"]ready['"]/.test(newsExperience), 'news-experience.begin deve publicar ready de forma síncrona.');
assert(/'\/novidades\.html': \['DokeInitNewsPage'\]/.test(routerJs), 'stable shell deve chamar DokeInitNewsPage em novidades.');
assert(/'\/ajuda\.html': \['DokeInitHelpCenter'\]/.test(routerJs), 'stable shell deve chamar DokeInitHelpCenter em ajuda.');
assert(/\.doke-empty-state\[hidden\]\s*\{[^}]*display:\s*none/s.test(emptyStateCss), 'o componente canônico de empty state deve preservar a semântica nativa de hidden.');

if (failures.length) {
  console.error('Public pages navigation lifecycle contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public pages navigation lifecycle contract: PASS');

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-118-css-import-layer-map-report.json');
const PAGES = ['index.html','resultados.html','perfil.html','detalhe-anuncio.html','pedidos.html','carteira.html','pagamento-profissional.html','avaliacao.html','configuracoes.html','notificacoes.html','mensagens.html','comunidade.html','comunidade-interna.html'];
function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function cssHrefs(html) { return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1].split('?')[0].replace(/^\.\//, '')); }
function layer(href) {
  if (href.includes('/core/')) return 'core';
  if (href.includes('/components/')) return 'components';
  if (href.includes('/patterns/')) return 'patterns';
  if (href.includes('/pages/')) return 'pages';
  if (href.includes('/layout/')) return 'layout';
  if (href.includes('/utilities/') || href.includes('/utils/')) return 'utilities';
  if (/https?:|fonts\.googleapis|cdn/i.test(href)) return 'external';
  return 'other';
}
const expectedOrder = ['external','core','layout','components','patterns','pages','utilities','other'];
function orderWarnings(layers) {
  const warnings = [];
  let last = -1;
  layers.forEach((entry, index) => {
    const pos = expectedOrder.indexOf(entry.layer);
    if (pos !== -1 && pos < last && entry.layer !== 'external') warnings.push({ index, href: entry.href, layer: entry.layer, previousOrder: last });
    if (pos > last) last = pos;
  });
  return warnings;
}
const pages = PAGES.filter((page) => fs.existsSync(path.join(ROOT, page))).map((page) => {
  const imports = cssHrefs(read(path.join(ROOT, page))).map((href) => ({ href, layer: layer(href), exists: href.startsWith('http') || fs.existsSync(path.join(ROOT, href)) }));
  const counts = imports.reduce((acc, item) => { acc[item.layer] = (acc[item.layer] || 0) + 1; return acc; }, {});
  return { page, importCount: imports.length, counts, missing: imports.filter((item) => !item.exists), orderWarnings: orderWarnings(imports), imports };
});
const missing = pages.flatMap((page) => page.missing.map((item) => ({ page: page.page, href: item.href })));
const report = {
  cycle: 118,
  name: 'css import layer map',
  status: missing.length ? 'failed' : 'passed',
  policy: { importsChanged: false, visualChanges: false, orderingAuditOnly: true },
  summary: {
    pageCount: pages.length,
    totalImports: pages.reduce((sum, page) => sum + page.importCount, 0),
    missingCount: missing.length,
    pagesWithOrderWarnings: pages.filter((page) => page.orderWarnings.length).length,
  },
  pages: pages.map((page) => ({ page: page.page, importCount: page.importCount, counts: page.counts, missing: page.missing, orderWarnings: page.orderWarnings })),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (missing.length) { console.error(`[global-cycle-118] css import layer map: failed (${missing.length} missing)`); process.exitCode = 1; }
else console.log(`[global-cycle-118] css import layer map: passed (${pages.length} pages)`);

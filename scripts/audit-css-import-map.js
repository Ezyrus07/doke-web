const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-110-css-import-map-report.json');
const HTML_PAGES = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento-profissional.html',
  'avaliacao.html',
  'configuracoes.html',
  'notificacoes.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
];

function normalizeHref(href) {
  return href.replace(/^\.\//, '').split('?')[0].split('#')[0];
}

function extractCssImports(html) {
  const imports = [];
  const linkRegex = /<link\b[^>]*rel=["']?stylesheet["']?[^>]*>/gi;
  let match;
  while ((match = linkRegex.exec(html))) {
    const tag = match[0];
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    const rawHref = hrefMatch[1];
    if (/^https?:\/\//i.test(rawHref)) {
      imports.push({ href: rawHref, normalized: rawHref, external: true, exists: true });
      continue;
    }
    const normalized = normalizeHref(rawHref);
    imports.push({
      href: rawHref,
      normalized,
      external: false,
      exists: fs.existsSync(path.join(ROOT, normalized)),
      hasQuery: rawHref.includes('?'),
    });
  }
  return imports;
}

const pages = HTML_PAGES.map((page) => {
  const file = path.join(ROOT, page);
  const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const imports = fs.existsSync(file) ? extractCssImports(html) : [];
  const duplicateImports = [...new Set(imports.map((item) => item.normalized))]
    .map((normalized) => ({ normalized, count: imports.filter((item) => item.normalized === normalized).length }))
    .filter((item) => item.count > 1);
  const missingImports = imports.filter((item) => !item.exists);
  return {
    page,
    exists: fs.existsSync(file),
    importCount: imports.length,
    uniqueImportCount: new Set(imports.map((item) => item.normalized)).size,
    duplicateImports,
    missingImports,
    imports,
  };
});

const allImports = pages.flatMap((page) => page.imports.map((item) => item.normalized));
const uniqueImports = [...new Set(allImports)].sort();
const missingImports = pages.flatMap((page) => page.missingImports.map((item) => ({ page: page.page, ...item })));
const duplicatePages = pages.filter((page) => page.duplicateImports.length > 0);
const heavyPages = pages
  .map((page) => ({ page: page.page, importCount: page.importCount }))
  .sort((a, b) => b.importCount - a.importCount)
  .slice(0, 10);

const report = {
  cycle: 110,
  name: 'css import map',
  status: missingImports.length === 0 ? 'passed' : 'failed',
  policy: {
    removedImports: false,
    visualChanges: false,
    auditOnly: true,
  },
  summary: {
    pageCount: pages.length,
    totalCssImportReferences: allImports.length,
    uniqueCssImports: uniqueImports.length,
    pagesWithDuplicateImports: duplicatePages.length,
    missingImportCount: missingImports.length,
    heavyPages,
  },
  pages,
  missingImports,
  uniqueImports,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (missingImports.length > 0) {
  console.error(`[global-cycle-110] css import map: failed (${missingImports.length} missing imports)`);
  process.exit(1);
}
console.log(`[global-cycle-110] css import map: passed (${allImports.length} references, ${uniqueImports.length} unique)`);

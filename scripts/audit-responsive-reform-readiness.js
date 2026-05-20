#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUTPUT = 'docs/validation/global-cycle-99-responsive-reform-readiness-report.json';
const PRODUCT_PAGES = [
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
  'comunidade-interna.html'
];

function extractAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function unique(values) {
  return [...new Set(values)];
}

const pages = PRODUCT_PAGES.map((page) => {
  const htmlPath = path.join(ROOT, page);
  const exists = fs.existsSync(htmlPath);
  if (!exists) return { page, exists, status: 'failed', issues: ['missing-page'] };
  const html = fs.readFileSync(htmlPath, 'utf8');
  const bodyMatch = html.match(/<body\b([^>]*)>/i);
  const bodyClass = bodyMatch ? extractAttr(bodyMatch[0], 'class') : '';
  const cssImports = unique([...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1].split('?')[0]));
  const scriptImports = unique([...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map((m) => m[1].split('?')[0]));
  const dataHooks = unique([...html.matchAll(/\b(data-[a-z0-9-]+)(?=[=\s>])/gi)].map((m) => m[1]));
  const inlineStyleCount = (html.match(/\sstyle=["']/gi) || []).length;
  const inlineHandlerCount = (html.match(/\son[a-z]+=["']/gi) || []).length;
  const viewportPresent = /<meta\b[^>]*name=["']viewport["']/i.test(html);
  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const imagesWithoutAlt = images.filter((tag) => !/\balt=["']/i.test(tag)).length;
  const provisional = ['carteira.html','detalhe-anuncio.html','resultados.html','pagamento-profissional.html','avaliacao.html','configuracoes.html','comunidade-interna.html'].includes(page);
  const issues = [];
  if (!viewportPresent) issues.push('missing-viewport');
  if (!bodyClass.trim()) issues.push('missing-body-class');
  if (inlineStyleCount > 0) issues.push('inline-style-present');
  if (inlineHandlerCount > 0) issues.push('inline-handler-present');
  if (imagesWithoutAlt > 0) issues.push('image-alt-gap');
  if (dataHooks.length < 5) issues.push('weak-data-hook-surface');
  return {
    page,
    exists,
    status: issues.length === 0 ? 'ready-for-responsive-review' : 'needs-prep-before-responsive-review',
    visualStatus: provisional ? 'provisional-visual-not-final-contract' : 'baseline-sensitive',
    bodyClass,
    cssImportCount: cssImports.length,
    scriptImportCount: scriptImports.length,
    dataHookCount: dataHooks.length,
    viewportPresent,
    inlineStyleCount,
    inlineHandlerCount,
    imageCount: images.length,
    imagesWithoutAlt,
    issues
  };
});

const groups = {
  marketplaceCritical: ['index.html','resultados.html','perfil.html','detalhe-anuncio.html'],
  operationalTransactional: ['pedidos.html','carteira.html','pagamento-profissional.html','avaliacao.html','configuracoes.html','notificacoes.html'],
  communicationCommunity: ['mensagens.html','comunidade.html','comunidade-interna.html']
};

const report = {
  cycle: 99,
  name: 'responsive-reform-readiness',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'read-only responsive reform inventory',
    visualChanges: false,
    cssChanges: false,
    purpose: 'Identify which product pages can enter visual/responsive reform and which need prep first.'
  },
  summary: {
    pageCount: pages.length,
    readyCount: pages.filter((p) => p.status === 'ready-for-responsive-review').length,
    needsPrepCount: pages.filter((p) => p.status !== 'ready-for-responsive-review').length,
    provisionalVisualCount: pages.filter((p) => p.visualStatus === 'provisional-visual-not-final-contract').length,
    inlineStyleTotal: pages.reduce((sum, p) => sum + (p.inlineStyleCount || 0), 0),
    inlineHandlerTotal: pages.reduce((sum, p) => sum + (p.inlineHandlerCount || 0), 0),
    imageAltGapTotal: pages.reduce((sum, p) => sum + (p.imagesWithoutAlt || 0), 0)
  },
  groups,
  pages
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(`[cycle-99] Responsive reform readiness generated for ${pages.length} pages.`);
console.log(`[cycle-99] Ready: ${report.summary.readyCount}; needs prep: ${report.summary.needsPrepCount}.`);

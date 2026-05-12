#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(validationDir, { recursive: true });

const CRITICAL_PAGES = ['index.html', 'resultados.html', 'perfil.html'];
const sensitiveCssPattern = /(stage|final|hotfix|fix|refinement|parity|normalization|redesign|reference|legacy|override|mobile|desktop)/i;

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function count(content, rx) {
  return (content.match(rx) || []).length;
}

function cssImports(file) {
  const content = read(file);
  const imports = [];
  const rx = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?\s*;/g;
  let m;
  while ((m = rx.exec(content))) {
    const raw = m[1].split('#')[0].split('?')[0];
    if (!raw.endsWith('.css')) continue;
    imports.push(path.normalize(path.join(path.dirname(file), raw)));
  }
  return imports;
}

function htmlAssets(file, type) {
  const content = read(file);
  if (type === 'css') {
    const out = [];
    const linkRx = /<link\b[^>]*>/gi;
    const hrefRx = /href=["']([^"']+)["']/i;
    const relRx = /rel=["']([^"']+)["']/i;
    let m;
    while ((m = linkRx.exec(content))) {
      const tag = m[0];
      const href = tag.match(hrefRx)?.[1];
      const relAttr = tag.match(relRx)?.[1] || '';
      if (!href || !/stylesheet/i.test(relAttr)) continue;
      const clean = href.split('#')[0].split('?')[0];
      if (!clean.endsWith('.css')) continue;
      out.push(path.normalize(path.join(path.dirname(file), clean)));
    }
    return out;
  }

  const out = [];
  const scriptRx = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = scriptRx.exec(content))) {
    const clean = m[1].split('#')[0].split('?')[0];
    if (!clean.endsWith('.js')) continue;
    out.push(path.normalize(path.join(path.dirname(file), clean)));
  }
  return out;
}

function transitiveCss(entry, seen = new Set()) {
  const normalized = path.normalize(entry);
  if (seen.has(normalized)) return seen;
  seen.add(normalized);
  for (const child of cssImports(normalized)) transitiveCss(child, seen);
  return seen;
}

function unique(list) {
  return [...new Set(list.map(item => path.normalize(item)))];
}

function pageAreas(page) {
  if (page === 'index.html') {
    return [
      'shell/sidebar/topbar',
      'hero/search area',
      'featured service cards',
      'workers rail',
      'publication cards',
      'more services grid',
      'mobile width rhythm',
    ];
  }
  if (page === 'resultados.html') {
    return [
      'shell/sidebar/topbar',
      'search/filter bar',
      'result service cards',
      'grid/list rhythm',
      'favorite actions',
      'empty/loading states',
      'mobile filters and card width',
    ];
  }
  return [
    'shell/sidebar/topbar',
    'profile hero/header',
    'owner/visitor/client state',
    'tabs/navigation',
    'services cards',
    'workers cards',
    'publication cards',
    'reviews/reputation',
    'mobile profile layout',
  ];
}

function contractSignals(htmlContent) {
  return {
    dokeShellBody: /<body[^>]*\bdoke-app-shell-page\b/.test(htmlContent),
    pageContentInner: /page__content-inner/.test(htmlContent),
    serviceCard: /service-card/.test(htmlContent),
    workerCard: /worker-card|worker-media-card/.test(htmlContent),
    publicationCard: /publication-card/.test(htmlContent),
    reviewCard: /review-card|doke-review/.test(htmlContent),
    dataHooks: /data-[a-z0-9-]+=|data-[a-z0-9-]+\b/i.test(htmlContent),
  };
}

const pages = CRITICAL_PAGES.map(page => {
  const file = path.join(root, page);
  const html = read(file);
  const directCss = htmlAssets(file, 'css');
  const directJs = htmlAssets(file, 'js');
  const loadedCss = new Set();
  directCss.forEach(css => transitiveCss(css, loadedCss));
  const loadedCssList = [...loadedCss].sort();
  const missingCss = loadedCssList.filter(css => !fs.existsSync(css)).map(rel);
  const missingJs = directJs.filter(js => !fs.existsSync(js)).map(rel);
  const cssStats = loadedCssList.map(css => {
    const content = read(css);
    return {
      file: rel(css),
      important: count(content, /!important/g),
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      sensitive: sensitiveCssPattern.test(rel(css)),
    };
  });

  const sensitiveCss = cssStats.filter(item => item.sensitive || item.important > 200)
    .sort((a, b) => b.important - a.important || b.sizeBytes - a.sizeBytes)
    .slice(0, 24);

  return {
    page,
    directCss: directCss.map(rel),
    directJs: directJs.map(rel),
    loadedCssCount: loadedCssList.length,
    jsCount: directJs.length,
    missingCss,
    missingJs,
    totalImportant: cssStats.reduce((sum, item) => sum + item.important, 0),
    sensitiveCssCount: cssStats.filter(item => item.sensitive || item.important > 200).length,
    topSensitiveCss: sensitiveCss,
    contracts: contractSignals(html),
    protectedAreas: pageAreas(page),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  purpose: 'Mapear baseline técnico de index/resultados/perfil antes de remover CSS sensível.',
  summary: {
    pages: pages.length,
    totalLoadedCss: pages.reduce((sum, item) => sum + item.loadedCssCount, 0),
    totalJs: pages.reduce((sum, item) => sum + item.jsCount, 0),
    totalImportant: pages.reduce((sum, item) => sum + item.totalImportant, 0),
    missingCss: pages.reduce((sum, item) => sum + item.missingCss.length, 0),
    missingJs: pages.reduce((sum, item) => sum + item.missingJs.length, 0),
  },
  pages,
  decision: [
    'Não remover CSS sensível destas páginas sem checklist visual antes/depois.',
    'Não alterar shell/sidebar/header/body para corrigir problema local.',
    'Páginas em evolução devem receber data-hooks e estrutura flexível, não visual definitivo travado.',
  ],
};

const reportPath = path.join(validationDir, 'global-cycle-52-critical-page-baseline-report.json');
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

function table(page) {
  return `| Métrica | Valor |\n|---|---:|\n| CSS carregados direta/indiretamente | ${page.loadedCssCount} |\n| JS diretos | ${page.jsCount} |\n| !important carregados | ${page.totalImportant} |\n| CSS sensíveis | ${page.sensitiveCssCount} |\n| CSS ausentes | ${page.missingCss.length} |\n| JS ausentes | ${page.missingJs.length} |`;
}

const md = `# Ciclo Global 52 — Baseline técnico das páginas críticas\n\nEste ciclo protege as páginas mais importantes antes de qualquer remoção real de CSS sensível. Não altera visual.\n\n## Resumo\n\n- Páginas auditadas: **${report.summary.pages}**\n- CSS carregados somados: **${report.summary.totalLoadedCss}**\n- JS carregados somados: **${report.summary.totalJs}**\n- \`!important\` carregados somados: **${report.summary.totalImportant}**\n- CSS ausentes: **${report.summary.missingCss}**\n- JS ausentes: **${report.summary.missingJs}**\n\n${pages.map(page => `## ${page.page}\n\n${table(page)}\n\n### Áreas protegidas\n\n${page.protectedAreas.map(area => `- ${area}`).join('\n')}\n\n### CSS sensíveis principais\n\n${page.topSensitiveCss.slice(0, 12).map(css => `- \`${css.file}\` — ${css.important} !important, ${Math.round(css.sizeBytes / 1024)} KB`).join('\n') || '- Nenhum CSS sensível identificado.'}\n\n### Contratos observados\n\n${Object.entries(page.contracts).map(([key, value]) => `- ${key}: **${value ? 'sim' : 'não'}**`).join('\n')}\n`).join('\n')}\n\n## Decisão\n\n1. Não remover CSS sensível destas páginas sem checklist visual.\n2. Priorizar snapshots de \`index.html\`, \`resultados.html\` e \`perfil.html\` antes da próxima limpeza pesada.\n3. Validar desktop e mobile antes/depois em toda alteração que mexer em cards, grid, shell, topbar, filtros ou perfil.\n`;
fs.writeFileSync(path.join(docsDir, 'GLOBAL-CYCLE-52-CRITICAL-PAGE-BASELINE.md'), md);

console.log(`Critical page baseline audit complete: ${pages.length} pages.`);
console.log(`Total loaded !important: ${report.summary.totalImportant}.`);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
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
  'comunidade.html'
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function attrs(tag) {
  const out = {};
  tag.replace(/([\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, (_, key, raw) => {
    if (!raw) out[key] = true;
    else out[key] = raw.replace(/^['"]|['"]$/g, '');
  });
  return out;
}

function links(html) {
  return [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((m) => {
    const a = attrs(m[0]);
    return a.href || '';
  }).filter(Boolean);
}

function scripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].map((m) => {
    const a = attrs(m[1] || '');
    return { src: a.src || '', defer: Object.prototype.hasOwnProperty.call(a, 'defer'), module: a.type === 'module', inline: !a.src, body: m[2] || '' };
  });
}

function localAsset(href) {
  if (/^(https?:)?\/\//i.test(href) || href.startsWith('data:')) return null;
  return href.split('?')[0].replace(/^\.\//, '');
}

const pageReports = pages.map((page) => {
  const html = read(page);
  const css = links(html);
  const js = scripts(html);
  const localCss = css.map(localAsset).filter(Boolean);
  const localJs = js.map((item) => localAsset(item.src)).filter(Boolean);
  const missingCss = localCss.filter((file) => !exists(file));
  const missingJs = localJs.filter((file) => !exists(file));
  const coreIndexPosition = css.findIndex((href) => /assets\/css\/core\/index\.css/i.test(href));
  const firstPageCssPosition = css.findIndex((href) => /assets\/css\/pages\//i.test(href));
  const appJsPosition = js.findIndex((item) => /assets\/js\/core\/app\.js/i.test(item.src));
  const runtimePosition = js.findIndex((item) => /assets\/js\/core\/runtime-config\.js/i.test(item.src));
  const flagsPosition = js.findIndex((item) => /assets\/js\/core\/feature-flags\.js/i.test(item.src));
  const appBeforeRuntime = appJsPosition !== -1 && runtimePosition !== -1 && appJsPosition < runtimePosition;
  const appBeforeFlags = appJsPosition !== -1 && flagsPosition !== -1 && appJsPosition < flagsPosition;
  const mobilePendingInline = js.some((item) => item.inline && /doke-mobile-shell-pending/.test(item.body));
  const mobileShellCss = css.some((href) => /assets\/css\/components\/shell\/mobile-app-shell\.css/i.test(href));
  const mobileShellJs = js.some((item) => /assets\/js\/components\/mobile-app-shell\.js/i.test(item.src));
  return {
    page,
    stylesheetCount: css.length,
    scriptCount: js.filter((item) => item.src).length,
    missingCss,
    missingJs,
    coreIndexBeforePageCss: coreIndexPosition !== -1 && (firstPageCssPosition === -1 || coreIndexPosition < firstPageCssPosition),
    runtimeBeforeApp: !(appBeforeRuntime || appBeforeFlags),
    mobileShellPendingContract: !mobilePendingInline || Boolean(mobileShellCss && mobileShellJs),
    mobilePendingInline,
    mobileShellCss,
    mobileShellJs,
    risks: []
  };
});

pageReports.forEach((report) => {
  if (report.missingCss.length) report.risks.push('missing-css');
  if (report.missingJs.length) report.risks.push('missing-js');
  if (!report.coreIndexBeforePageCss) report.risks.push('core-css-not-before-page-css');
  if (!report.runtimeBeforeApp) report.risks.push('runtime-or-flags-after-app');
  if (!report.mobileShellPendingContract) report.risks.push('pending-shell-without-shell-runtime');
});

const appJs = read('assets/js/core/app.js');
const runtime = read('assets/js/core/runtime-config.js');
const hasInstantFlag = /instantShellNavigation\s*:\s*false/.test(runtime);
const hasBypassGuard = /isInstantShellNavigationEnabled/.test(appJs) && /if \(!isInstantShellNavigationEnabled\(\)\) return true/.test(appJs);
const report = {
  cycle: 146,
  audit: 'first-load-layout-stability',
  generatedAt: new Date().toISOString(),
  summary: {
    pageCount: pageReports.length,
    pagesWithRisks: pageReports.filter((item) => item.risks.length).length,
    missingCssCount: pageReports.reduce((sum, item) => sum + item.missingCss.length, 0),
    missingJsCount: pageReports.reduce((sum, item) => sum + item.missingJs.length, 0),
    instantShellNavigationDefaultDisabled: hasInstantFlag,
    shellSwapBypassGuardPresent: hasBypassGuard
  },
  pages: pageReports,
  decision: hasInstantFlag && hasBypassGuard && pageReports.every((item) => item.missingCss.length === 0 && item.missingJs.length === 0)
    ? 'first-load-critical-assets-and-native-navigation-guard-present'
    : 'follow-up-required'
};

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/validation/global-cycle-146-first-load-layout-stability-report.json'),
  JSON.stringify(report, null, 2)
);

if (report.summary.missingCssCount || report.summary.missingJsCount || !hasInstantFlag || !hasBypassGuard) {
  console.error(JSON.stringify(report.summary, null, 2));
  process.exit(1);
}

console.log('[audit:first-load-layout-stability] passed');

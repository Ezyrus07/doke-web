const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-104-desktop-phase-entry-gate-report.json');
const pages = [
  'index.html','resultados.html','perfil.html','detalhe-anuncio.html','pedidos.html','carteira.html','pagamento-profissional.html','avaliacao.html','configuracoes.html','notificacoes.html','mensagens.html','comunidade.html','comunidade-interna.html'
];
const provisionalPages = new Set(['carteira.html','detalhe-anuncio.html','resultados.html','pagamento-profissional.html','configuracoes.html','comunidade-interna.html','avaliacao.html']);
const pageReports = pages.filter((file) => fs.existsSync(path.join(ROOT, file))).map((file) => {
  const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const inlineStyleCount = (text.match(/\sstyle\s*=\s*"[^"]*"/g) || []).length;
  const dataHookCount = (text.match(/\sdata-[\w-]+/g) || []).length;
  const scriptCount = (text.match(/<script\b/g) || []).length;
  const cssImportCount = (text.match(/<link\b[^>]*rel="stylesheet"/g) || []).length;
  const phase = provisionalPages.has(file) ? 'desktop-visual-provisional' : 'desktop-baseline-sensitive';
  const blockers = [];
  if (inlineStyleCount) blockers.push('inline-style-present');
  if (file === 'detalhe-anuncio.html' && dataHookCount < 10) blockers.push('weak-data-hook-surface');
  return { file, phase, inlineStyleCount, dataHookCount, scriptCount, cssImportCount, blockers };
});
const blockers = pageReports.flatMap((page) => page.blockers.map((blocker) => ({ file: page.file, blocker })));
const report = {
  cycle: 104,
  title: 'Desktop phase entry gate',
  goal: 'Confirm global cycles can hand off to desktop reform without starting responsive work.',
  responsiveWorkStatus: 'not-started-by-design',
  desktopFirstPolicy: true,
  pageReports,
  summary: {
    pageCount: pageReports.length,
    provisionalDesktopPages: pageReports.filter((page) => page.phase === 'desktop-visual-provisional').length,
    baselineSensitivePages: pageReports.filter((page) => page.phase === 'desktop-baseline-sensitive').length,
    blockerCount: blockers.length,
    blockers,
  },
};
report.status = blockers.length === 0 ? 'passed' : 'failed';
fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');
console.log(`[global-cycle-104] desktop phase entry gate: ${report.status}`);
if (report.status !== 'passed') process.exit(1);

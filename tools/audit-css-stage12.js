const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOT = path.join(ROOT, 'assets/css');
const OUT_DIR = path.join(ROOT, 'docs/validation');

const normalize = value => value.replace(/\\/g, '/').replace(/^\.\//, '');
const stripQuery = value => value.split('?')[0];

function walk(dir, predicate = () => true, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const rel = normalize(path.relative(ROOT, full));
    if (rel.startsWith('archive/') || rel.includes('/__pycache__/')) continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, predicate, out);
    else if (predicate(full, rel)) out.push(full);
  }
  return out;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

const htmlFiles = [
  ...fs.readdirSync(ROOT).filter(file => file.endsWith('.html')).map(file => file),
  ...walk(path.join(ROOT, 'auth'), (full, rel) => rel.endsWith('.html')).map(full => normalize(path.relative(ROOT, full)))
].sort();

const cssFiles = walk(CSS_ROOT, (full, rel) => rel.endsWith('.css'))
  .map(full => normalize(path.relative(ROOT, full)))
  .sort();
const cssSet = new Set(cssFiles);

function extractHtmlLinks(htmlRel) {
  const html = read(htmlRel);
  const htmlDir = path.dirname(htmlRel) === '.' ? '' : path.dirname(htmlRel);
  return [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)["'][^>]*>/gi)]
    .map(match => stripQuery(match[1]))
    .map(href => normalize(path.normalize(path.join(htmlDir, href))))
    .filter(rel => rel.startsWith('assets/css/') && cssSet.has(rel));
}

function extractCssImports(cssRel) {
  const css = read(cssRel);
  const cssDir = path.dirname(cssRel);
  return [...css.matchAll(/@import\s+(?:url\()?['"]?([^'"\)]+\.css(?:\?[^'"\)]*)?)['"]?\)?\s*;/gi)]
    .map(match => stripQuery(match[1]))
    .map(href => normalize(path.normalize(path.join(cssDir, href))))
    .filter(rel => cssSet.has(rel));
}

const htmlCssMap = Object.fromEntries(htmlFiles.map(html => [html, extractHtmlLinks(html)]));
const importMap = Object.fromEntries(cssFiles.map(css => [css, extractCssImports(css)]));

const reachable = new Set();
const stack = Object.values(htmlCssMap).flat();
while (stack.length) {
  const rel = stack.pop();
  if (reachable.has(rel)) continue;
  reachable.add(rel);
  for (const dep of importMap[rel] || []) stack.push(dep);
}

const ownerRules = [
  ['core', /^assets\/css\/core\//],
  ['components', /^assets\/css\/components\//],
  ['patterns', /^assets\/css\/patterns\//],
  ['pages', /^assets\/css\/pages\//],
  ['other', /^assets\/css\//],
];

function ownerOf(file) {
  const match = ownerRules.find(([, rx]) => rx.test(file));
  return match ? match[0] : 'other';
}

const legacyNameRx = /(final|fix|rescue|pass|polish|cleanup|v\d+|legacy|old|temp|backup)/i;
const broadSelectorRx = /(^|\n)\s*(button|input|select|textarea|a|img|svg|\.btn|\.card|\.modal|\.chip|\.badge|\.icon-btn)\b[^,{]*[,{]/g;
const riskTermRx = /(modal|popover|drawer|dropdown|card|btn|button|close|input|select|textarea|filter|lightbox|topbar|sidebar|bottom-nav)/i;

const cssMeta = cssFiles.map(file => {
  const text = read(file);
  const lines = text.split(/\r?\n/);
  const sizeBytes = fs.statSync(path.join(ROOT, file)).size;
  const imports = importMap[file] || [];
  const riskMatches = lines.filter(line => riskTermRx.test(line)).length;
  const broadSelectors = [...text.matchAll(broadSelectorRx)].length;
  return {
    file,
    owner: ownerOf(file),
    reachable: reachable.has(file),
    importedBy: cssFiles.filter(other => (importMap[other] || []).includes(file)),
    linkedBy: Object.entries(htmlCssMap).filter(([, links]) => links.includes(file)).map(([html]) => html),
    imports,
    lines: lines.length,
    sizeBytes,
    legacyName: legacyNameRx.test(path.basename(file)),
    riskMatches,
    broadSelectors,
  };
});

const activeLegacyNamed = cssMeta.filter(x => x.reachable && x.legacyName);
const inactiveCandidates = cssMeta.filter(x => !x.reachable);
const highRiskActive = cssMeta
  .filter(x => x.reachable && (x.riskMatches > 60 || x.broadSelectors > 20 || x.sizeBytes > 25000))
  .sort((a, b) => (b.riskMatches + b.broadSelectors * 3) - (a.riskMatches + a.broadSelectors * 3));

const ownerSummary = cssMeta.reduce((acc, item) => {
  const key = item.owner;
  acc[key] ||= { total: 0, reachable: 0, inactive: 0, legacyNamedReachable: 0 };
  acc[key].total += 1;
  acc[key].reachable += item.reachable ? 1 : 0;
  acc[key].inactive += item.reachable ? 0 : 1;
  acc[key].legacyNamedReachable += item.reachable && item.legacyName ? 1 : 0;
  return acc;
}, {});

const stageContracts = [
  'assets/css/core/responsive-foundation.css',
  'assets/css/components/internal/topbar-standard.css',
  'assets/css/components/cards/card-grid-contract.css',
  'assets/css/patterns/home-results-card-stage4.css',
  'assets/css/pages/perfil/mobile-stage5.css',
  'assets/css/patterns/internal-pages-stage6.css',
  'assets/css/pages/comunidade/mobile-stage7.css',
  'assets/css/patterns/remaining-pages-stage8.css',
  'assets/css/components/overlays/overlay-contract-stage9.css',
  'assets/css/components/forms-actions/form-action-contract-stage10.css',
  'assets/css/core/responsive-runtime-stage11.css',
];

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    htmlFiles: htmlFiles.length,
    cssFiles: cssFiles.length,
    reachableCss: reachable.size,
    inactiveCssCandidates: inactiveCandidates.length,
    activeLegacyNamed: activeLegacyNamed.length,
    highRiskActive: highRiskActive.length,
  },
  ownerSummary,
  stageContracts: stageContracts.map(file => ({ file, exists: cssSet.has(file), reachable: reachable.has(file) })),
  htmlCssMap,
  importMap,
  inactiveCandidates: inactiveCandidates.map(x => x.file).sort(),
  activeLegacyNamed: activeLegacyNamed.map(x => x.file).sort(),
  highRiskActive: highRiskActive.slice(0, 60),
};

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'css-stage12-inventory.json'), JSON.stringify(report, null, 2));

const stageContractRows = report.stageContracts
  .map(x => `| ${x.file} | ${x.exists ? 'sim' : 'não'} | ${x.reachable ? 'sim' : 'não'} |`)
  .join('\n');

const ownerRows = Object.entries(ownerSummary)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([owner, data]) => `| ${owner} | ${data.total} | ${data.reachable} | ${data.inactive} | ${data.legacyNamedReachable} |`)
  .join('\n');

const inactiveList = inactiveCandidates
  .slice(0, 80)
  .map(x => `- ${x.file}`)
  .join('\n') || '- Nenhum candidato encontrado.';

const activeLegacyList = activeLegacyNamed
  .slice(0, 80)
  .map(x => `- ${x.file}`)
  .join('\n') || '- Nenhum arquivo ativo com nome legado encontrado.';

const highRiskList = highRiskActive
  .slice(0, 30)
  .map(x => `- ${x.file} — ${x.lines} linhas, ${x.riskMatches} linhas sensíveis, ${x.broadSelectors} seletores amplos`)
  .join('\n') || '- Nenhum arquivo ativo entrou no corte de risco.';

const markdown = `# Etapa 12 — Inventário de CSS legado e mapa de limpeza\n\n` +
`Esta etapa não muda visual, HTML ou comportamento. Ela cria uma base objetiva para limpar CSS sem apagar arquivo errado e sem repetir o problema do Stage 10.\n\n` +
`## Números atuais\n\n` +
`- HTMLs analisados: ${report.totals.htmlFiles}\n` +
`- Arquivos CSS encontrados: ${report.totals.cssFiles}\n` +
`- CSS alcançável por HTML ou @import: ${report.totals.reachableCss}\n` +
`- Candidatos inativos: ${report.totals.inactiveCssCandidates}\n` +
`- Arquivos ativos com nome de legado/fix/pass/rescue: ${report.totals.activeLegacyNamed}\n` +
`- Arquivos ativos de maior risco para auditoria manual: ${report.totals.highRiskActive}\n\n` +
`## Contratos oficiais das etapas 1–11\n\n` +
`| Arquivo | Existe | Alcançável |\n|---|---:|---:|\n${stageContractRows}\n\n` +
`## Distribuição por responsabilidade\n\n` +
`| Camada | Total | Ativos | Inativos | Ativos com nome legado |\n|---|---:|---:|---:|---:|\n${ownerRows}\n\n` +
`## Regra operacional para a próxima limpeza\n\n` +
`1. Não apagar arquivo apenas porque está inativo no inventário; primeiro confirmar se ele não é usado por testes, protótipos ou HTMLs fora da raiz.\n` +
`2. Não criar novos arquivos com nomes como final, fix, rescue, pass, polish ou cleanup.\n` +
`3. Qualquer ajuste visual novo deve entrar em core, components, patterns ou pages conforme responsabilidade.\n` +
`4. Contrato global só pode afetar desktop quando houver escopo explícito; ajustes de mobile precisam ficar em media query mobile.\n` +
`5. Arquivos de página não devem redefinir botão, input, modal, card ou topbar global.\n\n` +
`## Candidatos inativos — não apagar ainda\n\n${inactiveList}\n\n` +
`## Arquivos ativos com nome legado\n\n${activeLegacyList}\n\n` +
`## Arquivos ativos de maior risco para auditoria manual\n\n${highRiskList}\n\n` +
`## Próximo passo seguro\n\n` +
`A Etapa 13 deve validar visualmente os breakpoints principais e só depois arquivar/remover os candidatos confirmados. A limpeza física deve ser incremental, em pequenos lotes, com rollback simples.\n`;

fs.writeFileSync(path.join(OUT_DIR, 'css-stage12-inventory.md'), markdown);
console.log(JSON.stringify(report.totals, null, 2));

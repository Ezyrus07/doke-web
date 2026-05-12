#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssRoot = path.join(root, 'assets', 'css');
const docsDir = path.join(root, 'docs');
const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(docsDir, { recursive: true });
fs.mkdirSync(validationDir, { recursive: true });

const suspectPattern = /(stage|final|hotfix|fix|refinement|parity|normalization|redesign|reference|legacy|override)/i;
const extension = '.css';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function countImportant(content) {
  return (content.match(/!important/g) || []).length;
}

function cssImports(file) {
  const content = read(file);
  const imports = [];
  const rx = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?\s*;/g;
  let m;
  while ((m = rx.exec(content))) {
    const raw = m[1].split('#')[0].split('?')[0];
    if (!raw.endsWith('.css')) continue;
    const resolved = path.normalize(path.join(path.dirname(file), raw));
    imports.push(resolved);
  }
  return imports;
}

function htmlLinks(file) {
  const content = read(file);
  const links = [];
  const linkRx = /<link\b[^>]*>/gi;
  const hrefRx = /href=["']([^"']+)["']/i;
  const relRx = /rel=["']([^"']+)["']/i;
  let m;
  while ((m = linkRx.exec(content))) {
    const tag = m[0];
    const href = tag.match(hrefRx)?.[1];
    const relAttr = tag.match(relRx)?.[1] || '';
    if (!href || !/stylesheet/i.test(relAttr) || !href.endsWith('.css')) continue;
    const normalized = href.split('#')[0].split('?')[0];
    const resolved = path.normalize(path.join(path.dirname(file), normalized));
    links.push(resolved);
  }
  return links;
}

function transitiveCss(entry, seen = new Set()) {
  const normalized = path.normalize(entry);
  if (seen.has(normalized)) return seen;
  seen.add(normalized);
  for (const child of cssImports(normalized)) {
    transitiveCss(child, seen);
  }
  return seen;
}

const cssFiles = walk(cssRoot).filter(f => f.endsWith(extension));
const htmlFiles = walk(root).filter(f => f.endsWith('.html') && !rel(f).startsWith('archive/'));

const cssToPages = new Map();
for (const html of htmlFiles) {
  const links = htmlLinks(html);
  const loaded = new Set();
  for (const link of links) {
    for (const css of transitiveCss(link)) loaded.add(path.normalize(css));
  }
  for (const css of loaded) {
    if (!cssToPages.has(css)) cssToPages.set(css, new Set());
    cssToPages.get(css).add(rel(html));
  }
}

function pageDomain(pages) {
  const list = [...pages];
  const text = list.join(' ');
  if (/perfil\.html/.test(text)) return 'perfil';
  if (/index\.html/.test(text)) return 'home';
  if (/mensagens\.html/.test(text)) return 'mensagens';
  if (/comunidade-interna\.html/.test(text)) return 'comunidade-interna';
  if (/comunidade\.html/.test(text)) return 'comunidade';
  if (/resultados\.html/.test(text)) return 'resultados';
  if (/pedidos\.html/.test(text)) return 'pedidos';
  if (/notificacoes\.html/.test(text)) return 'notificacoes';
  return 'misto/baixo-uso';
}

function riskFor(fileRel, importantCount, pages) {
  const p = [...pages].join(' ');
  const name = path.basename(fileRel);
  if (/perfil-reference|perfil-mobile-reference|desktop-redesign|channel-message-parity|index-final-refinement|final-room-layout|compact-final-adjustments/i.test(fileRel)) return 'bloquear até baseline visual';
  if (importantCount > 250) return 'bloquear até baseline visual';
  if (/legacy|final|stage|hotfix|normalization|parity|redesign|refinement|reference/i.test(name) && pages.size > 0) return 'migrar antes de remover';
  if (pages.size === 0 && importantCount === 0) return 'candidato a remoção após verificação de referência';
  if (pages.size === 0) return 'arquivar/remover só após busca global';
  return 'revisar antes de alterar';
}

function baselineRequirement(fileRel, domain, risk) {
  if (risk.includes('remover') || risk.includes('arquivar')) return 'validar que não há import direto/transitivo nem referência textual antes de remover';
  const map = {
    'home': 'screenshots desktop/mobile do index: hero, anúncios, workers, publicações, mais anúncios',
    'perfil': 'screenshots desktop/mobile de owner, visitor e client; hero, tabs, serviços, workers, publicações e avaliações',
    'mensagens': 'screenshots desktop/mobile da lista, chat ativo, estados vazios e composição de mensagem',
    'comunidade-interna': 'screenshots desktop/mobile do workspace interno, sidebar, canais, thread e composer',
    'comunidade': 'screenshots desktop/mobile da descoberta, cards, ranking e modal de entrada/código',
    'resultados': 'screenshots desktop/mobile de busca, filtros, lista/grid, card de serviço e estados de resultado',
    'pedidos': 'screenshots desktop/mobile de resumo, lista, agenda e cards de pedido',
    'notificacoes': 'screenshots desktop/mobile da lista, filtros e agrupamentos de notificações',
  };
  return map[domain] || 'baseline visual da página consumidora antes/depois';
}

const suspects = cssFiles
  .filter(f => suspectPattern.test(rel(f)))
  .map(f => {
    const content = read(f);
    const fileRel = rel(f);
    const pages = cssToPages.get(path.normalize(f)) || new Set();
    const importantCount = countImportant(content);
    const domain = pageDomain(pages);
    const risk = riskFor(fileRel, importantCount, pages);
    return {
      file: fileRel,
      sizeBytes: Buffer.byteLength(content, 'utf8'),
      importantCount,
      importedByPages: [...pages].sort(),
      pageCount: pages.size,
      domain,
      risk,
      baseline: baselineRequirement(fileRel, domain, risk),
    };
  })
  .sort((a, b) => {
    const order = { 'bloquear até baseline visual': 0, 'migrar antes de remover': 1, 'revisar antes de alterar': 2, 'arquivar/remover só após busca global': 3, 'candidato a remoção após verificação de referência': 4 };
    return (order[a.risk] ?? 99) - (order[b.risk] ?? 99) || b.importantCount - a.importantCount || a.file.localeCompare(b.file);
  });

const byRisk = suspects.reduce((acc, item) => {
  acc[item.risk] = (acc[item.risk] || 0) + 1;
  return acc;
}, {});

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    cssFiles: cssFiles.length,
    htmlFiles: htmlFiles.length,
    suspectCss: suspects.length,
    totalImportantInSuspects: suspects.reduce((sum, item) => sum + item.importantCount, 0),
    byRisk,
  },
  suspects,
  nextActions: [
    'Não remover arquivos marcados como bloquear até baseline visual sem screenshots antes/depois.',
    'Migrar arquivos marcados como migrar antes de remover para components/patterns/pages corretos antes da exclusão.',
    'Remover primeiro apenas candidatos sem imports ativos e sem !important, usando script de cleanup auditável.',
    'Para páginas em evolução, preparar estrutura/data-hooks, mas não transformar visual provisório em contrato global.',
  ],
};

fs.writeFileSync(path.join(validationDir, 'global-cycle-51-legacy-baseline-report.json'), JSON.stringify(report, null, 2));

function tableRows(items) {
  return items.map(item => `| \`${item.file}\` | ${item.importantCount} | ${item.pageCount} | ${item.domain} | ${item.risk} | ${item.baseline} |`).join('\n');
}

const md = `# Ciclo Global 51 — Baseline dos CSS legados restantes\n\nEste relatório mapeia os CSS com nomes de legado/remendo/camada provisória e define o que precisa de baseline visual antes de qualquer remoção ou migração.\n\n## Resumo\n\n- CSS analisados: **${report.summary.cssFiles}**\n- HTMLs analisados: **${report.summary.htmlFiles}**\n- CSS suspeitos: **${report.summary.suspectCss}**\n- \`!important\` dentro dos suspeitos: **${report.summary.totalImportantInSuspects}**\n\n## Classificação\n\n${Object.entries(byRisk).map(([risk, count]) => `- **${risk}:** ${count}`).join('\n')}\n\n## Arquivos bloqueados ou com migração necessária\n\n| Arquivo | !important | Páginas | Domínio | Decisão | Baseline necessário |\n|---|---:|---:|---|---|---|\n${tableRows(suspects.filter(item => item.risk !== 'candidato a remoção após verificação de referência'))}\n\n## Candidatos a remoção futura\n\n| Arquivo | !important | Páginas | Domínio | Decisão | Validação |\n|---|---:|---:|---|---|---|\n${tableRows(suspects.filter(item => item.risk === 'candidato a remoção após verificação de referência')) || '| — | — | — | — | — | — |'}\n\n## Próxima decisão técnica\n\n1. Não remover os bloqueados sem baseline visual real.\n2. Priorizar baseline de \`index.html\`, \`resultados.html\` e \`perfil.html\`, porque eles concentram marketplace e cards reutilizáveis.\n3. Páginas em evolução devem receber estrutura e data-hooks, mas não visual definitivo.\n4. A próxima limpeza segura deve ser feita somente em arquivos sem import ativo e sem \`!important\`.\n`;
fs.writeFileSync(path.join(docsDir, 'GLOBAL-CYCLE-51-LEGACY-BASELINE.md'), md);

console.log(`Legacy baseline audit complete: ${suspects.length} suspect CSS files.`);
console.log(`Total !important in suspects: ${report.summary.totalImportantInSuspects}.`);

#!/usr/bin/env node
/*
  CSS dormant debt policy gate.

  Purpose:
  - Separate CSS debt that is still loaded by root HTML pages from CSS debt that is dormant in the package.
  - Generate a clear quarantine report for dormant debt.
  - Prevent silent reactivation of deprecated mobile chrome CSS by direct HTML links or CSS imports.

  This script does not delete CSS and does not mutate the important debt register.
*/
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const registerPath = path.join(root, 'config/important-debt-register.json');
const deprecatedDocPath = path.join(root, 'docs/DEPRECATED-CSS.md');
const outputPath = path.join(root, 'docs/validation/css-dormant-debt-policy.md');
const strict = process.argv.includes('--strict');

const deprecatedMobileChromeAssets = [
  'assets/css/components/navigation/bottom-nav.css',
  'assets/css/components/navigation/header-mobile.css',
  'assets/css/components/navigation/mobile-bottom-nav-system.css',
  'assets/css/components/navigation/mobile-internal-header.css',
  'assets/css/components/navigation/app-mobile-header-contract.css',
  'assets/css/components/navigation/app-mobile-topbar.css',
  'assets/css/components/navigation/app-mobile-search.css',
  'assets/css/components/navigation/mobile-search-header-shared.css',
  'assets/css/components/navigation/mobile-chrome-lock.css',
  'assets/css/components/shell/mobile-page-rhythm-contract.css',
];

function normalize(file) {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

function readProjectFile(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function listRootHtmlPages() {
  return fs.readdirSync(root).filter((file) => file.endsWith('.html')).sort();
}

function listCssFiles(dir = 'assets/css') {
  const fullDir = path.join(root, dir);
  if (!fs.existsSync(fullDir)) return [];
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = normalize(path.join(dir, entry.name));
    if (entry.isDirectory()) files.push(...listCssFiles(relative));
    if (entry.isFile() && entry.name.endsWith('.css')) files.push(relative);
  }
  return files.sort();
}

function countImportant(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return 0;
  return (fs.readFileSync(fullPath, 'utf8').match(/!important/g) || []).length;
}

function collectCssImports(cssFile) {
  const fullPath = path.join(root, cssFile);
  if (!fs.existsSync(fullPath)) return [];
  const css = fs.readFileSync(fullPath, 'utf8');
  const imports = [];
  const pattern = /@import\s+(?:url\()?['"]([^'")]+)['"]\)?/g;
  let match;
  while ((match = pattern.exec(css))) {
    const raw = match[1].split('?')[0];
    if (/^https?:\/\//i.test(raw)) continue;
    const resolved = normalize(path.join(path.dirname(cssFile), raw));
    imports.push(resolved);
  }
  return imports;
}

function buildLoadedCssSet() {
  const loaded = new Set();
  const pagesByAsset = new Map();
  const queue = [];
  const pages = listRootHtmlPages();

  for (const page of pages) {
    const assets = getLoadedCssAssets(readProjectFile(page), root).map(normalize);
    for (const asset of assets) {
      loaded.add(asset);
      queue.push(asset);
      if (!pagesByAsset.has(asset)) pagesByAsset.set(asset, new Set());
      pagesByAsset.get(asset).add(page);
    }
  }

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const imported of collectCssImports(current)) {
      if (!loaded.has(imported)) {
        loaded.add(imported);
        queue.push(imported);
      }
      if (!pagesByAsset.has(imported)) pagesByAsset.set(imported, new Set());
      const parents = pagesByAsset.get(current) || new Set();
      for (const page of parents) pagesByAsset.get(imported).add(page);
    }
  }

  return { loaded, pagesByAsset };
}

if (!fs.existsSync(registerPath)) {
  console.error('Registro não encontrado: config/important-debt-register.json');
  process.exit(1);
}

const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const items = Array.isArray(register.items) ? register.items : [];
const itemByFile = new Map(items.map((item) => [normalize(item.file), item]));
const { loaded, pagesByAsset } = buildLoadedCssSet();
const deprecatedDoc = fs.existsSync(deprecatedDocPath) ? fs.readFileSync(deprecatedDocPath, 'utf8') : '';

const rows = items.map((item) => {
  const file = normalize(item.file);
  const active = loaded.has(file);
  const pages = active ? Array.from(pagesByAsset.get(file) || []).sort() : [];
  return {
    file,
    group: item.group || 'unclassified',
    risk: item.risk || 'unknown',
    currentCount: countImportant(file),
    active,
    pages,
    documentedDeprecated: deprecatedDoc.includes(file),
  };
});

const activeRows = rows.filter((row) => row.active);
const dormantRows = rows.filter((row) => !row.active);
const activeUses = activeRows.reduce((sum, row) => sum + row.currentCount, 0);
const dormantUses = dormantRows.reduce((sum, row) => sum + row.currentCount, 0);

const undocumentedHighRiskDormant = dormantRows.filter((row) => row.risk === 'high' && !row.documentedDeprecated);
const reactivatedDeprecated = deprecatedMobileChromeAssets.filter((file) => loaded.has(file));
const registeredMissingFiles = rows.filter((row) => !fs.existsSync(path.join(root, row.file)));
const unregisteredActiveImportant = Array.from(loaded)
  .filter((file) => file.endsWith('.css'))
  .map((file) => ({ file, count: countImportant(file) }))
  .filter((row) => row.count > 0 && !itemByFile.has(row.file))
  .sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));

const totalCssFiles = listCssFiles().length;
const loadedCssFiles = Array.from(loaded).filter((file) => file.endsWith('.css')).length;

const lines = [];
lines.push('# CSS dormant debt policy');
lines.push('');
lines.push(`Gerado em: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- CSS no pacote ativo de assets: ${totalCssFiles}`);
lines.push(`- CSS carregado pelo grafo dos HTMLs raiz: ${loadedCssFiles}`);
lines.push(`- Dívida ativa registrada: ${activeUses} uso(s) em ${activeRows.length} arquivo(s)`);
lines.push(`- Dívida dormente registrada: ${dormantUses} uso(s) em ${dormantRows.length} arquivo(s)`);
lines.push(`- CSS depreciado reativado: ${reactivatedDeprecated.length}`);
lines.push(`- Arquivos registrados ausentes: ${registeredMissingFiles.length}`);
lines.push(`- CSS ativo com !important fora do registro: ${unregisteredActiveImportant.length}`);
lines.push('');
lines.push('## Política aplicada');
lines.push('');
lines.push('- Dívida dormente continua no pacote, mas não pode voltar a ser carregada por HTML ou manifesto sem decisão explícita.');
lines.push('- CSS de chrome mobile depreciado permanece bloqueado como autoridade visual ativa.');
lines.push('- Arquivos dormentes de alto risco não devem ser removidos fisicamente sem validação visual e busca por referências em scripts/testes/docs.');
lines.push('- A remoção física de CSS dormente deve acontecer em lote próprio, com rollback documentado.');
lines.push('');
lines.push('## Dívida ativa registrada');
lines.push('');
lines.push('| Arquivo | Grupo | Uso(s) | Páginas |');
lines.push('|---|---|---:|---|');
for (const row of activeRows.sort((a, b) => b.currentCount - a.currentCount || a.file.localeCompare(b.file))) {
  lines.push(`| \`${row.file}\` | ${row.group} | ${row.currentCount} | ${row.pages.join(', ')} |`);
}
lines.push('');
lines.push('## Quarentena dormente registrada');
lines.push('');
lines.push('| Arquivo | Grupo | Uso(s) | Risco | Documentado em DEPRECATED-CSS |');
lines.push('|---|---|---:|---|---|');
for (const row of dormantRows.sort((a, b) => b.currentCount - a.currentCount || a.file.localeCompare(b.file))) {
  lines.push(`| \`${row.file}\` | ${row.group} | ${row.currentCount} | ${row.risk} | ${row.documentedDeprecated ? 'sim' : 'não'} |`);
}
lines.push('');
lines.push('## Violações');
lines.push('');
if (!reactivatedDeprecated.length && !registeredMissingFiles.length && !unregisteredActiveImportant.length) {
  lines.push('Nenhuma violação encontrada.');
} else {
  if (reactivatedDeprecated.length) {
    lines.push('### CSS depreciado reativado');
    for (const file of reactivatedDeprecated) lines.push(`- \`${file}\``);
    lines.push('');
  }
  if (registeredMissingFiles.length) {
    lines.push('### Arquivos registrados ausentes');
    for (const row of registeredMissingFiles) lines.push(`- \`${row.file}\``);
    lines.push('');
  }
  if (unregisteredActiveImportant.length) {
    lines.push('### CSS ativo com !important fora do registro');
    for (const row of unregisteredActiveImportant) lines.push(`- \`${row.file}\`: ${row.count}`);
    lines.push('');
  }
}
lines.push('');
lines.push('## Observação sobre dormentes de alto risco não documentados');
lines.push('');
if (!undocumentedHighRiskDormant.length) {
  lines.push('Nenhum item dormente de alto risco ficou sem documentação mínima neste relatório.');
} else {
  lines.push('Os itens abaixo aparecem como dormentes, mas ainda não foram promovidos para uma seção explícita do documento de CSS depreciado. Isso não bloqueia o audit por enquanto, mas deve ser resolvido antes de remoção física.');
  for (const row of undocumentedHighRiskDormant) lines.push(`- \`${row.file}\``);
}
lines.push('');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'));
console.log(lines.join('\n'));

if (strict && (reactivatedDeprecated.length || registeredMissingFiles.length || unregisteredActiveImportant.length)) {
  process.exit(1);
}

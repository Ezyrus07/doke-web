#!/usr/bin/env node
/*
  Maps registered !important debt against CSS assets actually loaded by root HTML pages.
  This is a diagnostic gate: it does not remove CSS or mutate the register.
*/
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const registerPath = path.join(root, 'config/important-debt-register.json');
const outputPath = path.join(root, 'docs/validation/css-active-debt-map.md');

function normalize(file) {
  return file.replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function listRootHtmlPages() {
  return fs.readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .sort();
}

function countImportant(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return 0;
  return (fs.readFileSync(fullPath, 'utf8').match(/!important/g) || []).length;
}

if (!fs.existsSync(registerPath)) {
  console.error('Registro não encontrado: config/important-debt-register.json');
  process.exit(1);
}

const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const items = Array.isArray(register.items) ? register.items : [];
const pages = listRootHtmlPages();
const loadedCssAssets = new Set();
const pagesByAsset = new Map();

for (const page of pages) {
  const assets = getLoadedCssAssets(read(page), root).map(normalize);
  for (const asset of assets) {
    loadedCssAssets.add(asset);
    if (!pagesByAsset.has(asset)) pagesByAsset.set(asset, []);
    pagesByAsset.get(asset).push(page);
  }
}

const rows = items.map((item) => {
  const currentCount = countImportant(item.file);
  const active = loadedCssAssets.has(item.file);
  return {
    file: item.file,
    group: item.group || 'unclassified',
    risk: item.risk || 'unknown',
    currentCount,
    maxAllowed: Number(item.maxAllowed || 0),
    active,
    pages: active ? Array.from(new Set(pagesByAsset.get(item.file) || [])).sort() : [],
  };
});

const activeRows = rows.filter((row) => row.active);
const dormantRows = rows.filter((row) => !row.active);
const activeUses = activeRows.reduce((sum, row) => sum + row.currentCount, 0);
const dormantUses = dormantRows.reduce((sum, row) => sum + row.currentCount, 0);
const byGroup = new Map();

for (const row of rows) {
  if (!byGroup.has(row.group)) {
    byGroup.set(row.group, { activeFiles: 0, activeUses: 0, dormantFiles: 0, dormantUses: 0 });
  }
  const stats = byGroup.get(row.group);
  if (row.active) {
    stats.activeFiles += 1;
    stats.activeUses += row.currentCount;
  } else {
    stats.dormantFiles += 1;
    stats.dormantUses += row.currentCount;
  }
}

const lines = [];
lines.push('# CSS active debt map');
lines.push('');
lines.push(`Gerado em: ${new Date().toISOString()}`);
lines.push('');
lines.push('## Resumo');
lines.push('');
lines.push(`- HTMLs raiz avaliados: ${pages.length}`);
lines.push(`- Arquivos CSS com dívida registrada: ${rows.length}`);
lines.push(`- Dívida ativa carregada por HTML raiz: ${activeUses} uso(s) em ${activeRows.length} arquivo(s)`);
lines.push(`- Dívida dormente no pacote: ${dormantUses} uso(s) em ${dormantRows.length} arquivo(s)`);
lines.push('');
lines.push('## Resumo por grupo');
lines.push('');
lines.push('| Grupo | Ativos | Uso ativo | Dormentes | Uso dormente |');
lines.push('|---|---:|---:|---:|---:|');
for (const [group, stats] of Array.from(byGroup.entries()).sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`| ${group} | ${stats.activeFiles} | ${stats.activeUses} | ${stats.dormantFiles} | ${stats.dormantUses} |`);
}
lines.push('');
lines.push('## Dívida ativa carregada');
lines.push('');
lines.push('| Arquivo | Grupo | Uso(s) | Páginas que carregam |');
lines.push('|---|---|---:|---|');
for (const row of activeRows.sort((a, b) => b.currentCount - a.currentCount || a.file.localeCompare(b.file))) {
  lines.push(`| \`${row.file}\` | ${row.group} | ${row.currentCount} | ${row.pages.join(', ')} |`);
}
lines.push('');
lines.push('## Candidatos dormentes');
lines.push('');
lines.push('Esses arquivos continuam no pacote e no orçamento técnico, mas não aparecem no grafo de CSS carregado pelos HTMLs raiz nesta auditoria. Não apagar sem checar scripts, testes visuais, rotas futuras e documentação de legado.');
lines.push('');
lines.push('| Arquivo | Grupo | Uso(s) | Risco |');
lines.push('|---|---|---:|---|');
for (const row of dormantRows.sort((a, b) => b.currentCount - a.currentCount || a.file.localeCompare(b.file))) {
  lines.push(`| \`${row.file}\` | ${row.group} | ${row.currentCount} | ${row.risk} |`);
}
lines.push('');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, lines.join('\n'));
console.log(lines.join('\n'));

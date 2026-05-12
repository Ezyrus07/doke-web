#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const cssAssets = [...new Set(getLoadedCssAssets(html, root))];

const scriptPattern = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
const jsAssets = [];
let match;
while ((match = scriptPattern.exec(html))) {
  const src = match[1];
  if (/^(https?:)?\/\//.test(src)) continue;
  jsAssets.push(src.split('?')[0].split('#')[0]);
}

function fileStats(asset) {
  const absolute = path.join(root, asset);
  if (!fs.existsSync(absolute)) {
    return { asset, missing: true, bytes: 0, lines: 0, important: 0, suspiciousComments: [] };
  }
  const text = fs.readFileSync(absolute, 'utf8');
  const suspiciousComments = [];
  text.split(/\r?\n/).forEach((line, index) => {
    if (/\b(final|hotfix|fix|repair|stage|override|parity|cleanup|legacy)\b/i.test(line)) {
      suspiciousComments.push({ line: index + 1, text: line.trim().slice(0, 180) });
    }
  });
  return {
    asset,
    missing: false,
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split(/\r?\n/).length,
    important: (text.match(/!important/g) || []).length,
    suspiciousComments: suspiciousComments.slice(0, 40),
  };
}

const cssStats = cssAssets.map(fileStats).sort((a, b) => b.important - a.important || b.bytes - a.bytes);
const jsStats = jsAssets.map((asset) => {
  const absolute = path.join(root, asset);
  if (!fs.existsSync(absolute)) return { asset, missing: true, bytes: 0, lines: 0 };
  const text = fs.readFileSync(absolute, 'utf8');
  return { asset, missing: false, bytes: Buffer.byteLength(text, 'utf8'), lines: text.split(/\r?\n/).length };
}).sort((a, b) => b.bytes - a.bytes);

const broken = [...cssStats.filter((s) => s.missing), ...jsStats.filter((s) => s.missing)];
const totalImportant = cssStats.reduce((sum, s) => sum + s.important, 0);

const report = [];
report.push('# Ciclo Global 5 — Mapa de limpeza do `index.html`');
report.push('');
report.push('Este relatório é operacional: ele mapeia o que precisa ser limpo no `index.html` antes de remover qualquer CSS/JS antigo.');
report.push('');
report.push('## Resumo');
report.push('');
report.push(`- CSS carregados diretamente/por @import: **${cssAssets.length}**`);
report.push(`- JS locais carregados: **${jsAssets.length}**`);
report.push(`- Imports internos quebrados no index: **${broken.length}**`);
report.push(`- Ocorrências de \`!important\` nos CSS carregados pelo index: **${totalImportant}**`);
report.push('');
report.push('## CSS mais críticos carregados pelo index');
report.push('');
report.push('| Arquivo | KB | Linhas | !important |');
report.push('|---|---:|---:|---:|');
cssStats.slice(0, 18).forEach((s) => {
  report.push(`| \`${s.asset}\` | ${(s.bytes / 1024).toFixed(1)} | ${s.lines} | ${s.important} |`);
});
report.push('');
report.push('## JS locais mais pesados carregados pelo index');
report.push('');
report.push('| Arquivo | KB | Linhas |');
report.push('|---|---:|---:|');
jsStats.slice(0, 18).forEach((s) => {
  report.push(`| \`${s.asset}\` | ${(s.bytes / 1024).toFixed(1)} | ${s.lines} |`);
});
report.push('');
report.push('## Sinais de legado em `home.css`');
report.push('');
const home = cssStats.find((s) => s.asset === 'assets/css/pages/home.css');
if (home) {
  report.push(`O \`home.css\` tem **${(home.bytes / 1024).toFixed(1)} KB**, **${home.lines} linhas** e **${home.important} !important**.`);
  report.push('');
  report.push('Comentários que indicam camadas históricas:');
  report.push('');
  home.suspiciousComments.slice(0, 24).forEach((item) => {
    report.push(`- L${item.line}: ${item.text}`);
  });
}
report.push('');
report.push('## Plano de limpeza seguro para o index');
report.push('');
report.push('1. Não remover imports do `index.html` de uma vez.');
report.push('2. Congelar screenshot de desktop e mobile do index.');
report.push('3. Separar `home.css` por domínio: hero/search, categorias, anúncios, workers, publicações, mais anúncios, mobile.');
report.push('4. Mover apenas contratos reutilizáveis para `components` ou `patterns`; deixar layout específico em `pages/home.css`.');
report.push('5. Remover blocos finais/repair/override apenas depois que o contrato equivalente estiver ativo e validado.');
report.push('6. Não criar novos arquivos `final`, `fix`, `stage`, `hotfix` ou `redesign`.');
report.push('7. Não adicionar `!important`; toda remoção deve preservar o visual aprovado.');
report.push('');
report.push('## Próximo corte recomendado');
report.push('');
report.push('Começar pelos blocos de maior reaproveitamento e menor risco: `workers`, `publicações`, `section headers` e `cards de anúncio`. Evitar mexer primeiro no shell/topbar ou no mobile geral do index.');
report.push('');

fs.mkdirSync(path.join(root, 'docs', 'validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'INDEX-CLEANUP-MAP.md'), report.join('\n'));
fs.writeFileSync(path.join(root, 'docs', 'validation', 'global-cycle-5-index-cleanup-map.json'), JSON.stringify({ cssAssets, jsAssets, cssStats, jsStats, broken, totalImportant }, null, 2));

console.log(`Index cleanup map generated. CSS=${cssAssets.length} JS=${jsAssets.length} broken=${broken.length} important=${totalImportant}`);

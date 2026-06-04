#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();

const targets = [
  'assets/css/pages/perfil-reference-hero.css',
  'assets/css/pages/perfil-responsive-contract.css',
  'assets/css/pages/perfil/header-rail.css',
  'assets/css/pages/perfil/profile-adaptive-contract.css',
  'assets/css/pages/perfil/profile-trim.css',
  'assets/css/pages/perfil-page-adjustments.css',
];

const htmlFiles = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'archive', 'reports', 'docs'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
walk(root);

const removedLinks = [];
for (const htmlPath of htmlFiles) {
  let content = fs.readFileSync(htmlPath, 'utf8');
  const original = content;
  for (const target of targets) {
    const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const basename = path.basename(target).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`\\s*<link\\b[^>]*href=["'][^"']*${escaped}["'][^>]*>\\s*`, 'gi'),
      new RegExp(`\\s*<link\\b[^>]*href=["'][^"']*${basename}["'][^>]*>\\s*`, 'gi'),
    ];
    for (const re of patterns) {
      content = content.replace(re, (match) => {
        removedLinks.push(`${path.relative(root, htmlPath)} :: ${target}`);
        return '\n';
      });
    }
  }
  if (content !== original) fs.writeFileSync(htmlPath, content, 'utf8');
}

const deleted = [];
const missing = [];
for (const target of targets) {
  const full = path.join(root, target);
  if (fs.existsSync(full)) {
    fs.rmSync(full, { force: true });
    deleted.push(target);
  } else {
    missing.push(target);
  }
}

const report = [
  '# Stage 62D — Profile remnants important reduction',
  '',
  'Etapa agressiva controlada para remover camadas antigas de perfil com nomes de contrato/referencia/ajuste.',
  '',
  '## Arquivos alvo',
  ...targets.map((item) => `- \`${item}\``),
  '',
  '## Links removidos de HTML',
  ...(removedLinks.length ? removedLinks.map((item) => `- ${item}`) : ['- nenhum link direto encontrado']),
  '',
  '## Arquivos deletados',
  ...(deleted.length ? deleted.map((item) => `- \`${item}\``) : ['- nenhum']),
  '',
  '## Arquivos ja ausentes',
  ...(missing.length ? missing.map((item) => `- \`${item}\``) : ['- nenhum']),
  '',
  '## Validacao requerida',
  '- npm.cmd run audit:frontend',
  '- npm.cmd run audit:important-reduction-plan',
  '- npm.cmd run audit:duplicate-assets',
  '- npm.cmd run audit:unused-asset-candidates',
  '- conferencia visual manual em perfil.html desktop/tablet/mobile',
  '',
].join('\n');

const reportDir = path.join(root, 'reports', 'generated');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'stage62d-profile-remnants-important-reduction.md'), report, 'utf8');

console.log('[Stage 62D] Profile remnants important reduction complete.');
console.log(`Deleted: ${deleted.length}`);
console.log(`Missing: ${missing.length}`);
console.log(`HTML links removed: ${removedLinks.length}`);
console.log('Report: reports/generated/stage62d-profile-remnants-important-reduction.md');

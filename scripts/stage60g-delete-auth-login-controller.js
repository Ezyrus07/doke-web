#!/usr/bin/env node
/*
  Stage 60G — Auth login-controller unused removal
  Purpose: remove only assets/js/controllers/login-controller.js when no runtime reference exists.
  This script intentionally ignores docs/, reports/, scripts/ and archive/ to avoid diagnostic self-reference.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = 'assets/js/controllers/login-controller.js';
const targetWin = target.replace(/\//g, '\\');
const basename = path.basename(target);
const targetAbs = path.join(root, ...target.split('/'));
const ignoredDirs = new Set(['.git', 'node_modules', 'docs', 'reports', 'scripts', 'archive']);
const runtimeExt = new Set(['.html', '.css', '.js']);
const matches = [];

function walk(dir) {
  const entries = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    const first = rel.split('/')[0];
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name) && !ignoredDirs.has(first)) walk(full);
      continue;
    }
    if (!runtimeExt.has(path.extname(entry.name))) continue;
    if (rel === target) continue;
    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      // Block direct script/link/import references, not generic words like login or controller.
      if (line.includes(target) || line.includes(targetWin) || line.includes(basename)) {
        matches.push({ file: rel, line: index + 1, text: line.trim().slice(0, 220) });
      }
    });
  }
}

walk(root);

fs.mkdirSync(path.join(root, 'reports/generated'), { recursive: true });
const reportPath = path.join(root, 'reports/generated/stage60g-auth-login-controller-removal.md');
let report = '# Stage 60G — Auth login-controller unused removal\n\n';
report += 'Esta etapa remove apenas `assets/js/controllers/login-controller.js` se nenhuma referencia direta runtime for encontrada.\n\n';
report += `Gerado em: ${new Date().toISOString()}\n\n`;
report += `- alvo: \`${target}\`\n`;
report += `- existe antes: ${fs.existsSync(targetAbs) ? 'sim' : 'nao'}\n`;
report += `- referencias runtime encontradas: ${matches.length}\n`;

if (matches.length) {
  report += '\n## Resultado\n\nBLOQUEADO. O arquivo nao foi deletado.\n\n## Referencias encontradas\n\n';
  for (const m of matches) report += `- ${m.file}:${m.line} — ${m.text}\n`;
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log('[Stage 60G] BLOQUEADO: referencias runtime encontradas.');
  console.log(`Relatorio: ${path.relative(root, reportPath)}`);
  process.exit(2);
}

if (fs.existsSync(targetAbs)) {
  fs.unlinkSync(targetAbs);
  report += '\n## Resultado\n\nREMOVIDO. Nenhuma referencia direta runtime foi encontrada.\n';
  console.log(`[Stage 60G] Removido: ${target}`);
} else {
  report += '\n## Resultado\n\nJA AUSENTE. Nenhuma acao de delecao foi necessaria.\n';
  console.log(`[Stage 60G] Ja ausente: ${target}`);
}

fs.writeFileSync(reportPath, report, 'utf8');
console.log(`Relatorio: ${path.relative(root, reportPath)}`);

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const stage = 'stage62h-search-results-remnants';
const logPath = path.join(ROOT, 'stage62h-search-results-remnants-log.txt');
const backupRoot = path.join(ROOT, 'reports', 'generated', `${stage}-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const targets = [
  "assets/css/pages/search-results-runtime.css",
  "assets/css/pages/search-results/mobile-layout-contract.css",
  "assets/css/pages/search-results/preview-layout-contract.css",
  "assets/css/pages/search-results/responsive-pass.css",
  "assets/css/pages/search-results/results-density-preview-contract.css",
  "assets/css/pages/search-results/results-layout-foundation.css",
  "assets/css/pages/search-results/results-page-alignment.css",
  "assets/css/pages/search-results/rhythm.css",
  "assets/css/pages/search-results/worker-preview-layout-v34.css",
  "assets/css/pages/search-results/workers-desktop.css",
  "assets/css/pages/search-results/workers-index-layout-contract.css"
];

function toWin(p) {
  return p.split('/').join(path.sep);
}

function log(line) {
  fs.appendFileSync(logPath, line + '\n', 'utf8');
  console.log(line);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyToBackup(absPath, relativePath) {
  const backupPath = path.join(backupRoot, relativePath.split('/').join(path.sep));
  ensureDir(path.dirname(backupPath));
  fs.copyFileSync(absPath, backupPath);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'archive', 'docs', 'reports'].includes(entry.name)) continue;
      out.push(...walk(full));
    } else {
      out.push(rel);
    }
  }
  return out;
}

function stripCssLinksFromHtml(html, target) {
  const basename = path.basename(target);
  const normalized = target.replace(/\//g, '[\\\\/]');
  const escapedBase = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedPath = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[\\\\\/\\\]/g, '[\\\\/]');

  const patterns = [
    new RegExp(`\\n?\\s*<link\\b[^>]*href=["'][^"']*${escapedBase}[^"']*["'][^>]*>\\s*`, 'gi'),
    new RegExp(`\\n?\\s*<link\\b[^>]*href=["'][^"']*${escapedPath}[^"']*["'][^>]*>\\s*`, 'gi'),
  ];
  let next = html;
  for (const re of patterns) {
    next = next.replace(re, '\n');
  }
  return next;
}

function main() {
  fs.writeFileSync(logPath, '', 'utf8');
  log('[Doke Stage 62H] Search-results remnants important reduction');
  log(`Root: ${ROOT}`);

  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    log('ERRO: package.json nao encontrado. Rode este script na raiz do projeto.');
    process.exitCode = 1;
    return;
  }

  ensureDir(backupRoot);
  log(`Backup local: ${path.relative(ROOT, backupRoot)}`);

  const runtimeFiles = walk(ROOT).filter((rel) => /\.(html|css|js)$/i.test(rel));
  const htmlFiles = runtimeFiles.filter((rel) => /\.html$/i.test(rel));

  let htmlChanged = 0;
  for (const rel of htmlFiles) {
    const abs = path.join(ROOT, rel);
    let content = fs.readFileSync(abs, 'utf8');
    let next = content;
    for (const target of targets) {
      next = stripCssLinksFromHtml(next, target);
    }
    if (next !== content) {
      copyToBackup(abs, rel);
      fs.writeFileSync(abs, next, 'utf8');
      htmlChanged++;
      log(`HTML atualizado: ${rel}`);
    }
  }

  let removed = 0;
  let missing = 0;
  for (const target of targets) {
    const abs = path.join(ROOT, toWin(target));
    if (fs.existsSync(abs)) {
      copyToBackup(abs, target);
      fs.rmSync(abs, { force: true });
      removed++;
      log(`REMOVIDO: ${target}`);
    } else {
      missing++;
      log(`JA AUSENTE: ${target}`);
    }
  }

  const restoreLines = [
    '@echo off',
    'setlocal',
    'echo [Doke Stage 62H] Restaurando backup local...',
    `xcopy /E /I /Y "${path.relative(ROOT, backupRoot)}" "."`,
    'echo Restauracao concluida.',
    'pause'
  ];
  fs.writeFileSync(path.join(ROOT, 'RODAR_STAGE62H_ROLLBACK_LOCAL.cmd'), restoreLines.join('\r\n'), 'utf8');

  log('');
  log(`Resumo: ${removed} removido(s), ${missing} ja ausente(s), ${htmlChanged} HTML(s) atualizado(s).`);
  log('Rollback local criado: RODAR_STAGE62H_ROLLBACK_LOCAL.cmd');
  log('Agora rode os audits recomendados.');
}

main();

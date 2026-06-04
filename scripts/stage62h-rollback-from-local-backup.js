const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const generatedDir = path.join(ROOT, 'reports', 'generated');
const prefix = 'stage62h-search-results-remnants-backup-';
const logPath = path.join(ROOT, 'stage62h-rollback-from-local-backup-log.txt');

function log(line) {
  fs.appendFileSync(logPath, line + '\n', 'utf8');
  console.log(line);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileFromBackup(absBackupFile, backupRoot) {
  const rel = path.relative(backupRoot, absBackupFile);
  const dest = path.join(ROOT, rel);
  ensureDir(path.dirname(dest));
  fs.copyFileSync(absBackupFile, dest);
  return rel.replace(/\\/g, '/');
}

function main() {
  fs.writeFileSync(logPath, '', 'utf8');
  log('[Doke Stage 62H Rollback] Restaurando estado anterior da Stage 62H pelo backup local');
  log(`Root: ${ROOT}`);

  if (!fs.existsSync(path.join(ROOT, 'package.json'))) {
    log('ERRO: package.json nao encontrado. Rode na raiz do projeto.');
    process.exitCode = 1;
    return;
  }

  if (!fs.existsSync(generatedDir)) {
    log('ERRO: reports/generated nao existe. Nao encontrei backups locais da Stage 62H.');
    process.exitCode = 1;
    return;
  }

  const backups = fs.readdirSync(generatedDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => {
      const full = path.join(generatedDir, entry.name);
      const stat = fs.statSync(full);
      return { name: entry.name, full, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (backups.length === 0) {
    log('ERRO: nenhum backup local stage62h-search-results-remnants-backup-* encontrado.');
    log('Se voce apagou reports/generated, envie o ZIP atual para gerar rollback manual.');
    process.exitCode = 1;
    return;
  }

  const selected = backups[0];
  log(`Backup selecionado: reports/generated/${selected.name}`);

  const files = walk(selected.full);
  if (files.length === 0) {
    log('ERRO: backup encontrado, mas sem arquivos.');
    process.exitCode = 1;
    return;
  }

  let restored = 0;
  for (const file of files) {
    const rel = copyFileFromBackup(file, selected.full);
    restored++;
    log(`RESTAURADO: ${rel}`);
  }

  log('');
  log(`Resumo: ${restored} arquivo(s) restaurado(s).`);
  log('Agora rode os audits e confira detalhe-anuncio.html, perfil.html, mensagens.html e resultados.html.');
}

main();

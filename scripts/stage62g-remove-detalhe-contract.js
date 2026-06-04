const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = 'assets/css/pages/detalhe-anuncio/detail-page-contract.css';
const targetWin = target.replaceAll('/', '\\');
const logPath = path.join(root, 'stage62g-detalhe-contract-log.txt');
const lines = [];

function log(message) {
  lines.push(message);
  console.log(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(root, full).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'archive', 'reports', 'docs'].includes(entry.name)) continue;
      acc = walk(full, acc);
    } else {
      acc.push(rel);
    }
  }
  return acc;
}

function removeDirectLinksFromHtml() {
  const htmlFiles = walk(root).filter((file) => file.endsWith('.html'));
  let changed = 0;
  const escapedForward = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedWin = targetWin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linkPattern = new RegExp(`\\s*<link[^>]+href=["'][^"']*(?:${escapedForward}|${escapedWin})[^"']*["'][^>]*>\\s*`, 'gi');

  for (const file of htmlFiles) {
    const abs = path.join(root, file);
    const before = fs.readFileSync(abs, 'utf8');
    const after = before.replace(linkPattern, '\n');
    if (after !== before) {
      fs.writeFileSync(abs, after, 'utf8');
      changed += 1;
      log(`HTML atualizado: ${file}`);
    }
  }
  log(`HTMLs com link removido: ${changed}`);
}

function assertNoRuntimeDirectReference() {
  const runtimeFiles = walk(root).filter((file) => /\.(html|css|js)$/.test(file));
  const references = [];
  for (const file of runtimeFiles) {
    if (file === target) continue;
    if (file.startsWith('scripts/')) continue;
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    if (content.includes(target) || content.includes(targetWin)) {
      references.push(file);
    }
  }
  if (references.length) {
    log('BLOQUEADO: ainda existem referencias runtime diretas ao arquivo alvo:');
    references.forEach((file) => log(`- ${file}`));
    return false;
  }
  log('Sem referencias runtime diretas restantes ao arquivo alvo.');
  return true;
}

function removeTarget() {
  const abs = path.join(root, target);
  if (!fs.existsSync(abs)) {
    log(`JA AUSENTE: ${target}`);
    return;
  }
  fs.unlinkSync(abs);
  log(`DELETADO: ${target}`);
}

try {
  log('[Doke Stage 62G] Remocao controlada de contrato legado do detalhe-anuncio');
  if (!exists('package.json')) {
    throw new Error('package.json nao encontrado. Rode este script na raiz do projeto.');
  }
  removeDirectLinksFromHtml();
  if (!assertNoRuntimeDirectReference()) {
    process.exitCode = 1;
  } else {
    removeTarget();
  }
} catch (error) {
  process.exitCode = 1;
  log(`ERRO: ${error.message}`);
} finally {
  fs.writeFileSync(logPath, `${lines.join('\n')}\n`, 'utf8');
  log(`Log salvo em: ${path.relative(root, logPath)}`);
}

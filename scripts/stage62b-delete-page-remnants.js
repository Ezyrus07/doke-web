const fs = require('fs');
const path = require('path');

const root = process.cwd();
const listFile = path.join(root, 'DELETE_STAGE62B_PAGE_REMNANTS.txt');
const reportDir = path.join(root, 'reports', 'generated');
const reportFile = path.join(reportDir, 'stage62b-page-remnants-important-reduction.md');

const ignoredDirs = new Set(['.git', 'node_modules', 'archive', 'docs', 'reports', 'scripts']);
const runtimeExtensions = new Set(['.html', '.css', '.js']);

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (runtimeExtensions.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function countImportant(file) {
  if (!fs.existsSync(file)) return 0;
  const text = fs.readFileSync(file, 'utf8');
  return (text.match(/!important/g) || []).length;
}

function hasDirectRuntimeReference(targetRel, runtimeFiles) {
  const normalized = targetRel.replace(/\\/g, '/');
  const win = normalized.replace(/\//g, '\\\\');
  const basename = path.basename(normalized);
  const needleVariants = [normalized, win, basename];
  const hits = [];

  for (const file of runtimeFiles) {
    const rel = toPosix(path.relative(root, file));
    if (rel === normalized) continue;
    let text = '';
    try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const needle of needleVariants) {
      const idx = text.indexOf(needle);
      if (idx !== -1) {
        const line = text.slice(0, idx).split(/\r?\n/).length;
        hits.push(`${rel}:${line} (${needle})`);
        break;
      }
    }
  }
  return hits;
}

function main() {
  if (!fs.existsSync(listFile)) {
    console.error('Lista nao encontrada:', listFile);
    process.exit(1);
  }

  const targets = fs.readFileSync(listFile, 'utf8')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const runtimeFiles = walk(root);
  const deleted = [];
  const missing = [];
  const blocked = [];
  let removedImportant = 0;

  for (const targetRel of targets) {
    const targetAbs = path.join(root, targetRel);
    if (!fs.existsSync(targetAbs)) {
      missing.push(targetRel);
      continue;
    }

    const hits = hasDirectRuntimeReference(targetRel, runtimeFiles);
    if (hits.length) {
      blocked.push({ targetRel, hits });
      continue;
    }

    const importantCount = countImportant(targetAbs);
    fs.rmSync(targetAbs, { force: true });
    deleted.push({ targetRel, importantCount });
    removedImportant += importantCount;
  }

  fs.mkdirSync(reportDir, { recursive: true });
  const lines = [];
  lines.push('# Stage 62B — Page remnants important reduction');
  lines.push('');
  lines.push('Etapa agressiva controlada: remove arquivos de pagina com nomes/remanescentes historicos, mas bloqueia se houver referencia direta runtime em HTML/CSS/JS.');
  lines.push('');
  lines.push('## Resultado');
  lines.push('');
  lines.push(`- alvos: ${targets.length}`);
  lines.push(`- deletados: ${deleted.length}`);
  lines.push(`- ausentes: ${missing.length}`);
  lines.push(`- bloqueados: ${blocked.length}`);
  lines.push(`- !important removidos estimados: ${removedImportant}`);
  lines.push('');
  lines.push('## Deletados');
  lines.push('');
  if (deleted.length) deleted.forEach(item => lines.push(`- \`${item.targetRel}\` — ${item.importantCount} !important`));
  else lines.push('- nenhum');
  lines.push('');
  lines.push('## Ausentes');
  lines.push('');
  if (missing.length) missing.forEach(item => lines.push(`- \`${item}\``));
  else lines.push('- nenhum');
  lines.push('');
  lines.push('## Bloqueados por referencia runtime direta');
  lines.push('');
  if (blocked.length) {
    blocked.forEach(item => {
      lines.push(`### \`${item.targetRel}\``);
      item.hits.slice(0, 20).forEach(hit => lines.push(`- ${hit}`));
      if (item.hits.length > 20) lines.push(`- ... +${item.hits.length - 20} referencias`);
      lines.push('');
    });
  } else {
    lines.push('- nenhum');
  }
  lines.push('');
  lines.push('## Validacao recomendada');
  lines.push('');
  lines.push('- `npm.cmd run audit:frontend`');
  lines.push('- `npm.cmd run audit:important-reduction-plan`');
  lines.push('- `npm.cmd run audit:duplicate-assets`');
  lines.push('- `npm.cmd run audit:unused-asset-candidates`');
  lines.push('- conferencia visual minima: `perfil.html`, `mensagens.html`, `detalhe-anuncio.html`, `index.html` em mobile e desktop.');

  fs.writeFileSync(reportFile, lines.join('\n') + '\n');

  console.log('[Doke Stage 62B] Page remnants important reduction');
  console.log('Alvos:', targets.length);
  console.log('Deletados:', deleted.length);
  console.log('Ausentes:', missing.length);
  console.log('Bloqueados:', blocked.length);
  console.log('!important removidos estimados:', removedImportant);
  console.log('Relatorio:', path.relative(root, reportFile));

  if (blocked.length) {
    console.log('\nBloqueados:');
    blocked.forEach(item => console.log('-', item.targetRel));
  }
}

main();

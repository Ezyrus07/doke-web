/*
  Stage 62F — detalhe-anuncio remnants important reduction
  Removes selected legacy/contract CSS from detalhe-anuncio domain.
  This script intentionally avoids shell/router/header/sidebar/global CSS.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const logPath = path.join(root, 'stage62f-detail-remnants-log.txt');
const targets = [
  'assets/css/pages/detalhe-anuncio/detail-layout-contract.css',
  'assets/css/pages/detalhe-anuncio/detail-legacy.css',
  'assets/css/pages/detalhe-anuncio/mobile-rail-contract.css',
];

const htmlFiles = [
  'detalhe-anuncio.html',
  'resultado/detalhe-anuncio.html',
  'resultados/detalhe-anuncio.html',
].filter((file) => fs.existsSync(path.join(root, file)));

function log(line) {
  fs.appendFileSync(logPath, `${line}\n`, 'utf8');
  console.log(line);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function removeHtmlLinksForTarget(target) {
  const href = target.replace(/\\/g, '/');
  const basename = path.basename(target);
  let changedCount = 0;

  for (const html of htmlFiles) {
    const filePath = path.join(root, html);
    const before = fs.readFileSync(filePath, 'utf8');
    const lines = before.split(/\r?\n/);
    const nextLines = lines.filter((line) => {
      const normalized = line.replace(/\\/g, '/');
      const isStylesheetLink = /<link\b/i.test(line) && /rel=["']?stylesheet/i.test(line);
      const mentionsFullTarget = normalized.includes(href);
      const mentionsBasename = normalized.includes(basename);
      return !(isStylesheetLink && (mentionsFullTarget || mentionsBasename));
    });
    const after = nextLines.join(before.includes('\r\n') ? '\r\n' : '\n');
    if (after !== before) {
      fs.writeFileSync(filePath, after, 'utf8');
      changedCount += 1;
      log(`HTML link removido: ${html} -> ${target}`);
    }
  }
  return changedCount;
}

function main() {
  fs.writeFileSync(logPath, `[Stage 62F] ${new Date().toISOString()}\n`, 'utf8');

  if (!fs.existsSync(path.join(root, 'package.json'))) {
    log('ERRO: package.json nao encontrado. Rode este script na raiz do projeto.');
    process.exitCode = 1;
    return;
  }

  log('Removendo links HTML diretos dos CSS alvo...');
  for (const target of targets) {
    removeHtmlLinksForTarget(target);
  }

  log('Deletando arquivos alvo...');
  for (const target of targets) {
    const filePath = path.join(root, target);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log(`DELETADO: ${target}`);
    } else {
      log(`JA AUSENTE: ${target}`);
    }
  }

  log('Stage 62F concluida. Rode os audits indicados.');
}

main();

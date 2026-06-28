#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const manifestPath = path.join(root, 'tests', 'visual', 'visual-regression.manifest.json');

const requiredViewports = new Map([
  ['desktop-1366x768', { width: 1366, height: 768, kind: 'desktop' }],
  ['tablet-820x1180', { width: 820, height: 1180, kind: 'tablet' }],
  ['mobile-390x844', { width: 390, height: 844, kind: 'mobile' }],
]);

const requiredPages = new Map([
  ['index.html', 'home'],
  ['perfil.html', 'perfil'],
  ['pedidos.html', 'pedidos'],
  ['mensagens.html', 'mensagens'],
  ['notificacoes.html', 'notificacoes'],
  ['comunidade.html', 'comunidade'],
  ['comunidade-interna.html', 'comunidade-interna'],
  ['resultados.html', 'resultados'],
  ['detalhe-anuncio.html', 'detalhe-anuncio'],
  ['ajuda.html', 'ajuda'],
  ['carteira.html', 'carteira'],
  ['configuracoes.html', 'configuracoes'],
  ['anunciar-servico.html', 'anunciar-servico'],
  ['orcamento.html', 'orcamento'],
  ['pagamento-profissional.html', 'pagamento-profissional'],
]);

function fail(message) {
  console.error(`[audit:visual-manifest-coverage] ${message}`);
  process.exitCode = 1;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`Cannot read ${path.relative(root, file)}: ${error.message}`);
    return { viewports: [], pages: [] };
  }
}

function firstDataPage(html) {
  const match = html.match(/<body\b[^>]*\bdata-page="([^"]+)"/i);
  return match ? match[1] : '';
}

const manifest = readJson(manifestPath);
const viewports = Array.isArray(manifest.viewports) ? manifest.viewports : [];
const pages = Array.isArray(manifest.pages) ? manifest.pages : [];

for (const [name, expected] of requiredViewports) {
  const viewport = viewports.find((entry) => entry.name === name);
  if (!viewport) {
    fail(`Missing viewport ${name}.`);
    continue;
  }
  for (const key of ['width', 'height', 'kind']) {
    if (viewport[key] !== expected[key]) {
      fail(`Viewport ${name} has invalid ${key}: expected ${expected[key]}, found ${viewport[key]}.`);
    }
  }
}

for (const [pagePath, expectedDataPage] of requiredPages) {
  const entry = pages.find((item) => item.path === pagePath);
  if (!entry) {
    fail(`Missing visual manifest page ${pagePath}.`);
    continue;
  }
  if (entry.expectedDataPage !== expectedDataPage) {
    fail(`${pagePath} expectedDataPage must be "${expectedDataPage}", found "${entry.expectedDataPage}".`);
  }

  const htmlPath = path.join(root, pagePath);
  if (!fs.existsSync(htmlPath)) {
    fail(`${pagePath} listed in visual manifest but file does not exist.`);
    continue;
  }

  const actualDataPage = firstDataPage(fs.readFileSync(htmlPath, 'utf8'));
  if (actualDataPage !== expectedDataPage) {
    fail(`${pagePath} body[data-page] must be "${expectedDataPage}", found "${actualDataPage || '<missing>'}".`);
  }
}

const duplicatePages = pages
  .map((entry) => entry.path)
  .filter((pagePath, index, all) => all.indexOf(pagePath) !== index);
if (duplicatePages.length) {
  fail(`Duplicate visual manifest pages: ${[...new Set(duplicatePages)].join(', ')}.`);
}

if (!process.exitCode) {
  console.log(`[audit:visual-manifest-coverage] OK — ${requiredPages.size} priority pages × ${requiredViewports.size} viewports covered.`);
}

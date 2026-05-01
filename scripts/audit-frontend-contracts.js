#!/usr/bin/env node
/*
  Doke frontend contract audit.
  Uso:
    node scripts/audit-frontend-contracts.js
    node scripts/audit-frontend-contracts.js --strict

  Sem --strict: gera relatório e sai com código 0.
  Com --strict: sai com código 1 se encontrar violação crítica.
*/

const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const strict = process.argv.includes('--strict');

const migratedPages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade-interna.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const requiredShellCss = 'assets/css/components/shell/mobile-app-shell.css';
const requiredShellJs = 'assets/js/components/mobile-app-shell.js';
const requiredUiCss = 'assets/css/components/ui/doke-ui-system.css';
const manifestPages = {
  'index.html': 'assets/css/pages/home.css',
  'resultados.html': 'assets/css/pages/search-results.css',
};

const deprecatedCssLinks = [
  'assets/css/components/navigation/mobile-chrome-lock.css',
  'assets/css/components/navigation/app-mobile-topbar.css',
  'assets/css/components/navigation/app-mobile-search.css',
  'assets/css/components/navigation/mobile-search-header-shared.css',
  'assets/css/components/shell/mobile-page-rhythm-contract.css',
  'assets/css/components/navigation/mobile-bottom-nav-system.css',
  'assets/css/components/navigation/mobile-bottom-nav.css',
  'assets/css/components/navigation/bottom-nav.css',
  'assets/css/components/navigation/mobile-internal-header.css',
  'assets/css/components/navigation/header-mobile.css',
  'assets/css/components/navigation/app-mobile-header-contract.css',
];

const legacyClassHints = [
  'results-searchbar__',
  'home-search-hero__form',
  'home-search-hero__input',
  'doke-mobile-search',
  'app-mobile-topbar',
  'app-mobile-search',
];

const report = [];
let critical = 0;
let warning = 0;

function exists(file) {
  return fs.existsSync(path.join(root, file));
}

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function getDirectCssLinks(html) {
  const links = [];
  const linkPattern = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/g;
  let match;

  while ((match = linkPattern.exec(html))) {
    links.push(match[1].split('?')[0]);
  }

  return links;
}

function push(level, file, message) {
  if (level === 'critical') critical += 1;
  if (level === 'warning') warning += 1;
  report.push({ level, file, message });
}

function listFiles(dir, exts) {
  const base = path.join(root, dir);
  if (!fs.existsSync(base)) return [];
  const out = [];

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        walk(full);
      } else if (exts.some((ext) => entry.name.endsWith(ext))) {
        out.push(path.relative(root, full).replace(/\\/g, '/'));
      }
    }
  }

  walk(base);
  return out;
}

for (const page of migratedPages) {
  if (!exists(page)) {
    push('warning', page, 'Página migrada não encontrada neste pacote.');
    continue;
  }

  const html = read(page);
  const loadedCssAssets = getLoadedCssAssets(html);
  const directCssLinks = getDirectCssLinks(html);
  const pageManifest = manifestPages[page];

  if (pageManifest) {
    const expectedLinks = ['assets/css/core/index.css', 'assets/css/pages/app-shell.css', pageManifest];
    const matchesManifestContract = directCssLinks.length === expectedLinks.length
      && expectedLinks.every((link, index) => directCssLinks[index] === link);

    if (!matchesManifestContract) {
      push('critical', page, `Deve carregar somente os CSS base e o manifesto da pÃ¡gina: ${expectedLinks.join(', ')}.`);
    }
  }

  if (!loadedCssAssets.includes(requiredShellCss)) {
    push('critical', page, 'Não carrega o CSS oficial do Mobile App Shell.');
  }

  if (!html.includes(requiredShellJs)) {
    push('critical', page, 'Não carrega o JS oficial do Mobile App Shell.');
  }

  if (!loadedCssAssets.includes(requiredUiCss)) {
    push('critical', page, 'Não carrega o CSS oficial do Doke UI System.');
  }


  for (const deprecated of deprecatedCssLinks) {
    if (loadedCssAssets.includes(deprecated)) {
      push('critical', page, `Carrega CSS depreciado de chrome mobile: ${deprecated}`);
    }
  }

  for (const hint of legacyClassHints) {
    if (html.includes(hint)) {
      push('warning', page, `Ainda contém classe legada que deve ser removida depois da validação: ${hint}`);
    }
  }
}

const cssFiles = listFiles('assets/css', ['.css']);
for (const file of cssFiles) {
  const css = read(file);

  const importantCount = (css.match(/!important/g) || []).length;
  if (importantCount > 0 && !file.includes('mobile-app-shell.css')) {
    push('warning', file, `Contém ${importantCount} uso(s) de !important. Auditar se ainda é necessário.`);
  }

  if (/stage-|hotfix-|lock/i.test(file)) {
    push('warning', file, 'Nome sugere CSS emergencial. Verificar se deve entrar em DEPRECATED-CSS.md.');
  }

  if (/border-radius:\s*(?:[0-9]+px|[0-9.]+rem)/.test(css) && !file.includes('doke-ui-system.css') && !file.includes('mobile-app-shell.css')) {
    push('warning', file, 'Define radius literal. Preferir tokens do Doke UI System para evitar variação visual.');
  }
}

const lines = [];
lines.push('# Relatório de auditoria frontend');
lines.push('');
lines.push(`Gerado em: ${new Date().toISOString()}`);
lines.push('');
lines.push(`Críticos: ${critical}`);
lines.push(`Avisos: ${warning}`);
lines.push('');
if (!report.length) {
  lines.push('Nenhuma violação encontrada.');
} else {
  for (const item of report) {
    lines.push(`- **${item.level.toUpperCase()}** — \`${item.file}\`: ${item.message}`);
  }
}

const outputDir = path.join(root, 'docs/validation');
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'frontend-contract-audit-report.md'), lines.join('\n') + '\n');

console.log(lines.join('\n'));

if (strict && critical > 0) {
  process.exit(1);
}

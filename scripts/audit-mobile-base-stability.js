#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const cssPath = path.join(root, 'assets/css/components/shell/mobile-base-stability.css');
const errors = [];
const mobileAssetPath = 'assets/css/components/shell/mobile-base-stability.css';
const boundaryAssetPath = 'assets/css/components/shell/responsive-boundary.css';

if (!fs.existsSync(cssPath)) {
  errors.push('Missing assets/css/components/shell/mobile-base-stability.css');
} else {
  const css = fs.readFileSync(cssPath, 'utf8');
  const required = [
    '@media (max-width: 760px)',
    'body.doke-mobile-shell-mounted .doke-mobile-shell',
    'position: absolute !important',
    'body.doke-mobile-shell-mounted .doke-mobile-bottom-nav',
    'position: fixed !important',
    '.doke-desktop-search-panel',
    'overflow-x: hidden !important',
  ];

  required.forEach((needle) => {
    if (!css.includes(needle)) {
      errors.push(`mobile-base-stability.css missing required guard: ${needle}`);
    }
  });
}

pages.forEach((page) => {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) {
    errors.push(`Missing page: ${page}`);
    return;
  }
  const html = fs.readFileSync(file, 'utf8');
  const loadedAssets = getLoadedCssAssets(html, root);
  if (!loadedAssets.includes(mobileAssetPath)) {
    errors.push(`${page} does not load mobile-base-stability.css`);
  }
  const boundaryIndex = loadedAssets.indexOf(boundaryAssetPath);
  const mobileIndex = loadedAssets.indexOf(mobileAssetPath);
  if (boundaryIndex >= 0 && mobileIndex >= 0 && mobileIndex < boundaryIndex) {
    errors.push(`${page} loads mobile-base-stability.css before responsive-boundary.css`);
  }
});

if (errors.length) {
  console.error('Mobile base stability audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Mobile base stability audit passed.');
console.log(`Pages checked: ${pages.length}`);

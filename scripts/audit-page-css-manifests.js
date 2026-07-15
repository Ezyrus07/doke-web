#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const groups = {
  home: [
    'assets/css/pages/home-runtime.css',
    'assets/css/pages/home-runtime-page.css',
    'assets/css/pages/home-runtime-components.css',
    'assets/css/pages/home-runtime-shell.css',
    'assets/css/pages/home-runtime-feed.css',
  ],
  results: [
    'assets/css/pages/search-results-runtime.css',
    'assets/css/pages/search-results-runtime-platform.css',
    'assets/css/pages/search-results-runtime-page.css',
    'assets/css/pages/search-results-runtime-components.css',
    'assets/css/pages/search-results-runtime-display.css',
  ],
  communityRoom: [
    'assets/css/pages/comunidade-interna-foundation.css',
    'assets/css/pages/comunidade-interna-runtime-platform.css',
    'assets/css/pages/comunidade-interna-runtime-chat.css',
    'assets/css/pages/comunidade-interna-runtime-settings.css',
    'assets/css/pages/comunidade-interna-runtime-page.css',
  ],
  messaging: [
    'assets/css/pages/messaging-foundation.css',
    'assets/css/pages/messaging-runtime-platform.css',
    'assets/css/pages/messaging-runtime-chat.css',
    'assets/css/pages/messaging-runtime-page.css',
    'assets/css/pages/messaging-runtime-extensions.css',
  ],
  profile: [
    'assets/css/pages/profile-foundation.css',
    'assets/css/pages/profile-runtime-platform.css',
    'assets/css/pages/profile-runtime-components.css',
  ],
  orders: [
    'assets/css/pages/pedidos-foundation.css',
    'assets/css/pages/pedidos-runtime-platform.css',
    'assets/css/pages/pedidos-runtime-operations.css',
    'assets/css/pages/pedidos-runtime-page.css',
    'assets/css/pages/pedidos-runtime-extensions.css',
  ],
  wallet: [
    'assets/css/pages/carteira-foundation.css',
    'assets/css/pages/carteira-runtime-platform.css',
    'assets/css/pages/carteira-runtime-finance.css',
    'assets/css/pages/carteira-runtime-page.css',
    'assets/css/pages/carteira-runtime-extensions.css',
  ],
};

const importPattern = /@import\s+url\((?:"|')?([^"')]+)(?:"|')?\)(?:\s+[^;]+)?;/g;
const stripComments = (value) => value.replace(/\/\*[\s\S]*?\*\//g, '').trim();
let failed = false;

for (const [name, files] of Object.entries(groups)) {
  const directImports = new Map();
  for (const relative of files) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      console.error(`[${name}] missing manifest: ${relative}`);
      failed = true;
      continue;
    }

    const source = fs.readFileSync(absolute, 'utf8');
    const withoutImports = stripComments(source.replace(importPattern, ''));
    if (withoutImports) {
      console.error(`[${name}] declarations or unsupported content found in ${relative}`);
      failed = true;
    }

    importPattern.lastIndex = 0;
    let match;
    while ((match = importPattern.exec(source))) {
      const importPath = match[1].split('?')[0];
      const normalized = path.normalize(path.join(path.dirname(relative), importPath));
      const owners = directImports.get(normalized) || [];
      owners.push(relative);
      directImports.set(normalized, owners);
    }
  }

  for (const [imported, owners] of directImports.entries()) {
    if (owners.length > 1) {
      console.error(`[${name}] duplicate direct import ${imported}: ${owners.join(', ')}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('Page CSS manifests: OK');

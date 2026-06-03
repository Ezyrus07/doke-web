#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'assets/css/pages/notificacoes/selection-cleanup.css',
  'assets/css/pages/notificacoes/pedidos-parity.css',
  'assets/css/pages/notificacoes/selection-parity.css',
];

for (const rel of files) {
  const abs = path.join(root, rel);
  if (fs.existsSync(abs)) {
    fs.rmSync(abs, { force: true });
    console.log(`[phase27-cleanup] removed ${rel}`);
  } else {
    console.log(`[phase27-cleanup] already absent ${rel}`);
  }
}

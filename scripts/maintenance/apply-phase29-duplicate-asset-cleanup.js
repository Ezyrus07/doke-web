#!/usr/bin/env node
/* Remove exact duplicate CSS aliases retired in phase 29. */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const removedAliases = [
  'assets/css/pages/notificacoes/pedidos-parity.css',
  'assets/css/pages/notificacoes/selection-parity.css',
  'assets/css/pages/mensagens/community-parity.css',
  'assets/css/pages/mensagens/desktop-redesign.css',
  'assets/css/pages/pedidos/mobile-longterm-normalization.css',
  'assets/css/pages/home-overlays/workers-feed-polish.css',
  'assets/css/pages/perfil-budget-modal/final-polish-success.css',
  'assets/css/pages/search-results/final-normalization.css',
  'assets/css/pages/search-results/final-parity.css',
  'assets/css/pages/search-results/preview-parity.css',
  'assets/css/components/layout/marketplace-index-parity-contract.css',
  'assets/css/components/navigation/mobile-bottom-nav.css',
];

let removed = 0;
let alreadyMissing = 0;
for (const relativePath of removedAliases) {
  const absolutePath = path.join(ROOT, relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
    removed += 1;
    console.log(`removed ${relativePath}`);
  } else {
    alreadyMissing += 1;
  }
}

console.log(`Phase 29 duplicate asset cleanup complete. Removed: ${removed}. Already missing: ${alreadyMissing}.`);

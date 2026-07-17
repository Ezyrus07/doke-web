'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'assets/css/pages/carteira.css');
const htmlPath = path.join(root, 'carteira.html');
const css = fs.readFileSync(cssPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const failures = [];

if (!html.includes('data-wallet-hydration-skeleton')) {
  failures.push('carteira.html não contém o skeleton canônico da carteira.');
}

if (!html.includes('data-wallet-hydration-ready hidden')) {
  failures.push('O conteúdo real da carteira deve iniciar oculto em hard load.');
}

if (!css.includes('.wallet-hydration-skeleton:not([hidden])')) {
  failures.push('O display do skeleton deve ser condicionado a :not([hidden]).');
}

if (/\.wallet-hydration-skeleton\s*\{\s*display\s*:\s*grid/i.test(css)) {
  failures.push('Uma regra display:grid incondicional pode sobrescrever o atributo hidden.');
}

if (failures.length) {
  console.error('Wallet skeleton visibility contract: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Wallet skeleton visibility contract: PASS');

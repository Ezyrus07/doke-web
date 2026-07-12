const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const feature = fs.readFileSync(path.join(root, 'assets/js/features/community-final-logic-stability.js'), 'utf8');
const pages = ['comunidade-interna.html', 'mensagens.html', 'notificacoes.html'];
const required = [
  'window.DokeFinalLogicStability',
  'doke:account-context-invalidated',
  'doke:account-context-refreshed',
  'data-logic-fallback-error',
  'doke:submit-complete',
  'AbortController',
  'MutationObserver',
  'doke:final-logic-stability-ready'
];
required.forEach((token) => {
  if (!feature.includes(token)) throw new Error(`Missing final stability contract token: ${token}`);
});
pages.forEach((page) => {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  if (!html.includes('assets/js/features/community-final-logic-stability.js')) {
    throw new Error(`${page} does not load final logic stability`);
  }
});
console.log('Community final logic stability contract: OK');

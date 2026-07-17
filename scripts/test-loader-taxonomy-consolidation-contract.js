'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const pendingPages = [
  ['configuracoes.html', 'data-settings-hydration-pending', 'data-settings-hydration-skeleton'],
  ['orcamento.html', 'data-budget-hydration-pending', 'data-budget-hydration-skeleton'],
  ['avaliacao-profissional.html', 'data-review-hydration-pending', 'data-review-hydration-skeleton'],
  ['tornar-profissional.html', 'data-professional-onboarding-hydration-pending', 'data-professional-onboarding-hydration-skeleton'],
  ['verificacao-profissional.html', 'data-professional-verification-hydration-pending', 'data-professional-verification-hydration-skeleton']
];

const hardLoadControllers = [
  'assets/js/pages/mensagens.js',
  'assets/js/pages/notificacoes.js',
  'assets/js/pages/pedidos.js',
  'assets/js/pages/carteira.js',
  'assets/js/pages/search-results.js',
  'assets/js/pages/detalhe-anuncio-data-controller.js'
];

const failures = [];
for (const [file, pendingAttr, obsoleteSkeletonAttr] of pendingPages) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes(pendingAttr)) failures.push(`${file}: pending state ausente (${pendingAttr})`);
  if (!source.includes('doke-state-region--pending')) failures.push(`${file}: região pending canônica ausente`);
  if (source.includes(obsoleteSkeletonAttr)) failures.push(`${file}: skeleton obsoleto ainda presente (${obsoleteSkeletonAttr})`);
}

for (const file of hardLoadControllers) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes("skeletonMode: 'hard-load'")) failures.push(`${file}: política hard-load ausente`);
  if (source.includes("skeletonMode: 'route-and-document'")) failures.push(`${file}: política route-and-document ainda ativa`);
  if (!source.includes('preserveReadyDuringHydration: true')) failures.push(`${file}: ready não é preservado durante revalidação`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`loader taxonomy consolidation contract: ${pendingPages.length + hardLoadControllers.length} targets passed`);

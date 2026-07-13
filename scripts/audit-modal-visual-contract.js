#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

function classAttrForToken(html, token) {
  const re = new RegExp(`<[^>]*class="[^"]*\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"]*"[^>]*>`, 'g');
  return html.match(re) || [];
}

function requireClass(file, token, required) {
  const html = read(file);
  const tags = classAttrForToken(html, token);
  if (!tags.length) {
    failures.push(`${file}: ${token} não encontrado`);
    return;
  }
  for (const tag of tags) {
    const classAttr = tag.match(/class="([^"]+)"/)?.[1] || '';
    const classes = new Set(classAttr.split(/\s+/));
    for (const cls of required) {
      if (!classes.has(cls)) failures.push(`${file}: ${token} sem ${cls}`);
    }
  }
}


function requireClassOneOf(file, token, required, alternatives) {
  const html = read(file);
  const tags = classAttrForToken(html, token);
  if (!tags.length) {
    failures.push(`${file}: ${token} não encontrado`);
    return;
  }
  for (const tag of tags) {
    const classAttr = tag.match(/class="([^"]+)"/)?.[1] || '';
    const classes = new Set(classAttr.split(/\s+/));
    for (const cls of required) {
      if (!classes.has(cls)) failures.push(`${file}: ${token} sem ${cls}`);
    }
    if (!alternatives.some((cls) => classes.has(cls))) {
      failures.push(`${file}: ${token} sem uma das variantes ${alternatives.join(' ou ')}`);
    }
  }
}

function requireCssContains(file, tokens) {
  const css = read(file);
  for (const token of tokens) {
    if (!css.includes(token)) failures.push(`${file}: não contém ${token}`);
  }
  if (/!important/.test(css)) failures.push(`${file}: contrato visual de modal não deve usar !important`);
}

function requireImportAfter(file, precedingImportNeedle) {
  const css = read(file);
  const modalNeedle = 'modal-visual-contract.css';
  const modalIndex = css.lastIndexOf(modalNeedle);
  if (modalIndex === -1) {
    failures.push(`${file}: não importa ${modalNeedle}`);
    return;
  }
  if (precedingImportNeedle) {
    const pageIndex = css.lastIndexOf(precedingImportNeedle);
    if (pageIndex !== -1 && modalIndex < pageIndex) failures.push(`${file}: modal visual deve vir depois de ${precedingImportNeedle}`);
  }
}

requireCssContains('assets/css/components/overlays/modal-visual-contract.css', [
  '.doke-modal-surface',
  '.doke-modal-surface--compact',
  '.doke-modal-surface--form',
  '.doke-modal-surface--financial',
  '.doke-modal-surface--detail',
  '.doke-modal-surface--feedback',
  '.doke-modal-header',
  '.doke-modal-eyebrow',
  '.doke-modal-title',
  '.doke-modal-description',
  '.doke-modal-body',
  '.doke-modal-actions',
  '.doke-modal-field',
  '.doke-modal-money-field'
]);

const expectations = {
  'mensagens.html': [
    ['charge-modal__surface', ['doke-modal-surface', 'doke-modal-surface--compact', 'doke-modal-surface--financial']],
    ['charge-modal__header', ['doke-modal-header']],
    ['charge-modal__eyebrow', ['doke-modal-eyebrow']],
    ['doke-financial-modal__title', ['doke-modal-title']],
    ['charge-modal__body', ['doke-modal-body']],
    ['charge-modal__actions', ['doke-modal-actions']]
  ],
  'carteira.html': [
    ['wallet-dialog--withdraw', ['doke-modal-surface', 'doke-modal-surface--compact', 'doke-modal-surface--financial']],
    ['wallet-bank-modal__surface', ['doke-modal-surface', 'doke-modal-surface--form']],
    ['wallet-bank-modal__header', ['doke-modal-header']],
    ['wallet-bank-modal__actions', ['doke-modal-actions']]
  ],
  'comunidade.html': [
    ['community-action-modal__dialog--code', ['doke-modal-surface', 'doke-modal-surface--compact']],
    ['community-action-modal__header', ['doke-modal-header']],
    ['community-action-modal__actions', ['doke-modal-actions']]
  ],
  'orcamento.html': [
    ['address-modal__dialog', ['doke-modal-surface', 'doke-modal-surface--form']],
    ['budget-success-modal__dialog', ['doke-modal-surface', 'doke-modal-surface--feedback']],
    ['address-modal__actions', ['doke-modal-actions']]
  ],
  'resultados.html': [
    ['ui-modal__dialog', ['doke-modal-surface', 'doke-modal-surface--compact']],
    ['before-after-preview__dialog', ['doke-modal-surface', 'doke-modal-surface--media']],
    ['worker-preview__stage', ['doke-modal-surface', 'doke-modal-surface--media']]
  ],
  'novidades.html': [
    ['news-detail-modal__panel', ['doke-modal-surface', 'doke-modal-surface--detail']],
    ['news-detail-modal__header', ['doke-modal-header']],
    ['news-detail-modal__actions', ['doke-modal-actions']]
  ],
  'pagamento-profissional.html': [
    ['payment-submit-state__card', ['doke-modal-surface', 'doke-modal-surface--feedback']],
    ['payment-finish-modal__card', ['doke-modal-surface', 'doke-modal-surface--feedback']],
    ['payment-finish-actions', ['doke-modal-actions']]
  ],
  'avaliacao-profissional.html': [
    ['pro-review-success__card', ['doke-modal-surface', 'doke-modal-surface--feedback']],
    ['pro-review-success__actions', ['doke-modal-actions']]
  ],
  'anunciar-servico.html': [
    ['post-service-submit-state__card', ['doke-modal-surface', 'doke-modal-surface--feedback']],
    ['post-service-submit-state__actions', ['doke-modal-actions']]
  ],
  'tornar-profissional.html': [
    ['become-pro-submit-state__card', ['doke-modal-surface', 'doke-modal-surface--feedback']]
  ],
  'verificacao-profissional.html': [
    ['professional-verification-submit-state__card', ['doke-modal-surface', 'doke-modal-surface--feedback']]
  ],
  'pedidos.html': [
    ['orders-sidepanel', ['doke-modal-surface', 'doke-modal-surface--detail']]
  ]
};

for (const [file, rules] of Object.entries(expectations)) {
  for (const [token, req] of rules) {
    requireClass(file, token, req);
  }
}

for (const [file, marker] of [
  ['assets/css/pages/messaging-foundation.css', 'mensagens.css'],
  ['assets/css/pages/carteira-foundation.css', 'carteira.css'],
  ['assets/css/pages/comunidade-foundation.css', 'comunidade.css'],
  ['assets/css/pages/novidades-foundation.css', 'novidades.css'],
  ['assets/css/pages/pagamento-profissional-foundation.css', 'pagamento-profissional.css'],
  ['assets/css/pages/avaliacao-profissional-foundation.css', 'avaliacao-profissional.css'],
  ['assets/css/pages/anunciar-servico-foundation.css', 'anunciar-servico.css'],
  ['assets/css/pages/tornar-profissional-foundation.css', 'tornar-profissional.css'],
  ['assets/css/pages/resultados-foundation.css', 'search-results.css'],
  ['assets/css/pages/pedidos-foundation.css', 'orders-command-center.css'],
  ['assets/css/pages/orcamento-foundation.css', 'orcamento.css'],
]) {
  requireImportAfter(file, marker);
}

if (!read('orcamento.html').includes('assets/css/pages/orcamento-foundation.css')) {
  failures.push('orcamento.html deve carregar orcamento-foundation.css para manter contrato de modal em ordem final');
}

if (failures.length) {
  console.error('audit:modal-visual-contract falhou:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('audit:modal-visual-contract OK');

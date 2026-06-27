#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function hasClassInElement(html, token, required) {
  const re = new RegExp(`<[^>]+class="[^"]*\\b${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[^"]*"[^>]*>`, 'g');
  const matches = html.match(re) || [];
  if (!matches.length) {
    failures.push(`${token}: nenhum elemento encontrado`);
    return;
  }
  for (const tag of matches) {
    for (const cls of required) {
      const classAttr = tag.match(/class="([^"]+)"/)?.[1] || '';
      if (!new RegExp(`(^|\\s)${cls.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$)`).test(classAttr)) {
        failures.push(`${token}: elemento sem ${cls}`);
      }
    }
  }
}

const expectations = {
  'index.html': [
    ['ui-modal', ['doke-overlay']],
    ['ui-modal__backdrop', ['doke-overlay__backdrop']],
    ['ui-modal__dialog', ['doke-overlay__surface']],
    ['ui-modal__header', ['doke-overlay__header']],
    ['ui-modal__actions', ['doke-overlay__actions']],
    ['home-address-modal', ['doke-native-overlay']],
    ['home-address-modal__dialog', ['doke-overlay__surface']],
    ['home-address-modal__head', ['doke-overlay__header']],
    ['home-address-modal__body', ['doke-overlay__body']],
    ['home-address-modal__actions', ['doke-overlay__actions']],
    ['before-after-preview', ['doke-overlay']],
    ['before-after-preview__scrim', ['doke-overlay__backdrop']],
    ['before-after-preview__dialog', ['doke-overlay__surface']],
    ['worker-preview', ['doke-overlay']],
    ['worker-preview__scrim', ['doke-overlay__backdrop']],
    ['worker-preview__stage', ['doke-overlay__surface']],
  ],
  'resultados.html': [
    ['before-after-preview', ['doke-overlay']],
    ['before-after-preview__scrim', ['doke-overlay__backdrop']],
    ['before-after-preview__dialog', ['doke-overlay__surface']],
    ['worker-preview', ['doke-overlay']],
    ['worker-preview__scrim', ['doke-overlay__backdrop']],
    ['worker-preview__stage', ['doke-overlay__surface']],
    ['ui-modal', ['doke-overlay']],
    ['ui-modal__backdrop', ['doke-overlay__backdrop']],
    ['ui-modal__dialog', ['doke-overlay__surface']],
    ['ui-modal__header', ['doke-overlay__header']],
    ['ui-modal__actions', ['doke-overlay__actions']],
  ],
  'novidades.html': [
    ['news-detail-modal', ['doke-overlay']],
    ['news-detail-modal__backdrop', ['doke-overlay__backdrop']],
    ['news-detail-modal__panel', ['doke-overlay__surface']],
    ['news-detail-modal__header', ['doke-overlay__header']],
    ['news-detail-modal__body', ['doke-overlay__body']],
    ['news-detail-modal__actions', ['doke-overlay__actions']],
  ],
  'pagamento-profissional.html': [
    ['payment-submit-state', ['doke-overlay']],
    ['payment-submit-state__backdrop', ['doke-overlay__backdrop']],
    ['payment-submit-state__card', ['doke-overlay__surface']],
    ['payment-submit-state__panel', ['doke-overlay__body']],
    ['payment-submit-state__actions', ['doke-overlay__actions']],
    ['payment-finish-modal', ['doke-overlay']],
    ['payment-finish-modal__backdrop', ['doke-overlay__backdrop']],
    ['payment-finish-modal__card', ['doke-overlay__surface']],
    ['payment-finish-panel', ['doke-overlay__body']],
    ['payment-finish-actions', ['doke-overlay__actions']],
  ],
  'anunciar-servico.html': [
    ['post-service-submit-state', ['doke-overlay']],
    ['post-service-submit-state__card', ['doke-overlay__surface']],
    ['post-service-submit-state__actions', ['doke-overlay__actions']],
  ],
  'tornar-profissional.html': [
    ['become-pro-submit-state', ['doke-overlay']],
    ['become-pro-submit-state__card', ['doke-overlay__surface']],
  ],
  'avaliacao-profissional.html': [
    ['pro-review-success', ['doke-overlay']],
    ['pro-review-success__backdrop', ['doke-overlay__backdrop']],
    ['pro-review-success__card', ['doke-overlay__surface']],
    ['pro-review-success__actions', ['doke-overlay__actions']],
  ],
  'carteira.html': [
    ['wallet-modal', ['doke-overlay']],
    ['wallet-modal__scrim', ['doke-overlay__backdrop']],
    ['wallet-dialog', ['doke-overlay__surface']],
    ['wallet-dialog__header', ['doke-overlay__header']],
    ['wallet-dialog__body', ['doke-overlay__body']],
    ['wallet-dialog__footer', ['doke-overlay__actions']],
  ],
  'comunidade.html': [
    ['community-request-modal', ['doke-overlay']],
    ['community-request-modal__backdrop', ['doke-overlay__backdrop']],
    ['community-request-modal__dialog', ['doke-overlay__surface']],
    ['community-action-modal', ['doke-overlay']],
    ['community-action-modal__backdrop', ['doke-overlay__backdrop']],
    ['community-action-modal__dialog', ['doke-overlay__surface']],
    ['community-action-modal__header', ['doke-overlay__header']],
    ['community-action-modal__body', ['doke-overlay__body']],
    ['community-action-modal__actions', ['doke-overlay__actions']],
  ],
  'orcamento.html': [
    ['budget-success-modal', ['doke-native-overlay']],
    ['budget-success-modal__dialog', ['doke-overlay__surface']],
    ['address-modal', ['doke-native-overlay']],
    ['address-modal__dialog', ['doke-overlay__surface']],
    ['address-modal__head', ['doke-overlay__header']],
    ['address-modal__actions', ['doke-overlay__actions']],
  ],
  'mensagens.html': [
    ['charge-modal', ['doke-native-overlay']],
    ['charge-modal__surface', ['doke-overlay__surface']],
    ['charge-modal__header', ['doke-overlay__header']],
    ['charge-modal__body', ['doke-overlay__body']],
    ['charge-modal__actions', ['doke-overlay__actions']],
  ],
  'pedidos.html': [
    ['doke-mobile-action-panel', ['doke-overlay-panel']],
    ['orders-panel-scrim', ['doke-overlay__backdrop']],
    ['orders-sidepanel', ['doke-overlay__surface']],
    ['orders-sidepanel__header', ['doke-overlay__header']],
    ['orders-sidepanel__body', ['doke-overlay__body']],
  ],
  'notificacoes.html': [
    ['doke-mobile-action-panel', ['doke-overlay-panel']],
  ],
};

for (const [file, rules] of Object.entries(expectations)) {
  const html = read(file);
  for (const [token, required] of rules) {
    hasClassInElement(html, token, required);
  }
}

const modalCss = read('assets/css/components/overlays/modal.css');
for (const token of ['.doke-overlay', '.doke-overlay__backdrop', '.doke-overlay__surface', '.doke-overlay__header', '.doke-overlay__body', '.doke-overlay__actions']) {
  if (!modalCss.includes(token)) failures.push(`modal.css não declara ${token}`);
}

const overlayCss = read('assets/css/components/overlays/overlay-contract.css');
for (const token of ['.doke-overlay', '.doke-native-overlay', '.doke-overlay__backdrop', '.doke-overlay__surface', '.doke-overlay__header', '.doke-overlay__body', '.doke-overlay__actions']) {
  if (!overlayCss.includes(token)) failures.push(`overlay-contract.css não declara ${token}`);
}

const unsafePanel = read('comunidade-interna.html');
if (/community-room-panel[^"<]*\bdoke-overlay\b/.test(unsafePanel)) {
  failures.push('community-room-panel não deve consumir doke-overlay enquanto não usar hidden/display contract');
}

if (failures.length) {
  console.error('audit:overlay-modal-contract falhou:');
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log('audit:overlay-modal-contract OK');

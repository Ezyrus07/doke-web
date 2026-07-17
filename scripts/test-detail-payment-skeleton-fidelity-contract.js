'use strict';

const fs = require('fs');
const assert = require('assert');

const detailHtml = fs.readFileSync('detalhe-anuncio.html', 'utf8');
const detailCss = fs.readFileSync('assets/css/pages/detalhe-anuncio/page-hydration-states.css', 'utf8');
const paymentHtml = fs.readFileSync('pagamento-profissional.html', 'utf8');
const paymentCss = fs.readFileSync('assets/css/pages/pagamento-profissional.css', 'utf8');

for (const token of [
  'detail-hydration-skeleton__thumbs',
  'detail-hydration-skeleton__stats',
  'detail-hydration-skeleton__checklist',
  'detail-hydration-skeleton__specs',
  'detail-hydration-skeleton__provider-row',
  'detail-hydration-skeleton__map'
]) assert(detailHtml.includes(token), `Detalhe sem anatomia obrigatória: ${token}`);

assert(detailCss.includes('.detail-hydration-skeleton:not([hidden])'), 'Skeleton de detalhe deve respeitar hidden');
assert(!detailCss.includes('.detail-hydration-skeleton { display: grid'), 'Skeleton de detalhe não pode forçar display quando hidden');

for (const token of [
  'payment-hydration-skeleton__section-head',
  'payment-hydration-skeleton__number',
  'payment-hydration-skeleton__points',
  'payment-hydration-skeleton__security',
  'payment-hydration-skeleton__summary-heading',
  'payment-hydration-skeleton__links'
]) assert(paymentHtml.includes(token), `Pagamento sem anatomia obrigatória: ${token}`);

assert(paymentCss.includes('.payment-hydration-skeleton:not([hidden])'), 'Skeleton de pagamento deve respeitar hidden');
assert(!paymentCss.includes('.payment-hydration-skeleton {\n  display: grid'), 'Skeleton de pagamento não pode forçar display quando hidden');

console.log('PASS detail-payment-skeleton-fidelity-contract');

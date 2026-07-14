'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const hydration = read('assets/js/core/page-hydration.js');
const payment = read('assets/js/pages/pagamento-profissional.js');
const paymentCss = read('assets/css/pages/pagamento-profissional.css');

assert(
  /const revealReadyOnEmpty = options\.revealReadyOnEmpty !== false/.test(hydration),
  'page-hydration must expose an opt-out for ready surfaces during empty state.'
);
assert(
  /syncReady\(lastHasItems \|\| revealReadyOnEmpty\)/.test(hydration),
  'terminal hydration must not reveal ready surfaces unconditionally.'
);
assert(
  /syncSkeleton\(false\)[\s\S]*syncReady\(lastHasItems \|\| revealReadyOnEmpty\)[\s\S]*setState\(nextState/.test(hydration),
  'terminal surfaces must settle before the terminal state event is published.'
);
assert(
  /revealReadyOnEmpty:\s*false/.test(payment),
  'payment checkout must keep ready content hidden when no valid payment exists.'
);
assert(
  /hasItems:\s*\(\) => paymentContextResolved/.test(payment),
  'payment checkout existence must use resolved payment context, not a standalone order object.'
);
assert(
  /paymentContextResolved = true/.test(payment) && /paymentContextResolved = false/.test(payment),
  'payment context resolution must be explicit on success and failure.'
);
assert(
  /Hydration state exclusivity/.test(paymentCss)
    && /data-page-hydration="hydrating"/.test(paymentCss)
    && /data-page-hydration="ready"/.test(paymentCss)
    && /data-page-hydration="empty"/.test(paymentCss)
    && /data-page-hydration="error"/.test(paymentCss),
  'payment CSS must defensively prevent hydration surfaces from overlapping.'
);
assert(!/!important/.test(paymentCss.slice(paymentCss.lastIndexOf('Hydration state exclusivity'))), 'new payment state contract must not use !important.');

console.log('payment hydration state exclusivity contract: PASS');

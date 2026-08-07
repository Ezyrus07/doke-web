#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('index.html', 'utf8');

const intents = [
  ['for-you', 'Para você', 'true', '0'],
  ['following', 'Seguindo', 'false', '-1'],
  ['top-rated', 'Bem avaliados', 'false', '-1'],
  ['guaranteed', 'Com garantia', 'false', '-1'],
  ['available-today', 'Disponíveis hoje', 'false', '-1'],
  ['newest', 'Novos', 'false', '-1']
];

for (const [intent, label, selected, tabIndex] of intents) {
  const pattern = new RegExp(
    `<button[^>]*data-more-services-intent="${intent}"[^>]*role="tab"[^>]*aria-selected="${selected}"[^>]*aria-pressed="${selected}"[^>]*tabindex="${tabIndex}"[^>]*>${label}</button>`
  );
  assert(pattern.test(html), `${label} must expose the stable ${intent} intent and accessible tab state.`);
}

assert.equal((html.match(/data-more-services-intent=/g) || []).length, 6, 'More services must expose exactly six stable intents.');
assert.equal((html.match(/data-more-services-intent="for-you"[^>]*aria-selected="true"/g) || []).length, 1, 'Only Para você may start selected.');
assert(
  !html.includes('<button class="filter-chip is-active doke-chip" type="button">Com garantia</button>'),
  'Com garantia must not start as a fake applied filter.'
);

const listState = html.indexOf('assets/js/core/list-state.js?v=20260511-data-ready-v1');
const state = html.indexOf('assets/js/pages/home/more-services-state.js?v=20260807-ux-home-002-v1');
const surface = html.indexOf('assets/js/pages/home/more-services-surface.js?v=20260807-ux-home-002-v1');
const controller = html.indexOf('assets/js/pages/index-data-controller.js?v=20260806-ux-home-001-v1');

assert(listState >= 0, 'Canonical list-state must remain loaded.');
assert(state > listState, 'More-services state must load after list-state.');
assert(surface > state, 'More-services surface must load after its state authority.');
assert(controller > surface, 'Index data controller must execute after the more-services presentation boundary is registered.');
assert.equal((html.match(/assets\/js\/pages\/home\/more-services-state\.js\?v=20260807-ux-home-002-v1/g) || []).length, 1);
assert.equal((html.match(/assets\/js\/pages\/home\/more-services-surface\.js\?v=20260807-ux-home-002-v1/g) || []).length, 1);

console.log('ux-home-002-index-contract: ok');
console.log('- stable intents, initial ARIA state, no fake filter and canonical script order validated');

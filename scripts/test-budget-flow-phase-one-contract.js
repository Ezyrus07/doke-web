#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'orcamento.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/orcamento.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/pages/orcamento.js'), 'utf8');

const failures = [];
const assert = (condition, message) => {
  if (!condition) failures.push(message);
};

assert(!html.includes('Preparando sua solicitação de orçamento'), 'remove the floating preparation message');
assert(html.includes('data-budget-hydration-pending'), 'keep an explicit structural pending surface');
assert(html.includes('budget-hydration-skeleton'), 'use a form-shaped hydration skeleton');
assert(/\[data-budget-hydration-pending\], \[data-budget-hydration-ready\]\)\[hidden\][\s\S]*?display:\s*none;/.test(css), 'hidden hydration surfaces must not be revived by grid CSS');
assert(/<header class="become-pro-intro doke-form-page-top">/.test(html), 'keep the static page title visible during hydration');

assert(!html.includes('data-step-progress-label'), 'remove the redundant progress label');
assert(!html.includes('data-step-progress-fill'), 'remove the redundant progress bar');
assert(!html.includes('class="budget-progress '), 'remove the budget progress wrapper');
assert(html.includes('<strong>Detalhes</strong><small>Descrição e perguntas</small>'), 'keep step one focused on description and professional questions');
assert(html.includes('<strong>Data e local</strong><small>Prazo, endereço e anexos</small>'), 'keep step two focused on scheduling, address and attachments');
assert(html.includes('<strong>Revisão</strong><small>Conferir e enviar</small>'), 'rename step three');

assert(!html.includes('Serviço principal'), 'remove the editable service selector label');
assert(!/<select[^>]+name="catégoria"/.test(html), 'do not render an editable category select');
assert(/<input[^>]+data-budget-service-category[^>]+name="catégoria"[^>]+type="hidden"/.test(html), 'preserve the immutable category as hidden form context');
assert(html.includes('Solicitando orçamento para'), 'show the linked service as context');

const scheduleStart = html.indexOf('data-step-panel="prazo"');
const reviewStart = html.indexOf('data-step-panel="revisao"');
const addressPosition = html.indexOf('data-address-required');
assert(scheduleStart >= 0 && reviewStart > scheduleStart, 'keep schedule and review panels ordered');
assert(addressPosition > scheduleStart && addressPosition < reviewStart, 'place address inside Data e local');

assert(html.includes('data-budget-custom-questions'), 'prepare the structured custom-question region');
assert(html.includes('data-budget-custom-question-list'), 'provide a renderer target for custom questions');
assert(html.includes('data-budget-review-custom-answers'), 'prepare custom-answer review');
assert(js.includes('const renderCustomQuestions ='), 'render custom questions from structured service data');
assert(js.includes('const collectCustomAnswers ='), 'collect structured answers');
assert(js.includes('quoteTemplateVersion:'), 'snapshot template version in the order payload');
assert(js.includes('quoteQuestionsSnapshot:'), 'snapshot question definitions in the order payload');
assert(js.includes('quoteAnswers:'), 'persist structured answers in the order payload');
assert(!js.includes('.innerHTML = question'), 'do not render professional-provided HTML');

assert(/\.budget-step\.become-pro-step\.doke-flow-step\s*\{[\s\S]*?border:\s*0;[\s\S]*?box-shadow:/m.test(css), 'step cards remove borders and use the standard shadow');
assert(/\.budget-step\.become-pro-step\.doke-flow-step:is\(\.is-active, \.is-complete\)[\s\S]*?border:\s*0;[\s\S]*?box-shadow:/m.test(css), 'active and complete steps remain borderless with elevated shadow');

assert(js.includes('const addressStepIndex = panels.findIndex'), 'derive address validation from the panel that owns the address');
assert(js.includes('index === addressStepIndex'), 'validate the address in Data e local rather than Review');

if (failures.length) {
  console.error('[budget-flow-phase-one-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[budget-flow-phase-one-contract] ok');
console.log('- stable skeleton replaces floating loading copy');
console.log('- service remains immutable and address belongs to Data e local');
console.log('- custom quote questions are structured, bounded and snapshotted');

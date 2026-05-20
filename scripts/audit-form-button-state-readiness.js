#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-128-form-button-state-readiness-report.json');
const PAGES = [
  'index.html', 'resultados.html', 'perfil.html', 'detalhe-anuncio.html', 'pedidos.html',
  'carteira.html', 'pagamento-profissional.html', 'avaliacao.html',
  'configuracoes.html', 'notificacoes.html', 'mensagens.html',
  'comunidade.html', 'comunidade-interna.html'
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function matches(regex, text) {
  return text.match(regex) || [];
}

function tagAttrs(tag) {
  const match = tag.match(/^<\w+\s*([^>]*)>/i);
  return match ? match[1] : '';
}

function hasStateSignal(attrs) {
  return /\b(disabled|aria-disabled|aria-busy|data-[\w-]*(loading|state|submit|action|disabled|feedback)|type=["']submit["'])/i.test(attrs);
}

const pages = PAGES.map((page) => {
  const html = read(page);
  const buttons = matches(/<button\b[^>]*>/gi, html);
  const forms = matches(/<form\b[^>]*>/gi, html);
  const inputs = matches(/<(?:input|select|textarea)\b[^>]*>/gi, html);
  const buttonsWithStateSignals = buttons.filter((tag) => hasStateSignal(tagAttrs(tag))).length;
  const formsWithStateSignals = forms.filter((tag) => hasStateSignal(tagAttrs(tag)) || /data-[\w-]*(form|feedback|submit|state)/i.test(tagAttrs(tag))).length;
  const submitButtons = buttons.filter((tag) => /type=["']submit["']|data-[\w-]*(submit|save|finish|send|create|confirm)/i.test(tagAttrs(tag))).length;
  const riskySubmitButtons = buttons.filter((tag) => /type=["']submit["']|data-[\w-]*(submit|save|finish|send|create|confirm)/i.test(tagAttrs(tag)) && !/aria-busy|data-[\w-]*(loading|feedback|state|submit)|disabled/i.test(tagAttrs(tag))).length;

  const risks = [];
  if (forms.length && !formsWithStateSignals) risks.push('forms-without-state-hooks');
  if (submitButtons && riskySubmitButtons) risks.push('submit-actions-without-loading-feedback-contract');
  if (buttons.length && buttonsWithStateSignals / Math.max(buttons.length, 1) < 0.15) risks.push('low-button-state-surface');

  return {
    page,
    buttons: buttons.length,
    forms: forms.length,
    inputs: inputs.length,
    submitButtons,
    buttonsWithStateSignals,
    formsWithStateSignals,
    riskySubmitButtons,
    riskLevel: risks.length === 0 ? 'low' : risks.length <= 1 ? 'medium' : 'high',
    risks
  };
});

const summary = {
  pageCount: pages.length,
  totalButtons: pages.reduce((sum, page) => sum + page.buttons, 0),
  totalForms: pages.reduce((sum, page) => sum + page.forms, 0),
  totalInputs: pages.reduce((sum, page) => sum + page.inputs, 0),
  totalSubmitButtons: pages.reduce((sum, page) => sum + page.submitButtons, 0),
  riskySubmitButtons: pages.reduce((sum, page) => sum + page.riskySubmitButtons, 0),
  highRiskPageCount: pages.filter((page) => page.riskLevel === 'high').length,
  mediumRiskPageCount: pages.filter((page) => page.riskLevel === 'medium').length,
  status: 'mapped-with-follow-up'
};

const report = {
  cycle: 128,
  title: 'Form and button state readiness',
  generatedAt: new Date().toISOString(),
  summary,
  pages
};

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[cycle 128] form/button state readiness mapped: ${summary.totalButtons} buttons, risky submit buttons: ${summary.riskySubmitButtons}`);

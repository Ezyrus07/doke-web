#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-126-page-state-surfaces-report.json');
const PAGES = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento.html',
  'finalizar-pedido.html',
  'avaliacao.html',
  'adicionar-cartao.html',
  'configuracoes.html',
  'notificacoes.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade-interna.html'
];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function count(regex, text) {
  return (text.match(regex) || []).length;
}

function unique(regex, text) {
  return Array.from(new Set(Array.from(text.matchAll(regex), (match) => match[1] || match[0]))).sort();
}

function stateSignals(html) {
  const dataAttrs = unique(/\b(data-[a-zA-Z0-9_-]+)/g, html);
  const stateAttrs = dataAttrs.filter((attr) => /(?:state|loading|empty|error|feedback|status|skeleton|placeholder|disabled)/i.test(attr));
  const listStateAttrs = dataAttrs.filter((attr) => /data-list-(?:region|loading|empty|error|message|kind|state|list)|data-list\b/i.test(attr));
  return {
    dataAttributeCount: dataAttrs.length,
    stateAttributeCount: stateAttrs.length,
    stateAttributes: stateAttrs,
    listStateAttributes: listStateAttrs,
    hasLoadingSignal: /data-[^\s=>]*(?:loading|skeleton)|aria-busy|Carregando/i.test(html),
    hasEmptySignal: /data-[^\s=>]*empty|Nenhum|vazio|sem resultado|sem item/i.test(html),
    hasErrorSignal: /data-[^\s=>]*(?:error|feedback)|erro|não foi possível|falha/i.test(html),
    hasAriaLive: /aria-live=/i.test(html),
    hasListRegion: /data-list-region|data-list\b/i.test(html),
    hasViewState: /data-view-state|data-state=/i.test(html),
    hiddenStateNodes: count(/\bhidden\b[^>]*(?:data-[^>]*(?:loading|empty|error|feedback|state)|aria-live)/gi, html)
  };
}

const pages = PAGES.map((page) => {
  const html = read(page);
  const signals = stateSignals(html);
  const risks = [];

  if (!signals.hasLoadingSignal) risks.push('missing-loading-signal');
  if (!signals.hasEmptySignal) risks.push('missing-empty-signal');
  if (!signals.hasErrorSignal) risks.push('missing-error-signal');
  if (!signals.hasAriaLive && (signals.hasLoadingSignal || signals.hasEmptySignal || signals.hasErrorSignal)) {
    risks.push('state-feedback-without-aria-live');
  }

  return {
    page,
    ...signals,
    riskLevel: risks.length === 0 ? 'low' : risks.length <= 2 ? 'medium' : 'high',
    risks
  };
});

const summary = {
  pageCount: pages.length,
  pagesWithLoadingSignal: pages.filter((page) => page.hasLoadingSignal).length,
  pagesWithEmptySignal: pages.filter((page) => page.hasEmptySignal).length,
  pagesWithErrorSignal: pages.filter((page) => page.hasErrorSignal).length,
  pagesWithAriaLive: pages.filter((page) => page.hasAriaLive).length,
  highRiskPageCount: pages.filter((page) => page.riskLevel === 'high').length,
  mediumRiskPageCount: pages.filter((page) => page.riskLevel === 'medium').length,
  lowRiskPageCount: pages.filter((page) => page.riskLevel === 'low').length,
  status: 'mapped-with-follow-up'
};

const report = {
  cycle: 126,
  title: 'Page state surfaces map',
  generatedAt: new Date().toISOString(),
  scope: PAGES,
  summary,
  pages
};

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(`[cycle 126] state surfaces mapped: ${summary.pageCount} pages, high risk: ${summary.highRiskPageCount}`);

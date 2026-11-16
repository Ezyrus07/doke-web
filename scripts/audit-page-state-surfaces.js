#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs/validation/global-cycle-126-page-state-surfaces-report.json');
const CANONICAL_EMPTY_STATE_OWNER = 'assets/css/components/states/empty-state-system.css';
const LEGACY_EMPTY_STATE_OWNER = 'assets/css/components/feedback/empty-state.css';
const PAGES = [
  'index.html',
  'resultados.html',
  'perfil.html',
  'detalhe-anuncio.html',
  'pedidos.html',
  'carteira.html',
  'pagamento-profissional.html',
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

function normalizeAssetPath(fromFile, assetRef) {
  const clean = String(assetRef || '').split('?')[0].split('#')[0].trim();
  if (!clean || /^https?:\/\//i.test(clean)) return null;
  if (clean.startsWith('/')) return clean.replace(/^\/+/, '');
  if (clean.startsWith('assets/')) return clean;
  return path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), clean));
}

function stylesheetLinks(html, page) {
  const links = [];
  const regex = /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const normalized = normalizeAssetPath(page, match[1]);
    if (normalized) links.push(normalized);
  }
  return links;
}

function cssImports(cssFile) {
  const fullPath = path.join(ROOT, cssFile);
  if (!fs.existsSync(fullPath)) return [];
  const css = fs.readFileSync(fullPath, 'utf8');
  const imports = [];
  const regex = /@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?[^;]*;/gi;
  let match;
  while ((match = regex.exec(css))) {
    const normalized = normalizeAssetPath(cssFile, match[1]);
    if (normalized) imports.push(normalized);
  }
  return imports;
}

function collectActiveCss() {
  const active = new Set();
  const queue = [];
  PAGES.forEach((page) => {
    stylesheetLinks(read(page), page).forEach((asset) => queue.push(asset));
  });
  while (queue.length) {
    const asset = queue.shift();
    if (!asset || active.has(asset)) continue;
    active.add(asset);
    cssImports(asset).forEach((imported) => queue.push(imported));
  }
  return active;
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

const activeCss = collectActiveCss();
const ownershipIssues = [];
if (!activeCss.has(CANONICAL_EMPTY_STATE_OWNER)) ownershipIssues.push('canonical-empty-state-owner-not-active');
if (activeCss.has(LEGACY_EMPTY_STATE_OWNER)) ownershipIssues.push('legacy-empty-state-owner-still-active');
const stateSurfaceOwnership = {
  canonicalOwner: CANONICAL_EMPTY_STATE_OWNER,
  canonicalOwnerActive: activeCss.has(CANONICAL_EMPTY_STATE_OWNER),
  legacyOwner: LEGACY_EMPTY_STATE_OWNER,
  legacyOwnerActive: activeCss.has(LEGACY_EMPTY_STATE_OWNER),
  issues: ownershipIssues
};

const summary = {
  pageCount: pages.length,
  pagesWithLoadingSignal: pages.filter((page) => page.hasLoadingSignal).length,
  pagesWithEmptySignal: pages.filter((page) => page.hasEmptySignal).length,
  pagesWithErrorSignal: pages.filter((page) => page.hasErrorSignal).length,
  pagesWithAriaLive: pages.filter((page) => page.hasAriaLive).length,
  highRiskPageCount: pages.filter((page) => page.riskLevel === 'high').length,
  mediumRiskPageCount: pages.filter((page) => page.riskLevel === 'medium').length,
  lowRiskPageCount: pages.filter((page) => page.riskLevel === 'low').length,
  ownershipIssueCount: ownershipIssues.length,
  status: ownershipIssues.length === 0 ? 'mapped-with-follow-up' : 'failed'
};

const report = {
  cycle: 126,
  title: 'Page state surfaces map',
  generatedAt: new Date().toISOString(),
  scope: PAGES,
  status: summary.status,
  summary,
  stateSurfaceOwnership,
  pages
};

fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (ownershipIssues.length) {
  console.error(`[cycle 126] state surface ownership failed: ${ownershipIssues.join(', ')}`);
  process.exit(1);
}
console.log(`[cycle 126] state surfaces mapped: ${summary.pageCount} pages, high risk: ${summary.highRiskPageCount}, canonical empty-state owner: active`);

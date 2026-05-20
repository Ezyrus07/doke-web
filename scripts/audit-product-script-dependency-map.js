#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT = 'docs/validation/global-cycle-76-product-script-inventory-report.json';
const OUTPUT = 'docs/validation/global-cycle-81-product-script-dependency-map-report.json';
const TARGET_PAGES = [
  'mensagens.html',
  'comunidade-interna.html',
  'pagamento-profissional.html',
  'avaliacao.html'
];
const TRANSACTION_PAGES = new Set(['pagamento-profissional.html', 'avaliacao.html']);
const COMMUNICATION_PAGES = new Set(['mensagens.html', 'comunidade-interna.html']);

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

function scriptRole(src) {
  if (src.includes('/core/')) return 'core-runtime';
  if (src.includes('/controllers/')) return 'controller-stack';
  if (src.includes('/services/')) return 'domain-service';
  if (src.includes('/state/')) return 'state-contract';
  if (src.includes('/ui/')) return 'ui-runtime';
  if (src.includes('/components/')) return 'shared-component';
  if (src.includes('/pages/')) return 'page-behavior';
  return 'unknown';
}

function groupForPages(pages) {
  const set = new Set(pages);
  const all = TARGET_PAGES.every((page) => set.has(page));
  const onlyTransactions = pages.length > 0 && pages.every((page) => TRANSACTION_PAGES.has(page));
  const onlyCommunication = pages.length > 0 && pages.every((page) => COMMUNICATION_PAGES.has(page));
  if (all) return 'all-target-pages';
  if (onlyTransactions) return 'transaction-flow';
  if (onlyCommunication) return 'communication-flow';
  if (pages.length === 1) return 'single-page';
  return 'mixed-flow';
}

function removalRisk(src, pages, role) {
  if (role === 'core-runtime' || role === 'controller-stack' || role === 'state-contract') return 'critical-do-not-remove-without-runtime-test';
  if (role === 'domain-service' && pages.length >= 4) return 'high-shared-service';
  if (role === 'ui-runtime' && pages.length >= 4) return 'high-shared-ui-runtime';
  if (role === 'page-behavior' && pages.length === 1) return 'page-owned-review-only';
  if (role === 'shared-component' && pages.length <= 2) return 'medium-component-review';
  return 'manual-review';
}

function hasPageController(src) {
  return /assets\/js\/controllers\/[^/]+-controller\.js$/.test(src);
}

const inventory = readJson(INPUT);
const byScript = new Map();
for (const page of inventory.pages || []) {
  for (const script of page.scripts || []) {
    const src = script.cleanSrc;
    if (!byScript.has(src)) byScript.set(src, { src, pages: [], categories: new Set(), orders: [] });
    const entry = byScript.get(src);
    entry.pages.push(page.page);
    entry.categories.add(script.category);
    entry.orders.push({ page: page.page, order: script.order });
  }
}

const scripts = Array.from(byScript.values())
  .map((entry) => {
    const pages = Array.from(new Set(entry.pages)).sort((a, b) => TARGET_PAGES.indexOf(a) - TARGET_PAGES.indexOf(b));
    const role = scriptRole(entry.src);
    return {
      src: entry.src,
      role,
      categoryGroup: groupForPages(pages),
      pageCount: pages.length,
      pages,
      categories: Array.from(entry.categories).sort(),
      hasPageSpecificController: hasPageController(entry.src),
      removalRisk: removalRisk(entry.src, pages, role),
      orders: entry.orders.sort((a, b) => TARGET_PAGES.indexOf(a.page) - TARGET_PAGES.indexOf(b.page) || a.order - b.order)
    };
  })
  .sort((a, b) => b.pageCount - a.pageCount || a.src.localeCompare(b.src));

const summary = {
  scriptCount: scripts.length,
  allTargetPageScripts: scripts.filter((script) => script.categoryGroup === 'all-target-pages').length,
  transactionFlowScripts: scripts.filter((script) => script.categoryGroup === 'transaction-flow').length,
  communicationFlowScripts: scripts.filter((script) => script.categoryGroup === 'communication-flow').length,
  singlePageScripts: scripts.filter((script) => script.categoryGroup === 'single-page').length,
  criticalOrHighRiskScripts: scripts.filter((script) => /critical|high/.test(script.removalRisk)).length,
  pageOwnedReviewOnlyScripts: scripts.filter((script) => script.removalRisk === 'page-owned-review-only').length
};

const report = {
  cycle: 81,
  name: 'product-script-dependency-map',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'read-only dependency classification',
    targetPages: TARGET_PAGES,
    sourceReport: INPUT,
    removalPerformed: false
  },
  summary,
  scripts
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');
console.log('[cycle-81] Product script dependency map generated.');
console.log(`[cycle-81] Scripts mapped: ${summary.scriptCount}`);
console.log(`[cycle-81] Critical/high risk scripts: ${summary.criticalOrHighRiskScripts}`);
console.log(`[cycle-81] Output: ${OUTPUT}`);

if (summary.scriptCount === 0) process.exitCode = 1;

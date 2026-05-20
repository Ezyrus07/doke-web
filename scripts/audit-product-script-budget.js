#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const INPUT = 'docs/validation/global-cycle-76-product-script-inventory-report.json';
const OUTPUT = 'docs/validation/global-cycle-84-product-script-budget-report.json';

const BASELINE_BUDGETS = {
  'mensagens.html': { maxExternalScripts: 34 },
  'comunidade.html': { maxExternalScripts: 32 },
  'pagamento-profissional.html': { maxExternalScripts: 17 },
  'avaliacao.html': { maxExternalScripts: 16 }
};
const GLOBAL_MAX_UNIQUE_EXTERNAL_SCRIPTS = 44;
const GLOBAL_MAX_TOTAL_EXTERNAL_REFERENCES = 131;

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

const inventory = readJson(INPUT);
const pages = (inventory.pages || []).map((page) => {
  const budget = BASELINE_BUDGETS[page.page];
  const externalScriptCount = page.externalScriptCount;
  return {
    page: page.page,
    externalScriptCount,
    maxExternalScripts: budget ? budget.maxExternalScripts : null,
    status: budget && externalScriptCount <= budget.maxExternalScripts ? 'within-budget' : 'over-budget'
  };
});

const overBudgetPages = pages.filter((page) => page.status === 'over-budget');
const uniqueExternalScripts = inventory.summary ? inventory.summary.uniqueExternalScripts : 0;
const totalExternalScriptReferences = inventory.summary ? inventory.summary.totalExternalScriptReferences : 0;
const globalBudget = {
  uniqueExternalScripts,
  maxUniqueExternalScripts: GLOBAL_MAX_UNIQUE_EXTERNAL_SCRIPTS,
  uniqueStatus: uniqueExternalScripts <= GLOBAL_MAX_UNIQUE_EXTERNAL_SCRIPTS ? 'within-budget' : 'over-budget',
  totalExternalScriptReferences,
  maxTotalExternalScriptReferences: GLOBAL_MAX_TOTAL_EXTERNAL_REFERENCES,
  totalStatus: totalExternalScriptReferences <= GLOBAL_MAX_TOTAL_EXTERNAL_REFERENCES ? 'within-budget' : 'over-budget'
};

const report = {
  cycle: 84,
  name: 'product-script-budget',
  generatedAt: new Date().toISOString(),
  scope: {
    type: 'script volume regression guard',
    sourceReport: INPUT,
    baseline: 'current-safe-baseline-after-critical-state-contracts',
    removalPerformed: false
  },
  summary: {
    pageCount: pages.length,
    overBudgetPageCount: overBudgetPages.length,
    globalBudgetStatus: globalBudget.uniqueStatus === 'within-budget' && globalBudget.totalStatus === 'within-budget' ? 'within-budget' : 'over-budget'
  },
  globalBudget,
  pages
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUTPUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUTPUT), JSON.stringify(report, null, 2) + '\n');
console.log('[cycle-84] Product script budget audit generated.');
console.log(`[cycle-84] Over-budget pages: ${overBudgetPages.length}`);
console.log(`[cycle-84] Output: ${OUTPUT}`);

if (overBudgetPages.length > 0 || report.summary.globalBudgetStatus !== 'within-budget') process.exitCode = 1;

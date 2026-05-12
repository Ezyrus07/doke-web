const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-113-shared-mobile-drawer-migration-plan-report.json');
const PLAN = path.join(ROOT, 'docs', 'SHARED-MOBILE-DRAWER-MIGRATION-PLAN.md');
const CURRENT = 'assets/js/pages/home/drawer.js';
const TARGET = 'assets/js/ui/mobile-drawer.js';

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

const htmlFiles = fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')).sort();
const usages = htmlFiles
  .map((page) => ({ page, usesCurrent: read(path.join(ROOT, page)).includes(CURRENT), usesTarget: read(path.join(ROOT, page)).includes(TARGET) }))
  .filter((item) => item.usesCurrent || item.usesTarget);

const currentExists = fs.existsSync(path.join(ROOT, CURRENT));
const targetAlreadyExists = fs.existsSync(path.join(ROOT, TARGET));
const planText = read(PLAN);
const planReferencesCurrent = planText.includes(CURRENT);
const planReferencesTarget = planText.includes(TARGET);

const report = {
  cycle: 113,
  name: 'shared mobile drawer migration plan',
  status: (targetAlreadyExists && usages.length > 0 && usages.every((item) => item.usesTarget) && planReferencesTarget) ? 'passed' : 'failed',
  policy: {
    movedDrawerNow: true,
    importRewriteNow: true,
    visualChanges: false,
    plannedTarget: TARGET,
  },
  summary: {
    currentPath: CURRENT,
    plannedTarget: TARGET,
    currentExists,
    targetAlreadyExists,
    usageCount: usages.length,
    pagesUsingCurrent: usages.filter((item) => item.usesCurrent).map((item) => item.page),
    pagesUsingTarget: usages.filter((item) => item.usesTarget).map((item) => item.page),
    planReferencesCurrent,
    planReferencesTarget,
  },
  usages,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'passed') {
  console.error('[global-cycle-113] shared mobile drawer migration plan: failed');
  process.exit(1);
}
console.log(`[global-cycle-113] shared mobile drawer migration plan: passed (${usages.length} usages planned)`);

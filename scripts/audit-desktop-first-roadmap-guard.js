const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ROADMAP = path.join(ROOT, 'docs/validation/global-cycle-100-product-reform-roadmap-report.json');
const OUT = path.join(ROOT, 'docs/validation/global-cycle-114-desktop-first-roadmap-guard-report.json');

const roadmap = JSON.parse(fs.readFileSync(ROADMAP, 'utf8'));
const serialized = JSON.stringify(roadmap);
const forbidden = [
  'Start visual/responsive reform now',
  'visual-responsive-priority',
  'ready-for-responsive-review'
];
const forbiddenHits = forbidden.filter((term) => serialized.includes(term));
const hasDesktopFirst = serialized.includes('desktop-first') || serialized.includes('desktop-priority');
const hasResponsiveDeferred = /responsive.*defer|deferred.*responsive/i.test(serialized);
const status = forbiddenHits.length === 0 && hasDesktopFirst && hasResponsiveDeferred ? 'passed' : 'failed';

const report = {
  cycle: 114,
  name: 'desktop-first roadmap guard',
  status,
  policy: {
    desktopFirst: true,
    responsiveDeferred: true,
    visualChanges: false,
  },
  summary: {
    forbiddenHits,
    hasDesktopFirst,
    hasResponsiveDeferred,
    roadmapFile: 'docs/validation/global-cycle-100-product-reform-roadmap-report.json',
  }
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (status !== 'passed') {
  console.error('[global-cycle-114] desktop-first roadmap guard: failed');
  process.exit(1);
}
console.log('[global-cycle-114] desktop-first roadmap guard: passed');

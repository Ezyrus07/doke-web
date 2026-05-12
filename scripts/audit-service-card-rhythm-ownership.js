const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'assets/css/components/cards/service-card.css');
const reportPath = path.join(root, 'docs/validation/global-cycle-23-service-card-rhythm-ownership-report.json');

function fail(message, details = {}) {
  const report = { status: 'failed', message, details, generatedAt: new Date().toISOString() };
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(cssPath)) {
  fail('Missing service-card.css', { cssPath });
}

const css = fs.readFileSync(cssPath, 'utf8');
const checks = [
  {
    name: 'compact child margin reset',
    pattern: /:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__rating,[\s\S]*?\.service-card__footer \{[\s\S]*?margin:\s*0\s*;/,
    forbidden: /:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__rating,[\s\S]*?\.service-card__footer \{[\s\S]*?margin:\s*0\s*!important\s*;/,
  },
  {
    name: 'compact footer rhythm',
    pattern: /:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__footer \{[\s\S]*?min-height:\s*36px\s*;[\s\S]*?padding-top:\s*0\s*;[\s\S]*?align-items:\s*center\s*;/,
    forbidden: /:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__footer \{[\s\S]*?(min-height:\s*36px|padding-top:\s*0|align-items:\s*center)\s*!important\s*;/,
  },
];

const failures = [];
for (const check of checks) {
  if (!check.pattern.test(css)) failures.push(`${check.name}: expected declaration block not found`);
  if (check.forbidden.test(css)) failures.push(`${check.name}: still uses !important`);
}

if (failures.length) {
  fail('Service-card rhythm ownership audit failed.', { failures });
}

const report = {
  status: 'passed',
  auditedFile: path.relative(root, cssPath),
  checks: checks.map((check) => check.name),
  remainingImportantCount: (css.match(/!important/g) || []).length,
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log('Service-card rhythm ownership audit passed.');

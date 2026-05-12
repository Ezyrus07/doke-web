const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'docs/DATA-READY-CONTRACTS.md',
  'assets/js/core/data-rendering.js',
  'assets/js/components/renderers/card-renderers.js',
  'assets/js/components/renderers/README.md'
];

const expectations = [
  ['assets/js/core/data-rendering.js', ['Doke.dataRendering', 'renderList', 'cloneTemplate', 'setText', 'setImage']],
  ['assets/js/components/renderers/card-renderers.js', ['Doke.renderers', 'renderServiceCard', 'renderWorkerCard', 'renderPublicationCard', 'renderReviewCard']],
  ['docs/DATA-READY-CONTRACTS.md', ['data-service-card', 'data-worker-card', 'data-publication-card', 'data-review-card', 'data-render-state']]
];

const forbiddenPatterns = [
  { file: 'assets/js/core/data-rendering.js', pattern: /fetch\s*\(/, reason: 'core renderer não deve buscar dados' },
  { file: 'assets/js/components/renderers/card-renderers.js', pattern: /fetch\s*\(/, reason: 'component renderer não deve buscar dados' },
  { file: 'assets/js/components/renderers/card-renderers.js', pattern: /supabase/i, reason: 'component renderer não deve conhecer Supabase/Firebase' }
];

const issues = [];
const report = {
  checkedAt: new Date().toISOString(),
  requiredFiles,
  expectations: expectations.map(([file, snippets]) => ({ file, snippets })),
  forbiddenPatterns: forbiddenPatterns.map((item) => ({ file: item.file, reason: item.reason })),
  issues: []
};

for (const file of requiredFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) issues.push(`Missing required file: ${file}`);
}

for (const [file, snippets] of expectations) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  for (const snippet of snippets) {
    if (!content.includes(snippet)) issues.push(`Expected snippet not found in ${file}: ${snippet}`);
  }
}

for (const item of forbiddenPatterns) {
  const full = path.join(root, item.file);
  if (!fs.existsSync(full)) continue;
  const content = fs.readFileSync(full, 'utf8');
  if (item.pattern.test(content)) issues.push(`${item.file}: ${item.reason}`);
}

const validationDir = path.join(root, 'docs/validation');
fs.mkdirSync(validationDir, { recursive: true });
report.issues = issues;
fs.writeFileSync(
  path.join(validationDir, 'global-cycle-12-data-ready-report.json'),
  JSON.stringify(report, null, 2)
);

if (issues.length) {
  console.error('Data-ready contract audit failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('Data-ready contract audit passed.');
console.log(`Checked files: ${requiredFiles.length}`);

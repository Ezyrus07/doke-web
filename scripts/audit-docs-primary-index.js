#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const validationDir = path.join(docsDir, 'validation');
const reportPath = path.join(validationDir, 'global-cycle-63-docs-primary-index-report.json');

const requiredReferences = [
  {
    file: 'docs/README.md',
    requiredText: 'ACTIVE-CONTRACTS-INDEX.md',
    purpose: 'Docs overview must point readers to the active contracts index first.',
  },
  {
    file: 'docs/DOCS-REGISTRY.md',
    requiredText: 'ACTIVE-CONTRACTS-INDEX.md',
    purpose: 'Docs registry must identify the active contracts index as the primary source for current rules.',
  },
];

const errors = [];
const checkedFiles = [];

for (const item of requiredReferences) {
  const absolute = path.join(root, item.file);
  const exists = fs.existsSync(absolute);
  const text = exists ? fs.readFileSync(absolute, 'utf8') : '';
  const hasReference = text.includes(item.requiredText);

  checkedFiles.push({
    file: item.file,
    exists,
    requiredText: item.requiredText,
    hasReference,
    purpose: item.purpose,
  });

  if (!exists) {
    errors.push(`${item.file} is missing.`);
    continue;
  }

  if (!hasReference) {
    errors.push(`${item.file} must reference ${item.requiredText}.`);
  }
}

fs.mkdirSync(validationDir, { recursive: true });
const report = {
  cycle: 63,
  name: 'docs-primary-index',
  ok: errors.length === 0,
  checkedAt: new Date().toISOString(),
  checkedFiles,
  errors,
};

fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

if (errors.length) {
  console.error('Docs primary index audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Docs primary index audit passed.');
console.log(JSON.stringify({ checkedFiles: checkedFiles.length, report: path.relative(root, reportPath).replace(/\\/g, '/') }, null, 2));

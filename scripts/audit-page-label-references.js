#!/usr/bin/env node
/*
 * Doke page label reference contract.
 *
 * Purpose: every aria-labelledby reference in active root HTML files must point
 * to an element that exists in the same document. This protects page-level
 * headings and modal/section labels from silent semantic regressions.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'reports', 'generated', 'page-label-references-report.json');

function activeRootHtmlFiles() {
  return fs.readdirSync(ROOT)
    .filter((file) => file.endsWith('.html'))
    .filter((file) => !file.startsWith('_'))
    .sort();
}

function collectIds(html) {
  const ids = new Set();
  const idPattern = /\bid\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = idPattern.exec(html))) {
    if (match[2]) ids.add(match[2]);
  }
  return ids;
}

function collectLabelledBy(html) {
  const references = [];
  const labelPattern = /\baria-labelledby\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = labelPattern.exec(html))) {
    const raw = (match[2] || '').trim();
    if (!raw) continue;
    for (const id of raw.split(/\s+/).filter(Boolean)) {
      references.push({ id, index: match.index });
    }
  }
  return references;
}

const failures = [];
const files = activeRootHtmlFiles();
const samples = [];

for (const file of files) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const ids = collectIds(html);
  const references = collectLabelledBy(html);
  samples.push({ file, references: references.length });

  for (const reference of references) {
    if (!ids.has(reference.id)) {
      failures.push({
        file,
        id: reference.id,
        check: `aria-labelledby references missing id "${reference.id}"`,
      });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  files,
  samples,
  failures,
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[audit:page-label-references] ${report.status.toLowerCase()}`);
console.log(`- files: ${files.length}`);
console.log(`- failures: ${failures.length}`);
console.log(`- report: ${path.relative(ROOT, REPORT)}`);

if (failures.length) process.exitCode = 1;

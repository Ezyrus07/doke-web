#!/usr/bin/env node
/*
 * Shared card CTA contract guard.
 * Index is the visual baseline, but card CTAs must not depend on the index page
 * to receive reusable button semantics. Static HTML and data renderers must attach
 * the same shared button classes used by the baseline card actions.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const reportJson = path.join(reportsDir, 'card-cta-contract-report.json');
const reportMd = path.join(reportsDir, 'card-cta-contract-report.md');

const sources = [
  'index.html',
  'detalhe-anuncio.html',
  'perfil.html',
  'perfil-profissional.html',
  'assets/js/pages/search-results.js',
  'assets/js/controllers/perfil-controller.js',
];

const contracts = [
  {
    name: 'advertisement card CTA',
    marker: 'doke-ad-card__cta',
    required: ['doke-btn', 'doke-btn--success'],
  },
  {
    name: 'professional showcase CTA',
    marker: 'professional-showcase-card__cta',
    required: ['doke-btn', 'doke-btn--primary'],
  },
];

function read(file) {
  return fs.readFileSync(path.join(rootDir, file), 'utf8');
}

function lineNumber(content, index) {
  return content.slice(0, index).split('\n').length;
}

function findClassAttributes(content) {
  const matches = [];
  const pattern = /class=(['"])([^'"]*)\1/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    matches.push({ index: match.index, value: match[2] });
  }
  return matches;
}

function scanSource(file) {
  const content = read(file);
  const classAttributes = findClassAttributes(content);
  const failures = [];

  for (const contract of contracts) {
    for (const attribute of classAttributes) {
      if (!attribute.value.split(/\s+/).includes(contract.marker)) continue;
      const missing = contract.required.filter((className) => !attribute.value.split(/\s+/).includes(className));
      if (!missing.length) continue;
      failures.push({
        file,
        line: lineNumber(content, attribute.index),
        contract: contract.name,
        marker: contract.marker,
        missing,
        classValue: attribute.value,
      });
    }
  }

  return failures;
}

const failures = [];
for (const source of sources) {
  const file = path.join(rootDir, source);
  if (!fs.existsSync(file)) {
    failures.push({ file: source, line: 0, contract: 'source file', marker: 'file', missing: ['exists'], classValue: 'missing' });
    continue;
  }
  failures.push(...scanSource(source));
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  sources,
  contracts,
  failures,
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);
const lines = [
  '# Card CTA contract report',
  '',
  `Generated at: ${report.generatedAt}`,
  `Status: **${report.status}**`,
  '',
  '## Scope',
  '',
  ...sources.map((source) => `- ${source}`),
  '',
  '## Contracts',
  '',
  ...contracts.map((contract) => `- ${contract.marker}: ${contract.required.join(' + ')}`),
  '',
  '## Failures',
  '',
];

if (!failures.length) {
  lines.push('No failures.');
} else {
  lines.push('| file | line | contract | missing | class |', '|---|---:|---|---|---|');
  for (const failure of failures) {
    lines.push(`| ${failure.file} | ${failure.line} | ${failure.contract} | ${failure.missing.join(', ')} | \`${failure.classValue.replace(/\|/g, '\\|')}\` |`);
  }
}
fs.writeFileSync(reportMd, `${lines.join('\n')}\n`);

console.log(`Card CTA contract: ${report.status}`);
console.log(`Failures: ${failures.length}`);
console.log(`Report: ${path.relative(rootDir, reportMd)}`);
if (failures.length) process.exitCode = 1;

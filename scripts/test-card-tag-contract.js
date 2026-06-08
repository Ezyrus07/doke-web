#!/usr/bin/env node
/*
 * Guard for shared service/ad card tag anatomy.
 * Pages and patterns may position/densify tag rows, but the visible anatomy of
 * each tag chip belongs to the canonical card components.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const reportJson = path.join(reportsDir, 'card-tag-contract-report.json');
const reportMd = path.join(reportsDir, 'card-tag-contract-report.md');

const scanRoots = [
  'assets/css/pages',
  'assets/css/patterns',
  'assets/css/components/layout',
  'assets/css/components/shell',
];

const forbiddenProperties = new Set([
  'height',
  'min-height',
  'max-height',
  'padding',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-left',
  'padding-right',
  'border',
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  'background',
  'background-color',
  'color',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'box-shadow',
  'text-transform',
]);

const canonicalFiles = [
  'assets/css/components/cards/service-card.css',
  'assets/css/components/cards/ad-card.css',
  'assets/css/components/cards/marketplace-card-contract.css',
  'assets/css/components/domain/doke-domain-cards.css',
];

function walkCss(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkCss(full);
    return entry.isFile() && entry.name.endsWith('.css') ? [full] : [];
  });
}

function relative(file) {
  return path.relative(rootDir, file).replace(/\\/g, '/');
}

function parseDeclarations(body) {
  return body
    .split(';')
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const index = declaration.indexOf(':');
      if (index === -1) return null;
      return {
        property: declaration.slice(0, index).trim().toLowerCase(),
        value: declaration.slice(index + 1).trim(),
      };
    })
    .filter(Boolean);
}

function isTargetSelector(selector) {
  const normalized = selector.replace(/\s+/g, ' ');
  if (/nth-child|nth-of-type|:has\(/.test(normalized)) return false;
  const ownsServiceTag = normalized.includes('.service-card__tags') && /(?:>|\s|,)span\b/.test(normalized);
  const ownsAdTag = normalized.includes('.doke-ad-card__tags') && /(?:>|\s|,)span\b/.test(normalized);
  return ownsServiceTag || ownsAdTag;
}

function scanFile(file) {
  const css = fs.readFileSync(file, 'utf8');
  const failures = [];
  const rulePattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = rulePattern.exec(css)) !== null) {
    const selector = match[1].trim();
    if (!isTargetSelector(selector)) continue;
    for (const declaration of parseDeclarations(match[2])) {
      if (!forbiddenProperties.has(declaration.property)) continue;
      failures.push({
        file: relative(file),
        selector: selector.replace(/\s+/g, ' '),
        property: declaration.property,
        value: declaration.value,
      });
    }
  }
  return failures;
}

function writeReport(report) {
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Card tag contract report',
    '',
    `Generated at: ${report.generatedAt}`,
    `Status: **${report.status}**`,
    '',
    'Canonical files:',
    ...canonicalFiles.map((file) => `- ${file}`),
    '',
    '## Failures',
    '',
  ];
  if (!report.failures.length) {
    lines.push('No failures.');
  } else {
    lines.push('| file | selector | property | value |', '|---|---|---|---|');
    for (const failure of report.failures) {
      lines.push(`| ${failure.file} | \`${failure.selector}\` | ${failure.property} | \`${failure.value.replace(/\|/g, '\\|')}\` |`);
    }
  }
  fs.writeFileSync(reportMd, `${lines.join('\n')}\n`);
}

const scannedFiles = scanRoots.flatMap((root) => walkCss(path.join(rootDir, root)));
const failures = scannedFiles.flatMap(scanFile);
const missingCanonical = canonicalFiles.filter((file) => !fs.existsSync(path.join(rootDir, file)));
for (const file of missingCanonical) {
  failures.push({ file, selector: 'canonical contract', property: 'file', value: 'missing' });
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  scanRoots,
  canonicalFiles,
  failures,
};

writeReport(report);
console.log(`Card tag contract: ${report.status}`);
console.log(`Failures: ${failures.length}`);
console.log(`Report: ${path.relative(rootDir, reportMd)}`);
if (failures.length) process.exitCode = 1;

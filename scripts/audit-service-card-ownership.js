#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const componentPath = 'assets/css/components/cards/service-card.css';
const patternPath = 'assets/css/patterns/service-card-grid.css';
const component = fs.readFileSync(path.join(root, componentPath), 'utf8');
const pattern = fs.readFileSync(path.join(root, patternPath), 'utf8');
const errors = [];

const forbiddenComponentSelectors = [
  /(^|\n)\s*\.service-cards-grid\s*,/,
  /(^|\n)\s*\.service-grid\s*\{/,
  /(^|\n)\s*\.service-grid--compact\s*\{/,
];

for (const selector of forbiddenComponentSelectors) {
  if (selector.test(component)) {
    errors.push(`${componentPath} still owns grid/layout selectors. Move them to ${patternPath}.`);
  }
}

for (const required of ['.service-cards-grid', '.service-grid', '.service-grid--compact']) {
  if (!pattern.includes(required)) {
    errors.push(`${patternPath} is missing ${required}.`);
  }
}

const manifestChecks = [
  'assets/css/pages/home.css',
  'assets/css/pages/search-results.css',
  'assets/css/pages/perfil.css',
];

for (const relative of manifestChecks) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  const source = fs.readFileSync(absolute, 'utf8');
  if (source.includes('components/cards/service-card.css') && !source.includes('patterns/service-card-grid.css')) {
    errors.push(`${relative} imports service-card.css but not service-card-grid.css.`);
  }
}

const reportDir = path.join(root, 'docs/validation');
fs.mkdirSync(reportDir, { recursive: true });
const report = {
  checkedAt: new Date().toISOString(),
  componentPath,
  patternPath,
  manifestChecks,
  errors,
  status: errors.length ? 'failed' : 'passed',
};
fs.writeFileSync(path.join(reportDir, 'global-cycle-10-service-card-ownership-report.json'), JSON.stringify(report, null, 2));

if (errors.length) {
  console.error('Service card ownership audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Service card ownership audit passed.');

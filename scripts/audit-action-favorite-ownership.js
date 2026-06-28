#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const failures = [];
const warnings = [];

const canonical = 'assets/css/components/actions/favorite-action.css';
const legacy = 'assets/css/components/cards/service-card-actions.css';
const serviceCard = 'assets/css/components/cards/service-card.css';

if (!exists(canonical)) failures.push(`${canonical} does not exist.`);
if (!exists(legacy)) failures.push(`${legacy} does not exist.`);
if (!exists(serviceCard)) failures.push(`${serviceCard} does not exist.`);

if (exists(canonical)) {
  const css = read(canonical);
  if (!css.includes('.doke-favorite-button')) failures.push(`${canonical} must define .doke-favorite-button.`);
  if (!css.includes('.service-card__favorite')) failures.push(`${canonical} must keep compatibility for .service-card__favorite.`);
  if (/!important\b/.test(css)) failures.push(`${canonical} must not use !important.`);
}

if (exists(legacy)) {
  const css = read(legacy);
  if (!css.includes('../actions/favorite-action.css')) failures.push(`${legacy} must delegate to the canonical favorite-action.css contract.`);
  if (/!important\b/.test(css)) failures.push(`${legacy} must not use !important.`);
  const ruleCount = (css.match(/\{[^}]*\}/g) || []).length;
  if (ruleCount > 0) warnings.push(`${legacy} should remain a compatibility import only; found ${ruleCount} CSS block(s).`);
}

if (exists(serviceCard)) {
  const css = read(serviceCard);
  if (/\.service-card__favorite\s*\{/.test(css) || /\.service-card__favorite\s+svg\s*\{/.test(css)) {
    failures.push(`${serviceCard} must not own favorite button styling.`);
  }
}

const manifests = [
  'assets/css/pages/home.css',
  'assets/css/pages/home-sections.css',
  'assets/css/pages/home/sections.css',
  'assets/css/pages/perfil.css',
  'assets/css/pages/search-results.css',
];

for (const file of manifests) {
  if (!exists(file)) {
    warnings.push(`${file} does not exist.`);
    continue;
  }
  const css = read(file);
  if (css.includes('service-card.css') && !css.includes('favorite-action.css')) {
    failures.push(`${file} imports service-card.css but not favorite-action.css.`);
  }
}

for (const file of ['perfil.html', 'resultados.html']) {
  if (!exists(file)) continue;
  const html = read(file);
  const serviceIndex = html.indexOf('assets/css/components/cards/service-card.css');
  if (serviceIndex !== -1) {
    const favoriteIndex = html.indexOf('assets/css/components/actions/favorite-action.css');
    if (favoriteIndex === -1) failures.push(`${file} links service-card.css but not favorite-action.css.`);
    if (favoriteIndex > serviceIndex) failures.push(`${file} must load favorite-action.css before service-card.css.`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'failed' : 'passed',
  failures,
  warnings,
};
const reportPath = path.join(root, 'docs/validation/global-cycle-11-action-favorite-ownership-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('Action/favorite ownership audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Action/favorite ownership audit passed.');
if (warnings.length) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

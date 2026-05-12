#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlPath = path.join(root, 'perfil.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const required = [
  'data-profile-root',
  'data-profile-id=',
  'data-data-ready="profile"',
  'data-profile-name',
  'data-profile-avatar',
  'data-profile-stats',
  'data-profile-actions',
  'data-profile-panel="services"',
  'data-list-region="profile-services"',
  'data-list-kind="services"',
  'data-profile-panel="workers"',
  'data-list-region="profile-workers"',
  'data-list-kind="workers"',
  'data-profile-panel="beforeAfter"',
  'data-list-region="profile-publications"',
  'data-list-kind="publications"',
  'data-profile-panel="reviews"',
  'data-list-region="profile-reviews"',
  'data-list-kind="reviews"',
  'data-profile-data-region="about"',
  'data-list-region="profile-portfolio"',
  'data-list-region="profile-achievements"',
  'data-list-region="profile-certificates"',
  'data-list-region="profile-faq"',
];

const missing = required.filter((token) => !html.includes(token));

const visualRisk = [];
if (/style=\"[^\"]*data-list/.test(html)) {
  visualRisk.push('data hooks must not be added through inline style');
}

const report = {
  page: 'perfil.html',
  requiredHooks: required.length,
  missing,
  visualRisk,
  status: missing.length || visualRisk.length ? 'fail' : 'pass',
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'global-cycle-36-perfil-data-hooks-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (report.status !== 'pass') {
  console.error('Perfil data hooks audit failed.');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('Perfil data hooks audit passed.');

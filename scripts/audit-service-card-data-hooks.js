#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rendererPath = path.join(root, 'assets/js/renderers/service-card-renderer.js');
const renderer = fs.readFileSync(rendererPath, 'utf8');

const requiredHooks = [
  'data-service-card',
  'data-card-kind',
  'data-service-id',
  'data-service-link',
  'data-service-image',
  'data-service-badge',
  'data-favorite-action',
  'data-service-category',
  'data-service-title',
  'data-service-rating',
  'data-rating-value',
  'data-rating-count',
  'data-service-tags',
  'data-service-tag',
  'data-service-avatar',
  'data-service-location',
  'data-service-price',
  'data-service-cta'
];

const forbiddenPatterns = [
  /fetch\s*\(/,
  /XMLHttpRequest/,
  /supabase\s*\./i,
  /firebase\s*\./i,
  /localStorage\s*\./
];

const missingHooks = requiredHooks.filter((hook) => !renderer.includes(hook));
const forbiddenHits = forbiddenPatterns
  .filter((pattern) => pattern.test(renderer))
  .map((pattern) => pattern.toString());

const report = {
  file: 'assets/js/renderers/service-card-renderer.js',
  requiredHooks,
  missingHooks,
  forbiddenHits,
  status: missingHooks.length || forbiddenHits.length ? 'failed' : 'passed'
};

const reportDir = path.join(root, 'docs/validation');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(
  path.join(reportDir, 'global-cycle-26-service-card-data-hooks-report.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (report.status !== 'passed') {
  console.error('Service-card data hooks audit failed.');
  if (missingHooks.length) console.error('Missing hooks:', missingHooks.join(', '));
  if (forbiddenHits.length) console.error('Forbidden renderer responsibilities:', forbiddenHits.join(', '));
  process.exit(1);
}

console.log('Service-card data hooks audit passed.');

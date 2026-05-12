#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  {
    path: 'assets/js/renderers/worker-card-renderer.js',
    name: 'workerCard',
    hooks: ['data-worker-card', 'data-card-kind', 'data-worker-id', 'data-worker-trigger', 'data-worker-title', 'data-worker-poster']
  },
  {
    path: 'assets/js/renderers/publication-card-renderer.js',
    name: 'publicationCard',
    hooks: ['data-publication-card', 'data-card-kind', 'data-publication-id', 'data-publication-media', 'data-publication-title', 'data-publication-actions']
  },
  {
    path: 'assets/js/renderers/review-card-renderer.js',
    name: 'reviewCard',
    hooks: ['data-review-card', 'data-card-kind', 'data-review-id', 'data-review-author', 'data-review-text', 'data-rating-value']
  }
];

const forbidden = ['supabase', 'firebase', 'localStorage', 'sessionStorage', 'fetch(', 'style:'];
const report = { generatedAt: new Date().toISOString(), files: [], ok: true };

for (const item of files) {
  const absolute = path.join(root, item.path);
  const exists = fs.existsSync(absolute);
  const content = exists ? fs.readFileSync(absolute, 'utf8') : '';
  const missingHooks = item.hooks.filter((hook) => !content.includes(hook));
  const forbiddenHits = forbidden.filter((term) => content.includes(term));
  const hasExport = content.includes(`Doke.renderers.${item.name}`);
  const ok = exists && hasExport && missingHooks.length === 0 && forbiddenHits.length === 0;

  report.files.push({
    file: item.path,
    exists,
    renderer: item.name,
    hasExport,
    missingHooks,
    forbiddenHits,
    ok
  });

  if (!ok) report.ok = false;
}

const outDir = path.join(root, 'docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-27-media-review-data-hooks-report.json'), JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error('Media/review data hooks audit failed.');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('Media/review data hooks audit passed.');

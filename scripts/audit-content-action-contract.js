#!/usr/bin/env node
/* Content action contract audit.
   Keeps help/news CTA controls on the shared button component instead of page-owned anatomy. */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const violations = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function fail(message) {
  violations.push(message);
}

function classAttrFor(html, className) {
  const pattern = new RegExp(`<(?:button|a)[^>]*class=["']([^"']*\\b${className}\\b[^"']*)["'][^>]*>`, 'g');
  return [...html.matchAll(pattern)].map((match) => match[1].trim().split(/\s+/));
}

function requireClasses(file, className, requiredClasses) {
  const html = read(file);
  const matches = classAttrFor(html, className);
  if (!matches.length) {
    fail(`${file}: expected at least one .${className} action`);
    return;
  }
  for (const classes of matches) {
    for (const required of requiredClasses) {
      if (!classes.includes(required)) {
        fail(`${file}: .${className} must include .${required}`);
      }
    }
  }
}

function cssBlocksContaining(css, selector) {
  const blocks = [];
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`[^{}]*${escaped}[^{}]*\\{[^{}]*\\}`, 'g');
  let match;
  while ((match = pattern.exec(css))) blocks.push(match[0]);
  return blocks;
}

function forbidPageActionAnatomy(file, selectors, allowedProps = []) {
  const css = read(file);
  const forbiddenProps = [
    'display',
    'align-items',
    'justify-content',
    'gap',
    'min-height',
    'height',
    'padding',
    'border',
    'border-color',
    'border-radius',
    'background',
    'color',
    'box-shadow',
    'font',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-decoration',
    'cursor',
  ];
  for (const selector of selectors) {
    for (const block of cssBlocksContaining(css, selector)) {
      for (const prop of forbiddenProps) {
        if (allowedProps.includes(prop)) continue;
        const propPattern = new RegExp(`(^|[;\\s])${prop.replace('-', '\\-')}\\s*:`, 'm');
        if (propPattern.test(block)) {
          fail(`${file}: page CSS must not own action anatomy for ${selector} (${prop})`);
        }
      }
    }
  }
}

const flowFoundation = read('assets/css/pages/flow-foundation.css');
if (!/\.\.\/components\/buttons\.css/.test(flowFoundation)) {
  fail('assets/css/pages/flow-foundation.css: shared flow manifest must import components/buttons.css for content CTAs');
}

requireClasses('ajuda.html', 'help-support-card__primary', ['doke-btn', 'doke-btn--primary', 'doke-btn--block']);
requireClasses('ajuda.html', 'help-support-card__secondary', ['doke-btn', 'doke-btn--soft', 'doke-btn--block']);
requireClasses('novidades.html', 'news-primary-action', ['doke-btn', 'doke-btn--primary', 'doke-btn--pill']);
requireClasses('novidades.html', 'news-load-more', ['doke-btn', 'doke-btn--ghost', 'doke-btn--pill']);
requireClasses('novidades.html', 'news-detail-modal__secondary', ['doke-btn', 'doke-btn--ghost', 'doke-btn--pill']);

forbidPageActionAnatomy('assets/css/pages/ajuda.css', [
  '.help-support-card__primary',
  '.help-support-card__secondary',
], ['margin-top']);

forbidPageActionAnatomy('assets/css/pages/novidades.css', [
  '.news-primary-action',
  '.news-load-more',
  '.news-detail-modal__secondary',
], ['justify-self']);

const report = {
  ok: violations.length === 0,
  checkedAt: new Date().toISOString(),
  targets: [
    'ajuda.html',
    'novidades.html',
    'assets/css/pages/ajuda.css',
    'assets/css/pages/novidades.css',
    'assets/css/pages/flow-foundation.css',
  ],
  violations,
};

const reportDir = path.join(ROOT, 'reports/generated');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'content-action-contract-report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (!report.ok) {
  console.error('[audit:content-action-contract] violations found:', violations.length);
  violations.forEach((violation) => console.error('- ' + violation));
  process.exit(1);
}

console.log('[audit:content-action-contract] ok');
console.log('- report: reports/generated/content-action-contract-report.json');

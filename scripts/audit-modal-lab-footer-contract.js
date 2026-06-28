#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlPath = path.join(root, 'labs', 'modal-lab.html');
const cssPath = path.join(root, 'assets', 'css', 'components', 'overlays', 'doke-modal-system.css');

function fail(message) {
  console.error(`[audit:modal-lab-footer-contract] ${message}`);
  process.exitCode = 1;
}

const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');

if (!/\.doke-modal__footer\s*{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/.test(css)) {
  fail('doke-modal__footer must use equal 50/50 columns by default.');
}

if (!/\.doke-modal__footer--single\s*{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css)) {
  fail('doke-modal__footer--single must define a single 100% column.');
}

if (!/\.doke-modal__button\s*{[\s\S]*height:\s*var\(--doke-modal-button-height\)/.test(css)) {
  fail('doke-modal__button must have a fixed height from --doke-modal-button-height.');
}

if (!/\.doke-modal__button\s*{[\s\S]*width:\s*100%/.test(css)) {
  fail('doke-modal__button must be width: 100%.');
}

const footerRegex = /<footer\b([^>]*)class="([^"]*\bdoke-modal__footer\b[^"]*)"([^>]*)>([\s\S]*?)<\/footer>/g;
let count = 0;
let match;
while ((match = footerRegex.exec(html)) !== null) {
  count += 1;
  const attrs = `${match[1]} ${match[2]} ${match[3]}`;
  const classes = match[2];
  const body = match[4];
  const buttons = [...body.matchAll(/<(button|a)\b([^>]*)class="([^"]*\bdoke-modal__button\b[^"]*)"/g)].map((m) => m[3]);

  if (classes.includes('doke-modal__footer--single')) {
    if (buttons.length !== 1) {
      fail(`single footer must contain exactly 1 doke-modal__button; found ${buttons.length}.`);
    }
    if (!buttons[0].includes('doke-modal__button--primary')) {
      fail('single footer button must use doke-modal__button--primary.');
    }
    continue;
  }

  if (buttons.length !== 2) {
    fail(`two-action footer must contain exactly 2 doke-modal__button elements; found ${buttons.length}.`);
    continue;
  }

  if (buttons[0].includes('doke-modal__button--primary')) {
    fail('two-action footer must place the secondary button first.');
  }

  if (!buttons[1].includes('doke-modal__button--primary')) {
    fail('two-action footer must place the primary button second.');
  }

  if (/style\s*=/.test(body) || /style\s*=/.test(attrs)) {
    fail('modal lab footer/buttons must not use inline styles.');
  }
}

if (count < 1) {
  fail('No doke-modal__footer instances were found in labs/modal-lab.html.');
}

if (!process.exitCode) {
  console.log(`[audit:modal-lab-footer-contract] OK — ${count} modal footer examples checked.`);
}

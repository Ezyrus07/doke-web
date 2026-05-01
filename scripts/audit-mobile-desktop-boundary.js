#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const cssPath = path.join(root, 'assets/css/components/shell/mobile-app-shell.css');
const css = fs.readFileSync(cssPath, 'utf8');

const requiredSelectors = [
  'body.doke-mobile-shell-mounted .home-search-hero',
  'body.doke-mobile-shell-mounted .home-search-hero__desktop-search',
  'body.doke-mobile-shell-mounted .doke-desktop-search-panel',
  'body.doke-mobile-shell-mounted .topbar',
  'body.doke-mobile-shell-mounted .home-side-meta'
];

const missing = requiredSelectors.filter((selector) => !css.includes(selector));

if (missing.length) {
  console.error('Mobile/Desktop boundary audit failed. Missing selectors:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Mobile/Desktop boundary audit passed.');
console.log(`Selectors checked: ${requiredSelectors.length}`);

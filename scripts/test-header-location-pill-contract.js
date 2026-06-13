#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (message) => {
  console.error(`Header location pill contract: FAIL\n- ${message}`);
  process.exit(1);
};

const headerCss = read('assets/css/layout/header.css');
const requiredCss = [
  'Header location pill contract',
  '--doke-header-location-width',
  '.app-header .home-side-meta__location',
  '.app-header .home-side-meta__location-text',
  '.app-header .home-side-meta__location-dot',
  '.app-header .home-side-meta__caret',
];

for (const token of requiredCss) {
  if (!headerCss.includes(token)) {
    fail(`assets/css/layout/header.css is missing required token: ${token}`);
  }
}

const htmlFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
const problems = [];
for (const file of htmlFiles) {
  const html = read(file);
  if (!html.includes('home-side-meta__location')) continue;

  const locationButtons = html.match(/<button[^>]*class="[^"]*home-side-meta__location[^"]*"[^>]*>[\s\S]*?<\/button>/g) || [];
  if (!locationButtons.length) {
    problems.push(`${file}: uses home-side-meta__location but not as a button contract`);
    continue;
  }

  for (const button of locationButtons) {
    if (!button.includes('home-side-meta__location-text')) {
      problems.push(`${file}: location button is missing home-side-meta__location-text`);
    }
    if (/\sstyle=/.test(button)) {
      problems.push(`${file}: location button contains inline style`);
    }
  }
}

if (problems.length) {
  fail(problems.join('\n- '));
}

console.log('Header location pill contract: PASS');
console.log(`Checked ${htmlFiles.length} HTML files.`);

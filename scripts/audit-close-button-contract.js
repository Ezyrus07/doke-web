#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = tag.match(re);
  return match ? (match[2] ?? match[3] ?? '') : '';
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

const inlineCloseExceptions = [
  'messages-sidebar-search__close',
  'orders-header-search__close',
  'messages-selection-bar__close',
  'messages-reply-preview__close',
  'doke-search-field__button',
];

const sourceFiles = [
  ...fs.readdirSync(ROOT).filter((file) => file.endsWith('.html')),
  ...walkJs(path.join(ROOT, 'assets/js')).map((file) => path.relative(ROOT, file).replace(/\\/g, '/')),
].sort();

function walkJs(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkJs(absolute);
    return entry.isFile() && entry.name.endsWith('.js') ? [absolute] : [];
  });
}

for (const file of sourceFiles) {
  const html = read(file);
  const buttons = html.match(/<button\b[\s\S]*?<\/button>/gi) || [];
  for (const button of buttons) {
    const openTag = button.match(/<button\b[\s\S]*?>/i)?.[0] || '';
    const className = attr(openTag, 'class');
    const ariaLabel = attr(openTag, 'aria-label').toLowerCase();
    const text = stripTags(button);
    const isCloseSemantics = /fechar|close/.test(ariaLabel)
      || /(?:^|\s)[\w-]+__(?:close|dismiss)(?:\s|$)/.test(className)
      || /(?:^|\s)[\w-]+__(?:close|dismiss)--/.test(className);

    if (!isCloseSemantics) continue;
    if (/backdrop|scrim/.test(className)) continue;
    if (inlineCloseExceptions.some((needle) => className.includes(needle))) continue;

    if (!className.split(/\s+/).includes('doke-close-button')) {
      failures.push(`${file}: close control must include doke-close-button -> ${className || '(no class)'}`);
    }

    if (/^[×✕x]$/i.test(text)) {
      failures.push(`${file}: close control must use the canonical SVG icon, not a text glyph -> ${className}`);
    }

    if (text && /fechar/i.test(text) && !button.includes('doke-close-button__label')) {
      failures.push(`${file}: textual close label must use doke-close-button__label -> ${className}`);
    }
  }
}

const modalCss = read('assets/css/components/overlays/modal.css');
if (!modalCss.includes('.doke-close-button')) {
  failures.push('assets/css/components/overlays/modal.css: missing .doke-close-button contract');
}
if (!modalCss.includes('.doke-close-button__label')) {
  failures.push('assets/css/components/overlays/modal.css: missing .doke-close-button__label contract');
}

const surfaceCloseCss = read('assets/css/components/ui-surface/buttons-close.css');
if (!surfaceCloseCss.includes('.doke-close-button')) {
  failures.push('assets/css/components/ui-surface/buttons-close.css: missing .doke-close-button compatibility alias');
}

const resultsDensityCss = read('assets/css/pages/search-results/filter-toggle-density.css');
if (/\.results-filters__close\s*\{/.test(resultsDensityCss)) {
  failures.push('assets/css/pages/search-results/filter-toggle-density.css: results-filters__close must not redefine close button anatomy');
}

if (failures.length) {
  console.error('Close button contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Close button contract OK (${sourceFiles.length} active HTML/JS sources scanned).`);

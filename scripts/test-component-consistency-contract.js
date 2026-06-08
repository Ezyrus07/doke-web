#!/usr/bin/env node
/*
 * Doke shared component consistency guard.
 * Scope: prevent page/shell files from redefining the anatomy of section action
 * links such as "Ver todos". The canonical anatomy belongs to
 * assets/css/components/sections/section-header-canonical-contract.css.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const scannedRoots = [
  'assets/css/pages',
  'assets/css/components/shell',
  'assets/css/patterns'
];

const selectorNeedles = [
  '.section-heading__link',
  '.doke-section-header__action'
];

const forbiddenProperties = new Set([
  'height',
  'min-height',
  'max-height',
  'width',
  'min-width',
  'max-width',
  'padding',
  'padding-inline',
  'padding-inline-start',
  'padding-inline-end',
  'padding-left',
  'padding-right',
  'padding-block',
  'padding-block-start',
  'padding-block-end',
  'padding-top',
  'padding-bottom',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'box-shadow',
  'color',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'text-align'
]);

const allowedFiles = new Set([
  'assets/css/components/sections/section-header-canonical-contract.css',
  'assets/css/components/base/sections.css'
]);

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(absolute, entry.name);
    const rel = path.relative(root, full).replaceAll(path.sep, '/');
    if (entry.isDirectory()) return walk(rel);
    if (!entry.isFile() || !entry.name.endsWith('.css')) return [];
    return [rel];
  });
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function scanFile(file) {
  if (allowedFiles.has(file)) return [];
  const css = stripComments(fs.readFileSync(path.join(root, file), 'utf8'));
  const issues = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = blockPattern.exec(css)) !== null) {
    const selector = match[1].trim();
    if (!selectorNeedles.some((needle) => selector.includes(needle))) continue;

    const body = match[2];
    const declarations = body.split(';');
    for (const declaration of declarations) {
      const propMatch = declaration.match(/(^|\n)\s*([a-zA-Z-]+)\s*:/);
      if (!propMatch) continue;
      const property = propMatch[2];
      if (forbiddenProperties.has(property)) {
        issues.push({ file, selector, property });
      }
    }
  }

  return issues;
}

const files = scannedRoots.flatMap(walk);
const issues = files.flatMap(scanFile);

if (issues.length) {
  console.error('Shared component consistency contract failed.');
  console.error('Section action anatomy must live in components/sections, not page/shell/pattern overrides.');
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.property} in selector ${issue.selector}`);
  }
  process.exit(1);
}

console.log(`Shared component consistency contract passed (${files.length} CSS files scanned).`);

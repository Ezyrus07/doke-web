#!/usr/bin/env node
/*
 * Doke favorite action consistency guard.
 * Scope: favorite/save heart actions that sit over marketplace cards/media.
 * Canonical anatomy belongs to assets/css/components/actions/favorite-action.css.
 * Page/pattern/shell CSS may position a favorite action only when context requires it;
 * it must not redefine size, color, radius, shadow, padding or icon typography.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const scannedRoots = [
  'assets/css/pages',
  'assets/css/patterns',
  'assets/css/components/shell'
];

const selectorNeedles = [
  '.service-card__favorite',
  '.doke-ad-card__favorite',
  '.favorite-button',
  '.heart-button'
];

const selectorExclusions = [
  '.ad-gallery__favorite'
];

const forbiddenProperties = new Set([
  'height',
  'min-height',
  'max-height',
  'width',
  'min-width',
  'max-width',
  'inline-size',
  'min-inline-size',
  'max-inline-size',
  'block-size',
  'min-block-size',
  'max-block-size',
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
  'aspect-ratio'
]);

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
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
  const css = stripComments(fs.readFileSync(path.join(root, file), 'utf8'));
  const issues = [];
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match;

  while ((match = blockPattern.exec(css)) !== null) {
    const selector = match[1].trim();
    if (!selectorNeedles.some((needle) => selector.includes(needle))) continue;
    if (selectorExclusions.some((needle) => selector.includes(needle))) continue;

    const declarations = match[2].split(';');
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
  console.error('Favorite action consistency contract failed.');
  console.error('Favorite button anatomy must live in components/actions/favorite-action.css, not page/shell/pattern overrides.');
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.property} in selector ${issue.selector}`);
  }
  process.exit(1);
}

console.log(`Favorite action consistency contract passed (${files.length} CSS files scanned).`);

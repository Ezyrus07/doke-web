#!/usr/bin/env node
/* Audits page CSS that edits internals of shared marketplace cards.
   Pages may place cards in grids/rails, but card anatomy belongs in assets/css/components/cards/. */

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const scanRoots = [
  path.join(root, 'assets', 'css', 'pages'),
  path.join(root, 'assets', 'css', 'patterns')
];

const sharedCardInternal = /\.(?:doke-ad-card|service-card|publication-card|video-card)__[a-z0-9_-]+/i;
const sharedCardBlock = /\.(?:doke-ad-card|service-card|publication-card|video-card)(?:[\s.{:#>[,+~]|$)/i;
const allowedPlacementProps = /(?:grid-template|grid-auto|grid-column|grid-row|display|gap|width|min-width|max-width|flex|order|margin|padding|overflow|scroll-snap|align|justify|place-|position|left|right|top|bottom|transform|translate|z-index|box-sizing)/i;
const forbiddenAnatomyProps = /(?:height|min-height|max-height|aspect-ratio|border-radius|border|background|box-shadow|font|line-height|letter-spacing|color|object-fit)/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.css') ? [full] : [];
  });
}

const findings = [];

for (const file of scanRoots.flatMap(walk)) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    const touchesInternal = sharedCardInternal.test(trimmed);
    const touchesBlock = sharedCardBlock.test(trimmed) && forbiddenAnatomyProps.test(trimmed);
    const editsAnatomy = forbiddenAnatomyProps.test(trimmed) && !allowedPlacementProps.test(trimmed);
    if (touchesInternal || (touchesBlock && editsAnatomy)) {
      findings.push(`${rel}:${index + 1}: ${trimmed}`);
    }
  });
}

if (findings.length) {
  console.error('Shared card anatomy overrides found outside components/cards:');
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Shared card anatomy audit passed.');

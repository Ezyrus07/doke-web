#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = path.join(root, 'assets/css/pages/home/mobile-hero-feed.css');
const apply = process.argv.includes('--apply');
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

let depth = 0;
let media = null;
let mediaIndex = 0;
let selectorParts = [];
let selector = null;
const declarations = [];

const mediaKind = (header) => /max-width\s*:\s*390px/.test(header) ? 'max390' : /max-width\s*:\s*560px/.test(header) ? 'max560' : 'other';
const declRe = /^\s*([\w-]+)\s*:\s*(.*?)\s*(!important)?\s*;\s*$/;

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  const trimmed = line.trim();

  if (depth === 0 && /^@media\b/.test(trimmed)) {
    mediaIndex += 1;
    media = { index: mediaIndex, kind: mediaKind(trimmed), header: trimmed };
  }

  if (media && depth === 1 && !selector) {
    if (trimmed && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && trimmed !== '*/' && trimmed !== '}') {
      selectorParts.push(trimmed.replace(/\{\s*$/, '').trim());
      if (line.includes('{')) {
        selector = selectorParts.join(' ').replace(/\s+/g, ' ').trim();
        selectorParts = [];
      }
    }
  } else if (media && depth === 2 && selector) {
    const match = line.match(declRe);
    if (match) {
      declarations.push({
        lineIndex: i,
        line: i + 1,
        mediaIndex: media.index,
        mediaKind: media.kind,
        selector,
        property: match[1],
        value: match[2].trim(),
        important: Boolean(match[3])
      });
    }
  }

  for (const ch of line) {
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
  }

  if (selector && depth === 1) selector = null;
  if (media && depth === 0) {
    media = null;
    selectorParts = [];
    selector = null;
  }
}

const covers = (later, earlier) => {
  if (earlier.mediaKind === 'max560') return later.mediaKind === 'max560';
  if (earlier.mediaKind === 'max390') return later.mediaKind === 'max390' || later.mediaKind === 'max560';
  return later.mediaKind === earlier.mediaKind;
};
const canOverride = (later, earlier) => !earlier.important || later.important;

const dead = [];
for (let i = 0; i < declarations.length; i += 1) {
  const current = declarations[i];
  if (current.mediaIndex > 6) continue;
  const later = declarations.slice(i + 1).find((candidate) =>
    candidate.selector === current.selector &&
    candidate.property === current.property &&
    covers(candidate, current) &&
    canOverride(candidate, current)
  );
  if (later) dead.push({ ...current, defeatedByLine: later.line, defeatedByMedia: later.mediaIndex, defeatedByImportant: later.important });
}

const deadLines = new Set(dead.map((entry) => entry.lineIndex));
const candidateLines = lines.filter((_line, index) => !deadLines.has(index));
const before = lines.join('\n');
const candidate = candidateLines.join('\n');
const result = {
  declarations: declarations.length,
  deadDeclarations: dead.length,
  deadImportant: dead.filter((entry) => entry.important).length,
  beforeImportant: (before.match(/!important/g) || []).length,
  afterImportant: (candidate.match(/!important/g) || []).length,
  beforeBytes: Buffer.byteLength(before),
  afterBytes: Buffer.byteLength(candidate),
  byMediaBlock: Object.fromEntries([...new Set(dead.map((d) => d.mediaIndex))].sort((a,b)=>a-b).map((idx) => [idx, dead.filter((d) => d.mediaIndex === idx).length]))
};
console.log(JSON.stringify(result, null, 2));
dead.forEach((entry) => console.log('DEAD ' + JSON.stringify(entry)));
if (apply) fs.writeFileSync(file, candidate.endsWith('\n') ? candidate : candidate + '\n');

#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

function patch(file, before, after) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(before)) throw new Error('Expected block not found in ' + file);
  fs.writeFileSync(file, source.replace(before, after));
}

patch(
  'scripts/audit-msg-001-a02-canonical-authority-boundary.js',
  `if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A06'));
  assert(!msg.nextActions.some(function (item) { return item.includes('MSG-A05:'); }));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {`,
  `if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  assert(msg.nextActions[0].includes('MSG-A07'));
  assert(!msg.nextActions.some(function (item) { return item.includes('MSG-A06:'); }));
} else if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A06'));
  assert(!msg.nextActions.some(function (item) { return item.includes('MSG-A05:'); }));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {`,
);

patch(
  'scripts/audit-msg-001-a03-server-command-boundary.js',
  `if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A06'));
  assert(!msg.nextActions.some(item => item.includes('MSG-A05:')));
} else {`,
  `if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  assert(msg.nextActions[0].includes('MSG-A07'));
  assert(!msg.nextActions.some(item => item.includes('MSG-A06:')));
} else if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A06'));
  assert(!msg.nextActions.some(item => item.includes('MSG-A05:')));
} else {`,
);

patch(
  'scripts/audit-msg-001-a05-attachment-lifecycle.js',
  `assert(matrix.version === '1.3.82');
assert(msg.evidence.some((item) => item.includes('MSG-A05')));
assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
assert(!msg.nextActions.some((item) => item.includes('MSG-A05 —')));`,
  `const matrixVersion = matrix.version.split('.').map(Number);
assert(matrixVersion[0] === 1 && matrixVersion[1] === 3 && matrixVersion[2] >= 82);
assert(msg.evidence.some((item) => item.includes('MSG-A05')));
if (fs.existsSync('config/msg-001-a06-presence-typing-boundary.json')) {
  assert(matrixVersion[2] >= 83);
  assert(msg.nextActions.some((item) => item.includes('MSG-A07')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A06:')));
} else {
  assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
}
assert(!msg.nextActions.some((item) => item.includes('MSG-A05 —')));`,
);

console.log('MSG-A02/A03/A05 cumulative audits patched for A06.');

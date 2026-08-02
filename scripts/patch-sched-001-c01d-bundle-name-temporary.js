#!/usr/bin/env node
'use strict';

const fs = require('fs');
const file = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
let source = fs.readFileSync(file, 'utf8');

const replacements = [
  [
    '  const bundle = candidates.find((candidate) => fs.existsSync(candidate));',
    '  const localSupabaseUmd = candidates.find((candidate) => fs.existsSync(candidate));'
  ],
  [
    "  if (!bundle) throw new Error('Pinned local Supabase UMD browser bundle was not found after npm ci.');",
    "  if (!localSupabaseUmd) throw new Error('Pinned local Supabase UMD browser bundle was not found after npm ci.');"
  ],
  ['      path: bundle', '      path: localSupabaseUmd']
];

for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one canonical bundle rename target, found ${count}: ${before}`);
  source = source.replace(before, after);
}

fs.writeFileSync(file, source);
console.log('Canonical C01D localSupabaseUmd name preserved.');

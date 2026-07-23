#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase', 'functions');
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs']);
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*)["'](\.\.?\/[^"']+)["']/g;

const normalize = (value) => value.split(path.sep).join('/');

const sourceFiles = [];
const functionDirectories = [];
const failures = [];

if (!fs.existsSync(FUNCTIONS_ROOT)) {
  failures.push('Missing Supabase functions directory: supabase/functions');
} else {
  for (const entry of fs.readdirSync(FUNCTIONS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const directory = path.join(FUNCTIONS_ROOT, entry.name);
    functionDirectories.push(directory);
    const entrypoint = path.join(directory, 'index.ts');
    if (!fs.existsSync(entrypoint)) {
      failures.push(`Missing Edge Function entrypoint: ${normalize(path.relative(ROOT, entrypoint))}`);
    }
  }

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(absolute);
        continue;
      }
      if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) sourceFiles.push(absolute);
    }
  };
  walk(FUNCTIONS_ROOT);
}

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const functionRoot = functionDirectories.find((directory) => file === directory || file.startsWith(`${directory}${path.sep}`));
  let match;
  while ((match = IMPORT_PATTERN.exec(source)) !== null) {
    const importPath = match[1];
    const resolved = path.resolve(path.dirname(file), importPath);
    const displayFile = normalize(path.relative(ROOT, file));
    const displayTarget = normalize(path.relative(ROOT, resolved));

    if (!resolved.startsWith(`${functionRoot}${path.sep}`) && resolved !== functionRoot) {
      failures.push(`Relative import escapes its Edge Function boundary: ${displayFile} -> ${importPath}`);
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      failures.push(`Missing relative Edge Function source: ${displayFile} -> ${importPath} (${displayTarget})`);
    }
  }
}

if (failures.length) {
  console.error('Edge Function source closure audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Edge Function source closure audit passed.');
console.log(`Functions checked: ${functionDirectories.length}`);
console.log(`Source files checked: ${sourceFiles.length}`);

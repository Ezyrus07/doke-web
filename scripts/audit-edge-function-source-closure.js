#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_ROOT = path.join(ROOT, 'supabase', 'functions');
const SHARED_ROOT = path.join(FUNCTIONS_ROOT, '_shared');
const SOURCE_EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.cjs']);
const IMPORT_PATTERN = /(?:\bfrom\s*|\bimport\s*)["'](\.\.?\/[^"']+)["']/g;
const HARDENED_FUNCTIONS = [
  'financial-operations',
  'order-event-operations',
  'professional-verification-operations',
  'quote-template-ai',
  'search-public-services-v2',
  'self-service-operations',
  'service-moderation-operations',
  'staging-finance-sandbox',
];
const REQUIRED_HARDENING_MARKERS = [
  '../_shared/http-security.ts',
  'enforceActorRateLimit',
  'readJsonObject',
  'rejectDisallowedOrigin',
  'preflightResponse',
];

const normalize = (value) => value.split(path.sep).join('/');
const isWithin = (candidate, directory) => candidate === directory || candidate.startsWith(`${directory}${path.sep}`);

const sourceFiles = [];
const functionDirectories = [];
const failures = [];

if (!fs.existsSync(FUNCTIONS_ROOT)) {
  failures.push('Missing Supabase functions directory: supabase/functions');
} else {
  for (const entry of fs.readdirSync(FUNCTIONS_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const directory = path.join(FUNCTIONS_ROOT, entry.name);
    if (entry.name === '_shared') continue;
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
  const functionRoot = functionDirectories.find((directory) => isWithin(file, directory));
  const boundaryRoot = isWithin(file, SHARED_ROOT) ? SHARED_ROOT : functionRoot;
  let match;

  while ((match = IMPORT_PATTERN.exec(source)) !== null) {
    const importPath = match[1];
    const resolved = path.resolve(path.dirname(file), importPath);
    const displayFile = normalize(path.relative(ROOT, file));
    const displayTarget = normalize(path.relative(ROOT, resolved));
    const allowed = boundaryRoot && (
      isWithin(resolved, boundaryRoot)
      || (functionRoot && isWithin(resolved, SHARED_ROOT))
    );

    if (!allowed) {
      failures.push(`Relative import escapes its Edge Function boundary: ${displayFile} -> ${importPath}`);
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
      failures.push(`Missing relative Edge Function source: ${displayFile} -> ${importPath} (${displayTarget})`);
    }
  }
}

const sharedSecurityPath = path.join(SHARED_ROOT, 'http-security.ts');
if (!fs.existsSync(sharedSecurityPath)) {
  failures.push('Missing shared Edge HTTP security module: supabase/functions/_shared/http-security.ts');
}

for (const functionName of HARDENED_FUNCTIONS) {
  const entrypoint = path.join(FUNCTIONS_ROOT, functionName, 'index.ts');
  if (!fs.existsSync(entrypoint)) continue;
  const source = fs.readFileSync(entrypoint, 'utf8');

  if (source.includes('"Access-Control-Allow-Origin": "*"')
      || source.includes("'Access-Control-Allow-Origin': '*'")) {
    failures.push(`Wildcard CORS remains in hardened Edge Function: ${functionName}`);
  }

  for (const marker of REQUIRED_HARDENING_MARKERS) {
    if (!source.includes(marker)) {
      failures.push(`Missing ${marker} in hardened Edge Function: ${functionName}`);
    }
  }
}

const migrationPath = path.join(ROOT, 'supabase', 'migrations', '145_edge_function_abuse_guard.sql');
const validationPath = path.join(ROOT, 'supabase', 'tests', '014_edge_function_abuse_guard_validation.sql');
if (!fs.existsSync(migrationPath)) {
  failures.push('Missing migration: supabase/migrations/145_edge_function_abuse_guard.sql');
}
if (!fs.existsSync(validationPath)) {
  failures.push('Missing validation: supabase/tests/014_edge_function_abuse_guard_validation.sql');
}

if (failures.length) {
  console.error('Edge Function source closure audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Edge Function source closure audit passed.');
console.log(`Functions checked: ${functionDirectories.length}`);
console.log(`Source files checked: ${sourceFiles.length}`);
console.log(`HTTP-hardened functions checked: ${HARDENED_FUNCTIONS.length}`);

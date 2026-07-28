#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const migrationPath = path.join(root, 'supabase/migrations/160_service_search_ranking_v1.sql');
let sql = fs.readFileSync(migrationPath, 'utf8');

const replacements = [
  ['pg_catalog.greatest', 'greatest'],
  ['pg_catalog.least', 'least'],
  ['pg_catalog.extract', 'extract']
];

for (const [from, to] of replacements) {
  const count = sql.split(from).length - 1;
  if (count < 1) {
    throw new Error(`[SEARCH-A07 SQL fix] Expected marker missing: ${from}`);
  }
  sql = sql.split(from).join(to);
}

fs.writeFileSync(migrationPath, sql, 'utf8');
console.log('[SEARCH-A07 SQL fix] PostgreSQL conditional-expression syntax normalized.');

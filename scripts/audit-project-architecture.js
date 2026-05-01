#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const required = [
  'docs/FRONTEND-GOVERNANCE.md',
  'docs/DEPRECATED-CSS.md',
  'docs/ui-kit.html',
  'docs/ARCHITECTURE-DECISIONS.md',
  'docs/DATA-MODEL-DRAFT.md',
  'src/features',
  'src/components',
  'src/pages',
  'src/lib',
  'backend/modules',
  'supabase/migrations',
  'tests/e2e'
];

const errors = required.filter((item) => !fs.existsSync(path.join(root, item)));
if (errors.length) {
  console.log('Architecture audit failed:');
  errors.forEach((item) => console.log(`- Missing: ${item}`));
  process.exit(1);
}
console.log('Architecture audit passed.');

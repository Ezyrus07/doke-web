'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const scripts = require(path.join(root, 'package.json')).scripts || {};
const requiredFiles = ['scripts/bind-staging-environment-seeds.js', 'docs/STAGING-SEED-BINDER-RUNBOOK.md', 'supabase/seed/001_seed_reference_data.sql', 'supabase/seed/002_mvp_controlled_seed.sql'];
const requiredScripts = ['audit:staging-seed-binder', 'bind:staging-seeds:dry-run', 'bind:staging-seeds:check-env', 'bind:staging-seeds', 'bind:staging-seeds:report'];
const report = { name: 'audit-staging-seed-binder', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
for (const script of requiredScripts) scripts[script] ? pass(`package.script.${script}.present`) : fail(`Missing package script: ${script}`);
report.status = report.failures.length ? 'failed' : 'staging_seed_binder_contract_ok';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

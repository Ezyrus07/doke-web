'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const requiredFiles = [
  'scripts/prepare-staging-real-command-pack.js',
  'docs/STAGING-REAL-COMMAND-PACK-RUNBOOK.md',
  'config/staging-real.env.example',
  'package.json'
];
const requiredScripts = [
  'audit:staging-real-command-pack',
  'prepare:staging-real-command-pack:dry-run',
  'prepare:staging-real-command-pack:check-env',
  'prepare:staging-real-command-pack',
  'prepare:staging-real-command-pack:report'
];
const report = { name: 'staging-real-command-pack-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
for (const file of requiredFiles) exists(file) ? pass(`${file}.present`) : fail(`Missing required file: ${file}`);
const pkg = readJson('package.json');
if (pkg) for (const script of requiredScripts) pkg.scripts && pkg.scripts[script] ? pass(`package.script.${script}`) : fail(`Missing package script: ${script}`);
const envExample = read('config/staging-real.env.example');
/supabase\.co|service_role|sk-|eyJ/i.test(envExample) ? fail('Env example appears to contain a real credential or project URL.') : pass('env.example.safe.placeholders');
const runner = read('scripts/prepare-staging-real-command-pack.js');
runner.includes('containsSecret') ? pass('runner.secret.scan.present') : fail('Runner must scan env example for real secrets.');
runner.includes('mutatesStaging') ? pass('runner.mutation.disclosure.present') : fail('Runner must disclose staging mutation commands.');
report.status = report.failures.length ? 'failed' : 'staging_real_command_pack_audit_passed';
console.log(JSON.stringify(report, null, 2));
process.exit(report.failures.length ? 1 : 0);
function exists(file) { return fs.existsSync(path.join(root, file)); }
function read(file) { const absolute = path.join(root, file); return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : ''; }
function readJson(file) { try { return JSON.parse(read(file)); } catch { fail(`${file} is not valid JSON.`); return null; } }
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

'use strict';
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const report = { name: 'staging-seed-operator-env-audit', generatedAt: new Date().toISOString(), status: 'not_evaluated', results: [], failures: [] };
const files = ['scripts/prepare-staging-seed-operator-env.js', 'docs/STAGING-SEED-OPERATOR-ENV-RUNBOOK.md', 'config/staging-seed-operator.env.example'];
const scripts = ['prepare:staging-seed-operator-env:dry-run', 'prepare:staging-seed-operator-env:check-env', 'prepare:staging-seed-operator-env:report'];
main();
function main() {
  for (const file of files) fs.existsSync(path.join(root, file)) ? pass(`${file}.present`) : fail(`Missing ${file}`);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const script of scripts) pkg.scripts && pkg.scripts[script] ? pass(`script.${script}.present`) : fail(`Missing script ${script}`);
  const env = fs.readFileSync(path.join(root, 'config/staging-seed-operator.env.example'), 'utf8');
  /DOKE_STAGING_REAL_SEED_OPERATOR_EXECUTE=0/.test(env) ? pass('env.example.seed.execute.default.safe') : fail('Seed operator env must default execute flag to 0.');
  /DOKE_STAGING_SEED_BINDER_CONFIRM=/.test(env) ? pass('env.example.confirm.present') : fail('Seed operator env must include confirmation variable.');
  report.status = report.failures.length ? 'failed' : 'staging_seed_operator_env_audit_passed';
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
}
function pass(name) { report.results.push({ name, status: 'passed' }); }
function fail(message) { report.failures.push(message); }

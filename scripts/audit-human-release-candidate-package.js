'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-human-release-candidate-package', 'private-beta-rc', 'Audit the human release candidate package wiring.');
const reportPath = 'reports/generated/audit-human-release-candidate-package-report.json';
[
  'config/private-beta-human-rc-map.json',
  'docs/HUMAN-RELEASE-CANDIDATE-PACKAGE-RUNBOOK.md',
  'scripts/execute-human-release-candidate-package.js'
].forEach((file) => requireFile(report, file));
[
  'execute:human-release-candidate-package:dry-run',
  'execute:human-release-candidate-package:check-env',
  'execute:human-release-candidate-package:report'
].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'human_release_candidate_package_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, reportPath, process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

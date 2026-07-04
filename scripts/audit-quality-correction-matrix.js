'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-quality-correction-matrix', 'quality', 'Audit quality correction matrix wiring.');
['scripts/execute-quality-correction-matrix.js','docs/QUALITY-CORRECTION-MATRIX-RUNBOOK.md'].forEach((file) => requireFile(report, file));
['execute:quality-correction-matrix:dry-run','execute:quality-correction-matrix:check-env','execute:quality-correction-matrix:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'quality_correction_matrix_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, 'reports/generated/audit-quality-correction-matrix-report.json', process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

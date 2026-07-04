'use strict';
const { makeReport, requireFile, requireScript, finish } = require('./lib/private-beta-resolution-utils');
const report = makeReport('audit-visual-correction-matrix', 'visual', 'Audit visual correction matrix wiring.');
['scripts/execute-visual-correction-matrix.js','docs/VISUAL-CORRECTION-MATRIX-RUNBOOK.md','tests/visual/visual-regression.manifest.json'].forEach((file) => requireFile(report, file));
['execute:visual-correction-matrix:dry-run','execute:visual-correction-matrix:check-env','execute:visual-correction-matrix:report'].forEach((script) => requireScript(report, script));
report.status = report.failures.length ? 'failed' : 'visual_correction_matrix_audit_passed';
report.decision = report.failures.length ? 'NO_GO' : 'GO';
finish(report, 'reports/generated/audit-visual-correction-matrix-report.json', process.argv.includes('--write-report'), report.failures.length ? 1 : 0);

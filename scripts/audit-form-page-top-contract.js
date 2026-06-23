#!/usr/bin/env node
/* Form page top contract audit. */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targets = ['orcamento.html', 'anunciar-servico.html'];
const violations = [];

for (const file of targets) {
  const absolute = path.join(ROOT, file);
  if (!fs.existsSync(absolute)) continue;
  const html = fs.readFileSync(absolute, 'utf8');

  if (!html.includes('doke-form-page-rail')) {
    violations.push(`${file}: missing .doke-form-page-rail`);
  }
  if (!html.includes('doke-form-page-top')) {
    violations.push(`${file}: missing .doke-form-page-top`);
  }
  if (!html.includes('doke-form-page-title')) {
    violations.push(`${file}: missing .doke-form-page-title`);
  }
  if (!html.includes('doke-form-page-grid')) {
    violations.push(`${file}: missing .doke-form-page-grid`);
  }
}

const contractPath = path.join(ROOT, 'assets/css/components/forms/form-page-top-contract.css');
if (!fs.existsSync(contractPath)) {
  violations.push('missing assets/css/components/forms/form-page-top-contract.css');
}

const report = {
  ok: violations.length === 0,
  checkedAt: new Date().toISOString(),
  targets,
  violations
};

const reportDir = path.join(ROOT, 'reports/generated');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'form-page-top-contract-report.json'), JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error('[audit:form-page-top-contract] violations found:', violations.length);
  violations.forEach((violation) => console.error('- ' + violation));
  process.exit(1);
}

console.log('[audit:form-page-top-contract] ok');
console.log('- report: reports/generated/form-page-top-contract-report.json');

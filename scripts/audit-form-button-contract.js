#!/usr/bin/env node
/* Form/Button contract audit.
   Checks adopted flow pages for canonical action containers and button roles. */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targets = [
  {
    file: 'orcamento.html',
    containers: ['budget-actions', 'address-modal__actions', 'budget-success__actions']
  },
  {
    file: 'tornar-profissional.html',
    containers: ['become-pro-actions']
  }
];

const violations = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

for (const target of targets) {
  const absolute = path.join(ROOT, target.file);
  if (!fs.existsSync(absolute)) continue;
  const html = read(target.file);

  for (const className of target.containers) {
    const containerPattern = new RegExp(`<[^>]+class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>`, 'g');
    const matches = html.match(containerPattern) || [];
    if (!matches.length) {
      violations.push(`${target.file}: missing action container .${className}`);
      continue;
    }

    for (const match of matches) {
      if (!/\bdoke-form-actions\b/.test(match)) {
        violations.push(`${target.file}: .${className} must include .doke-form-actions`);
      }
    }
  }

  const primaryLabels = ['Continuar', 'Salvar endereço', 'Ver pedido', 'Enviar solicitação', 'Entendi'];
  const secondaryLabels = ['Cancelar', 'Fechar', 'Voltar', 'Retornar', 'Voltar ao perfil'];

  for (const label of primaryLabels) {
    const pattern = new RegExp(`<(?:button|a)[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|<(?:button|a)[^>]*>[^<]*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const snippets = html.match(pattern) || [];
    for (const snippet of snippets) {
      if (!/\bdoke-btn--primary\b/.test(snippet) && !/\bdoke-btn--success\b/.test(snippet)) {
        violations.push(`${target.file}: primary action "${label}" must include .doke-btn--primary`);
      }
    }
  }

  for (const label of secondaryLabels) {
    const pattern = new RegExp(`<(?:button|a)[^>]*>${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|<(?:button|a)[^>]*>[^<]*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g');
    const snippets = html.match(pattern) || [];
    for (const snippet of snippets) {
      if (!/\bdoke-btn--ghost\b|\bdoke-btn--secondary\b/.test(snippet)) {
        violations.push(`${target.file}: secondary action "${label}" must include secondary/ghost button class`);
      }
    }
  }
}

const report = {
  ok: violations.length === 0,
  checkedAt: new Date().toISOString(),
  targets: targets.map((target) => target.file),
  violations
};

const reportDir = path.join(ROOT, 'reports/generated');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'form-button-contract-report.json'), JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error('[audit:form-button-contract] violations found:', violations.length);
  violations.forEach((violation) => console.error('- ' + violation));
  process.exit(1);
}

console.log('[audit:form-button-contract] ok');
console.log('- report: reports/generated/form-button-contract-report.json');

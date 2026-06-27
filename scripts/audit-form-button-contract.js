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
  },
  {
    file: 'anunciar-servico.html',
    containers: ['post-service-actions']
  },
  {
    file: 'pagamento-profissional.html',
    containers: ['payment-summary__actions']
  }
];

const violations = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const pageButtonCssBoundaries = [
  {
    file: 'assets/css/pages/tornar-profissional.css',
    selectors: ['.become-pro-btn {', '.become-pro-btn--primary', '.become-pro-btn--soft', '.become-pro-actions.doke-form-actions .become-pro-btn']
  },
  {
    file: 'assets/css/pages/anunciar-servico.css',
    selectors: ['.post-service-btn {', '.post-service-btn--primary', '.post-service-btn--soft']
  },
  {
    file: 'assets/css/pages/pagamento-profissional.css',
    selectors: ['.payment-primary-button', '.payment-secondary-button']
  }
];

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

  const primaryLabels = ['Continuar', 'Salvar endereço', 'Enviar solicitação', 'Entendi', 'Confirmar pagamento', 'Finalizar pedido'];
  const secondaryLabels = ['Cancelar', 'Fechar', 'Retornar', 'Voltar ao perfil', 'Abrir conversa'];

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


for (const boundary of pageButtonCssBoundaries) {
  const cssPath = path.join(ROOT, boundary.file);
  if (!fs.existsSync(cssPath)) continue;
  const css = read(boundary.file);
  for (const selector of boundary.selectors) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ \\{$/, '\\s*\\{');
    const blockPattern = new RegExp(`${escaped}[^}]*}`, 'g');
    const blocks = css.match(blockPattern) || [];
    for (const block of blocks) {
      if (/\b(min-height|height|border-radius|background|box-shadow|font|font-weight|border)\s*:/.test(block)) {
        violations.push(`${boundary.file}: page CSS must not own form button anatomy selector "${selector}"`);
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

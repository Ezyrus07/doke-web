#!/usr/bin/env node
/* Form page top contract audit. */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const targets = ['orcamento.html', 'anunciar-servico.html', 'tornar-profissional.html', 'pagamento-profissional.html'];
const forbiddenTopClasses = ['doke-form-page-eyebrow', 'doke-form-page-meta', 'doke-form-page-chip'];
const violations = [];

const cssForbiddenPatterns = [
  { file: 'assets/css/pages/orcamento.css', patterns: ['quote-context-head h1', 'quote-context-head .doke-form-page-description', 'quote-context-head__meta', 'quote-context-head.doke-form-page-top .doke-form-page-title', 'quote-context-head.doke-form-page-top .doke-form-page-description'] },
  { file: 'assets/css/pages/anunciar-servico.css', patterns: ['post-service-intro h1', 'post-service-intro p', 'post-service-intro.doke-form-page-top', 'post-service-intro.doke-form-page-top .doke-form-page-title', 'post-service-intro.doke-form-page-top .doke-form-page-description'] },
  { file: 'assets/css/pages/tornar-profissional.css', patterns: ['become-pro-intro h1', 'become-pro-intro p', 'become-pro-intro.doke-form-page-top', 'become-pro-intro.doke-form-page-top .doke-form-page-title', 'become-pro-intro.doke-form-page-top .doke-form-page-description'] },
  { file: 'assets/css/pages/pagamento-profissional.css', patterns: ['payment-hero {', 'payment-hero.doke-form-page-top', 'payment-hero .doke-form-page-title', 'payment-hero .doke-form-page-description', '--doke-form-page-title-size', '--doke-form-page-title-color', '--doke-form-page-muted'] }
];


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

  const titleMatches = [...html.matchAll(/<h1[^>]*class=["'][^"']*doke-form-page-title[^"']*["'][^>]*>([^<]+)<\/h1>/g)];
  if (!titleMatches.length) {
    violations.push(`${file}: missing h1.doke-form-page-title`);
  }
  titleMatches.forEach((match) => {
    const title = String(match[1] || '').trim();
    if (title && title !== title.toLocaleUpperCase('pt-BR')) {
      violations.push(`${file}: form page title must be uppercase`);
    }
  });

  for (const forbiddenClass of forbiddenTopClasses) {
    if (html.includes(forbiddenClass)) {
      violations.push(`${file}: top block must not include .${forbiddenClass}`);
    }
  }
}

const contractPath = path.join(ROOT, 'assets/css/components/forms/form-page-top-contract.css');
if (!fs.existsSync(contractPath)) {
  violations.push('missing assets/css/components/forms/form-page-top-contract.css');
}

for (const target of cssForbiddenPatterns) {
  const cssPath = path.join(ROOT, target.file);
  if (!fs.existsSync(cssPath)) continue;
  const css = fs.readFileSync(cssPath, 'utf8');
  for (const pattern of target.patterns) {
    if (css.includes(pattern)) {
      violations.push(`${target.file}: form top styling must not be owned by page CSS selector "${pattern}"`);
    }
  }
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

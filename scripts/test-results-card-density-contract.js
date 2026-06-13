#!/usr/bin/env node
/*
 * Result card density contract guard.
 * resultados.html may control grid columns and expose density tokens, but it must
 * not redefine doke-ad-card media/body/footer/CTA anatomy directly in page CSS.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const reportsDir = path.join(rootDir, 'reports');
const reportJson = path.join(reportsDir, 'results-card-density-contract-report.json');
const reportMd = path.join(reportsDir, 'results-card-density-contract-report.md');

const files = {
  renderer: 'assets/js/pages/search-results.js',
  component: 'assets/css/components/cards/ad-card.css',
  pageDensity: 'assets/css/pages/search-results/filter-toggle-density.css',
};

function read(rel) {
  return fs.readFileSync(path.join(rootDir, rel), 'utf8');
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const failures = [];

const renderer = read(files.renderer);
if (!renderer.includes('doke-ad-card--results')) {
  failures.push({
    file: files.renderer,
    contract: 'results renderer card modifier',
    message: 'Rendered result advertisement cards must include doke-ad-card--results.',
  });
}

const component = stripComments(read(files.component));
const requiredComponentSelectors = [
  '.doke-ad-card--results .doke-ad-card__media',
  '.doke-ad-card--results .doke-ad-card__body',
  '.doke-ad-card--results .doke-ad-card__footer',
  '.doke-ad-card--results .doke-ad-card__cta',
];
for (const selector of requiredComponentSelectors) {
  if (!component.includes(selector)) {
    failures.push({
      file: files.component,
      contract: 'component-owned results card anatomy',
      message: `Missing selector ${selector}.`,
    });
  }
}

const pageDensity = stripComments(read(files.pageDensity));
const forbiddenPageAnatomy = [
  '.doke-ad-card__media',
  '.doke-ad-card__body',
  '.doke-ad-card__footer',
  '.doke-ad-card__cta',
];
for (const selector of forbiddenPageAnatomy) {
  if (pageDensity.includes(selector)) {
    failures.push({
      file: files.pageDensity,
      contract: 'page composition boundary',
      message: `Page density CSS must not target card anatomy selector ${selector}; use --doke-ad-results-* tokens instead.`,
    });
  }
}

const requiredTokens = [
  '--doke-ad-results-media-height',
  '--doke-ad-results-media-min-height',
  '--doke-ad-results-body-padding',
  '--doke-ad-results-footer-gap',
  '--doke-ad-results-cta-min-width',
];
for (const token of requiredTokens) {
  if (!pageDensity.includes(token) || !component.includes(token)) {
    failures.push({
      file: `${files.pageDensity} / ${files.component}`,
      contract: 'results card density token bridge',
      message: `Token ${token} must be defined by page composition and consumed by the card component.`,
    });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  files,
  requiredComponentSelectors,
  requiredTokens,
  forbiddenPageAnatomy,
  failures,
};

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(reportJson, `${JSON.stringify(report, null, 2)}\n`);

const lines = [
  '# Results card density contract report',
  '',
  `Generated at: ${report.generatedAt}`,
  `Status: **${report.status}**`,
  '',
  '## Scope',
  '',
  `- Renderer: ${files.renderer}`,
  `- Component authority: ${files.component}`,
  `- Page density/composition: ${files.pageDensity}`,
  '',
  '## Contract',
  '',
  '- Rendered result ad cards must opt into `doke-ad-card--results`.',
  '- `assets/css/components/cards/ad-card.css` owns result card media/body/footer/CTA anatomy.',
  '- `assets/css/pages/search-results/filter-toggle-density.css` may set `--doke-ad-results-*` tokens and grid columns, but must not target card anatomy selectors directly.',
  '',
  '## Failures',
  '',
];

if (!failures.length) {
  lines.push('No failures.');
} else {
  lines.push('| file | contract | message |', '|---|---|---|');
  for (const failure of failures) {
    lines.push(`| ${failure.file} | ${failure.contract} | ${failure.message.replace(/\|/g, '\\|')} |`);
  }
}
fs.writeFileSync(reportMd, `${lines.join('\n')}\n`);

console.log(`Results card density contract: ${report.status}`);
console.log(`Failures: ${failures.length}`);
console.log(`Report: ${path.relative(rootDir, reportMd)}`);
if (failures.length) process.exitCode = 1;

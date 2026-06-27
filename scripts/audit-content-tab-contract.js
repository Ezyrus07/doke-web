const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const checks = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function addFailure(file, message) {
  checks.push({ ok: false, file, message });
}

function addOk(file, message) {
  checks.push({ ok: true, file, message });
}

function classListFromTag(tag) {
  const match = tag.match(/\bclass\s*=\s*(["'])(.*?)\1/s);
  return match ? match[2].trim().split(/\s+/).filter(Boolean) : [];
}

function assertFilteredButtonsUsePill(file, selectorPattern, label) {
  const html = read(file);
  const pattern = new RegExp(`<button\\b(?=[^>]*${selectorPattern})[^>]*>`, 'gis');
  const buttons = [...html.matchAll(pattern)].map((match) => match[0]);
  if (!buttons.length) {
    addFailure(file, `Nenhum botão encontrado para ${label}.`);
    return;
  }

  buttons.forEach((button, index) => {
    const classes = classListFromTag(button);
    if (!classes.includes('doke-tab-pill')) {
      addFailure(file, `${label} #${index + 1} perdeu doke-tab-pill.`);
    }
  });

  if (!checks.some((check) => !check.ok && check.file === file && check.message.includes(label))) {
    addOk(file, `${label} consome doke-tab-pill.`);
  }
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

const bannedProperties = new Set([
  'display',
  'align-items',
  'justify-content',
  'gap',
  'min-height',
  'height',
  'width',
  'padding',
  'padding-inline',
  'padding-left',
  'padding-right',
  'border',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'color',
  'box-shadow',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'transition',
  'transform',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill',
  'cursor',
]);

function selectorOwnsTarget(selector, target) {
  const className = target.replace(/^\./, '');
  const classPattern = new RegExp(`(^|[^a-zA-Z0-9_-])\\.${className}(?![a-zA-Z0-9_-])`);
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => classPattern.test(part));
}

function assertPageCssDoesNotOwnTabAnatomy(file, targetClass) {
  const css = stripComments(read(file));
  const failures = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;
  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const body = match[2];
    if (!selectorOwnsTarget(selector, targetClass)) continue;

    const declarations = [...body.matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) => bannedProperties.has(property));
    if (forbidden.length) {
      failures.push({ selector, forbidden: [...new Set(forbidden)] });
    }
  }

  if (failures.length) {
    failures.forEach((failure) => {
      addFailure(file, `${targetClass} ainda redesenha anatomia (${failure.forbidden.join(', ')}) em "${failure.selector}".`);
    });
  } else {
    addOk(file, `${targetClass} não redesenha anatomia no CSS de página.`);
  }
}

function assertTabsAuthority() {
  const file = 'assets/css/components/tabs/tabs.css';
  const css = read(file);
  const required = [
    '.doke-tab-pill',
    '.doke-tab-pill svg',
    '.doke-tab-pill:is(.is-active, [aria-pressed="true"], [aria-selected="true"])',
    '--doke-tab-pill-height',
    '--doke-tab-pill-icon-size',
  ];

  required.forEach((token) => {
    if (!css.includes(token)) {
      addFailure(file, `Contrato de tabs não contém ${token}.`);
    }
  });

  if (!checks.some((check) => !check.ok && check.file === file)) {
    addOk(file, 'Contrato doke-tab-pill está centralizado em components/tabs/tabs.css.');
  }
}

function assertFlowFoundationImportsTabs() {
  const file = 'assets/css/pages/flow-foundation.css';
  const css = read(file);
  if (!css.includes('../components/tabs/tabs.css')) {
    addFailure(file, 'flow-foundation.css não importa components/tabs/tabs.css.');
  } else {
    addOk(file, 'flow-foundation.css carrega a autoridade de tabs.');
  }
}

function writeReport() {
  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    failures,
    checks,
  };
  const out = path.join(ROOT, 'reports/generated/content-tab-contract-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

assertFilteredButtonsUsePill('ajuda.html', 'data-help-filter=', 'Filtros de ajuda');
assertFilteredButtonsUsePill('novidades.html', 'data-news-filter=', 'Filtros de novidades');
assertPageCssDoesNotOwnTabAnatomy('assets/css/pages/ajuda.css', '.help-tab');
assertPageCssDoesNotOwnTabAnatomy('assets/css/pages/novidades.css', '.news-filter');
assertTabsAuthority();
assertFlowFoundationImportsTabs();

const report = writeReport();
if (!report.ok) {
  console.error('[audit:content-tab-contract] failed');
  report.failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-tab-contract] ok');
console.log('- report: reports/generated/content-tab-contract-report.json');

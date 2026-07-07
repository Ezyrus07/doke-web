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

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function selectorOwnsTarget(selector, target) {
  const className = target.replace(/^\./, '');
  const classPattern = new RegExp(`(^|[^a-zA-Z0-9_-])\\.${className}(?![a-zA-Z0-9_-])`);
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => classPattern.test(part));
}

function assertHelpSearchMarkup() {
  const file = 'ajuda.html';
  const html = read(file);
  const formMatch = html.match(/<form\b(?=[^>]*data-help-search-form)[^>]*>/is);
  if (!formMatch) {
    addFailure(file, 'Campo de busca de ajuda não foi encontrado.');
    return;
  }

  const classes = classListFromTag(formMatch[0]);
  ['help-center-search', 'doke-search-pill', 'doke-search-pill--toolbar'].forEach((className) => {
    if (!classes.includes(className)) {
      addFailure(file, `Campo de busca de ajuda perdeu ${className}.`);
    }
  });

  const inputMatch = html.match(/<input\b(?=[^>]*data-help-search)[^>]*>/is);
  if (!inputMatch) {
    addFailure(file, 'Input de busca de ajuda não foi encontrado.');
  } else {
    const inputClasses = classListFromTag(inputMatch[0]);
    ['doke-search-pill__input', 'doke-input'].forEach((className) => {
      if (!inputClasses.includes(className)) {
        addFailure(file, `Input de busca de ajuda perdeu ${className}.`);
      }
    });
  }

  if (!checks.some((check) => !check.ok && check.file === file)) {
    addOk(file, 'Busca de ajuda consome doke-search-pill e o modificador doke-search-pill--toolbar.');
  }
}

const bannedProperties = new Set([
  'display',
  'align-items',
  'justify-content',
  'gap',
  'min-height',
  'height',
  'padding',
  'padding-inline',
  'padding-left',
  'padding-right',
  'border',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'box-shadow',
  'outline',
  'color',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill',
]);

function assertPageCssDoesNotOwnHelpSearch() {
  const file = 'assets/css/pages/ajuda.css';
  const css = stripComments(read(file));
  const failures = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const ownsHelpSearch = selectorOwnsTarget(selector, '.help-center-search');
    const ownsHelpSearchDescendant = selector.includes('.help-center-search ');
    if (!ownsHelpSearch && !ownsHelpSearchDescendant) continue;

    const declarations = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) => bannedProperties.has(property));
    if (forbidden.length) {
      failures.push({ selector, forbidden: [...new Set(forbidden)] });
    }
  }

  if (failures.length) {
    failures.forEach((failure) => {
      addFailure(file, `.help-center-search ainda redesenha anatomia (${failure.forbidden.join(', ')}) em "${failure.selector}".`);
    });
  } else {
    addOk(file, 'ajuda.css não redesenha a anatomia do campo de busca de ajuda.');
  }
}

function assertSearchAuthority() {
  const file = 'assets/css/components/search/search-bar.css';
  const css = read(file);
  const required = [
    '.doke-search-pill',
    '.doke-search-pill--toolbar',
    '--doke-search-pill-min-height',
    '--doke-search-pill-padding-left',
    '--doke-search-pill-padding-right',
    '--doke-search-pill-radius',
    '--doke-search-pill-button-size',
  ];

  required.forEach((token) => {
    if (!css.includes(token)) {
      addFailure(file, `Contrato de busca não contém ${token}.`);
    }
  });

  if (!checks.some((check) => !check.ok && check.file === file)) {
    addOk(file, 'Contrato doke-search-pill está centralizado em components/search/search-bar.css.');
  }
}

function assertCoreImportsSearchAuthority() {
  const file = 'assets/css/core/components.css';
  const css = read(file);
  if (!css.includes('../components/search/search-field.css')) {
    addFailure(file, 'core/components.css não carrega components/search/search-field.css.');
  } else {
    addOk(file, 'core/components.css preserva o contrato base de busca compartilhada.');
  }

  const helpFoundation = read('assets/css/pages/ajuda-foundation.css');
  if (!helpFoundation.includes('../components/search/search-bar.css')) {
    addFailure('assets/css/pages/ajuda-foundation.css', 'ajuda-foundation.css não carrega components/search/search-bar.css para a busca pill.');
  } else {
    addOk('assets/css/pages/ajuda-foundation.css', 'ajuda-foundation.css carrega a autoridade doke-search-pill.');
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
  const out = path.join(ROOT, 'reports/generated/content-search-contract-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

assertHelpSearchMarkup();
assertPageCssDoesNotOwnHelpSearch();
assertSearchAuthority();
assertCoreImportsSearchAuthority();

const report = writeReport();
if (!report.ok) {
  console.error('[audit:content-search-contract] failed');
  report.failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-search-contract] ok');
console.log('- report: reports/generated/content-search-contract-report.json');

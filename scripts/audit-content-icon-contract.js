const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function fail(file, message, extra = {}) {
  failures.push({ file, message, ...extra });
}

function classListFromTag(tag) {
  const match = tag.match(/\bclass\s*=\s*(["'])(.*?)\1/s);
  return match ? match[2].trim().split(/\s+/).filter(Boolean) : [];
}

function assertClassConsumers(file, baseClass, requiredClasses, expectedCount = null) {
  const html = read(file);
  const tags = [...html.matchAll(new RegExp(`<[^>]+\\bclass=["'][^"']*\\b${baseClass}\\b[^"']*["'][^>]*>`, 'g'))].map((match) => match[0]);
  if (!tags.length) {
    fail(file, `Nenhum consumidor ${baseClass} encontrado.`);
    return;
  }
  if (expectedCount !== null && tags.length !== expectedCount) {
    fail(file, `${baseClass} deveria ter ${expectedCount} ocorrência(s), mas tem ${tags.length}.`);
  }
  tags.forEach((tag, index) => {
    const classes = classListFromTag(tag);
    requiredClasses.forEach((required) => {
      if (!classes.includes(required)) {
        fail(file, `${baseClass} #${index + 1} perdeu ${required}.`, { className: classes.join(' ') });
      }
    });
  });
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function selectorOwnsClass(selector, className) {
  const pattern = new RegExp(`(^|[^a-zA-Z0-9_-])\\.${className}(?![a-zA-Z0-9_-])`);
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => pattern.test(part));
}

const bannedAnatomyProps = new Set([
  'display',
  'place-items',
  'align-items',
  'justify-content',
  'width',
  'height',
  'min-width',
  'min-height',
  'border',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'box-shadow',
  'color',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill',
  'backdrop-filter',
]);

function assertPageCssDoesNotOwnIconAnatomy(file, ownedClasses, allowedByClass = {}) {
  const css = stripComments(read(file));
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const matchedClasses = ownedClasses.filter((className) => selectorOwnsClass(selector, className));
    if (!matchedClasses.length) continue;

    const declarations = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) => {
      if (!bannedAnatomyProps.has(property)) return false;
      return matchedClasses.some((className) => !(allowedByClass[className] || new Set()).has(property));
    });

    if (forbidden.length) {
      fail(file, `Ícone de superfície ainda redesenha anatomia (${[...new Set(forbidden)].join(', ')}) em "${selector}".`);
    }
  }
}

function assertAuthority() {
  const file = 'assets/css/components/internal/surface-contract.css';
  const css = read(file);
  const required = [
    '.content-surface-icon',
    '.content-surface-icon svg',
    '.content-surface-icon--topic',
    '.content-surface-icon--support',
    '.content-surface-icon--compact',
    '.content-surface-icon--floating',
    '.content-surface-icon--cover',
    '.content-surface-icon--cover-primary',
    '.content-surface-icon--cover-community',
    '.content-surface-icon--cover-success',
    '.content-surface-icon--cover-announcement',
    '.content-surface-icon--success',
    '.content-surface-icon--success-alt',
    '--content-surface-icon-size',
    '--content-surface-icon-radius',
  ];

  required.forEach((needle) => {
    if (!css.includes(needle)) {
      fail(file, `Contrato de ícone de superfície não contém ${needle}.`);
    }
  });
}

function assertImport() {
  const file = 'assets/css/pages/internal-shell.css';
  const css = read(file);
  if (!css.includes('../components/internal/surface-contract.css')) {
    fail(file, 'internal-shell.css não carrega components/internal/surface-contract.css.');
  }
}

assertClassConsumers('ajuda.html', 'help-topic-card__icon', ['content-surface-icon', 'content-surface-icon--topic'], 6);
assertClassConsumers('ajuda.html', 'help-support-card__icon', ['content-surface-icon', 'content-surface-icon--support'], 1);
assertClassConsumers('novidades.html', 'news-feature__floating-icon', ['content-surface-icon', 'content-surface-icon--floating'], 1);
assertClassConsumers('novidades.html', 'news-important-card__icon', ['content-surface-icon', 'content-surface-icon--compact'], 3);
assertClassConsumers('novidades.html', 'news-important-card__icon--security', ['content-surface-icon--success'], 1);
assertClassConsumers('novidades.html', 'news-important-card__icon--community', ['content-surface-icon--success-alt'], 1);
assertClassConsumers('novidades.html', 'news-card__cover-icon', ['content-surface-icon', 'content-surface-icon--cover'], 9);
assertClassConsumers('novidades.html', 'content-surface-icon--cover-primary', ['news-card__cover-icon'], 3);
assertClassConsumers('novidades.html', 'content-surface-icon--cover-community', ['news-card__cover-icon'], 2);
assertClassConsumers('novidades.html', 'content-surface-icon--cover-success', ['news-card__cover-icon'], 2);
assertClassConsumers('novidades.html', 'content-surface-icon--cover-announcement', ['news-card__cover-icon'], 2);

assertPageCssDoesNotOwnIconAnatomy('assets/css/pages/ajuda.css', [
  'help-topic-card__icon',
  'help-support-card__icon',
]);

assertPageCssDoesNotOwnIconAnatomy('assets/css/pages/novidades.css', [
  'news-important-card__icon',
  'news-important-card__icon--security',
  'news-important-card__icon--community',
  'news-feature__floating-icon',
  'news-card__cover-icon',
], {
  // Position belongs to the feature visual composition and is intentionally not
  // part of the reusable icon anatomy.
  'news-feature__floating-icon': new Set(),
});

assertAuthority();
assertImport();

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  failures,
  checked: [
    'ajuda.html',
    'novidades.html',
    'assets/css/pages/ajuda.css',
    'assets/css/pages/novidades.css',
    'assets/css/components/internal/surface-contract.css',
    'assets/css/pages/internal-shell.css',
  ],
};

const reportPath = path.join(root, 'reports/generated/content-icon-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('[audit:content-icon-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-icon-contract] ok');
console.log('- report: reports/generated/content-icon-contract-report.json');

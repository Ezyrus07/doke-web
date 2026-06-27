const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function fail(file, message, details = {}) {
  failures.push({ file, message, ...details });
}

function classListFromTag(tag) {
  const match = tag.match(/\bclass\s*=\s*(["'])(.*?)\1/s);
  return match ? match[2].trim().split(/\s+/).filter(Boolean) : [];
}

function tagsWithClass(file, className) {
  const html = read(file);
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [...html.matchAll(new RegExp(`<[^>]+\\bclass=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`, 'g'))]
    .map((match) => match[0]);
}

function assertConsumers(file, baseClass, requiredClasses, expectedCount = null) {
  const tags = tagsWithClass(file, baseClass);
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

const bannedPropsByClass = {
  'news-important-list': new Set(['display', 'gap', 'row-gap', 'column-gap']),
  'news-important-card': new Set(['display', 'grid-template-columns', 'gap', 'row-gap', 'column-gap', 'padding']),
  'news-important-card__body': new Set(['display', 'gap', 'row-gap', 'column-gap', 'min-width', 'font-size']),
  'news-sidebar__link': new Set(['display', 'align-items', 'justify-content', 'gap', 'color', 'font', 'font-size', 'font-weight', 'line-height', 'text-decoration']),
};

function assertPageCssDoesNotOwnSideListAnatomy(file) {
  const css = stripComments(read(file));
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const matchedClasses = Object.keys(bannedPropsByClass).filter((className) => selectorOwnsClass(selector, className));
    if (!matchedClasses.length) continue;

    const declarations = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) =>
      matchedClasses.some((className) => bannedPropsByClass[className].has(property))
    );

    if (forbidden.length) {
      fail(file, `Sidebar/lista local ainda redesenha anatomia (${[...new Set(forbidden)].join(', ')}) em "${selector}".`);
    }
  }
}

function assertAuthority() {
  const file = 'assets/css/components/internal/surface-contract.css';
  const css = read(file);
  [
    '.content-side-list',
    '.content-side-item',
    '.content-side-item__body',
    '.content-side-item__title',
    '.content-side-link',
  ].forEach((needle) => {
    if (!css.includes(needle)) {
      fail(file, `Contrato de side list não contém ${needle}.`);
    }
  });

  const loader = 'assets/css/pages/internal-shell.css';
  if (!read(loader).includes('../components/internal/surface-contract.css')) {
    fail(loader, 'internal-shell.css deve continuar carregando surface-contract.css.');
  }
}

assertConsumers('novidades.html', 'news-important-list', ['content-side-list'], 1);
assertConsumers('novidades.html', 'news-important-card', ['content-side-item'], 3);
assertConsumers('novidades.html', 'news-important-card__body', ['content-side-item__body'], 3);
assertConsumers('novidades.html', 'content-side-item__title', ['content-side-item__title'], 3);
assertConsumers('novidades.html', 'content-side-item__text', ['content-side-item__text'], 3);
assertConsumers('novidades.html', 'content-side-item__meta', ['content-side-item__meta'], 3);
assertConsumers('novidades.html', 'news-sidebar__link', ['content-side-link'], 1);

assertPageCssDoesNotOwnSideListAnatomy('assets/css/pages/novidades.css');
assertAuthority();

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  failures,
  checked: [
    'novidades.html',
    'assets/css/pages/novidades.css',
    'assets/css/components/internal/surface-contract.css',
    'assets/css/pages/internal-shell.css',
  ],
};

const reportPath = path.join(root, 'reports/generated/content-side-list-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('[audit:content-side-list-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-side-list-contract] ok');
console.log('- report: reports/generated/content-side-list-contract-report.json');

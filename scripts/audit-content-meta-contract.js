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
  return [...html.matchAll(new RegExp(`<[^>]+\\bclass=["'][^"']*\\b${escaped}\\b[^"']*["'][^>]*>`, 'g'))].map((match) => match[0]);
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

const bannedMetaProps = new Set([
  'display',
  'align-items',
  'justify-content',
  'gap',
  'width',
  'height',
  'min-width',
  'min-height',
  'padding',
  'padding-inline',
  'padding-left',
  'padding-right',
  'border',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'backdrop-filter',
  'box-shadow',
  'color',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill',
  'cursor',
]);

function assertPageCssDoesNotOwnMetaAnatomy(file, ownedClasses, allowedByClass = {}) {
  const css = stripComments(read(file));
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const matchedClasses = ownedClasses.filter((className) => selectorOwnsClass(selector, className));
    if (!matchedClasses.length) continue;

    const declarations = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) => {
      if (!bannedMetaProps.has(property)) return false;
      return matchedClasses.some((className) => !(allowedByClass[className] || new Set()).has(property));
    });

    if (forbidden.length) {
      fail(file, `Meta/chip/action local ainda redesenha anatomia (${[...new Set(forbidden)].join(', ')}) em "${selector}".`);
    }
  }
}

function assertAuthority() {
  const chipFile = 'assets/css/components/status/chips-badges.css';
  const chipCss = read(chipFile);
  [
    '.doke-chip--content',
    '.doke-chip--on-media',
    '.doke-badge--success',
    '.doke-badge--content',
  ].forEach((needle) => {
    if (!chipCss.includes(needle)) {
      fail(chipFile, `Contrato de chip/badge não contém ${needle}.`);
    }
  });

  const buttonsFile = 'assets/css/components/buttons.css';
  const buttonCss = read(buttonsFile);
  if (!buttonCss.includes('.doke-icon-btn--soft')) {
    fail(buttonsFile, 'Contrato de botão de ícone não contém .doke-icon-btn--soft.');
  }
}

function assertImports() {
  const coreComponents = read('assets/css/core/components.css');
  if (!coreComponents.includes('../components/status/chips-badges.css')) {
    fail('assets/css/core/components.css', 'core/components.css não carrega components/status/chips-badges.css.');
  }

  const flowFoundation = read('assets/css/pages/flow-foundation.css');
  if (!flowFoundation.includes('../components/buttons.css')) {
    fail('assets/css/pages/flow-foundation.css', 'flow-foundation.css não carrega components/buttons.css.');
  }
}

assertConsumers('novidades.html', 'news-kicker', ['doke-chip', 'doke-chip--content'], 11);
assertConsumers('novidades.html', 'news-feature__badge', ['doke-badge', 'doke-badge--success', 'doke-badge--content'], 1);
assertConsumers('novidades.html', 'news-sidebar__pin', ['doke-icon-btn', 'doke-icon-btn--soft'], 1);
assertConsumers('novidades.html', 'news-important-card__pin', ['doke-icon-btn', 'doke-icon-btn--soft'], 3);

const html = read('novidades.html');
const onMediaCount = [...html.matchAll(/class=["'][^"']*\bnews-kicker\b[^"']*\bdoke-chip--on-media\b[^"']*["']/g)].length;
if (onMediaCount !== 9) {
  fail('novidades.html', `Kickers sobre capa deveriam usar doke-chip--on-media 9 vez(es), mas foram encontrados ${onMediaCount}.`);
}

assertPageCssDoesNotOwnMetaAnatomy('assets/css/pages/novidades.css', [
  'news-kicker',
  'news-kicker--featured',
  'news-kicker--security',
  'news-feature__badge',
  'news-sidebar__pin',
  'news-important-card__pin',
], {
  // Positioning belongs to the card/visual composition; visual anatomy belongs
  // to chips, badges and icon button components.
  'news-kicker': new Set(['position', 'z-index']),
  'news-feature__badge': new Set(['position', 'top', 'right']),
});

assertAuthority();
assertImports();

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  failures,
  checked: [
    'novidades.html',
    'assets/css/pages/novidades.css',
    'assets/css/components/status/chips-badges.css',
    'assets/css/components/buttons.css',
    'assets/css/core/components.css',
    'assets/css/pages/flow-foundation.css',
  ],
};

const reportPath = path.join(root, 'reports/generated/content-meta-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('[audit:content-meta-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-meta-contract] ok');
console.log('- report: reports/generated/content-meta-contract-report.json');

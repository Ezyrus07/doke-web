const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];

function addFailure(file, message, extra = {}) {
  checks.push({ ok: false, file, message, ...extra });
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

function selectorOwnsClass(selector, className) {
  const pattern = new RegExp(`(^|[^a-zA-Z0-9_-])\\.${className}(?![a-zA-Z0-9_-])`);
  return selector
    .split(',')
    .map((part) => part.trim())
    .some((part) => pattern.test(part));
}

function assertFaqMarkup() {
  const file = 'ajuda.html';
  const html = read(file);
  const sectionMatch = html.match(/<section\b(?=[^>]*\bhelp-faq\b)[\s\S]*?<\/section>/i);
  if (!sectionMatch) {
    addFailure(file, 'FAQ de ajuda não foi encontrado.');
    return;
  }

  const section = sectionMatch[0];
  const listTag = section.match(/<div\b(?=[^>]*\bhelp-faq__list\b)[^>]*>/i);
  if (!listTag) {
    addFailure(file, 'Lista do FAQ de ajuda não foi encontrada.');
  } else {
    const classes = classListFromTag(listTag[0]);
    if (!classes.includes('content-disclosure')) {
      addFailure(file, 'Lista do FAQ perdeu content-disclosure.');
    }
  }

  const detailTags = [...section.matchAll(/<details\b(?=[^>]*data-help-faq)[^>]*>/gi)].map((match) => match[0]);
  if (!detailTags.length) {
    addFailure(file, 'Itens details do FAQ de ajuda não foram encontrados.');
  }

  detailTags.forEach((tag, index) => {
    const classes = classListFromTag(tag);
    if (!classes.includes('content-disclosure__item')) {
      addFailure(file, `Item ${index + 1} do FAQ perdeu content-disclosure__item.`);
    }
  });

  const summaryTags = [...section.matchAll(/<summary\b[^>]*>/gi)].map((match) => match[0]);
  if (summaryTags.length !== detailTags.length) {
    addFailure(file, 'Quantidade de summaries não corresponde aos itens details do FAQ.');
  }
  summaryTags.forEach((tag, index) => {
    const classes = classListFromTag(tag);
    if (!classes.includes('content-disclosure__summary')) {
      addFailure(file, `Summary ${index + 1} do FAQ perdeu content-disclosure__summary.`);
    }
  });

  const chevrons = [...section.matchAll(/<span\b(?=[^>]*\bhelp-faq__chevron\b)[^>]*>/gi)].map((match) => match[0]);
  if (chevrons.length !== detailTags.length) {
    addFailure(file, 'Quantidade de chevrons não corresponde aos itens details do FAQ.');
  }
  chevrons.forEach((tag, index) => {
    const classes = classListFromTag(tag);
    if (!classes.includes('content-disclosure__chevron')) {
      addFailure(file, `Chevron ${index + 1} do FAQ perdeu content-disclosure__chevron.`);
    }
  });

  const bodies = [...section.matchAll(/<p\b[^>]*>/gi)].map((match) => match[0]);
  if (bodies.length !== detailTags.length) {
    addFailure(file, 'Quantidade de respostas do FAQ não corresponde aos itens details.');
  }
  bodies.forEach((tag, index) => {
    const classes = classListFromTag(tag);
    if (!classes.includes('content-disclosure__body')) {
      addFailure(file, `Resposta ${index + 1} do FAQ perdeu content-disclosure__body.`);
    }
  });

  if (!checks.some((check) => !check.ok && check.file === file)) {
    addOk(file, 'FAQ de ajuda consome o contrato content-disclosure completo.');
  }
}

const bannedProperties = new Set([
  'display',
  'align-items',
  'justify-content',
  'gap',
  'padding',
  'padding-block',
  'padding-inline',
  'padding-left',
  'padding-right',
  'padding-top',
  'padding-bottom',
  'border',
  'border-top',
  'border-bottom',
  'border-color',
  'border-radius',
  'background',
  'background-color',
  'box-shadow',
  'overflow',
  'color',
  'font',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'list-style',
  'cursor',
  'width',
  'height',
  'min-width',
  'min-height',
  'flex',
  'place-items',
  'transition',
  'transform',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'fill',
]);

function assertPageCssDoesNotOwnDisclosure() {
  const file = 'assets/css/pages/ajuda.css';
  const css = stripComments(read(file));
  const failures = [];
  const rulePattern = /([^{}]+)\{([^{}]+)\}/g;
  let match;

  while ((match = rulePattern.exec(css))) {
    const selector = match[1].trim();
    const ownsFaqDisclosure = [
      'help-faq__item',
      'help-faq__chevron',
    ].some((className) => selectorOwnsClass(selector, className));

    const ownsFaqSummary = selector.includes('.help-faq__item summary');
    const ownsFaqBody = selector.includes('.help-faq__item p');
    const ownsFaqList = selectorOwnsClass(selector, 'help-faq__list');

    if (!ownsFaqDisclosure && !ownsFaqSummary && !ownsFaqBody && !ownsFaqList) continue;

    const declarations = [...match[2].matchAll(/([a-zA-Z-]+)\s*:/g)].map((decl) => decl[1]);
    const forbidden = declarations.filter((property) => bannedProperties.has(property));

    const isAllowedListSpacingOnly = ownsFaqList
      && !ownsFaqDisclosure
      && !ownsFaqSummary
      && !ownsFaqBody
      && forbidden.every((property) => property === 'margin' || property === 'margin-top');

    if (!isAllowedListSpacingOnly && forbidden.length) {
      failures.push({ selector, forbidden: [...new Set(forbidden)] });
    }
  }

  if (failures.length) {
    failures.forEach((failure) => {
      addFailure(file, `FAQ ainda redesenha anatomia de disclosure (${failure.forbidden.join(', ')}) em "${failure.selector}".`);
    });
  } else {
    addOk(file, 'ajuda.css não redesenha anatomia do FAQ/disclosure.');
  }
}

function assertDisclosureAuthority() {
  const file = 'assets/css/components/internal/surface-contract.css';
  const css = read(file);
  const required = [
    '.content-disclosure',
    '.content-disclosure__item',
    '.content-disclosure__summary',
    '.content-disclosure__chevron',
    '.content-disclosure__body',
    '--content-disclosure-border',
    '--content-disclosure-radius',
  ];

  required.forEach((token) => {
    if (!css.includes(token)) {
      addFailure(file, `Contrato de disclosure não contém ${token}.`);
    }
  });

  if (!checks.some((check) => !check.ok && check.file === file)) {
    addOk(file, 'Contrato content-disclosure está centralizado em internal/surface-contract.css.');
  }
}

function assertInternalShellImportsSurfaceAuthority() {
  const file = 'assets/css/pages/internal-shell.css';
  const css = read(file);
  if (!css.includes('../components/internal/surface-contract.css')) {
    addFailure(file, 'internal-shell.css não carrega components/internal/surface-contract.css.');
  } else {
    addOk(file, 'internal-shell.css carrega a autoridade de superfície/disclosure compartilhada.');
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
  const out = path.join(root, 'reports/generated/content-disclosure-contract-report.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

assertFaqMarkup();
assertPageCssDoesNotOwnDisclosure();
assertDisclosureAuthority();
assertInternalShellImportsSurfaceAuthority();

const report = writeReport();
if (!report.ok) {
  console.error('[audit:content-disclosure-contract] failed');
  report.failures.forEach((failure) => console.error(`- ${failure.file}: ${failure.message}`));
  process.exit(1);
}

console.log('[audit:content-disclosure-contract] ok');
console.log('- report: reports/generated/content-disclosure-contract-report.json');

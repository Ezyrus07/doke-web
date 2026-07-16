'use strict';

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const rootDir = path.resolve(__dirname, '..');
const cssDir = path.join(rootDir, 'assets', 'css');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
}

function assertContains(relativePath, snippets) {
  const source = read(relativePath);
  for (const snippet of snippets) {
    if (!source.includes(snippet)) {
      failures.push(`${relativePath}: contrato ausente: ${snippet}`);
    }
  }
}

function collectHtmlFiles(directory, output = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'reports', 'test-results'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) collectHtmlFiles(absolute, output);
    else if (entry.name.endsWith('.html')) output.push(absolute);
  }
  return output;
}

function collectActiveCss() {
  const active = new Set();
  const addCss = (absolute) => {
    absolute = path.resolve(absolute);
    if (active.has(absolute) || !fs.existsSync(absolute)) return;
    active.add(absolute);
    const source = fs.readFileSync(absolute, 'utf8');
    for (const match of source.matchAll(/@import\s+(?:url\()?\s*["']([^"']+\.css(?:\?[^"']*)?)["']/gi)) {
      const reference = match[1].split('?')[0];
      if (!/^(?:https?:|\/\/)/.test(reference)) addCss(path.resolve(path.dirname(absolute), reference));
    }
  };

  for (const htmlFile of collectHtmlFiles(rootDir)) {
    const source = fs.readFileSync(htmlFile, 'utf8');
    for (const match of source.matchAll(/<link\b[^>]*href=["']([^"']+\.css(?:\?[^"']*)?)["']/gi)) {
      const reference = match[1].split('?')[0];
      if (/^(?:https?:|\/\/)/.test(reference)) continue;
      const absolute = path.resolve(path.dirname(htmlFile), reference);
      if (absolute.startsWith(cssDir)) addCss(absolute);
    }
  }
  return active;
}

assertContains('assets/css/core/tokens.css', [
  '--doke-white-control-shadow: 0 3px 12px rgba(24, 75, 118, 0.065);',
  '--doke-white-control-shadow-hover: 0 7px 18px rgba(24, 75, 118, 0.09);',
  '--doke-flat-control-shadow: none;',
]);
assertContains('assets/css/components/buttons.css', [
  'box-shadow: var(--doke-flat-control-shadow);',
  ':is(.doke-btn--ghost, .doke-button--ghost)',
  ':where(.doke-icon-btn--elevated, .doke-action-button--elevated)',
]);
assertContains('assets/css/components/forms/form-controls.css', [
  'box-shadow: var(--doke-white-control-shadow);',
  '.doke-search-pill,',
  ') :where(.doke-input, .doke-select, .doke-textarea, input, select, textarea)',
  'box-shadow: none;',
]);
assertContains('assets/css/components/ui-surface/buttons-close.css', [
  'box-shadow: none;',
  'box-shadow: var(--doke-white-control-shadow-focus);',
]);

const canonicalAliases = [
  ['assets/css/pages/admin.css', '--admin-shadow-control: var(--doke-white-control-shadow);'],
  ['assets/css/pages/anunciar-servico/visual-hierarchy.css', '--post-service-control-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/avaliacao-profissional/visual-hierarchy.css', 'box-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/carteira/visual-hierarchy.css', '--wallet-control-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/comunidade/visual-hierarchy.css', 'box-shadow: var(--doke-clean-control-shadow);'],
  ['assets/css/pages/comunidade-interna-visual-hierarchy.css', '--community-control-shadow: var(--doke-clean-control-shadow);'],
  ['assets/css/pages/configuracoes/visual-hierarchy.css', 'box-shadow: var(--doke-clean-control-shadow);'],
  ['assets/css/pages/profile/visual-hierarchy.css', '--profile-control-shadow: var(--doke-control-shadow, var(--doke-clean-control-shadow));'],
  ['assets/css/pages/notificacoes/visual-hierarchy.css', 'box-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/orcamento/visual-hierarchy.css', '--budget-control-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/tornar-profissional/visual-hierarchy.css', '--become-pro-control-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/pagamento-profissional/visual-hierarchy.css', 'box-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/verificacao-profissional.css', '--verification-micro-shadow: var(--doke-white-control-shadow);'],
  ['assets/css/pages/results/visual-hierarchy.css', '--results-micro-shadow: var(--doke-white-control-shadow);'],
];
for (const [file, snippet] of canonicalAliases) assertContains(file, [snippet]);

const flatClasses = [
  'doke-icon-btn',
  'doke-action-button',
  'doke-close-button',
  'doke-modal-close',
  'doke-tab-pill',
  'doke-chip',
  'doke-badge',
  'doke-filter-pill',
];

for (const absolute of collectActiveCss()) {
  let stylesheet;
  try {
    stylesheet = postcss.parse(fs.readFileSync(absolute, 'utf8'), { from: absolute });
  } catch (error) {
    failures.push(`${path.relative(rootDir, absolute)}: CSS inválido: ${error.message}`);
    continue;
  }

  stylesheet.walkRules((rule) => {
    for (const selector of rule.selectors || [rule.selector]) {
      const selectorWithoutNegations = selector.replace(/:not\([^)]*\)/g, '');
      const isFlatControl = flatClasses.some((className) =>
        new RegExp(`\\.${className}(?![-\\w])`).test(selectorWithoutNegations),
      );
      if (!isFlatControl) continue;
      const isFocus = /:focus|:focus-visible|:focus-within/.test(selector);
      rule.walkDecls('box-shadow', (declaration) => {
        const value = declaration.value.trim();
        const isFlatValue = value === 'none'
          || value.includes('--doke-flat-control-shadow')
          || value.includes('--shadow-none');
        if (!isFocus && !isFlatValue) {
          failures.push(
            `${path.relative(rootDir, absolute)}:${rule.source.start.line}: `
            + `controle plano recebeu sombra normal em "${selector}" (${value})`,
          );
        }
      });
    }
  });
}

if (failures.length) {
  console.error(`Control elevation scope: FALHOU (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Control elevation scope: aprovado.');
console.log('- Controles brancos standalone usam os tokens canônicos.');
console.log('- Ícones, fechar, tabs, chips, badges e filtros permanecem planos fora do foco.');

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const requireIncludes = (file, needle, message) => {
  const source = read(file);
  if (!source.includes(needle)) failures.push({ file, message });
};

const classAttrContains = (html, baseClass, requiredClasses, file) => {
  const classRegex = /class="([^"]+)"/g;
  let found = 0;
  let match;
  while ((match = classRegex.exec(html))) {
    const classes = match[1].trim().split(/\s+/);
    if (!classes.includes(baseClass)) continue;
    found += 1;
    for (const required of requiredClasses) {
      if (!classes.includes(required)) {
        failures.push({
          file,
          message: `${baseClass} must include ${required}`,
          className: match[1],
        });
      }
    }
  }
  if (found === 0) failures.push({ file, message: `No ${baseClass} instances found` });
};

const ajudaHtml = read('ajuda.html');
const novidadesHtml = read('novidades.html');

['help-topic-card', 'help-faq', 'help-support-card', 'help-status-card'].forEach((baseClass) => {
  classAttrContains(ajudaHtml, baseClass, ['content-surface'], 'ajuda.html');
});

classAttrContains(novidadesHtml, 'news-feature', ['content-surface', 'content-surface--interactive'], 'novidades.html');
classAttrContains(novidadesHtml, 'news-card', ['content-surface', 'content-surface--interactive'], 'novidades.html');
classAttrContains(novidadesHtml, 'news-sidebar', ['content-surface'], 'novidades.html');
classAttrContains(novidadesHtml, 'news-important-card', ['content-surface', 'content-surface--interactive'], 'novidades.html');

requireIncludes('assets/js/pages/ajuda.js', "help-empty-state content-surface", 'Generated help empty state must consume content-surface');
requireIncludes('assets/css/pages/internal-shell.css', '../components/internal/surface-contract.css', 'Flow/internal foundation must keep loading the internal surface contract');
requireIncludes('assets/css/components/internal/surface-contract.css', '.content-surface', 'Internal surface contract must define content-surface');
requireIncludes('assets/css/components/internal/surface-contract.css', '.content-surface--interactive', 'Internal surface contract must define interactive content surface behavior');

const rootSurfaceSelectors = new Set([
  '.help-topic-card',
  '.help-faq',
  '.help-support-card',
  '.help-status-card',
  '.help-empty-state',
  '.news-feature',
  '.news-card',
  '.news-sidebar',
  '.news-important-card',
]);
const bannedProps = ['background', 'border', 'border-radius', 'box-shadow'];

const scanCss = (file) => {
  const css = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
  let match;
  while ((match = blockRegex.exec(css))) {
    const selectors = match[1]
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean);
    const ownedRootSelectors = selectors.filter((selector) => rootSurfaceSelectors.has(selector));
    if (ownedRootSelectors.length === 0) continue;

    const declarations = match[2]
      .split(';')
      .map((declaration) => declaration.trim())
      .filter(Boolean);
    for (const declaration of declarations) {
      const prop = declaration.split(':')[0]?.trim();
      if (bannedProps.includes(prop)) {
        failures.push({
          file,
          selector: ownedRootSelectors.join(', '),
          message: `Root content surface anatomy (${prop}) belongs to assets/css/components/internal/surface-contract.css`,
        });
      }
    }
  }
};

scanCss('assets/css/pages/ajuda.css');
scanCss('assets/css/pages/novidades.css');

const report = {
  status: failures.length ? 'fail' : 'pass',
  failures,
  checked: [
    'ajuda.html',
    'novidades.html',
    'assets/css/pages/ajuda.css',
    'assets/css/pages/novidades.css',
    'assets/css/components/internal/surface-contract.css',
    'assets/js/pages/ajuda.js',
  ],
};

const reportPath = path.join(root, 'reports/generated/content-surface-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('[audit:content-surface-contract] failed');
  failures.forEach((failure) => {
    console.error(`- ${failure.file}: ${failure.message}${failure.selector ? ` (${failure.selector})` : ''}`);
  });
  process.exit(1);
}

console.log('[audit:content-surface-contract] ok');
console.log('- report: reports/generated/content-surface-contract-report.json');

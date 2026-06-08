#!/usr/bin/env node
/*
 * First paint/loading contract guard.
 * Loading/skeleton/ready states may add visual placeholders, but they must not
 * change card geometry after the first render. Component anatomy remains in the
 * component CSS; page/pattern CSS owns only rails, gaps and section layout.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const CSS_ROOTS = ['assets/css'];
const JS_ROOTS = ['assets/js'];
const CARD_SELECTORS = [
  'doke-ad-card',
  'publication-card',
  'service-card',
  'video-card',
  'worker-card',
  'professional-showcase-card',
  'doke-review-card',
  'review-card'
];
const STATE_RE = /(?:is-|data-|aria-)?(?:loading|loaded|ready|skeleton|pending|hydrated|media-loading|media-ready|changing)/i;
const GEOMETRY_PROPS = [
  'width', 'min-width', 'max-width', 'inline-size', 'min-inline-size', 'max-inline-size',
  'height', 'min-height', 'max-height', 'block-size', 'min-block-size', 'max-block-size',
  'padding', 'padding-inline', 'padding-block', 'margin', 'margin-inline', 'margin-block',
  'display', 'visibility', 'position', 'inset', 'top', 'right', 'bottom', 'left',
  'overflow', 'overflow-x', 'overflow-y', 'grid-template', 'grid-template-rows',
  'grid-template-columns', 'flex', 'flex-basis', 'aspect-ratio', 'transform'
];
const CSS_ALLOWLIST = new Set([
  'assets/css/components/states/component-loading-contract.css',
  'assets/css/components/states/list-states.css'
]);

function walk(dir, predicate, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const file = path.join(full, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      walk(path.relative(ROOT, file), predicate, out);
    } else if (predicate(file)) {
      out.push(path.relative(ROOT, file).replace(/\\/g, '/'));
    }
  }
  return out;
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

function findCssViolations() {
  const violations = [];
  const files = CSS_ROOTS.flatMap((root) => walk(root, (file) => file.endsWith('.css')));

  for (const file of files) {
    const text = stripComments(fs.readFileSync(path.join(ROOT, file), 'utf8'));
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while ((match = ruleRe.exec(text))) {
      const selector = match[1].trim().replace(/\s+/g, ' ');
      const body = match[2];
      if (!STATE_RE.test(selector)) continue;
      if (!CARD_SELECTORS.some((token) => selector.includes(token))) continue;
      if (CSS_ALLOWLIST.has(file)) continue;

      const props = GEOMETRY_PROPS.filter((prop) => {
        const re = new RegExp(`(?:^|;)\\s*${prop.replace(/-/g, '\\-')}\\s*:`, 'i');
        return re.test(body);
      });

      if (props.length) {
        violations.push({ file, selector, props });
      }
    }
  }

  return violations;
}

function findJsViolations() {
  const violations = [];
  const files = JS_ROOTS.flatMap((root) => walk(root, (file) => file.endsWith('.js')));
  const mutatingStateClass = /classList\.(?:add|toggle)\(([^)]*(?:loading|ready|skeleton|pending|hydrated|changing)[^)]*)\)/gi;

  for (const file of files) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    let match;
    while ((match = mutatingStateClass.exec(text))) {
      const before = text.slice(Math.max(0, match.index - 320), match.index + match[0].length + 180);
      const context = before.replace(/\s+/g, ' ');
      if (/worker-preview-open|is-previewing|is-playing|is-active|comments-visible/.test(match[1])) continue;
      if (!CARD_SELECTORS.some((token) => context.includes(token))) continue;
      violations.push({ file, call: match[0].replace(/\s+/g, ' '), context: context.slice(0, 260) });
    }
  }

  return violations;
}

function assertRendererContract() {
  const file = 'assets/js/renderers/render-loading-state.js';
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return [{ file, reason: 'missing renderer file' }];
  const text = fs.readFileSync(full, 'utf8');
  const required = [
    'preserveLayout',
    "root.dataset.loadingContract === 'preserve-layout'",
    "root.setAttribute('aria-busy', 'true')",
    "root.dataset.viewState = 'loading'"
  ];
  return required.filter((needle) => !text.includes(needle)).map((needle) => ({ file, reason: `missing ${needle}` }));
}

const cssViolations = findCssViolations();
const jsViolations = findJsViolations();
const rendererViolations = assertRendererContract();
const violations = [
  ...cssViolations.map((v) => `${v.file}: state selector mutates geometry (${v.props.join(', ')}) -> ${v.selector}`),
  ...jsViolations.map((v) => `${v.file}: JS adds/toggles loading-like state class -> ${v.call}`),
  ...rendererViolations.map((v) => `${v.file}: ${v.reason}`)
];

if (violations.length) {
  console.error('[first-paint-loading-contract] failed');
  violations.slice(0, 80).forEach((item) => console.error(`- ${item}`));
  if (violations.length > 80) console.error(`...and ${violations.length - 80} more`);
  process.exit(1);
}

console.log('[first-paint-loading-contract] ok');
console.log('- loading/skeleton card states do not mutate geometry outside the state contract');
console.log('- renderLoadingState supports preserve-layout mode for component lists');

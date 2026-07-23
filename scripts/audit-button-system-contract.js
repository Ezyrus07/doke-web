#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ACTIVE_HTML_DIRS = new Set(['.', 'auth']);
const IGNORE_PREFIXES = ['tools/', 'reports/', 'archive/', 'node_modules/', 'backend/', 'supabase/', 'src/'];

const BUTTON_CONTRACT_FILE = 'assets/css/components/buttons.css';
const REQUIRED_BUTTON_SELECTORS = [
  '.doke-btn',
  '.doke-btn--primary',
  '.doke-btn--secondary',
  '.doke-btn--ghost',
  '.doke-btn--soft',
  '.doke-btn--danger',
  '.doke-btn--success',
  '.doke-btn--block',
  '.doke-icon-btn',
  '.doke-icon-btn--soft',
  '.doke-icon-btn--flat',
  '.doke-segment-button',
  '.doke-choice-button',
];

const RUNTIME_IMPORTS = [
  { file: 'assets/css/core/components.css', needle: '../components/buttons.css', reason: 'core pages must receive the button contract' },
  { file: 'assets/css/pages/auth-foundation.css', needle: '../components/buttons.css', reason: 'auth pages do not import core/index.css' },
];

const CANONICAL_TOKENS = new Set([
  'doke-btn',
  'doke-button',
  'doke-icon-btn',
  'doke-action-button',
  'doke-close-button',
  'doke-tab-pill',
  'doke-filter-pill',
  'doke-chip',
  'doke-badge',
  'doke-segment-button',
  'doke-choice-button',
  'doke-rating-star',
  'doke-flow-step',
  'doke-search-field__button',
  'doke-search-pill__button',
  'doke-search-cta',
  'doke-composer-draft__cancel',
  'doke-chat-composer__tool',
  'doke-chat-composer__emoji',
  'doke-chat-composer__send',
  'doke-favorite-button',
  'doke-popover',
  'doke-select__trigger',
]);

const OWNER_PREFIXES = [
  'account-onboarding__',
  'home-side-meta__',
  'app-header__',
  'topbar-',
  'sidebar__',
  'bottom-nav__',
  'settings-sidebar__',
  'messages-sidebar-search__icon',
  'messages-sidebar-tools__filter',
  'messages-thread__back',
  'messages-thread__action',
  'messages-composer__',
  'messages-audio-draft__',
  'messages-image-draft__',
  'community-room-search__',
  'community-room-filter',
  'community-room-channel',
  'community-room-thread__',
  'community-room-composer__',
  'community-audio-draft__',
  'community-room-attachment-draft__',
  'orders-page-header__',
  'orders-planner__mobile-summary',
  'news-detail-modal__backdrop',
  'community-action-modal__backdrop',
];

const OWNER_CLASSES = new Set([
  'settings-chip',
  'wallet-tab',
  'mini-tab',
  'help-tab',
  'news-filter',
  'search-refine-chip',
  'filter-toggle',
  'results-searchbar__mobile-filter',
  'search-scope__filter-toggle',
  'home-search-hero__mobile-submit',
  'home-search-hero__audio-button',
  'home-search-hero__button',
  'home-catégories__arrow',
  'home-search-hero__cta',
  'ad-gallery__thumb',
  'doke-modal__backdrop',
  'doke-overlay__backdrop',
]);

function rel(file) { return path.relative(ROOT, file).replace(/\\/g, '/'); }
function exists(file) { return fs.existsSync(path.join(ROOT, file)); }
function read(file) { return fs.readFileSync(path.join(ROOT, file), 'utf8'); }
function walk(dir, predicate, out = []) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return out;
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const abs = path.join(full, entry.name);
    const relative = rel(abs);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(relative, predicate, out);
    } else if (predicate(relative)) out.push(relative);
  }
  return out;
}
function activeHtmlFiles() {
  return walk('.', (file) => {
    if (!file.endsWith('.html')) return false;
    if (IGNORE_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
    return ACTIVE_HTML_DIRS.has(path.dirname(file));
  }).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = tag.match(re);
  return match ? (match[2] ?? match[3] ?? '') : '';
}
function classList(tag) { return attr(tag, 'class').split(/\s+/).filter(Boolean); }
function stripTags(value) { return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
function buttonElements(html) {
  const buttons = html.match(/<button\b[\s\S]*?<\/button>/gi) || [];
  const anchors = (html.match(/<a\b[\s\S]*?<\/a>/gi) || [])
    .filter((a) => /class=["'][^"']*(btn|button|action|cta|close|pill|filter|chip)[^"']*/i.test(a));
  return [...buttons, ...anchors];
}
function isCanonicallyOwned(classes) {
  if (classes.some((cls) => CANONICAL_TOKENS.has(cls))) return true;
  if (classes.some((cls) => OWNER_CLASSES.has(cls))) return true;
  if (classes.some((cls) => OWNER_PREFIXES.some((prefix) => cls.startsWith(prefix)))) return true;
  return false;
}
function isInlineNativeException(openTag, classes) {
  const type = attr(openTag, 'type');
  const aria = attr(openTag, 'aria-label');
  if (type === 'button' && /data-toggle-password=/.test(openTag)) return false;
  if (!classes.length && aria && /fechar|voltar|buscar|filtrar|mostrar senha/i.test(aria)) return false;
  return false;
}

const failures = [];

if (!exists(BUTTON_CONTRACT_FILE)) failures.push(`${BUTTON_CONTRACT_FILE} não existe.`);
else {
  const css = read(BUTTON_CONTRACT_FILE);
  if (/!important/.test(css)) failures.push(`${BUTTON_CONTRACT_FILE} não pode usar !important.`);
  for (const selector of REQUIRED_BUTTON_SELECTORS) {
    if (!css.includes(selector)) failures.push(`${BUTTON_CONTRACT_FILE} não declara ${selector}.`);
  }
}

for (const item of RUNTIME_IMPORTS) {
  if (!exists(item.file)) failures.push(`${item.file} não existe.`);
  else if (!read(item.file).includes(item.needle)) failures.push(`${item.file} deve importar ${item.needle}: ${item.reason}.`);
}

for (const file of activeHtmlFiles()) {
  const html = read(file);
  for (const raw of buttonElements(html)) {
    const openTag = raw.match(/^<[^>]+>/)?.[0] || '';
    const classes = classList(openTag);
    if (isCanonicallyOwned(classes)) continue;
    if (isInlineNativeException(openTag, classes)) continue;
    const text = stripTags(raw).slice(0, 80) || attr(openTag, 'aria-label') || '(sem texto)';
    failures.push(`${file}: ação sem contrato canônico: <${openTag.match(/^<([a-z0-9-]+)/i)?.[1] || 'unknown'} class="${classes.join(' ')}"> ${text}`);
  }
}

if (failures.length) {
  console.error('[audit:button-system-contract] falhou:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[audit:button-system-contract] OK — ${activeHtmlFiles().length} HTMLs verificados; botões têm contrato canônico ou owner explícito.`);

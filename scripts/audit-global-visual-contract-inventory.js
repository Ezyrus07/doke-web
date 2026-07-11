#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const GENERATED_DIR = path.join(ROOT, 'reports', 'generated');
const JSON_REPORT = path.join(GENERATED_DIR, 'global-visual-contract-inventory.json');
const MD_REPORT = path.join(GENERATED_DIR, 'global-visual-contract-inventory.md');

const ACTIVE_HTML_DIRS = new Set(['.', 'auth']);
const IGNORE_HTML_PREFIXES = [
  'tools/',
  'reports/',
  'archive/',
  'node_modules/',
  'backend/',
  'supabase/',
  'src/',
];

const ANATOMY_PROPS = [
  'width', 'max-width', 'min-width',
  'height', 'min-height', 'max-height',
  'padding', 'padding-block', 'padding-inline', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border', 'border-width', 'border-color', 'border-radius',
  'background', 'background-color', 'box-shadow', 'filter', 'backdrop-filter',
  'font', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color',
  'display', 'align-items', 'justify-content', 'gap',
];

const FAMILY_DEFINITIONS = [
  {
    key: 'modalOverlay',
    label: 'Modais, overlays, drawers e painéis',
    selectorPattern: /(modal|dialog|overlay|backdrop|scrim|drawer|sheet|lightbox|preview|sidepanel|panel)/i,
    canonicalClasses: ['doke-overlay', 'doke-native-overlay', 'doke-overlay__surface', 'doke-overlay-panel', 'doke-close-button'],
    priority: 'alta',
  },
  {
    key: 'buttonsActions',
    label: 'Botões e ações',
    selectorPattern: /(button|btn|cta|action|submit|cancel|save|delete|close|dismiss|icon-btn)/i,
    canonicalClasses: ['doke-btn', 'doke-icon-btn', 'doke-close-button', 'doke-action-button'],
    priority: 'alta',
  },
  {
    key: 'formControls',
    label: 'Inputs, selects, textarea, checkbox, radio e switch',
    selectorPattern: /(input|select|textarea|checkbox|radio|switch|field|form|label|hint|error|money)/i,
    canonicalClasses: ['doke-input', 'doke-select', 'doke-textarea', 'doke-checkbox', 'doke-radio', 'doke-switch', 'doke-field', 'doke-search-field'],
    priority: 'alta',
  },
  {
    key: 'headerSidebar',
    label: 'Header, topbar, sidebar e navegação',
    selectorPattern: /(app-header|header|topbar|sidebar|bottom-nav|mobile-nav|drawer|home-side-meta)/i,
    canonicalClasses: ['app-header', 'app-header__inner', 'sidebar', 'bottom-nav', 'home-side-meta'],
    priority: 'alta',
  },
  {
    key: 'railRhythm',
    label: 'Rail, largura, page top e ritmo',
    selectorPattern: /(rail|container|page__content|page-main|workspace|section|page-top|shell|flow|grid)/i,
    canonicalClasses: ['doke-page-rail', 'doke-form-page-rail', 'doke-form-page-top', 'doke-page-section', 'app-shell'],
    priority: 'alta',
  },
  {
    key: 'cardsSurfaces',
    label: 'Cards, superfícies e listas',
    selectorPattern: /(card|surface|tile|item|summary|panel|list|empty-state|state-card)/i,
    canonicalClasses: ['content-surface', 'doke-card', 'service-card', 'ad-card', 'publication-card', 'worker-card'],
    priority: 'media',
  },
  {
    key: 'chipsBadgesTabs',
    label: 'Chips, badges, tabs, filtros e status',
    selectorPattern: /(chip|badge|tab|filter|pill|status|kicker|tag)/i,
    canonicalClasses: ['doke-chip', 'doke-badge', 'doke-tab-pill', 'doke-filter-pill', 'doke-status-pill'],
    priority: 'media',
  },
  {
    key: 'feedbackStates',
    label: 'Loading, success, empty, error e skeleton',
    selectorPattern: /(loading|success|empty|error|skeleton|toast|feedback|state)/i,
    canonicalClasses: ['doke-loading-state', 'doke-success-state', 'doke-empty-state', 'doke-error-state', 'doke-skeleton'],
    priority: 'media',
  },
];

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function walk(dir, predicate, out = []) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return out;
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const full = path.join(absolute, entry.name);
    const relative = rel(full);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      walk(relative, predicate, out);
    } else if (predicate(relative)) {
      out.push(relative);
    }
  }
  return out;
}

function activeHtmlFiles() {
  return walk('.', (file) => {
    if (!file.endsWith('.html')) return false;
    if (IGNORE_HTML_PREFIXES.some((prefix) => file.startsWith(prefix))) return false;
    const dir = path.dirname(file);
    return ACTIVE_HTML_DIRS.has(dir);
  }).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function attr(tag, name) {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const match = tag.match(re);
  return match ? (match[2] ?? match[3] ?? '') : '';
}

function classList(tag) {
  return attr(tag, 'class').split(/\s+/).filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function extractTags(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[\\s\\S]*?>`, 'gi');
  return html.match(re) || [];
}

function extractElements(html, tagName) {
  const re = new RegExp(`<${tagName}\\b[\\s\\S]*?<\\/${tagName}>`, 'gi');
  return html.match(re) || [];
}

function stripTags(value) {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function resolveHtmlAsset(htmlFile, assetPath) {
  const clean = assetPath.split('?')[0].replace(/^\.\//, '');
  if (/^https?:\/\//i.test(clean)) return null;
  if (clean.startsWith('/')) return clean.slice(1);
  if (clean.startsWith('assets/')) return clean;
  return path.normalize(path.join(path.dirname(htmlFile), clean)).replace(/\\/g, '/').replace(/^\.\//, '');
}

function styleLinks(html, htmlFile) {
  return (html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi) || [])
    .map((tag) => attr(tag, 'href'))
    .filter(Boolean)
    .map((href) => resolveHtmlAsset(htmlFile, href))
    .filter(Boolean);
}

function scriptLinks(html, htmlFile) {
  return (html.match(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi) || [])
    .map((tag) => attr(tag, 'src'))
    .filter(Boolean)
    .map((src) => resolveHtmlAsset(htmlFile, src))
    .filter(Boolean);
}

function resolveCssImport(fromFile, importPath) {
  const clean = importPath.split('?')[0].replace(/^\.\//, '');
  if (clean.startsWith('/')) return clean.slice(1);
  if (clean.startsWith('assets/')) return clean;
  return path.normalize(path.join(path.dirname(fromFile), clean)).replace(/\\/g, '/');
}

function cssImportChain(entry, seen = new Set()) {
  const normalized = entry.replace(/\\/g, '/');
  if (seen.has(normalized) || !exists(normalized)) return [];
  seen.add(normalized);
  const css = read(normalized);
  const imports = [];
  const re = /@import\s+(?:url\()?['"]?([^'"\)\s;]+)['"]?\)?[^;]*;/gi;
  let match;
  while ((match = re.exec(css))) {
    const imported = resolveCssImport(normalized, match[1]);
    imports.push(imported, ...cssImportChain(imported, seen));
  }
  return [normalized, ...imports];
}

function pageOwnedCssFor(page, directCss) {
  const pageBase = path.basename(page, '.html');
  const dataPage = pageBase === 'index' ? 'home' : pageBase;
  const active = unique(directCss.flatMap((css) => cssImportChain(css)));
  return active.filter((css) => css.startsWith('assets/css/pages/') || css.includes(`/pages/${dataPage}`));
}

function cssRules(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const re = /([^{}@][^{}]*)\{([^{}]*)\}/g;
  let match;
  while ((match = re.exec(withoutComments))) {
    const selector = match[1].trim().replace(/\s+/g, ' ');
    const body = match[2].trim();
    if (!selector || selector.startsWith('@')) continue;
    const props = [];
    for (const declaration of body.split(';')) {
      const parts = declaration.split(':');
      if (parts.length < 2) continue;
      const prop = parts[0].trim().toLowerCase();
      if (ANATOMY_PROPS.includes(prop) || ANATOMY_PROPS.some((p) => prop.startsWith(`${p}-`))) {
        props.push(prop);
      }
    }
    if (props.length) rules.push({ selector, props: unique(props) });
  }
  return rules;
}

function classifySelector(selector) {
  return FAMILY_DEFINITIONS.filter((family) => family.selectorPattern.test(selector)).map((family) => family.key);
}

function pageCssDebt(pageCssFiles) {
  const debt = [];
  for (const cssFile of pageCssFiles) {
    if (!exists(cssFile)) continue;
    const rules = cssRules(read(cssFile));
    for (const rule of rules) {
      const families = classifySelector(rule.selector);
      if (!families.length) continue;
      debt.push({ file: cssFile, selector: rule.selector, props: rule.props, families });
    }
  }
  return debt;
}

function scanButtonLike(html) {
  const buttons = [];
  const rawButtons = extractElements(html, 'button');
  const rawAnchors = extractElements(html, 'a').filter((a) => /class=["'][^"']*(btn|button|action|cta|doke-btn|icon-btn|close|pill)[^"']*/i.test(a));
  for (const raw of [...rawButtons, ...rawAnchors]) {
    const openTag = raw.match(/^<[^>]+>/)?.[0] || '';
    const classes = classList(openTag);
    buttons.push({
      tag: openTag.match(/^<([a-z0-9-]+)/i)?.[1] || 'unknown',
      classes,
      canonical: classes.some((c) => [
        'doke-btn',
        'doke-button',
        'doke-icon-btn',
        'doke-close-button',
        'doke-action-button',
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
        'settings-chip',
        'ad-gallery__thumb',
        'home-search-hero__mobile-submit',
        'home-search-hero__audio-button',
        'home-catégories__arrow',
        'results-searchbar__mobile-filter',
        'filter-toggle',
        'doke-card',
        'doke-overlay__backdrop',
        'doke-modal__backdrop',
      ].includes(c) || c.startsWith('home-side-meta__') || c.startsWith('app-header__') || c.startsWith('sidebar__') || c.startsWith('bottom-nav__') || c.startsWith('settings-sidebar__') || c.startsWith('messages-') || c.startsWith('community-room-') || c.startsWith('orders-page-header__')),
      text: stripTags(raw).slice(0, 80),
      ariaLabel: attr(openTag, 'aria-label'),
    });
  }
  return buttons;
}

function scanControls(html) {
  const inputs = extractTags(html, 'input')
    .map((tag) => ({ tag: 'input', type: (attr(tag, 'type') || 'text').toLowerCase(), classes: classList(tag) }))
    .filter((control) => !['hidden', 'file'].includes(control.type));
  const selects = extractElements(html, 'select').map((tag) => ({ tag: 'select', type: 'select', classes: classList(tag.match(/^<select\b[\s\S]*?>/i)?.[0] || tag) }));
  const textareas = extractElements(html, 'textarea').map((tag) => ({ tag: 'textarea', type: 'textarea', classes: classList(tag.match(/^<textarea\b[\s\S]*?>/i)?.[0] || tag) }));
  return [...inputs, ...selects, ...textareas].map((control) => {
    const canonicalTokens = ['doke-input', 'doke-select', 'doke-textarea', 'doke-checkbox', 'doke-radio', 'doke-switch', 'doke-switch__input', 'doke-search-field__input', 'doke-chat-composer__input'];
    return { ...control, canonical: control.classes.some((c) => canonicalTokens.includes(c)) };
  });
}

function scanClassElements(html, family) {
  const tags = html.match(/<[^>]+class=["'][^"']+["'][^>]*>/gi) || [];
  return tags.map((tag) => ({ tag, classes: classList(tag) }))
    .filter((item) => item.classes.some((cls) => family.selectorPattern.test(cls)))
    .map((item) => ({
      classes: item.classes,
      canonical: item.classes.some((cls) => family.canonicalClasses.includes(cls)),
    }));
}

function bodyInfo(html) {
  const body = html.match(/<body\b[^>]*>/i)?.[0] || '';
  return {
    dataPage: attr(body, 'data-page'),
    dataPageKey: attr(body, 'data-page-key'),
    classes: classList(body),
  };
}

function pageInfo(file) {
  const html = read(file);
  const directCss = styleLinks(html, file);
  const directJs = scriptLinks(html, file);
  const activeCss = unique(directCss.flatMap((css) => cssImportChain(css)));
  const pageCss = pageOwnedCssFor(file, directCss);
  const debt = pageCssDebt(pageCss);
  const buttons = scanButtonLike(html);
  const controls = scanControls(html);
  const families = Object.fromEntries(FAMILY_DEFINITIONS.map((family) => [family.key, scanClassElements(html, family)]));
  const headers = extractTags(html, 'header').map((tag) => ({ classes: classList(tag), variant: attr(tag, 'data-header-variant'), contract: attr(tag, 'data-header-contract') }));
  const sidebars = (html.match(/<aside\b[^>]*>/gi) || []).map((tag) => ({ classes: classList(tag), shellSidebar: /data-shell-sidebar/.test(tag), ariaLabel: attr(tag, 'aria-label') }));
  const titles = (html.match(/<(h1|h2)\b[\s\S]*?<\/\1>/gi) || []).slice(0, 8).map((h) => ({ level: h.match(/^<(h[12])/i)?.[1], classes: classList(h.match(/^<[^>]+>/)?.[0] || ''), text: stripTags(h).slice(0, 100) }));
  const pageSummary = {
    file,
    body: bodyInfo(html),
    directCss,
    activeCssCount: activeCss.length,
    pageOwnedCss: pageCss,
    directJs,
    headers,
    sidebars,
    titles,
    counts: {
      buttons: buttons.length,
      buttonsWithoutCanonical: buttons.filter((b) => !b.canonical).length,
      controls: controls.length,
      controlsWithoutCanonical: controls.filter((c) => !c.canonical).length,
      modalOverlayElements: families.modalOverlay.length,
      modalOverlayWithoutCanonical: families.modalOverlay.filter((x) => !x.canonical).length,
      headerSidebarElements: families.headerSidebar.length,
      headerSidebarWithoutCanonical: families.headerSidebar.filter((x) => !x.canonical).length,
      cardsSurfaces: families.cardsSurfaces.length,
      cardsSurfacesWithoutCanonical: families.cardsSurfaces.filter((x) => !x.canonical).length,
      chipsBadgesTabs: families.chipsBadgesTabs.length,
      chipsBadgesTabsWithoutCanonical: families.chipsBadgesTabs.filter((x) => !x.canonical).length,
      pageOwnedAnatomyRules: debt.length,
    },
    samples: {
      buttonsWithoutCanonical: buttons.filter((b) => !b.canonical).slice(0, 8),
      controlsWithoutCanonical: controls.filter((c) => !c.canonical).slice(0, 8),
      modalOverlayWithoutCanonical: families.modalOverlay.filter((x) => !x.canonical).slice(0, 8),
      cardsSurfacesWithoutCanonical: families.cardsSurfaces.filter((x) => !x.canonical).slice(0, 8),
      chipsBadgesTabsWithoutCanonical: families.chipsBadgesTabs.filter((x) => !x.canonical).slice(0, 8),
      pageOwnedAnatomyRules: debt.slice(0, 20),
    },
  };
  return pageSummary;
}

function summarizeFamilies(pages) {
  const result = {};
  for (const family of FAMILY_DEFINITIONS) {
    const affected = pages.map((page) => {
      const debtCount = page.samples.pageOwnedAnatomyRules.filter((r) => r.families.includes(family.key)).length;
      const totalDebtCount = page.pageOwnedDebt?.filter((r) => r.families.includes(family.key)).length || 0;
      const countKey = family.key === 'modalOverlay' ? 'modalOverlayElements'
        : family.key === 'headerSidebar' ? 'headerSidebarElements'
        : family.key === 'cardsSurfaces' ? 'cardsSurfaces'
        : family.key === 'chipsBadgesTabs' ? 'chipsBadgesTabs'
        : null;
      const count = countKey ? page.counts[countKey] : undefined;
      return {
        file: page.file,
        elements: count,
        pageOwnedAnatomyRules: totalDebtCount || debtCount,
      };
    }).filter((entry) => entry.elements || entry.pageOwnedAnatomyRules);
    result[family.key] = {
      label: family.label,
      priority: family.priority,
      affectedPages: affected.map((x) => x.file),
      totalPageOwnedAnatomyRules: affected.reduce((sum, x) => sum + (x.pageOwnedAnatomyRules || 0), 0),
      affected,
    };
  }
  return result;
}

function cssDebtGlobal(pages) {
  const byFamily = Object.fromEntries(FAMILY_DEFINITIONS.map((f) => [f.key, 0]));
  const byFile = new Map();
  for (const page of pages) {
    for (const rule of page.pageOwnedDebt || []) {
      for (const family of rule.families) byFamily[family] = (byFamily[family] || 0) + 1;
      const current = byFile.get(rule.file) || { file: rule.file, rules: 0, families: {} };
      current.rules += 1;
      for (const family of rule.families) current.families[family] = (current.families[family] || 0) + 1;
      byFile.set(rule.file, current);
    }
  }
  return {
    byFamily,
    topFiles: [...byFile.values()].sort((a, b) => b.rules - a.rules).slice(0, 30),
  };
}

function assignFullDebt(pages) {
  return pages.map((page) => {
    const debt = pageCssDebt(page.pageOwnedCss);
    return { ...page, pageOwnedDebt: debt, counts: { ...page.counts, pageOwnedAnatomyRules: debt.length }, samples: { ...page.samples, pageOwnedAnatomyRules: debt.slice(0, 20) } };
  });
}

function buildRecommendations(familySummary, cssDebt) {
  return [
    {
      lot: 'O',
      name: 'Modal Visual Contract',
      objective: 'Padronizar anatomia visual real de modais equivalentes: largura, radius, padding, close, eyebrow, título, descrição, body, footer, ações e scroll.',
      authority: 'assets/css/components/overlays/modal.css + overlay-contract.css + buttons/forms/chips compartilhados',
      pages: familySummary.modalOverlay.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.modalOverlay,
        reason: 'há overlays com classes compartilhadas, mas CSS de página ainda participa da anatomia visual em múltiplos fluxos.',
      },
      risk: 'alto; validar todos os modais em 390x844, 820x1180 e 1366x768.',
    },
    {
      lot: 'P',
      name: 'Form Controls Contract',
      objective: 'Unificar inputs, selects, money fields, textarea, checkbox, radio, switch, labels, hints e estados.',
      authority: 'assets/css/components/forms/form-controls.css + ui-surface/forms-controls.css',
      pages: familySummary.formControls.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.formControls,
        reason: 'campos básicos aparecem em quase todos os fluxos e são o maior ponto de diferença nos screenshots.',
      },
      risk: 'alto; campos são usados por JS e validação.',
    },
    {
      lot: 'Q',
      name: 'Button System Contract',
      objective: 'Fechar botões primários, secundários, ghost, icon, danger, success, block, pill, loading e disabled em todos os HTMLs.',
      authority: 'assets/css/components/buttons.css + doke-ui-system.css',
      pages: familySummary.buttonsActions.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.buttonsActions,
        reason: 'ações básicas ainda têm classe local e alguns links/btns não consomem contrato canônico.',
      },
      risk: 'médio; maior impacto visual, menor risco funcional.',
    },
    {
      lot: 'R',
      name: 'Header Sidebar Parity',
      objective: 'Alinhar header, sidebar, drawer mobile, bottom nav e slots de ação por breakpoint.',
      authority: 'assets/css/layout/header.css + components/shell + components/navigation',
      pages: familySummary.headerSidebar.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.headerSidebar,
        reason: 'o usuário ainda percebe diferenças de header/menu lateral em HTMLs internos; risco alto exige mapa antes de mexer.',
      },
      risk: 'muito alto; só executar com validação visual ou Live Server local.',
    },
    {
      lot: 'S',
      name: 'Rail Page Rhythm Contract',
      objective: 'Fechar largura, alinhamento, page top, título, descrição, primeiro bloco e gaps entre seções.',
      authority: 'assets/css/layout/page-rail-authority.css + components/shell/page-container-contract.css',
      pages: familySummary.railRhythm.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.railRhythm,
        reason: 'ainda há 213 colisões no audit de rail/card da home e muitos seletores locais de container/section.',
      },
      risk: 'alto; altera densidade e alinhamento em várias páginas.',
    },
    {
      lot: 'T',
      name: 'Cards Surfaces Contract',
      objective: 'Unificar superfícies equivalentes: card, painel, resumo, lista, avatar/mídia/footer quando semanticamente iguais.',
      authority: 'assets/css/components/cards/* + components/internal/surface-contract.css',
      pages: familySummary.cardsSurfaces.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.cardsSurfaces,
        reason: 'cards/superfícies têm muitas classes locais e ainda concentram a maior dívida de CSS visual.',
      },
      risk: 'alto; index deve seguir sendo baseline.',
    },
    {
      lot: 'U',
      name: 'Chips Badges Tabs Filters Contract',
      objective: 'Fechar chips, badges, tabs, filtros, status pills e tags.',
      authority: 'assets/css/components/status/chips-badges.css + components/tabs/tabs.css',
      pages: familySummary.chipsBadgesTabs.affectedPages,
      evidence: {
        pageOwnedAnatomyRules: cssDebt.byFamily.chipsBadgesTabs,
        reason: 'muitos microcomponentes ainda usam classes locais e afetam percepção de polimento.',
      },
      risk: 'médio.',
    },
  ];
}

function markdownTable(rows, columns) {
  const escape = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const header = `| ${columns.map((c) => c.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

function writeMarkdown(report) {
  const pageRows = report.pages.map((page) => ({
    page: page.file,
    dataPage: page.body.dataPage,
    css: page.directCss.join('<br>'),
    js: page.directJs.length,
    header: page.headers.map((h) => `${h.classes.join(' ')}${h.variant ? ` (${h.variant})` : ''}`).join('<br>'),
    sidebar: page.sidebars.some((s) => s.shellSidebar) ? 'shell' : (page.sidebars.length ? 'local/aside' : 'none'),
    buttonsDebt: page.counts.buttonsWithoutCanonical,
    controlsDebt: page.counts.controlsWithoutCanonical,
    pageCssDebt: page.counts.pageOwnedAnatomyRules,
  }));

  const familyRows = Object.entries(report.familySummary).map(([key, value]) => ({
    key,
    family: value.label,
    priority: value.priority,
    pages: value.affectedPages.length,
    rules: value.totalPageOwnedAnatomyRules,
  }));

  const topFileRows = report.cssDebt.topFiles.map((file) => ({
    file: file.file,
    rules: file.rules,
    families: Object.entries(file.families).map(([k, v]) => `${k}: ${v}`).join('<br>'),
  }));

  const planRows = report.recommendedLots.map((lot) => ({
    lot: `Lote ${lot.lot}`,
    name: lot.name,
    objective: lot.objective,
    authority: lot.authority,
    pages: lot.pages.length,
    risk: lot.risk,
  }));

  const md = [];
  md.push('# Inventário global de contratos visuais — Doke Web');
  md.push('');
  md.push('Este relatório é gerado por `npm run audit:global-visual-contract-inventory`. Ele não altera visual. Ele mapeia HTMLs ativos, famílias visuais, CSS page-owned com anatomia de componente e a fila segura de consolidação.');
  md.push('');
  md.push('## Resumo');
  md.push('');
  md.push(`- HTMLs ativos escaneados: **${report.summary.activeHtmlFiles}**`);
  md.push(`- HTMLs de raiz: **${report.summary.rootHtmlFiles}**`);
  md.push(`- HTMLs de auth: **${report.summary.authHtmlFiles}**`);
  md.push(`- CSS page-owned com anatomia de componente detectado: **${report.summary.pageOwnedAnatomyRules} regras**`);
  md.push(`- Botões/ações sem classe canônica detectados: **${report.summary.buttonsWithoutCanonical}**`);
  md.push(`- Controles de formulário sem classe canônica detectados: **${report.summary.controlsWithoutCanonical}**`);
  md.push('');
  md.push('## Famílias visuais');
  md.push('');
  md.push(markdownTable(familyRows, [
    { label: 'Família', value: 'family' },
    { label: 'Prioridade', value: 'priority' },
    { label: 'Páginas afetadas', value: 'pages' },
    { label: 'Regras page-owned', value: 'rules' },
  ]));
  md.push('');
  md.push('## Matriz por página');
  md.push('');
  md.push(markdownTable(pageRows, [
    { label: 'Página', value: 'page' },
    { label: 'data-page', value: 'dataPage' },
    { label: 'CSS entrada', value: 'css' },
    { label: 'JS diretos', value: 'js' },
    { label: 'Header', value: 'header' },
    { label: 'Sidebar', value: 'sidebar' },
    { label: 'Botões sem contrato', value: 'buttonsDebt' },
    { label: 'Controles sem contrato', value: 'controlsDebt' },
    { label: 'CSS page-owned', value: 'pageCssDebt' },
  ]));
  md.push('');
  md.push('## Arquivos CSS page-owned com maior dívida visual');
  md.push('');
  md.push(markdownTable(topFileRows, [
    { label: 'Arquivo', value: 'file' },
    { label: 'Regras', value: 'rules' },
    { label: 'Famílias', value: 'families' },
  ]));
  md.push('');
  md.push('## Fila recomendada');
  md.push('');
  md.push(markdownTable(planRows, [
    { label: 'Lote', value: 'lot' },
    { label: 'Nome', value: 'name' },
    { label: 'Objetivo', value: 'objective' },
    { label: 'Autoridade', value: 'authority' },
    { label: 'Páginas', value: 'pages' },
    { label: 'Risco', value: 'risk' },
  ]));
  md.push('');
  md.push('## Próximo lote exato');
  md.push('');
  md.push('Executar **Lote O — Modal Visual Contract**. O alvo é consolidar a anatomia visual real de modais equivalentes, começando pelos modais de formulário/financeiros que o usuário apontou nas capturas. Não tocar em header/sidebar neste lote; eles ficam para o Lote R porque têm risco global maior.');
  md.push('');
  md.push('## Observações');
  md.push('');
  md.push('- Este relatório é estático: ele aponta candidatos e dívida estrutural, mas não substitui validação visual/computada no navegador.');
  md.push('- Classes compartilhadas não são prova de paridade visual; o próximo lote precisa remover ou neutralizar CSS local concorrente por família.');
  md.push('- Quando Playwright/Chromium estiver disponível, complementar este inventário com medições de estilo computado.');
  return `${md.join('\n')}\n`;
}

function main() {
  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const htmlFiles = activeHtmlFiles();
  let pages = htmlFiles.map(pageInfo);
  pages = assignFullDebt(pages);
  const familySummary = summarizeFamilies(pages);
  const cssDebt = cssDebtGlobal(pages);
  const recommendedLots = buildRecommendations(familySummary, cssDebt);
  const summary = {
    activeHtmlFiles: htmlFiles.length,
    rootHtmlFiles: htmlFiles.filter((file) => path.dirname(file) === '.').length,
    authHtmlFiles: htmlFiles.filter((file) => file.startsWith('auth/')).length,
    pageOwnedAnatomyRules: pages.reduce((sum, page) => sum + page.counts.pageOwnedAnatomyRules, 0),
    buttonsWithoutCanonical: pages.reduce((sum, page) => sum + page.counts.buttonsWithoutCanonical, 0),
    controlsWithoutCanonical: pages.reduce((sum, page) => sum + page.counts.controlsWithoutCanonical, 0),
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    families: FAMILY_DEFINITIONS,
    familySummary,
    cssDebt,
    recommendedLots,
    pages,
  };
  fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2));
  fs.writeFileSync(MD_REPORT, writeMarkdown(report));
  console.log('[audit:global-visual-contract-inventory] ok');
  console.log(`- html files: ${summary.activeHtmlFiles}`);
  console.log(`- page-owned anatomy rules: ${summary.pageOwnedAnatomyRules}`);
  console.log(`- buttons without canonical class: ${summary.buttonsWithoutCanonical}`);
  console.log(`- controls without canonical class: ${summary.controlsWithoutCanonical}`);
  console.log(`- json: ${rel(JSON_REPORT)}`);
  console.log(`- markdown: ${rel(MD_REPORT)}`);
}

main();

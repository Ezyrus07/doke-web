#!/usr/bin/env node
/*
 * Audit: shared card anatomy boundary
 *
 * Fails when page/pattern/shell CSS changes internal anatomy of shared cards.
 * Pages may control external composition, but not card internals.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const SCAN_DIRS = [
  'assets/css/pages',
  'assets/css/patterns',
  'assets/css/components/shell',
];

const REPORT_DIR = path.join(ROOT, 'reports');
const JSON_REPORT = path.join(REPORT_DIR, 'card-anatomy-boundary-audit.json');
const CSV_REPORT = path.join(REPORT_DIR, 'card-anatomy-boundary-audit.csv');
const MD_REPORT = path.join(REPORT_DIR, 'card-anatomy-boundary-audit.md');
const ALLOWLIST_PATH = path.join(ROOT, 'scripts/card-anatomy-boundary-allowlist.json');

const CARD_SELECTORS = [
  '.publication-card',
  '.doke-ad-card',
  '.video-card',
  '.service-card',
  '.doke-review-card',
  '.doke-reviews-panel',
];

const FORBIDDEN_EXACT = new Set([
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'aspect-ratio',
  'font-size',
  'line-height',
  'grid-template-columns',
  'grid-template-rows',
  'object-fit',
]);

const FORBIDDEN_PREFIXES = [
  'padding',
  'border-radius',
];

const POSITION_PROPS = new Set(['top', 'left', 'right', 'bottom']);
const INTERNAL_POSITION_TARGET = /badge|favorite|fav|heart|save|bookmark|pill|chip|avatar|media|image|img|thumb|cover|poster/i;
const MEDIA_TARGET = /media|image|img|thumb|cover|poster|video|photo|picture|avatar/i;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (entry.isFile() && entry.name.endsWith('.css')) return [full];
    return [];
  });
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat(match.split('\n').length - 1));
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function extractRules(css, baseOffset = 0, atContext = []) {
  const rules = [];
  let i = 0;

  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open === -1) break;

    const selectorStart = Math.max(css.lastIndexOf('}', open), css.lastIndexOf(';', open), 0);
    let selector = css.slice(selectorStart === 0 ? 0 : selectorStart + 1, open).trim();

    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      if (css[j] === '}') depth -= 1;
      j += 1;
    }

    const block = css.slice(open + 1, j - 1);
    const ruleOffset = baseOffset + open;

    if (selector.startsWith('@')) {
      rules.push(...extractRules(block, baseOffset + open + 1, atContext.concat(selector)));
    } else if (selector) {
      rules.push({ selector, declarations: block, offset: ruleOffset, atContext });
    }

    i = j;
  }

  return rules;
}

function splitSelectors(selectorText) {
  const out = [];
  let current = '';
  let depth = 0;
  for (const ch of selectorText) {
    if (ch === '(' || ch === '[') depth += 1;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function parseDeclarations(block) {
  const declarations = [];
  const parts = block.split(';');
  for (const part of parts) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const property = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim();
    if (!property || property.startsWith('@')) continue;
    declarations.push({ property, value });
  }
  return declarations;
}

function containsSharedCard(selector) {
  return CARD_SELECTORS.filter((cardSelector) => selector.includes(cardSelector));
}

function isForbiddenDeclaration(property, selector) {
  if (FORBIDDEN_EXACT.has(property)) return true;
  if (FORBIDDEN_PREFIXES.some((prefix) => property === prefix || property.startsWith(`${prefix}-`))) return true;
  if (POSITION_PROPS.has(property) && INTERNAL_POSITION_TARGET.test(selector)) return true;
  return false;
}

function forbiddenReason(property, selector) {
  if (POSITION_PROPS.has(property)) return 'internal-position';
  if (property === 'height' && MEDIA_TARGET.test(selector)) return 'media-height';
  if (property.startsWith('padding')) return 'internal-padding';
  if (property.startsWith('border-radius')) return 'card-radius';
  return 'shared-card-anatomy';
}

function loadAllowlist() {
  if (!fs.existsSync(ALLOWLIST_PATH)) return { description: '', rules: [] };
  const parsed = JSON.parse(fs.readFileSync(ALLOWLIST_PATH, 'utf8'));
  if (!Array.isArray(parsed.rules)) {
    throw new Error('Invalid card anatomy allowlist: expected { rules: [] }');
  }
  for (const [index, rule] of parsed.rules.entries()) {
    if (!rule.file || !rule.selectorContains || !rule.property || !rule.justification) {
      throw new Error(`Invalid allowlist rule at index ${index}: file, selectorContains, property and justification are required.`);
    }
  }
  return parsed;
}

function isAllowed(violation, allowlist) {
  return allowlist.rules.some((rule) => {
    const fileMatches = violation.file === rule.file || violation.file.endsWith(rule.file);
    const selectorMatches = violation.selector.includes(rule.selectorContains);
    const propertyMatches = violation.property === rule.property || rule.property === '*';
    return fileMatches && selectorMatches && propertyMatches && String(rule.justification).trim().length >= 12;
  });
}

function cssLikelyResponsible(file, selector, property) {
  return `${file} :: ${selector} { ${property}: ... }`;
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function writeReports(violations, allowed, filesScanned) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });

  const payload = {
    generatedAt: new Date().toISOString(),
    status: violations.length === 0 ? 'pass' : 'fail',
    scannedDirectories: SCAN_DIRS,
    filesScanned,
    forbiddenCardSelectors: CARD_SELECTORS,
    forbiddenProperties: {
      exact: Array.from(FORBIDDEN_EXACT),
      prefixes: FORBIDDEN_PREFIXES,
      internalPosition: Array.from(POSITION_PROPS),
    },
    summary: {
      blockingViolations: violations.length,
      allowedExceptions: allowed.length,
    },
    violations,
    allowed,
  };

  fs.writeFileSync(JSON_REPORT, JSON.stringify(payload, null, 2));

  const headers = ['file', 'line', 'card', 'selector', 'property', 'value', 'reason', 'cssProvavelResponsavel'];
  const csvRows = [headers.join(',')].concat(
    violations.map((v) => headers.map((h) => csvEscape(v[h])).join(','))
  );
  fs.writeFileSync(CSV_REPORT, csvRows.join('\n'));

  const byFile = violations.reduce((acc, v) => {
    acc[v.file] = (acc[v.file] || 0) + 1;
    return acc;
  }, {});
  const byCard = violations.reduce((acc, v) => {
    acc[v.card] = (acc[v.card] || 0) + 1;
    return acc;
  }, {});

  const lines = [];
  lines.push('# Auditoria de fronteira da anatomia de cards compartilhados');
  lines.push('');
  lines.push(`Status: **${payload.status.toUpperCase()}**`);
  lines.push('');
  lines.push(`Arquivos CSS varridos: **${filesScanned.length}**`);
  lines.push(`Violações bloqueantes: **${violations.length}**`);
  lines.push(`Exceções permitidas por allowlist: **${allowed.length}**`);
  lines.push('');
  lines.push('## Diretórios auditados');
  lines.push('');
  for (const dir of SCAN_DIRS) lines.push(`- \`${dir}\``);
  lines.push('');
  lines.push('## Violações por arquivo');
  lines.push('');
  if (Object.keys(byFile).length === 0) {
    lines.push('Nenhuma violação encontrada.');
  } else {
    for (const [file, count] of Object.entries(byFile).sort((a, b) => b[1] - a[1])) {
      lines.push(`- \`${file}\`: ${count}`);
    }
  }
  lines.push('');
  lines.push('## Violações por componente');
  lines.push('');
  if (Object.keys(byCard).length === 0) {
    lines.push('Nenhuma violação encontrada.');
  } else {
    for (const [card, count] of Object.entries(byCard).sort((a, b) => b[1] - a[1])) {
      lines.push(`- \`${card}\`: ${count}`);
    }
  }
  lines.push('');
  lines.push('## Tabela de violações');
  lines.push('');
  lines.push('| arquivo | linha | card | seletor | propriedade | valor | motivo | CSS provável responsável |');
  lines.push('|---|---:|---|---|---|---|---|---|');
  for (const v of violations.slice(0, 500)) {
    lines.push(`| \`${v.file}\` | ${v.line} | \`${v.card}\` | \`${v.selector.replace(/\|/g, '\\|')}\` | \`${v.property}\` | \`${v.value.replace(/\|/g, '\\|')}\` | ${v.reason} | \`${v.cssProvavelResponsavel.replace(/\|/g, '\\|')}\` |`);
  }
  if (violations.length > 500) lines.push(`| ... | ... | ... | ... | ... | ... | ... | Relatório CSV/JSON contém todas as ${violations.length} violações. |`);
  lines.push('');
  lines.push('## Regra arquitetural');
  lines.push('');
  lines.push('CSS de página, patterns e shell podem controlar composição externa, mas não podem redefinir anatomia interna de cards compartilhados. Exceções exigem entrada em `scripts/card-anatomy-boundary-allowlist.json` com justificativa explícita.');

  fs.writeFileSync(MD_REPORT, lines.join('\n'));
}

function main() {
  const allowlist = loadAllowlist();
  const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
  const violations = [];
  const allowed = [];

  for (const absFile of files) {
    const file = path.relative(ROOT, absFile).replace(/\\/g, '/');
    const source = fs.readFileSync(absFile, 'utf8');
    const css = stripComments(source);
    const rules = extractRules(css);

    for (const rule of rules) {
      const selectors = splitSelectors(rule.selector);
      for (const selector of selectors) {
        const cards = containsSharedCard(selector);
        if (cards.length === 0) continue;
        const declarations = parseDeclarations(rule.declarations);
        for (const declaration of declarations) {
          if (!isForbiddenDeclaration(declaration.property, selector)) continue;
          for (const card of cards) {
            const violation = {
              file,
              line: lineOf(source, rule.offset),
              card,
              selector,
              property: declaration.property,
              value: declaration.value,
              reason: forbiddenReason(declaration.property, selector),
              cssProvavelResponsavel: cssLikelyResponsible(file, selector, declaration.property),
              atContext: rule.atContext,
            };
            if (isAllowed(violation, allowlist)) allowed.push(violation);
            else violations.push(violation);
          }
        }
      }
    }
  }

  const filesScanned = files.map((abs) => path.relative(ROOT, abs).replace(/\\/g, '/'));
  writeReports(violations, allowed, filesScanned);

  console.log(`Card anatomy boundary audit: ${violations.length === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`CSS files scanned: ${filesScanned.length}`);
  console.log(`Blocking violations: ${violations.length}`);
  console.log(`Allowed exceptions: ${allowed.length}`);
  console.log(`Reports:`);
  console.log(`- ${path.relative(ROOT, MD_REPORT)}`);
  console.log(`- ${path.relative(ROOT, CSV_REPORT)}`);
  console.log(`- ${path.relative(ROOT, JSON_REPORT)}`);

  if (violations.length > 0) process.exit(1);
}

main();

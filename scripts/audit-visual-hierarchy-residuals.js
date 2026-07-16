#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const postcss = require('postcss');

const root = path.resolve(__dirname, '..');
const cssRoot = path.join(root, 'assets', 'css');
const htmlRoots = [
  ...fs.readdirSync(root).filter((name) => name.endsWith('.html')).map((name) => path.join(root, name)),
  path.join(root, 'auth', 'login.html'),
  path.join(root, 'auth', 'cadastro.html'),
  path.join(root, 'auth', 'esqueci-senha.html'),
  path.join(root, 'labs', 'modal-lab.html'),
  path.join(root, 'docs', 'ui-kit.html'),
].filter(fs.existsSync);

const importPattern = /@import\s+(?:url\()?\s*["']([^"']+\.css(?:\?[^"']*)?)["']\s*\)?\s*;/gi;
const linkPattern = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
const stripQuery = (value) => value.split('?')[0].split('#')[0];
const rel = (file) => path.relative(root, file).replaceAll(path.sep, '/');

function resolveLocal(from, reference) {
  if (/^(?:https?:)?\/\//i.test(reference)) return null;
  return path.resolve(path.dirname(from), stripQuery(reference));
}

function collectActiveCss() {
  const active = new Set();
  function visit(file) {
    if (!file || active.has(file) || !fs.existsSync(file) || !file.startsWith(cssRoot)) return;
    active.add(file);
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(importPattern)) visit(resolveLocal(file, match[1]));
  }
  for (const html of htmlRoots) {
    const text = fs.readFileSync(html, 'utf8');
    for (const match of text.matchAll(linkPattern)) visit(resolveLocal(html, match[1]));
  }
  return [...active].sort();
}

const semanticBorderHints = /(?:select|selected|active|checked|choice|option|radio|checkbox|upload|drop|error|danger|success|warning|invalid|table|row|divider|separator|timeline|focus|outline|skeleton|before|bad)/i;
const staticSurfaceHints = /(?:panel|surface|summary|sidebar|workspace|section|hero|header|footer|empty|state|overview|analytics|details|info|card--static)/i;
const interactiveHints = /(?:button|btn|link|item|card|tile|row|action|trigger|option|choice|clickable|interactive)/i;
const focusSelector = /:focus|:focus-visible|:focus-within/i;
const hoverSelector = /:hover/i;
const tokenShadow = /var\(--(?:doke|shadow|elevation|modal|overlay|surface|control)[^)]+\)/i;
const noneLike = /^(?:none|initial|inherit|unset|0)$/i;

const findings = [];
const counts = { activeCss: 0, hierarchyFiles: 0, ringShadows: 0, literalShadows: 0, visibleBorders: 0, staticHoverMotion: 0 };

for (const file of collectActiveCss()) {
  counts.activeCss += 1;
  const isHierarchy = /visual-hierarchy\.css$/i.test(file);
  if (isHierarchy) counts.hierarchyFiles += 1;
  let rootNode;
  try {
    rootNode = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  } catch (error) {
    findings.push({ severity: 'error', kind: 'css-parse', file: rel(file), line: 0, selector: '', value: error.message });
    continue;
  }

  rootNode.walkRules((rule) => {
    const selector = rule.selector || '';
    const line = rule.source?.start?.line || 0;
    const isFocus = focusSelector.test(selector);
    const isHover = hoverSelector.test(selector);

    rule.walkDecls((decl) => {
      const prop = decl.prop.toLowerCase();
      const value = decl.value.trim();

      if (prop === 'box-shadow' && !noneLike.test(value)) {
        if (!isFocus && /(?:^|,)\s*(?:inset\s+)?0\s+0\s+0\s+1px\b/i.test(value)) {
          counts.ringShadows += 1;
          findings.push({ severity: 'high', kind: 'permanent-1px-ring', file: rel(file), line, selector, value });
        }
        if (isHierarchy && !tokenShadow.test(value) && !/^var\(/i.test(value)) {
          counts.literalShadows += 1;
          findings.push({ severity: 'medium', kind: 'literal-shadow-in-authority', file: rel(file), line, selector, value });
        }
      }

      if (/^border(?:-(?:top|right|bottom|left))?$/.test(prop) && !noneLike.test(value) && !/^0(?:\s|$)/.test(value)) {
        if (isHierarchy && !semanticBorderHints.test(selector)) {
          counts.visibleBorders += 1;
          findings.push({ severity: 'medium', kind: 'non-semantic-border', file: rel(file), line, selector, value });
        }
      }

      if (prop === 'transform' && isHover && /translateY\s*\(\s*-?\d/i.test(value)) {
        if (staticSurfaceHints.test(selector) && !interactiveHints.test(selector)) {
          counts.staticHoverMotion += 1;
          findings.push({ severity: 'medium', kind: 'static-surface-hover-motion', file: rel(file), line, selector, value });
        }
      }
    });
  });
}

const ordered = findings.sort((a, b) => {
  const rank = { error: 0, high: 1, medium: 2, low: 3 };
  return rank[a.severity] - rank[b.severity] || a.file.localeCompare(b.file) || a.line - b.line;
});

const payload = {
  generatedAt: new Date().toISOString(),
  counts,
  totalFindings: ordered.length,
  findings: ordered,
};

const reportDir = path.join(root, 'reports');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'visual-hierarchy-residuals.json'), JSON.stringify(payload, null, 2) + '\n');

const grouped = new Map();
for (const finding of ordered) {
  if (!grouped.has(finding.kind)) grouped.set(finding.kind, []);
  grouped.get(finding.kind).push(finding);
}
const md = [
  '# Visual hierarchy residual audit',
  '',
  `- Active CSS files: ${counts.activeCss}`,
  `- Explicit hierarchy authorities: ${counts.hierarchyFiles}`,
  `- Total findings: ${ordered.length}`,
  `- Permanent 1px rings: ${counts.ringShadows}`,
  `- Literal shadows inside hierarchy authorities: ${counts.literalShadows}`,
  `- Borders without an obvious semantic selector: ${counts.visibleBorders}`,
  `- Hover motion on likely static surfaces: ${counts.staticHoverMotion}`,
  '',
  '## Interpretation',
  '',
  '- High findings are strong candidates for correction.',
  '- Medium findings require visual or selector-level confirmation before editing.',
  '- Borders on selection, upload, status, error, table and divider selectors are intentionally excluded.',
  '',
];
for (const [kind, entries] of grouped) {
  md.push(`## ${kind}`, '');
  for (const entry of entries) {
    md.push(`- **${entry.severity}** \`${entry.file}:${entry.line}\` — \`${entry.selector}\` → \`${entry.value}\``);
  }
  md.push('');
}
fs.writeFileSync(path.join(reportDir, 'visual-hierarchy-residuals.md'), md.join('\n') + '\n');

console.log(`[visual-hierarchy-residuals] ${ordered.length} findings across ${counts.activeCss} active CSS files.`);
console.log(`[visual-hierarchy-residuals] high=${ordered.filter((x) => x.severity === 'high').length}, medium=${ordered.filter((x) => x.severity === 'medium').length}.`);
if (ordered.some((item) => item.severity === 'error')) process.exitCode = 1;

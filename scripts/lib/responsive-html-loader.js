'use strict';

const fs = require('fs');
const path = require('path');

const IMPORT_RE = /@import\s+(?:url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)|"([^"]+)"|'([^']+)')\s*([^;]*);/gi;

function stripQueryAndHash(value) {
  return String(value || '').split(/[?#]/, 1)[0];
}

function isExternal(value) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(String(value || '').trim());
}

function extractAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function insideRoot(filePath, rootDir) {
  const relative = path.relative(rootDir, filePath);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function displayPath(filePath, rootDir) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function resolveLocal(fromFile, reference, rootDir) {
  const clean = stripQueryAndHash(reference).trim();
  if (!clean || isExternal(clean)) return null;
  const resolved = clean.startsWith('/')
    ? path.resolve(rootDir, clean.slice(1))
    : path.resolve(path.dirname(fromFile), clean);
  if (!insideRoot(resolved, rootDir)) {
    throw new Error(`Local CSS reference escapes repository root: ${reference}`);
  }
  return resolved;
}

function expandLocalCss(cssFile, rootDir = process.cwd(), stack = []) {
  const root = path.resolve(rootDir);
  const absolute = path.isAbsolute(cssFile) ? path.resolve(cssFile) : path.resolve(root, cssFile);
  if (!insideRoot(absolute, root)) throw new Error(`CSS entrypoint escapes repository root: ${cssFile}`);
  if (!fs.existsSync(absolute)) throw new Error(`Missing local stylesheet: ${displayPath(absolute, root)}`);
  if (stack.includes(absolute)) {
    const cycle = [...stack, absolute].map(item => displayPath(item, root)).join(' -> ');
    throw new Error(`CSS import cycle detected: ${cycle}`);
  }

  const source = fs.readFileSync(absolute, 'utf8');
  const nextStack = [...stack, absolute];
  return source.replace(IMPORT_RE, (full, a, b, c, d, e, qualifierText) => {
    const reference = a || b || c || d || e || '';
    const qualifier = String(qualifierText || '').trim();
    if (isExternal(reference)) return `/* external CSS import skipped by responsive harness: ${reference} */`;

    const target = resolveLocal(absolute, reference, root);
    if (!target || !fs.existsSync(target)) {
      const label = target ? displayPath(target, root) : reference;
      throw new Error(`Missing local CSS import: ${label} from ${displayPath(absolute, root)}`);
    }

    const targetLabel = displayPath(target, root);
    const expanded = expandLocalCss(target, root, nextStack);
    const marked = `/* responsive-inline-source:start ${targetLabel} */\n${expanded}\n/* responsive-inline-source:end ${targetLabel} */`;
    if (!qualifier) return marked;
    if (/^(?:layer\b|supports\s*\()/i.test(qualifier)) {
      throw new Error(`Unsupported CSS @import qualifier: ${qualifier}`);
    }
    return `@media ${qualifier} {\n${marked}\n}`;
  });
}

function loadHtmlWithLocalCss(pageFile, rootDir = process.cwd(), options = {}) {
  const root = path.resolve(rootDir);
  const htmlFile = path.isAbsolute(pageFile) ? path.resolve(pageFile) : path.resolve(root, pageFile);
  if (!insideRoot(htmlFile, root) || !fs.existsSync(htmlFile)) {
    throw new Error(`Missing local HTML fixture: ${pageFile}`);
  }

  const modeLabel = options.modeLabel || 'responsive harness';
  let html = fs.readFileSync(htmlFile, 'utf8');
  html = html.replace(/<link\b[^>]*>/gi, tag => {
    const rel = extractAttribute(tag, 'rel').toLowerCase();
    if (!rel.split(/\s+/).includes('stylesheet')) return tag;
    const href = extractAttribute(tag, 'href');
    if (!href) return tag;
    if (isExternal(href)) return `<!-- external stylesheet disabled for ${modeLabel}: ${href} -->`;

    const cssFile = resolveLocal(htmlFile, href, root);
    if (!cssFile || !fs.existsSync(cssFile)) {
      const label = cssFile ? displayPath(cssFile, root) : href;
      throw new Error(`Missing local stylesheet linked by ${displayPath(htmlFile, root)}: ${label}`);
    }

    const label = displayPath(cssFile, root);
    return `<style data-source-css="${label}">\n/* responsive-inline-source:start ${label} */\n${expandLocalCss(cssFile, root)}\n/* responsive-inline-source:end ${label} */\n</style>`;
  });

  html = html.replace(/<script\b[^>]*\bsrc=["'][^"']+["'][^>]*><\/script>/gi, `<!-- external script disabled for ${modeLabel} -->`);
  const base = `file://${root.replace(/\\/g, '/')}/`;
  return /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1><base href="${base}">`)
    : `<base href="${base}">${html}`;
}

module.exports = {
  expandLocalCss,
  loadHtmlWithLocalCss,
};

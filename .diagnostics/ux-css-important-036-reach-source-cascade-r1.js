const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const ROOT = process.cwd();
const PARENT = '483d49d5f59c2eb24be0169f3d7ed6aec9703679';
const TARGET = 'assets/css/components/shell/mobile-app-shell.css';
const EXPECTED_BLOB = 'af6fd982517f2bc821435e633d70237e95ee11a8';
const EXPECTED_IMPORTANT = 314;
const RESULT = '.diagnostics/ux-css-important-036-reach-source-cascade-r1.json';

const norm = p => p.replace(/\\/g, '/').replace(/^\.\//, '');
const exists = p => fs.existsSync(path.join(ROOT, p));
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

function walk(dir, pred = () => true) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).flatMap(e => {
    const rel = norm(path.join(dir, e.name));
    if (['node_modules', '.git'].includes(e.name)) return [];
    if (e.isDirectory()) return walk(rel, pred);
    return e.isFile() && pred(rel) ? [rel] : [];
  });
}

function stripComments(s) {
  let out = '', quote = null, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (quote) {
      out += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < s.length && !(s[i] === '*' && s[i + 1] === '/')) i++;
      i++;
      out += ' ';
      continue;
    }
    out += c;
  }
  return out;
}

function splitSelectors(s) {
  const out = [];
  let buf = '', quote = null, esc = false, par = 0, br = 0;
  for (const c of s) {
    if (quote) {
      buf += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '(') par++;
    else if (c === ')') par = Math.max(0, par - 1);
    else if (c === '[') br++;
    else if (c === ']') br = Math.max(0, br - 1);
    if (c === ',' && par === 0 && br === 0) {
      if (buf.trim()) out.push(buf.trim().replace(/\s+/g, ' '));
      buf = '';
    } else buf += c;
  }
  if (buf.trim()) out.push(buf.trim().replace(/\s+/g, ' '));
  return out;
}

function topLevelColon(seg) {
  let quote = null, esc = false, par = 0, br = 0;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (quote) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '(') par++;
    else if (c === ')') par = Math.max(0, par - 1);
    else if (c === '[') br++;
    else if (c === ']') br = Math.max(0, br - 1);
    else if (c === ':' && par === 0 && br === 0) return i;
  }
  return -1;
}

function parseCss(text, file) {
  const s = stripComments(text);
  const stack = [];
  const decls = [];
  let buf = '', quote = null, esc = false, par = 0, br = 0;

  function processDecl(raw) {
    const seg = raw.trim();
    if (!seg) return;
    const rule = [...stack].reverse().find(x => x.kind === 'rule');
    if (!rule) return;
    const idx = topLevelColon(seg);
    if (idx <= 0) return;
    const property = seg.slice(0, idx).trim();
    const value = seg.slice(idx + 1).trim();
    if (!/^--[\w-]+$/.test(property) && !/^-?[a-zA-Z][\w-]*$/.test(property)) return;
    const selectors = splitSelectors(rule.header);
    const contexts = stack.filter(x => x.kind === 'at').map(x => x.header.replace(/\s+/g, ' '));
    decls.push({ file, selectors, property, value, important: /!important\b/i.test(value), contexts });
  }

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (quote) {
      buf += c;
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; buf += c; continue; }
    if (c === '(') { par++; buf += c; continue; }
    if (c === ')') { par = Math.max(0, par - 1); buf += c; continue; }
    if (c === '[') { br++; buf += c; continue; }
    if (c === ']') { br = Math.max(0, br - 1); buf += c; continue; }
    if (par === 0 && br === 0 && c === '{') {
      const header = buf.trim();
      buf = '';
      stack.push({ kind: header.startsWith('@') ? 'at' : 'rule', header });
      continue;
    }
    if (par === 0 && br === 0 && c === ';') {
      processDecl(buf);
      buf = '';
      continue;
    }
    if (par === 0 && br === 0 && c === '}') {
      processDecl(buf);
      buf = '';
      stack.pop();
      continue;
    }
    buf += c;
  }
  return decls;
}

function cleanUrl(u) {
  return u.trim().replace(/^['"]|['"]$/g, '').split(/[?#]/)[0];
}

function resolveCss(from, spec) {
  spec = cleanUrl(spec);
  if (!spec || /^(?:https?:|data:|\/\/)/i.test(spec)) return null;
  const rel = spec.startsWith('/') ? spec.slice(1) : norm(path.join(path.dirname(from), spec));
  return exists(rel) ? rel : null;
}

function cssImports(file) {
  const s = stripComments(read(file));
  const out = [];
  const re = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)["']?\s*\)?[^;]*;/gi;
  let m;
  while ((m = re.exec(s))) {
    const r = resolveCss(file, m[1]);
    if (r) out.push(r);
  }
  return [...new Set(out)];
}

function htmlLinks(file) {
  const s = read(file);
  const out = [];
  const re = /<link\b[^>]*\bhref\s*=\s*["']([^"']+\.css(?:[?#][^"']*)?)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(s))) {
    const spec = cleanUrl(m[1]);
    if (/^(?:https?:|\/\/)/i.test(spec)) continue;
    const rel = spec.startsWith('/') ? spec.slice(1) : norm(path.join(path.dirname(file), spec));
    if (exists(rel)) out.push(rel);
  }
  return [...new Set(out)];
}

function reachFromCss(start, seen = new Set()) {
  if (seen.has(start)) return seen;
  seen.add(start);
  for (const imp of cssImports(start)) reachFromCss(imp, seen);
  return seen;
}

function countBy(items, keyFn) {
  const m = new Map();
  for (const x of items) {
    const k = keyFn(x);
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key,count]) => ({ key, count }));
}

function hasToken(text, token) {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^A-Za-z0-9_-])${esc}([^A-Za-z0-9_-]|$)`).test(text);
}

const head = cp.execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const parentIsAncestor = cp.spawnSync('git', ['merge-base', '--is-ancestor', PARENT, 'HEAD']).status === 0;
const targetBlob = cp.execSync(`git hash-object ${TARGET}`, { encoding: 'utf8' }).trim();
const targetText = read(TARGET);
const markerRegexCount = (targetText.match(/!important\b/gi) || []).length;
if (!parentIsAncestor) throw new Error(`Parent ${PARENT} is not an ancestor of ${head}`);
if (targetBlob !== EXPECTED_BLOB) throw new Error(`Target blob mismatch ${targetBlob}`);
if (markerRegexCount !== EXPECTED_IMPORTANT) throw new Error(`Expected ${EXPECTED_IMPORTANT} markers, got ${markerRegexCount}`);

const rootHtml = fs.readdirSync(ROOT).filter(f => f.endsWith('.html') && fs.statSync(path.join(ROOT,f)).isFile()).sort();
const cssFiles = walk('assets/css', p => p.endsWith('.css')).sort();
const runtimeJs = walk('assets/js', p => p.endsWith('.js')).sort();
const toolingJs = [...walk('scripts', p => p.endsWith('.js')), ...walk('tests', p => p.endsWith('.js')), ...walk('.github', p => /\.(?:js|yml|yaml)$/.test(p))].sort();
const docsConfig = [...walk('docs', p => /\.(?:md|json|txt|yml|yaml)$/.test(p)), ...walk('config', p => /\.(?:json|md|txt|yml|yaml)$/.test(p))].sort();

const importers = cssFiles.filter(f => cssImports(f).includes(TARGET));
const directHtmlLinks = rootHtml.filter(f => htmlLinks(f).includes(TARGET));
const reachPages = [];
const pageReach = {};
for (const page of rootHtml) {
  const roots = htmlLinks(page);
  const reached = new Set();
  for (const css of roots) reachFromCss(css, reached);
  if (reached.has(TARGET)) reachPages.push(page);
  pageReach[page] = { rootCss: roots.length, totalCss: reached.size, target: reached.has(TARGET) };
}

const needleA = TARGET;
const needleB = path.basename(TARGET);
function refs(files) {
  return files.filter(f => {
    const s = read(f);
    return s.includes(needleA) || s.includes(needleB);
  });
}

const targetDecls = parseCss(targetText, TARGET);
const importantDecls = targetDecls.filter(d => d.important);
if (importantDecls.length !== EXPECTED_IMPORTANT) {
  throw new Error(`Cascade parser expected ${EXPECTED_IMPORTANT} important declarations, got ${importantDecls.length}`);
}

const externalMap = new Map();
for (const file of cssFiles) {
  if (file === TARGET) continue;
  for (const d of parseCss(read(file), file)) {
    for (const sel of d.selectors) {
      const key = `${sel}\u0000${d.property}`;
      if (!externalMap.has(key)) externalMap.set(key, new Set());
      externalMap.get(key).add(file);
    }
  }
}

let collisionDecls = 0;
const collisionFiles = new Set();
const collisionKeys = new Set();
for (const d of importantDecls) {
  let collided = false;
  for (const sel of d.selectors) {
    const key = `${sel}\u0000${d.property}`;
    const files = externalMap.get(key);
    if (files && files.size) {
      collided = true;
      collisionKeys.add(`${sel} :: ${d.property}`);
      for (const f of files) collisionFiles.add(f);
    }
  }
  if (collided) collisionDecls++;
}

const selectorTokens = new Set();
for (const d of importantDecls) for (const sel of d.selectors) {
  for (const m of sel.matchAll(/\.([A-Za-z_-][\w-]*)/g)) selectorTokens.add(m[1]);
  for (const m of sel.matchAll(/#([A-Za-z_-][\w-]*)/g)) selectorTokens.add(m[1]);
}
const htmlText = rootHtml.map(read);
const jsText = runtimeJs.map(read);
const tokenRefs = [...selectorTokens].sort().map(token => ({
  token,
  htmlFiles: rootHtml.filter((f,i) => hasToken(htmlText[i], token)),
  runtimeJsFiles: runtimeJs.filter((f,i) => hasToken(jsText[i], token)),
}));
const sourceReferenced = tokenRefs.filter(x => x.htmlFiles.length || x.runtimeJsFiles.length);
const sourceUnreferenced = tokenRefs.filter(x => !x.htmlFiles.length && !x.runtimeJsFiles.length);

const out = {
  boundary: 'UX-CSS-IMPORTANT-036',
  proof: 'reach-source-cascade-r1',
  certified035Head: PARENT,
  diagnosticHead: head,
  target: TARGET,
  targetBlob,
  importantCount: markerRegexCount,
  status: 'PASS',
  decision: 'ACTIVE_HIGH_RISK_REQUIRES_SEPARATE_CANDIDATE_AND_BROWSER_PROOF',
  mutationAuthorityGranted: false,
  reach: {
    rootHtmlCount: rootHtml.length,
    cssFileCount: cssFiles.length,
    directHtmlLinks,
    importers,
    reachedByPages: reachPages,
    reachedPageCount: reachPages.length,
    active: reachPages.length > 0 || importers.length > 0 || directHtmlLinks.length > 0,
    wholeFileDormant: false,
    pageReach,
  },
  sourceOwnership: {
    runtimeJsRefs: refs(runtimeJs),
    toolingRefs: refs(toolingJs),
    docsConfigRefs: refs(docsConfig),
    selectorTokenCount: tokenRefs.length,
    sourceReferencedTokenCount: sourceReferenced.length,
    sourceUnreferencedTokenCount: sourceUnreferenced.length,
    sourceReferencedTokenSample: sourceReferenced.slice(0, 80),
    sourceUnreferencedTokenSample: sourceUnreferenced.slice(0, 80).map(x => x.token),
  },
  cascade: {
    parsedDeclarationCount: targetDecls.length,
    importantDeclarationCount: importantDecls.length,
    uniqueImportantSelectorCount: new Set(importantDecls.flatMap(d => d.selectors)).size,
    uniqueImportantPropertyCount: new Set(importantDecls.map(d => d.property)).size,
    importantByProperty: countBy(importantDecls, d => d.property).slice(0, 80),
    importantByContext: countBy(importantDecls, d => d.contexts.length ? d.contexts.join(' > ') : '(base)').slice(0, 80),
    declarationsWithExternalExactSelectorPropertyCollision: collisionDecls,
    uniqueExternalCollisionKeys: collisionKeys.size,
    externalCollisionFileCount: collisionFiles.size,
    externalCollisionFiles: [...collisionFiles].sort(),
    externalCollisionKeySample: [...collisionKeys].sort().slice(0, 100),
  },
  prohibitionsPreserved: {
    productCssModified: false,
    candidatePromoted: false,
    permanentBranchCreated: false,
    merge: false,
    readyForReview: false,
    stagingOrProduction: false,
  },
};

if (!out.reach.active) throw new Error('Target unexpectedly not active; reach proof must be reclassified, not silently accepted');
fs.writeFileSync(RESULT, JSON.stringify(out, null, 2) + '\n');
console.log(JSON.stringify(out, null, 2));

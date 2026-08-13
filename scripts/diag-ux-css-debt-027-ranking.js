const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const report = JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json', 'utf8'));
const files = cp.execFileSync('git', ['ls-files', '-z', 'assets/css'], { encoding: 'utf8' })
  .split('\0').filter(file => file.endsWith('.css'));
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;
const normalizeImport = (value, from) => {
  value = value.replace(/\?.*$/, '').replace(/^\.\//, '');
  if (value.startsWith('/')) return value.replace(/^\/+/, '');
  if (value.startsWith('assets/')) return value;
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), value));
};

const meta = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const imports = [];
  let match; importRe.lastIndex = 0;
  while ((match = importRe.exec(text))) imports.push(normalizeImport(match[1], file));
  meta.set(file, {
    text,
    imports,
    bytes: Buffer.byteLength(text),
    important: (text.match(/!important/gi) || []).length,
  });
}

const active = new Set();
const todo = [...new Set(report.pageAssets.flatMap(page => page.css))].filter(file => meta.has(file));
while (todo.length) {
  const file = todo.pop();
  if (active.has(file) || !meta.has(file)) continue;
  active.add(file);
  for (const next of meta.get(file).imports) if (meta.has(next)) todo.push(next);
}
const high = [...active].filter(file => {
  const item = meta.get(file);
  return item.bytes >= 50000 || item.important >= 100 || item.imports.length >= 10;
});

function parse(source) {
  const lines = source.split(/\r?\n/);
  let depth = 0, selectorParts = [], atParts = [], selector = null;
  const declarations = [], stack = [];
  const declarationRe = /^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const normalize = parts => parts.join(' ').replace(/\{\s*$/, '').replace(/\s+/g, ' ').trim();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i], text = line.trim();
    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    if (!selector) {
      if (atParts.length) {
        if (text) atParts.push(text);
        if (line.includes('{')) { stack.push({ type: 'at', header: normalize(atParts), depthBefore: depth }); atParts = []; }
      } else if (text.startsWith('@') && !text.includes(';')) {
        if (line.includes('{')) stack.push({ type: 'at', header: normalize([text]), depthBefore: depth });
        else atParts = [text];
      } else if (selectorParts.length) {
        if (text) selectorParts.push(text);
        if (line.includes('{')) { selector = normalize(selectorParts); selectorParts = []; stack.push({ type: 'rule', selector, depthBefore: depth }); }
      } else if (text && !text.startsWith('/*') && !text.startsWith('*') && text !== '*/' && text !== '}' && !text.startsWith('@') && !line.includes(';')) {
        selectorParts = [text];
        if (line.includes('{')) { selector = normalize(selectorParts); selectorParts = []; stack.push({ type: 'rule', selector, depthBefore: depth }); }
      }
    }
    if (selector) {
      const m = line.match(declarationRe);
      if (m) {
        const raw = m[2].trim();
        declarations.push({
          line: i + 1,
          selector,
          property: m[1].toLowerCase(),
          value: raw,
          important: /\s*!important\s*$/i.test(raw),
          context: stack.filter(item => item.type === 'at').map(item => item.header).join(' || '),
        });
      }
    }
    depth += opens - closes;
    while (stack.length && depth <= stack[stack.length - 1].depthBefore) {
      const popped = stack.pop();
      if (popped.type === 'rule') selector = null;
    }
  }

  const last = new Map(), dead = [];
  for (let i = declarations.length - 1; i >= 0; i -= 1) {
    const d = declarations[i];
    const key = `${d.context} >>> ${d.selector} >>> ${d.property}`;
    const later = last.get(key);
    if (later && (!d.important || later.important)) {
      dead.push({ ...d, winnerLine: later.line, winnerValue: later.value, winnerImportant: later.important });
    }
    if (!later || d.important || !later.important) last.set(key, d);
  }
  return { declarations, dead };
}

const parsed = new Map([...active].map(file => [file, parse(meta.get(file).text)]));
if (active.size !== 401 || high.length !== 37) throw new Error(`estate drift ${active.size}/${high.length}`);
const previousTarget = parsed.get('assets/css/pages/pedidos/tablet-rail-contract.css');
if (!previousTarget || previousTarget.declarations.length !== 342 || previousTarget.dead.length !== 0) {
  throw new Error(`026 target drift ${previousTarget?.declarations.length}/${previousTarget?.dead.length}`);
}

const pagesFor = target => {
  const out = [];
  for (const page of report.pageAssets) {
    const seen = new Set(), stack = [...page.css.filter(file => meta.has(file))];
    let hit = false;
    while (stack.length) {
      const file = stack.pop();
      if (seen.has(file) || !meta.has(file)) continue;
      seen.add(file);
      if (file === target) { hit = true; break; }
      for (const next of meta.get(file).imports) if (meta.has(next)) stack.push(next);
    }
    if (hit) out.push(page.page);
  }
  return out.sort();
};

const residual = [...active].map(file => ({ file, ...parsed.get(file) })).filter(row => row.dead.length);
const total = residual.reduce((sum, row) => sum + row.dead.length, 0);
const highDead = residual.filter(row => high.includes(row.file)).length;
if (residual.length !== 48 || total !== 1286 || highDead !== 0) throw new Error(`residual drift ${residual.length}/${total}/${highDead}`);

const rows = residual
  .filter(row => row.file.includes('/pages/'))
  .map(row => {
    const item = meta.get(row.file);
    const pages = pagesFor(row.file);
    const selectors = [...new Set(row.dead.map(d => d.selector))];
    const identical = row.dead.filter(d => d.value === d.winnerValue && d.important === d.winnerImportant).length;
    return {
      file: row.file,
      decl: row.declarations.length,
      dead: row.dead.length,
      selectors: selectors.length,
      selectorList: selectors,
      pages: pages.length,
      pageList: pages,
      important: item.important,
      bytes: item.bytes,
      identical,
      changed: row.dead.length - identical,
      rows: row.dead.sort((a, b) => a.line - b.line),
    };
  });
rows.sort((a, b) => (a.pages - b.pages) || (a.dead - b.dead) || (a.selectors - b.selectors) || (a.important - b.important) || (a.changed - b.changed) || (a.bytes - b.bytes) || a.file.localeCompare(b.file));

console.log('BASE|active=401|high=37|files=48|dead=1286|highDead=0');
rows.slice(0, 10).forEach((r, i) => console.log(`TOP${i}|file=${r.file}|decl=${r.decl}|dead=${r.dead}|selectors=${r.selectors}|pages=${r.pages}|important=${r.important}|bytes=${r.bytes}|pageList=${r.pageList.join(',') || '-'}|selectorList=${r.selectorList.join(' <OR> ')}|identical=${r.identical}|changed=${r.changed}`));
const winner = rows[0];
if (!winner) throw new Error('no page residual candidate');
for (const d of winner.rows) console.log(`ROW|line=${d.line}|selector=${d.selector}|prop=${d.property}|value=${d.value}|imp=${d.important}|ctx=${d.context || '<global>'}|winnerLine=${d.winnerLine}|winnerValue=${d.winnerValue}|winnerImp=${d.winnerImportant}`);

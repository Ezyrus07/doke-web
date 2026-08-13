const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const target = process.env.TARGET_FILE;
const report = JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json', 'utf8'));
const files = cp.execFileSync('git', ['ls-files', '-z', 'assets/css'], { encoding: 'utf8' }).split('\0').filter(file => file.endsWith('.css'));
const importRe = /@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;
const norm = (value, from) => {
  value = value.replace(/\?.*$/, '').replace(/^\.\//, '');
  if (value.startsWith('/')) return value.replace(/^\/+/, '');
  if (value.startsWith('assets/')) return value;
  return path.posix.normalize(path.posix.join(path.posix.dirname(from), value));
};
const meta = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8'), imports = [];
  let match; importRe.lastIndex = 0;
  while ((match = importRe.exec(text))) imports.push(norm(match[1], file));
  meta.set(file, { text, imports, size: Buffer.byteLength(text), important: (text.match(/!important/gi) || []).length });
}
const active = new Set(), todo = [...new Set(report.pageAssets.flatMap(page => page.css))].filter(file => meta.has(file));
while (todo.length) {
  const file = todo.pop();
  if (active.has(file) || !meta.has(file)) continue;
  active.add(file);
  for (const next of meta.get(file).imports) if (meta.has(next)) todo.push(next);
}
const high = [...active].filter(file => {
  const item = meta.get(file);
  return item.size >= 50000 || item.important >= 100 || item.imports.length >= 10;
});
function parse(source) {
  const lines = source.split(/\r?\n/); let depth = 0, selectorParts = [], atParts = [], selector = null; const declarations = [], stack = [];
  const declarationRe = /^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const normalize = parts => parts.join(' ').replace(/\{\s*$/, '').replace(/\s+/g, ' ').trim();
  for (const line of lines) {
    const text = line.trim(), opens = (line.match(/\{/g) || []).length, closes = (line.match(/\}/g) || []).length;
    if (!selector) {
      if (atParts.length) {
        if (text) atParts.push(text);
        if (line.includes('{')) { stack.push({ type: 'at', header: normalize(atParts), depthBefore: depth }); atParts = []; }
      } else if (text.startsWith('@') && !text.includes(';')) {
        if (line.includes('{')) stack.push({ type: 'at', header: normalize([text]), depthBefore: depth }); else atParts = [text];
      } else if (selectorParts.length) {
        if (text) selectorParts.push(text);
        if (line.includes('{')) { selector = normalize(selectorParts); selectorParts = []; stack.push({ type: 'rule', selector, depthBefore: depth }); }
      } else if (text && !text.startsWith('/*') && !text.startsWith('*') && text !== '*/' && text !== '}' && !text.startsWith('@') && !line.includes(';')) {
        selectorParts = [text];
        if (line.includes('{')) { selector = normalize(selectorParts); selectorParts = []; stack.push({ type: 'rule', selector, depthBefore: depth }); }
      }
    }
    if (selector) {
      const match = line.match(declarationRe);
      if (match) {
        const raw = match[2].trim();
        declarations.push({ selector, prop: match[1].toLowerCase(), important: /\s*!important\s*$/i.test(raw), context: stack.filter(item => item.type === 'at').map(item => item.header).join(' || ') });
      }
    }
    depth += opens - closes;
    while (stack.length && depth <= stack[stack.length - 1].depthBefore) {
      const popped = stack.pop();
      if (popped.type === 'rule') selector = null;
    }
  }
  const last = new Map(); let dead = 0;
  for (let index = declarations.length - 1; index >= 0; index -= 1) {
    const declaration = declarations[index], key = `${declaration.context}>${declaration.selector}>${declaration.prop}`, later = last.get(key);
    if (later && (!declaration.important || later.important)) dead += 1;
    if (!later || declaration.important || !later.important) last.set(key, declaration);
  }
  return { decl: declarations.length, dead };
}
if (active.size !== 401 || high.length !== 37) throw new Error(`estate ${active.size}/${high.length}`);
const residualRows = [...active].map(file => ({ file, ...parse(meta.get(file).text) })).filter(row => row.dead);
const total = residualRows.reduce((sum, row) => sum + row.dead, 0);
const highDead = residualRows.filter(row => high.includes(row.file)).length;
const targetState = parse(meta.get(target).text);
if (residualRows.length !== 48 || total !== 1286 || highDead !== 0 || targetState.decl !== 342 || targetState.dead !== 0) throw new Error(`residual ${residualRows.length}/${total}/${highDead}/${targetState.decl}/${targetState.dead}`);
console.log('PERMANENT RESIDUAL PASS|active=401|high=37|files=48|dead=1286|highDead=0|target=342/dead0');

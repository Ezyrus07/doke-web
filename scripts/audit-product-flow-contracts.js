const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pages = [
  'index.html',
  'resultados.html',
  'pedidos.html',
  'mensagens.html',
  'comunidade.html',
  'comunidade.html',
  'perfil.html',
  'carteira.html',
  'notificacoes.html',
  'configuracoes.html',
];

const cssPath = 'assets/css/components/flows/doke-product-flows.css';
const requiredCssTokens = [
  '.doke-flow',
  '.doke-search-flow',
  '.doke-order-flow',
  '.doke-message-flow',
  '.doke-wallet-flow',
  '.doke-community-flow',
  '.doke-profile-flow',
  '.doke-scheduling-flow',
  '.doke-settings-flow',
];

function stripQuery(value) { return value.split('?')[0].split('#')[0]; }
function cssGraphLoads(html, targetPath) {
  if (html.includes(targetPath)) return true;
  const links = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["'][^>]*>/g)]
    .map(match => stripQuery(match[1]));
  const visited = new Set();
  function loads(cssRel) {
    const normalized = stripQuery(cssRel).replace(/^\.\//, '');
    if (visited.has(normalized)) return false;
    visited.add(normalized);
    const abs = path.join(root, normalized);
    if (!fs.existsSync(abs)) return false;
    const css = fs.readFileSync(abs, 'utf8');
    if (css.includes(targetPath)) return true;
    const imports = [...css.matchAll(/@import\s+(?:url\()?\s*["']([^"']+)["']\s*\)?/g)]
      .map(match => stripQuery(match[1]));
    return imports.some(imported => {
      const resolved = path.normalize(path.join(path.dirname(normalized), imported)).replace(/\\/g, '/');
      return resolved === targetPath || loads(resolved);
    });
  }
  return links.some(loads);
}

let errors = [];
let counts = { linkedPages: 0, flowClasses: 0 };

const cssAbs = path.join(root, cssPath);
if (!fs.existsSync(cssAbs)) {
  errors.push(`Missing ${cssPath}`);
} else {
  const css = fs.readFileSync(cssAbs, 'utf8');
  for (const token of requiredCssTokens) {
    if (!css.includes(token)) errors.push(`Missing CSS contract ${token}`);
  }
}

for (const page of pages) {
  const abs = path.join(root, page);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing page ${page}`);
    continue;
  }
  const html = fs.readFileSync(abs, 'utf8');
  if (!cssGraphLoads(html, cssPath)) {
    errors.push(`${page} does not load ${cssPath}`);
  } else {
    counts.linkedPages += 1;
  }
  const matches = html.match(/doke-[a-z-]*flow/g) || [];
  counts.flowClasses += matches.length;
}

if (errors.length) {
  console.error('Product flow contracts failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Product flow contracts passed.');
console.log(`Pages linked: ${counts.linkedPages}`);
console.log(`Flow class references: ${counts.flowClasses}`);

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const canonicalTokens = new Set([
  'doke-input',
  'doke-select',
  'doke-textarea',
  'doke-checkbox',
  'doke-radio',
  'doke-switch',
  'doke-switch__input',
  'doke-search-field__input',
  'doke-chat-composer__input',
]);

function attr(tag, name) {
  const match = tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function classList(tag) {
  return attr(tag, 'class').split(/\s+/).filter(Boolean);
}

function activeHtmlFiles() {
  const rootHtml = fs.readdirSync(root)
    .filter((file) => file.endsWith('.html'))
    .filter((file) => !/(backup|old|copy|temp|stage|debug)/i.test(file));
  const authDir = path.join(root, 'auth');
  const authHtml = exists('auth')
    ? fs.readdirSync(authDir).filter((file) => file.endsWith('.html')).map((file) => `auth/${file}`)
    : [];
  return [...rootHtml, ...authHtml].sort();
}

function controlTags(html) {
  const tags = [];
  for (const tag of html.match(/<input\b[^>]*>/gi) || []) {
    const type = (attr(tag, 'type') || 'text').toLowerCase();
    if (['hidden', 'file'].includes(type)) continue;
    tags.push({ tag, name: 'input', type, classes: classList(tag) });
  }
  for (const tag of html.match(/<select\b[^>]*>/gi) || []) {
    tags.push({ tag, name: 'select', type: 'select', classes: classList(tag) });
  }
  for (const tag of html.match(/<textarea\b[^>]*>/gi) || []) {
    tags.push({ tag, name: 'textarea', type: 'textarea', classes: classList(tag) });
  }
  return tags;
}

for (const file of activeHtmlFiles()) {
  const html = read(file);
  for (const control of controlTags(html)) {
    const canonical = control.classes.some((cls) => canonicalTokens.has(cls));
    if (!canonical) {
      failures.push(`${file}: ${control.name}[type=${control.type}] sem classe canônica (${control.tag.slice(0, 140)})`);
    }
    if (control.name === 'input' && control.type === 'checkbox') {
      const ok = control.classes.includes('doke-checkbox') || control.classes.includes('doke-switch__input');
      if (!ok) failures.push(`${file}: checkbox sem doke-checkbox ou doke-switch__input (${control.tag.slice(0, 140)})`);
    }
    if (control.name === 'input' && control.type === 'radio' && !control.classes.includes('doke-radio')) {
      failures.push(`${file}: radio sem doke-radio (${control.tag.slice(0, 140)})`);
    }
    if (control.name === 'select' && !control.classes.includes('doke-select')) {
      failures.push(`${file}: select sem doke-select (${control.tag.slice(0, 140)})`);
    }
    if (control.name === 'textarea') {
      const ok = control.classes.includes('doke-textarea') || control.classes.includes('doke-chat-composer__input');
      if (!ok) failures.push(`${file}: textarea sem doke-textarea ou doke-chat-composer__input (${control.tag.slice(0, 140)})`);
    }
  }
}

const css = read('assets/css/components/forms/form-controls.css');
for (const token of [
  '.doke-input',
  '.doke-select',
  '.doke-textarea',
  '.doke-checkbox',
  '.doke-radio',
  '.doke-switch',
  '.doke-field',
  '.doke-modal-field',
]) {
  if (!css.includes(token)) failures.push(`assets/css/components/forms/form-controls.css: não contém ${token}`);
}
if (/!important/.test(css)) {
  failures.push('assets/css/components/forms/form-controls.css: contrato de controles não deve usar !important');
}
if (/\.doke-search-field\s*>/.test(css)) {
  failures.push('assets/css/components/forms/form-controls.css: busca interna é autoridade de search-field.css, não de form-controls.css');
}

const searchCss = read('assets/css/components/search/search-field.css');
for (const token of [
  '.doke-search-field',
  '.doke-search-field__input',
  '.doke-input',
  'border: 0',
  'background: transparent',
]) {
  if (!searchCss.includes(token)) {
    failures.push(`assets/css/components/search/search-field.css: reset de busca não contém ${token}`);
  }
}

for (const [file, required] of Object.entries({
  'auth/cadastro.html': ['auth-choice__input doke-radio'],
  'auth/esqueci-senha.html': ['auth-choice__input doke-radio'],
  'avaliacao-profissional.html': ['class="doke-textarea"'],
  'carteira.html': ['class="doke-input" data-wallet-withdraw-amount'],
  'comunidade.html': ['id="community-action-code-input"', 'class="doke-input"', 'class="doke-textarea"'],
  'index.html': ['home-address-modal__field doke-field doke-modal-field', 'name="titulo"', 'class="doke-input" type="text" name="titulo"'],
  'mensagens.html': ['class="doke-input" type="text" inputmode="decimal"', 'doke-financial-modal__native-select doke-select'],
  'pagamento-profissional.html': ['class="doke-switch__input" type="checkbox" data-points-input'],
  'resultados.html': ['class="doke-select"', 'results-field doke-field'],
})) {
  const html = read(file);
  for (const needle of required) {
    if (!html.includes(needle)) failures.push(`${file}: não contém ${needle}`);
  }
}

if (failures.length) {
  console.error('audit:form-control-contract falhou:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`audit:form-control-contract OK (${activeHtmlFiles().length} HTMLs ativos escaneados).`);

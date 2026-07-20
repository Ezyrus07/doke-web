'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/profile-page.css'), 'utf8');
const presenter = fs.readFileSync(path.join(root, 'assets/js/pages/profile/profile-presentation.js'), 'utf8');
const editorCss = fs.readFileSync(path.join(root, 'assets/css/pages/professional-profile-editor.css'), 'utf8');
const pages = ['perfil.html', 'perfil-profissional.html', 'perfil-cliente.html', 'meu-perfil.html'];
const failures = [];

const selector = 'body.profile-page-shell[data-profile-contract="clean-v1"] .profile-heading h1';
const selectorIndex = css.indexOf(selector);
const ruleEnd = selectorIndex >= 0 ? css.indexOf('}', selectorIndex) : -1;
const rule = selectorIndex >= 0 && ruleEnd >= 0 ? css.slice(selectorIndex, ruleEnd + 1) : '';

if (!rule) failures.push('Contrato visual compartilhado do nome não foi encontrado.');
if (!/white-space:\s*nowrap\s*;/.test(rule)) failures.push('O nome deve permanecer em uma linha.');
if (!/overflow:\s*hidden\s*;/.test(rule)) failures.push('O nome deve conter o overflow.');
if (!/text-overflow:\s*ellipsis\s*;/.test(rule)) failures.push('O nome deve usar reticências.');
if (!/max-inline-size:\s*100%\s*;/.test(rule)) failures.push('O limite deve respeitar a largura disponível do hero.');
if (!/node\.setAttribute\('title',\s*name\)/.test(presenter)) failures.push('O nome completo deve permanecer disponível no title.');
if (editorCss.includes('.profile-heading h1')) failures.push('O editor profissional não deve redefinir a anatomia do nome.');

for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  if (!html.includes('profile-presentation.js?v=20260719-profile-family-v1')) {
    failures.push(`${page}: apresentador compartilhado de nome ausente.`);
  }
}

if (failures.length) {
  console.error('Professional profile name contract failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Professional profile name contract passed.');

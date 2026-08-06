'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = ['perfil.html', 'perfil-profissional.html', 'perfil-cliente.html', 'meu-perfil.html'];
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function requireTerm(file, source, term, message) {
  if (!source.includes(term)) failures.push(`${file}: ${message || `ausente: ${term}`}`);
}

function forbidTerm(file, source, term, message) {
  if (source.includes(term)) failures.push(`${file}: ${message || `não deveria conter: ${term}`}`);
}

for (const file of pages) {
  const html = read(file);
  requireTerm(file, html, 'class="app-header app-header--home home-side-meta"', 'header canônico da família de perfis ausente');
  requireTerm(file, html, 'data-home-profile-menu', 'dropdown canônico da conta ausente');
  requireTerm(file, html, 'assets/js/pages/profile/profile-presentation.js?v=20260719-profile-family-v1', 'apresentador compartilhado de identidade ausente');
  if (!/(data-profile-hydration-skeleton|data-professional-profile-hydration-skeleton)/.test(html)) {
    failures.push(`${file}: skeleton canônico de perfil ausente`);
  }
  if (!/(data-profile-hydration-ready|data-professional-profile-hydration-ready)/.test(html)) {
    failures.push(`${file}: boundary ready de hidratação ausente`);
  }
}

const publicProfessional = read('perfil.html');
requireTerm('perfil.html', publicProfessional, 'data-profile-hydration-ready hidden', 'conteúdo público deve aguardar hidratação');
requireTerm('perfil.html', publicProfessional, 'assets/js/pages/profile-experience.js', 'controller público canônico ausente');

const publicClient = read('perfil-cliente.html');
requireTerm('perfil-cliente.html', publicClient, 'data-state-scope="perfil-cliente"', 'scope da região de estado deve coincidir com a boundary');
requireTerm('perfil-cliente.html', publicClient, 'data-client-owner-public-action', 'owner deve receber apenas navegação para gerenciar o perfil');
requireTerm('perfil-cliente.html', publicClient, 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'bootstrap Supabase deve seguir a família de perfis');
requireTerm('perfil-cliente.html', publicClient, 'assets/js/repositories/notifications-repository.js', 'header deve consumir o mesmo repositório de notificações');
forbidTerm('perfil-cliente.html', publicClient, 'client-profile-editor.css', 'perfil público não pode carregar CSS de edição');
forbidTerm('perfil-cliente.html', publicClient, 'data-client-profile-editor', 'perfil público não pode conter modal de edição');
forbidTerm('perfil-cliente.html', publicClient, 'client-profile-editor.js', 'perfil público não pode carregar controller de edição');
forbidTerm('perfil-cliente.html', publicClient, 'data-client-edit-action', 'perfil público não pode conter affordances de edição');
forbidTerm('perfil-cliente.html', publicClient, 'profile-avatar--editable', 'avatar público não pode usar variante editável');

const ownerClient = read('meu-perfil.html');
requireTerm('meu-perfil.html', ownerClient, 'data-state-scope="meu-perfil"', 'scope da região de estado deve coincidir com a boundary');
requireTerm('meu-perfil.html', ownerClient, 'data-owner-public-profile-link', 'ação Ver perfil público ausente');
requireTerm('meu-perfil.html', ownerClient, 'data-profile-media-trigger="cover"', 'capa deve usar botão canônico de mídia');
requireTerm('meu-perfil.html', ownerClient, 'data-profile-media-trigger="avatar"', 'avatar deve usar botão canônico de mídia');
requireTerm('meu-perfil.html', ownerClient, 'close-button-authority.css', 'modal owner deve carregar a autoridade canônica de fechar');
requireTerm('meu-perfil.html', ownerClient, 'data-client-profile-editor', 'modal deve existir somente na rota owner');

const foundation = read('assets/css/pages/profile-page.css');
requireTerm('profile-page.css', foundation, 'body.profile-page-shell[data-profile-contract="clean-v1"] .profile-heading h1', 'título deve pertencer à fundação compartilhada');
for (const term of ['white-space: nowrap;', 'overflow: hidden;', 'text-overflow: ellipsis;']) {
  requireTerm('profile-page.css', foundation, term, `contrato de nome ausente: ${term}`);
}

const presentation = read('assets/js/pages/profile/profile-presentation.js');
requireTerm('profile-presentation.js', presentation, 'setDisplayName', 'API compartilhada de nome ausente');
requireTerm('profile-presentation.js', presentation, "node.setAttribute('title', name)", 'nome integral deve permanecer disponível');

const clientEditorCss = read('assets/css/pages/client-profile-editor.css');
forbidTerm('client-profile-editor.css', clientEditorCss, '@import url("./profile-foundation.css', 'editor não deve importar novamente a fundação');
requireTerm('client-profile-editor.css', clientEditorCss, 'profile-owner-controls.css', 'controles owner devem consumir o componente compartilhado');
requireTerm('client-profile-editor.css', clientEditorCss, 'profile-editor-form.css', 'formulário owner deve consumir o componente compartilhado');

const professionalEditorCss = read('assets/css/pages/professional-profile-editor.css');
requireTerm('professional-profile-editor.css', professionalEditorCss, 'profile-owner-controls.css', 'editor profissional deve consumir os controles owner compartilhados');
requireTerm('professional-profile-editor.css', professionalEditorCss, 'profile-editor-form.css', 'editor profissional deve consumir o formulário compartilhado');

const ownerControls = read('assets/css/components/profile/profile-owner-controls.css');
requireTerm('profile-owner-controls.css', ownerControls, 'body[data-profile-mode=\"owner-edit\"]', 'modo owner profissional ausente do componente');
requireTerm('profile-owner-controls.css', ownerControls, 'body[data-profile-mode=\"client-edit\"]', 'modo owner cliente ausente do componente');

const editorForm = read('assets/css/components/profile/profile-editor-form.css');
requireTerm('profile-editor-form.css', editorForm, '.profile-editor-form__grid', 'grid compartilhado do editor ausente');
requireTerm('profile-editor-form.css', editorForm, 'doke-modal-system.css', 'dependência canônica de modal ausente');
requireTerm('profile-editor-form.css', editorForm, 'form-controls.css', 'dependência canônica de formulário ausente');

for (const file of ['perfil-profissional.html', 'meu-perfil.html']) {
  const html = read(file);
  requireTerm(file, html, 'profile-editor-dialog__surface', 'surface compartilhada do editor ausente');
  requireTerm(file, html, 'profile-editor-form__grid', 'grid compartilhado do editor ausente');
  requireTerm(file, html, 'profile-editor-form__field', 'campo compartilhado do editor ausente');
  requireTerm(file, html, 'profile-editor-form__status', 'status compartilhado do editor ausente');
}

requireTerm('meu-perfil.html', ownerClient, 'profile-owner-section-tools profile-owner-section-tools--island', 'seções owner do cliente devem consumir a ilha compartilhada');

const services = read('assets/js/pages/profile/professional-services-section.js');
requireTerm('professional-services-section.js', services, "article.className = 'doke-ad-card profile-service-card profile-service-card--horizontal'", 'cards público e owner devem nascer da mesma anatomia canônica');
requireTerm('professional-services-section.js', services, "options.owner ? ' profile-service-card--owner", 'owner deve ser um modificador da anatomia compartilhada');

if (failures.length) {
  console.error('Profile family contract failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Profile family contract passed.');

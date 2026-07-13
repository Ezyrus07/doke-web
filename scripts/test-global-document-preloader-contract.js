#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const pages = [
  'admin.html','ajuda.html','anunciar-servico.html','auth/cadastro.html','auth/esqueci-senha.html','auth/login.html',
  'avaliacao-profissional.html','carteira.html','comunidade-interna.html','comunidade.html','configuracoes.html',
  'detalhe-anuncio.html','index.html','mensagens.html','meu-perfil.html','notificacoes.html','novidades.html',
  'orcamento.html','pagamento-profissional.html','pedidos.html','perfil-cliente.html','perfil-profissional.html',
  'perfil.html','resultados.html','tornar-profissional.html','verificacao-profissional.html'
];
const errors = [];
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
for (const file of pages) {
  const text = read(file);
  const preloaderCount = (text.match(/data-doke-document-preloader/g) || []).length;
  const scriptCount = (text.match(/document-preloader\.js\?v=20260712-global-document-boot-v1/g) || []).length;
  const bodyMatch = text.match(/<body\b[^>]*>([\s\S]{0,900})/i);
  if (preloaderCount !== 1) errors.push(`${file}: expected one global preloader, found ${preloaderCount}`);
  if (scriptCount !== 1) errors.push(`${file}: expected one preloader runtime, found ${scriptCount}`);
  if (!bodyMatch || !/^\s*<section\b[^>]*data-doke-document-preloader/i.test(bodyMatch[1])) errors.push(`${file}: preloader is not the first body surface`);
  const prefix = file.startsWith('auth/') ? '../' : '';
  if (!text.includes(`src="${prefix}assets/js/core/document-preloader.js?v=20260712-global-document-boot-v1"`)) errors.push(`${file}: invalid runtime path`);
  const hasDirectCss = text.includes(`${prefix}assets/css/components/feedback/document-preloader.css?v=20260712-global-document-boot-v1`);
  const foundationBacked = ['comunidade-interna.html','comunidade.html','mensagens.html','notificacoes.html'].includes(file);
  if (!hasDirectCss && !foundationBacked) errors.push(`${file}: preloader stylesheet is not loaded`);
}
const css = read('assets/css/components/feedback/document-preloader.css');
['position: fixed','inset: 0','data-doke-document-boot="ready"','dokeDocumentPreloaderFailsafe'].forEach((needle) => {
  if (!css.includes(needle)) errors.push(`document-preloader.css: missing ${needle}`);
});
if (css.includes('!important')) errors.push('document-preloader.css: !important is forbidden');
const runtime = read('assets/js/core/document-preloader.js');
['data-doke-document-preloader','doke.internalRouteNavigation',"dokeNavigationMode === 'stable-shell'",'DokeDocumentPreloader','doke:document-preloader-release'].forEach((needle) => {
  if (!runtime.includes(needle)) errors.push(`document-preloader.js: missing ${needle}`);
});
if (/location\.reload|window\.location\s*=/.test(runtime)) errors.push('document-preloader.js: must not force reload/navigation');
const router = read('assets/js/core/stable-shell-router.js');
if (!router.includes('.doke-document-preloader')) errors.push('stable-shell-router.js: internal navigation does not filter the preloader');
if (errors.length) {
  console.error('[global-document-preloader-contract] failed');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('[global-document-preloader-contract] ok');
console.log(`- production HTML pages covered: ${pages.length}`);
console.log('- document loads show the canonical Doke boot surface');
console.log('- stable-shell navigation does not replay the boot surface');

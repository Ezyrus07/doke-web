'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const html = read('admin-verificacao.html');
const js = read('assets/js/pages/admin-verificacao.js');
const css = read('assets/css/pages/admin-verificacao.css');

assert(/data-admin-review-pending/.test(html), 'admin-verificacao deve possuir pending explícito para guard e preparação.');
assert(!/data-admin-review-skeleton/.test(html), 'admin-verificacao não deve simular o dashboard com skeleton durante autorização.');
assert(/data-admin-review-content[^>]*hidden/.test(html), 'conteúdo administrativo deve iniciar oculto.');
assert(/data-view-state="guard-pending"[^>]*aria-busy="true"/.test(html), 'boundary deve iniciar em guard-pending e busy.');
assert(/var pending = q\('\[data-admin-review-pending\]'\)/.test(js), 'controller deve controlar a superfície pending.');
assert(/'guard-pending': \['Validando acesso à análise'/.test(js), 'guard deve comunicar validação de acesso.');
assert(/loading: \['Preparando a análise de identidade'/.test(js), 'carregamento de dados deve ser distinguido do guard.');
assert(/redirecting: \['Redirecionando com segurança'/.test(js), 'redirecionamento deve possuir estado semântico próprio.');
assert(!/admin-review-skeleton/.test(css), 'CSS obsoleto do skeleton administrativo deve ser removido.');
assert(/\.admin-review-pending__surface/.test(css), 'pending deve usar superfície compacta e canônica.');

if (failures.length) {
  console.error('Admin review pending state contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Admin review pending state contract: PASS');

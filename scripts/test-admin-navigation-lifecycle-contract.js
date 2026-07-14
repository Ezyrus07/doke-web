'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const adminHtml = read('admin.html');
const adminJs = read('assets/js/pages/admin.js');
const adminExperience = read('assets/js/pages/admin-experience.js');
const adminCss = read('assets/css/pages/admin.css');
const reviewHtml = read('admin-verificacao.html');
const reviewJs = read('assets/js/pages/admin-verificacao.js');
const reviewCss = read('assets/css/pages/admin-verificacao.css');
const accessService = read('assets/js/services/admin-access-service.js');
const authRoutes = read('assets/js/core/auth-route-map.js');
const navigationRegistry = read('assets/js/core/navigation-registry.js');
const mobileShell = read('assets/js/components/mobile-app-shell.js');

function scriptSources(html) {
  return Array.from(html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi), (match) => match[1]);
}

assert(/data-view-state="guard-pending"/.test(adminHtml), 'admin.html deve iniciar em guard-pending.');
assert(/data-admin-access-skeleton/.test(adminHtml), 'admin.html deve possuir skeleton estrutural de acesso.');
assert(/data-admin-dashboard[^>]*hidden/.test(adminHtml), 'dashboard administrativo deve iniciar oculto.');
assert(/data-admin-access-error/.test(adminHtml) && /data-admin-access-retry/.test(adminHtml), 'admin.html deve possuir erro recuperável e retry.');
assert(adminHtml.indexOf('assets/js/core/session.js') < adminHtml.indexOf('assets/js/pages/admin.js'), 'session.js deve carregar antes de admin.js.');
assert(adminHtml.indexOf('assets/js/services/admin-access-service.js') < adminHtml.indexOf('assets/js/pages/admin.js'), 'admin-access-service deve carregar antes do controller.');
assert(/setAccessSurface\('guard-pending'\)/.test(adminJs), 'admin controller deve publicar guard-pending.');
assert(/setAccessSurface\('loading'\)/.test(adminJs), 'admin controller deve manter skeleton durante hidratação.');
assert(/setAccessSurface\('ready'\)/.test(adminJs), 'admin controller deve revelar dashboard somente em ready.');
assert(/access\.guardPage/.test(adminJs), 'admin controller deve delegar o guard ao service compartilhado.');
assert(/api\.page\.begin/.test(adminJs) && /api\.page\.ready/.test(adminJs) && /api\.page\.fail/.test(adminJs), 'admin controller deve publicar lifecycle de página completo.');
assert(!/localStorage/.test(adminJs), 'admin.js não deve acessar localStorage diretamente.');
assert(!/setState\('loading'\);\s*\}\)\(\);\s*$/.test(adminExperience), 'admin-experience não deve iniciar loading antes do guard.');

assert(/data-state-boundary="admin-verificacao"/.test(reviewHtml), 'admin-verificacao deve declarar boundary próprio.');
assert(/data-admin-review-skeleton/.test(reviewHtml), 'admin-verificacao deve possuir skeleton estrutural.');
assert(/data-admin-review-content[^>]*hidden/.test(reviewHtml), 'conteúdo sensível da análise deve iniciar oculto.');
assert(/data-admin-review-error-message/.test(reviewHtml) && /data-admin-review-retry/.test(reviewHtml), 'análise deve possuir erro recuperável.');
assert(reviewHtml.indexOf('assets/js/core/session.js') < reviewHtml.indexOf('assets/js/pages/admin-verificacao.js'), 'session.js deve carregar antes do controller da análise.');
assert(reviewHtml.indexOf('assets/js/services/admin-access-service.js') < reviewHtml.indexOf('assets/js/pages/admin-verificacao.js'), 'guard administrativo deve carregar antes do controller da análise.');
assert(/access\.guardPage/.test(reviewJs), 'controller da análise deve executar o guard canônico.');
assert(/setSurface\('guard-pending'\)/.test(reviewJs) && /setSurface\('loading'\)/.test(reviewJs) && /setSurface\('ready'\)/.test(reviewJs), 'controller da análise deve separar pending, loading e ready.');
assert(/api\.page\.begin/.test(reviewJs) && /api\.page\.ready/.test(reviewJs) && /api\.page\.fail/.test(reviewJs), 'análise deve publicar lifecycle de página completo.');
assert(/replace:\s*replace\s*===\s*true/.test(reviewJs), 'retorno após decisão deve poder substituir histórico.');
assert(/setTimeout\(resolve,\s*280\)/.test(reviewJs), 'feedback de conclusão deve ser curto e explícito.');
assert(!/setTimeout\(init/.test(reviewJs), 'controller não deve usar setTimeout como sincronização de boot.');

assert(/guard\.begin/.test(accessService), 'admin-access-service deve iniciar guard.');
assert(/guard\.allow/.test(accessService), 'admin-access-service deve publicar allow.');
assert(/guard\.redirect/.test(accessService), 'admin-access-service deve publicar redirect.');
assert(/guard\.fail/.test(accessService), 'admin-access-service deve publicar falha.');
assert(/replace:\s*true/.test(accessService) && /forceDocument:\s*true/.test(accessService), 'negação administrativa deve usar replace e documento completo.');
assert(!/localStorage/.test(accessService), 'admin-access-service deve consumir a autoridade de sessão, não storage direto.');
assert(/admin-verificacao\.html/.test(authRoutes), 'admin-verificacao deve estar classificada como rota privada.');
assert(/'admin-verificacao\.html':\s*\{[^}]*bottomNav:\s*false/.test(navigationRegistry), 'registry deve impedir bottom navigation na análise administrativa.');
assert(/'admin-verificacao\.html':\s*\{[^}]*bottomNav:\s*false/.test(mobileShell), 'mobile shell deve tratar análise administrativa como superfície sem bottom nav.');
assert(/prefers-reduced-motion:\s*reduce/.test(adminCss) && /prefers-reduced-motion:\s*reduce/.test(reviewCss), 'skeletons administrativos devem respeitar reduced motion.');

const reviewScripts = scriptSources(reviewHtml);
const duplicates = reviewScripts.filter((src, index) => reviewScripts.indexOf(src) !== index);
assert(duplicates.length === 0, 'admin-verificacao não pode carregar scripts duplicados: ' + duplicates.join(', '));

if (failures.length) {
  console.error('Admin navigation lifecycle contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Admin navigation lifecycle contract: PASS');

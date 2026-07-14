'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const ownerHtml = read('meu-perfil.html');
const ownerJs = read('assets/js/pages/owner-profile-experience.js');
const professionalHtml = read('perfil-profissional.html');
const professionalJs = read('assets/js/pages/professional-profile-experience.js');
const settingsHtml = read('configuracoes.html');
const settingsJs = read('assets/js/pages/configuracoes.js');
const accountAccess = read('assets/js/services/account-access-service.js');
const pageHydration = read('assets/js/core/page-hydration.js');
const stableRouter = read('assets/js/core/stable-shell-router.js');

assert(/data-profile-hydration-skeleton/.test(ownerHtml), 'meu-perfil deve manter skeleton estrutural.');
assert(/data-profile-hydration-ready hidden/.test(ownerHtml), 'conteúdo do meu perfil deve iniciar oculto.');
assert(ownerHtml.indexOf('assets/js/core/session.js') < ownerHtml.indexOf('assets/js/services/account-access-service.js'), 'session.js deve carregar antes do guard de conta em meu-perfil.');
assert(ownerHtml.indexOf('assets/js/services/account-access-service.js') < ownerHtml.indexOf('assets/js/pages/owner-profile-experience.js'), 'guard de conta deve carregar antes do controller do meu perfil.');
assert(/skeletonMode:\s*'route-and-document'/.test(ownerJs), 'meu-perfil deve usar skeleton em documento e rota interna.');
assert(/access\.guardPage/.test(ownerJs), 'meu-perfil deve executar guard autenticado.');
assert(/hydration\?\.ready/.test(ownerJs) && /hydration\?\.error/.test(ownerJs), 'meu-perfil deve publicar ready e error no hydration contract.');
assert(/ownerInitializationBoundary/.test(ownerJs), 'inicialização do meu perfil deve ser idempotente por boundary.');

assert(/data-professional-profile-hydration-skeleton/.test(professionalHtml), 'perfil-profissional deve possuir skeleton estrutural.');
assert(/data-professional-profile-hydration-ready hidden/.test(professionalHtml), 'conteúdo profissional sensível deve iniciar oculto.');
assert(/data-state-boundary="perfil-profissional"[^>]*data-view-state="loading"[^>]*aria-busy="true"/.test(professionalHtml), 'boundary profissional deve iniciar busy/loading.');
assert(professionalHtml.indexOf('assets/js/core/page-hydration.js') < professionalHtml.indexOf('assets/js/core/stable-shell-router.js'), 'page-hydration deve carregar antes do router no perfil profissional.');
assert(/window\.DokeInitProfessionalProfile\s*=/.test(professionalJs), 'perfil profissional deve expor initializer canônico.');
assert(/access\.guardPage/.test(professionalJs), 'perfil profissional deve executar guard profissional antes de montar.');
assert(/skeletonMode:\s*'route-and-document'/.test(professionalJs), 'perfil profissional deve usar skeleton em hard load e rota interna.');
assert(/hydration\?\.ready/.test(professionalJs) && /hydration\?\.error/.test(professionalJs), 'perfil profissional deve publicar ready e error.');
assert(/professionalInitializationBoundary/.test(professionalJs), 'initializer profissional deve ser idempotente por boundary.');
assert(/'\/perfil-profissional\.html':\s*Object\.freeze/.test(pageHydration), 'page-hydration deve registrar contrato da rota profissional.');
assert(/'\/perfil-profissional\.html',/.test(stableRouter), 'perfil profissional deve participar da barreira de hydration.');
assert(/'\/perfil-profissional\.html':\s*\['DokeInitProfessionalProfile'\]/.test(stableRouter), 'router deve chamar o initializer profissional correto.');

assert(/data-settings-hydration-skeleton/.test(settingsHtml), 'configurações deve manter skeleton estrutural.');
assert(/data-settings-hydration-ready hidden/.test(settingsHtml), 'conteúdo de configurações deve iniciar oculto.');
assert(settingsHtml.indexOf('assets/js/core/session.js') < settingsHtml.indexOf('assets/js/services/account-access-service.js'), 'session.js deve carregar antes do guard em configurações.');
assert(settingsHtml.indexOf('assets/js/services/account-access-service.js') < settingsHtml.indexOf('assets/js/pages/configuracoes.js'), 'guard deve carregar antes do controller de configurações.');
assert(/data-settings-professional-only hidden/.test(settingsHtml), 'itens profissionais devem iniciar ocultos para impedir flash em conta cliente.');
assert(/data-settings-professional-panel[^>]*hidden/.test(settingsHtml), 'painéis profissionais e agenda devem iniciar ocultos.');
assert(/skeletonMode:\s*'route-and-document'/.test(settingsJs), 'configurações deve usar skeleton em documento e rota interna.');
assert(/accountAccess/.test(settingsJs) && /access\.guardPage/.test(settingsJs), 'configurações deve executar guard autenticado.');
assert(/applyAccountSurface/.test(settingsJs), 'configurações deve projetar superfícies por papel da conta.');
assert(/dataset\.settingsAccess\s*=\s*isProfessional\s*\?\s*'allowed'\s*:\s*'denied'/.test(settingsJs), 'agenda e painéis profissionais devem ser indisponíveis para cliente.');
assert(/activeInitializationRoot/.test(settingsJs), 'configurações deve evitar inicializações concorrentes na mesma boundary.');
assert(!/window\.location\.assign\('auth\/login\.html'\)/.test(settingsJs), 'logout em configurações deve usar a fachada de navegação.');

assert(/guard\.begin/.test(accountAccess), 'account-access-service deve iniciar guard.');
assert(/guard\.allow/.test(accountAccess), 'account-access-service deve publicar allow.');
assert(/guard\.redirect/.test(accountAccess), 'account-access-service deve publicar redirect.');
assert(/guard\.fail/.test(accountAccess), 'account-access-service deve publicar falha.');
assert(/replace:\s*true/.test(accountAccess) && /forceDocument:\s*true/.test(accountAccess), 'negação de conta deve usar replace e documento completo.');
assert(!/localStorage/.test(accountAccess), 'account-access-service não deve acessar storage diretamente.');

if (failures.length) {
  console.error('Profile/settings navigation lifecycle contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Profile/settings navigation lifecycle contract: PASS');

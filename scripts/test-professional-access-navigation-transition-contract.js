const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const announceHtml = read('anunciar-servico.html');
const announceJs = read('assets/js/pages/anunciar-servico.js');
const accessService = read('assets/js/services/professional-access-service.js');
const verificationHtml = read('verificacao-profissional.html');
const verificationJs = read('assets/js/pages/verificacao-profissional.js');
const stableRouter = read('assets/js/core/stable-shell-router.js');

assert(/data-post-service-guard-hydration-skeleton/.test(announceHtml), 'anunciar-servico deve possuir skeleton estrutural de guard.');
assert(/data-post-service-guard-ready hidden/.test(announceHtml), 'conteudo protegido deve iniciar oculto.');
assert(/data-post-service-guard-error[^>]*hidden/.test(announceHtml), 'guard deve possuir fallback de erro recuperavel.');
assert(/aria-busy="true"/.test(announceHtml), 'boundary deve iniciar com aria-busy=true.');
assert(/data-page-lifecycle-state="loading"/.test(announceHtml), 'boundary deve expor estado inicial verificavel.');
assert(/DokePageHydration\?\.create/.test(announceJs), 'controller deve usar a autoridade compartilhada de hydration.');
assert(/access\.can\(action\)/.test(announceJs), 'guard deve responder somente a decisao de acesso.');
assert(/setPageLifecycleState\(root,\s*'ready'\)/.test(announceJs), 'controller deve publicar o terminal ready.');
assert(/setPageLifecycleState\(root,\s*'error'\)/.test(announceJs), 'controller deve publicar o terminal error.');
assert(/setPageLifecycleState\(root,\s*'redirected'\)/.test(announceJs), 'controller deve publicar o terminal redirected.');
assert(/DokeInitServiceForm\?\.\(\)/.test(announceJs), 'formulario deve ser montado somente apos allowed.');
assert(/const pageControllers = new WeakMap\(\)/.test(announceJs), 'single-flight deve ser escopado ao root montado.');
assert(/PROFESSIONAL_ACCESS_TIMEOUT/.test(announceJs), 'guard deve possuir timeout ligado ao terminal error.');
assert(/data-post-service-guard-retry/.test(announceJs), 'fallback deve oferecer retry funcional.');
assert(/lifecycleApi\.guard\.begin/.test(accessService), 'service deve iniciar guard no lifecycle canonico.');
assert(/lifecycleApi\.guard\.allow/.test(accessService), 'service deve publicar allowed no lifecycle canonico.');
assert(/lifecycleApi\.guard\.redirect/.test(accessService), 'service deve publicar redirecting no lifecycle canonico.');
assert(/forceDocument:\s*options\.hard\s*===\s*true/.test(accessService), 'redirect obrigatorio deve manter opcao de documento completo.');
assert(/replace:\s*options\.replace\s*!==\s*false/.test(accessService), 'redirect obrigatorio deve usar replace por padrao.');
assert(/data-doke-document-preloader-mode="reload"/.test(verificationHtml), 'destino nao deve mostrar splash em navegacao por guard.');
assert(/data-professional-verification-hydration-pending/.test(verificationHtml), 'destino deve possuir pending explicito no primeiro frame.');
assert(!/data-professional-verification-hydration-skeleton/.test(verificationHtml), 'destino nao deve simular o formulario com skeleton generico.');
assert(/pendingSelectors:\s*'\[data-professional-verification-hydration-pending\]'/.test(verificationJs), 'destino deve registrar o pending de verificacao.');
assert(/skeletonMode:\s*'never'/.test(verificationJs), 'destino deve reservar skeleton para dados com geometria previsivel.');
assert(/doke-page-hydration-skeleton/.test(announceHtml), 'skeleton deve reutilizar a autoridade visual compartilhada.');
assert(!/setTimeout\([^)]*redirect|setTimeout\([^)]*location/i.test(announceJs + accessService), 'guard nao pode usar delay artificial para redirecionar.');
assert(/['"]\/anunciar-servico\.html['"]:\s*\[['"]DokeInitPostService['"]\]/.test(stableRouter), 'router deve reinicializar a pagina somente depois do commit.');
assert(/fallbackTimer = window\.setTimeout\(finishReset,\s*120\)/.test(stableRouter), 'reset de scroll nao pode depender indefinidamente de animation frame.');
assert(/restoreScrollWithFallback/.test(stableRouter) && /await restoreScrollWithFallback\(url\.href\)/.test(stableRouter), 'historico deve possuir settlement mesmo sem animation frame.');

if (failures.length) {
  console.error('Professional access navigation transition contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Professional access navigation transition contract: PASS');

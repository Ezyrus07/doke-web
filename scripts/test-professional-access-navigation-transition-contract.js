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
const announceCss = read('assets/css/pages/anunciar-servico.css');

assert(/data-post-service-guard-skeleton/.test(announceHtml), 'anunciar-servico deve possuir skeleton estrutural de guard.');
assert(/data-post-service-guard-ready hidden/.test(announceHtml), 'conteúdo protegido deve iniciar oculto.');
assert(/data-post-service-guard-error hidden/.test(announceHtml), 'guard deve possuir fallback de erro recuperável.');
assert(/aria-busy="true"/.test(announceHtml), 'boundary deve iniciar com aria-busy=true.');
assert(/setGuardSurface\('pending'\)/.test(announceJs), 'controller deve publicar estado pending antes do check.');
assert(/setGuardSurface\('allowed'\)/.test(announceJs), 'controller deve revelar conteúdo apenas após allowed.');
assert(/setGuardSurface\('redirecting'\)/.test(announceJs), 'controller deve manter superfície durante redirect.');
assert(/data-post-service-guard-retry/.test(announceJs), 'fallback deve oferecer retry funcional.');
assert(/lifecycleApi\.guard\.begin/.test(accessService), 'service deve iniciar guard no lifecycle canônico.');
assert(/lifecycleApi\.guard\.allow/.test(accessService), 'service deve publicar allowed no lifecycle canônico.');
assert(/lifecycleApi\.guard\.redirect/.test(accessService), 'service deve publicar redirecting no lifecycle canônico.');
assert(/forceDocument:\s*options\.hard\s*===\s*true/.test(accessService), 'redirect obrigatório deve forçar documento completo.');
assert(/replace:\s*options\.replace\s*!==\s*false/.test(accessService), 'redirect obrigatório deve usar replace por padrão.');
assert(/data-doke-document-preloader-mode="reload"/.test(verificationHtml), 'destino não deve mostrar splash em navegação por guard.');
assert(/data-professional-verification-hydration-skeleton/.test(verificationHtml), 'destino deve possuir skeleton estrutural no primeiro frame.');
assert(/skeletonMode:\s*'always'/.test(verificationJs), 'destino deve ativar o skeleton durante hidratação.');
assert(/prefers-reduced-motion:\s*reduce/.test(announceCss), 'skeleton do guard deve respeitar reduced motion.');
assert(!/setTimeout\([^)]*redirect|setTimeout\([^)]*location/i.test(announceJs + accessService), 'guard não pode usar delay artificial para redirecionar.');

if (failures.length) {
  console.error('Professional access navigation transition contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Professional access navigation transition contract: PASS');

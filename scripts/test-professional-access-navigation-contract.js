#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const check = (condition, message) => {
  try { assert.ok(condition, message); }
  catch (error) { failures.push(error.message); }
};

const announceHtml = read('anunciar-servico.html');
const announceCss = read('assets/css/pages/anunciar-servico.css');
const announcePage = read('assets/js/pages/anunciar-servico.js');
const accessService = read('assets/js/services/professional-access-service.js');
const verificationHtml = read('verificacao-profissional.html');
const verificationPage = read('assets/js/pages/verificacao-profissional.js');
const hydrationCore = read('assets/js/core/page-hydration.js');
const stableRouter = read('assets/js/core/stable-shell-router.js');
const legacyRouter = read('assets/js/core/app.js');

const scriptIndex = (html, fragment) => html.indexOf(fragment);

check(/data-state-boundary=["']anunciar-servico["'][^>]*data-view-state=["']loading["'][^>]*aria-busy=["']true["']/i.test(announceHtml),
  'anunciar-servico deve iniciar com boundary loading e aria-busy=true.');
check(/data-post-service-guard-hydration-skeleton/i.test(announceHtml),
  'anunciar-servico deve possuir skeleton estrutural próprio do guard.');
check(/data-post-service-guard-ready[^>]*hidden/i.test(announceHtml),
  'conteúdo protegido de anunciar-servico deve iniciar oculto.');
check(/data-post-service-guard-error[^>]*hidden/i.test(announceHtml),
  'anunciar-servico deve possuir erro recuperável inicialmente oculto.');
check(/data-post-service-guard-retry[^>]*data-page-hydration-retry/i.test(announceHtml),
  'retry do guard deve ser reconhecido pelo lifecycle compartilhado.');
check(scriptIndex(announceHtml, 'assets/js/core/page-hydration.js') > -1
  && scriptIndex(announceHtml, 'assets/js/core/page-hydration.js') < scriptIndex(announceHtml, 'assets/js/core/stable-shell-router.js'),
  'page-hydration deve carregar antes do stable-shell-router em anunciar-servico.');
check(!/professional-access-state[^}]+visibility\s*:\s*hidden/is.test(announceCss),
  'CSS não pode ocultar a tela inteira enquanto o guard resolve.');
check(/DokePageHydration\?\.create|DokePageHydration\.create/.test(announcePage),
  'anunciar-servico deve delegar skeleton/ready/error ao page-hydration compartilhado.');
check(/skeletonMode:\s*['"]always['"]/.test(announcePage),
  'guard de anunciar-servico deve manter skeleton também em navegação interna direta.');
check(/hardRedirect:\s*false/.test(announcePage),
  'fluxo obrigatório deve preservar shell e usar guard replace interno.');
check(/hydration\.ready\(\{\s*hasItems:\s*true\s*\}\)/.test(announcePage),
  'conteúdo só deve ser liberado após montagem e hydration.ready.');
check(/hydration\.error\(/.test(announcePage),
  'falha do guard deve publicar erro recuperável pelo lifecycle compartilhado.');
check(/Doke\.navigation\s*&&\s*typeof Doke\.navigation\.guard/.test(accessService),
  'professional-access-service deve delegar orquestração ao guard canônico.');
check(/replace:\s*true/.test(accessService) && /forceDocument:\s*options\.hard\s*===\s*true/.test(accessService),
  'fallback de navegação profissional deve manter replace e document navigation explícita.');
check(/['"]\/anunciar-servico\.html['"]:\s*Object\.freeze/.test(hydrationCore),
  'page-hydration deve registrar contrato estrutural de anunciar-servico.');
check(/internalNavigation\s*&&\s*routeVisualMode\s*===\s*['"]direct['"]\)\s*return\s+skeletonMode\s*===\s*['"]always['"]/.test(hydrationCore),
  'skeletonMode=always deve prevalecer em navegação interna direta.');
check(/HYDRATION_BARRIER_ROUTES[\s\S]*['"]\/anunciar-servico\.html['"]/.test(stableRouter),
  'stable-shell deve aguardar settlement do guard de anunciar-servico.');
check(/['"]\/anunciar-servico\.html['"]:\s*\[['"]DokeInitPostService['"]\]/.test(stableRouter),
  'stable-shell deve reinicializar o guard ao entrar em anunciar-servico.');
check(!/if \(navigating\) return Promise\.resolve\(false\)/.test(stableRouter),
  'stable-shell não pode bloquear redirect de guard iniciado durante a hidratação da rota de origem.');
check(/var settlement = await waitForRouteSettlement\(path\);\s*if \(id !== navigationId\) return;/.test(stableRouter),
  'rota supersedida não pode publicar settlement obsoleto.');
check(/finally \{[\s\S]*if \(id === navigationId\) \{[\s\S]*navigating = false;/.test(stableRouter),
  'somente a navegação mais recente pode liberar o estado busy do shell.');
check(/runViewInitializer\(['"]post-service['"],\s*window\.DokeInitPostService\)/.test(legacyRouter),
  'legacy-shell fallback deve reinicializar anunciar-servico.');
check(/runViewInitializer\(['"]professional-verification['"],\s*window\.DokeInitProfessionalVerification\)/.test(legacyRouter),
  'legacy-shell fallback deve reinicializar verificacao-profissional.');
check((verificationHtml.match(/doke-page-hydration-skeleton__field/g) || []).length >= 5,
  'skeleton de verificacao-profissional deve representar a densidade real do formulário.');
check(/skeletonMode:\s*['"]always['"]/.test(verificationPage) && /minDuration:\s*0/.test(verificationPage),
  'destino deve usar skeleton estrutural sem duração mínima artificial.');
check(verificationPage.indexOf('renderStatus(currentVerification);') < verificationPage.lastIndexOf('hydration && hydration.ready({ hasItems: true });'),
  'estado final da verificação deve ser renderizado antes de liberar o conteúdo.');

async function runtimeServiceContract() {
  let decision = { allowed: true, reason: 'allowed' };
  const guardCalls = [];
  const events = [];
  const document = {
    documentElement: { dataset: {} },
    dispatchEvent(event) { events.push(event); }
  };
  class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  }
  const context = {
    console,
    CustomEvent,
    document,
    window: null,
    location: {
      pathname: '/anunciar-servico.html',
      search: '',
      href: 'https://doke.test/anunciar-servico.html',
      replace() { throw new Error('document replace não deveria ser usado com facade disponível'); }
    },
    URL,
    Promise,
    Object
  };
  context.window = context;
  context.Doke = {
    session: { getCurrentUser: () => ({ id: 'user-1' }) },
    permissions: {
      PROFESSIONAL_ACTIONS: { PUBLISH_SERVICE: 'publish_service' },
      evaluateProfessionalAccess(action, resolved) {
        return Object.assign({}, resolved, decision, { action });
      }
    },
    repositories: {
      professionalProfiles: { getByUserId: async () => ({ userId: 'user-1', status: 'active' }) },
      professionalIdentityVerifications: { getByUserId: async () => ({ userId: 'user-1', status: 'approved' }) }
    },
    navigation: {
      async guard(options) {
        guardCalls.push(options);
        const result = await options.check();
        if (options.allowed(result)) return { allowed: true, result, guardId: guardCalls.length };
        return {
          allowed: false,
          result,
          guardId: guardCalls.length,
          redirect: new URL(options.redirect(result), context.location.href).href
        };
      },
      async go() { return true; }
    }
  };

  vm.runInNewContext(accessService, context, { filename: 'professional-access-service.js' });
  const service = context.Doke.services.professionalAccess;

  const allowed = await service.guardPage(service.ACTIONS.PUBLISH_SERVICE, {
    hardRedirect: false,
    source: 'contract-test'
  });
  assert.strictEqual(allowed.allowed, true, 'conta aprovada deve ser permitida');
  assert.strictEqual(guardCalls[0].forceDocument, false, 'fluxo interno não deve forçar documento');

  decision = { allowed: false, reason: 'professional_verification_required' };
  const denied = await service.guardPage(service.ACTIONS.PUBLISH_SERVICE, {
    hardRedirect: false,
    source: 'contract-test'
  });
  assert.strictEqual(denied.allowed, false, 'conta sem verificação deve ser negada');
  assert.ok(denied.redirect.endsWith('/verificacao-profissional.html'), 'negação deve apontar para verificação profissional');
  assert.strictEqual(guardCalls[1].fallback, 'meu-perfil.html', 'guard deve possuir destino seguro');
  assert.strictEqual(guardCalls[1].forceDocument, false, 'negação interna deve preservar shell');

  context.Doke.repositories.professionalIdentityVerifications.getByUserId = async () => {
    throw new Error('repository unavailable');
  };
  const unavailable = await service.guardPage(service.ACTIONS.PUBLISH_SERVICE, {
    hardRedirect: false,
    source: 'contract-test'
  });
  assert.strictEqual(unavailable.allowed, false, 'falha de repository deve ser fail-closed');
  assert.strictEqual(unavailable.reason, 'professional_access_context_unavailable', 'falha deve manter motivo recuperável explícito');
  assert.ok(events.some((event) => event.type === 'doke:professional-access-pending'), 'guard deve publicar pending');
  assert.ok(events.some((event) => event.type === 'doke:professional-access-resolved'), 'guard deve publicar resolução');
}

runtimeServiceContract().then(() => {
  if (failures.length) {
    console.error('[test:professional-access-navigation-contract] falhou');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log('[test:professional-access-navigation-contract] ok');
  console.log('- origem: skeleton estrutural + conteúdo fail-closed + erro recuperável');
  console.log('- guard: facade canônica + replace + fallback seguro');
  console.log('- destino: skeleton sempre + zero duração mínima artificial');
}).catch((error) => {
  console.error('[test:professional-access-navigation-contract] falhou');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});

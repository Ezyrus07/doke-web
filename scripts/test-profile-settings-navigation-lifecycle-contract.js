'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const storageName = 'localStorage';

function professionalInitialState(html) {
  const tags = (html.replace(/<!--[\s\S]*?-->/g, '').match(/<[a-z][^>]*>/gi) || []).map((tag) => {
    const attributes = new Map();
    const pattern = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
    for (const match of tag.matchAll(pattern)) {
      attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
    }
    return attributes;
  });
  const ready = tags.filter((tag) => tag.has('data-professional-profile-hydration-ready'));
  const boundaries = tags.filter((tag) => tag.get('data-state-boundary') === 'perfil-profissional');
  return {
    hidden: ready.length > 0 && ready.every((tag) => tag.has('hidden')),
    loading: boundaries.length === 1 && boundaries[0].get('data-view-state') === 'loading' && boundaries[0].get('aria-busy') === 'true'
  };
}

const readyAttribute = 'data-professional-profile-hydration-ready';
for (const tag of [`<section ${readyAttribute} hidden>`, `<section hidden="" class="profile-hero" ${readyAttribute}="">`]) {
  assert(professionalInitialState(tag).hidden, 'parser deve aceitar hidden booleano em qualquer ordem.');
}
for (const tag of ['', `<section ${readyAttribute}>`, `<section ${readyAttribute} class="hidden">`, `<section ${readyAttribute} hidden><section ${readyAttribute}>`]) {
  assert(!professionalInitialState(tag).hidden, 'parser deve rejeitar conteúdo sensível sem hidden em qualquer superfície.');
}
const boundary = '<main aria-busy="true" data-state-boundary="perfil-profissional" data-view-state="loading">';
assert(professionalInitialState(boundary).loading, 'parser deve aceitar atributos do boundary em qualquer ordem.');
for (const invalid of [boundary.replace(' aria-busy="true"', ''), boundary.replace('true', 'false'), boundary.replace(' data-view-state="loading"', ''), boundary.replace('loading', 'ready'), '<main data-state-boundary="perfil-profissional"><section aria-busy="true" data-view-state="loading">']) {
  assert(!professionalInitialState(invalid).loading, 'parser deve rejeitar boundary sem loading e aria-busy=true no mesmo elemento.');
}

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
assert(/skeletonMode:\s*'hard-load'/.test(ownerJs), 'meu-perfil deve reservar skeleton para hard load.');
assert(/preserveReadyDuringHydration:\s*true/.test(ownerJs), 'meu-perfil deve preservar conteúdo pronto durante revalidação interna.');
assert(/access\.guardPage/.test(ownerJs), 'meu-perfil deve executar guard autenticado.');
assert(/hydration\?\.ready/.test(ownerJs) && /hydration\?\.error/.test(ownerJs), 'meu-perfil deve publicar ready e error no hydration contract.');
assert(/ownerInitializationBoundary/.test(ownerJs), 'inicialização do meu perfil deve ser idempotente por boundary.');

assert(/data-professional-profile-hydration-skeleton/.test(professionalHtml), 'perfil-profissional deve possuir skeleton estrutural.');
const professionalState = professionalInitialState(professionalHtml);
assert(professionalState.hidden, 'conteúdo profissional sensível deve iniciar oculto.');
assert(professionalState.loading, 'boundary profissional deve iniciar busy/loading.');
assert(professionalHtml.indexOf('assets/js/core/page-hydration.js') < professionalHtml.indexOf('assets/js/core/stable-shell-router.js'), 'page-hydration deve carregar antes do router no perfil profissional.');
assert(/window\.DokeInitProfessionalProfile\s*=/.test(professionalJs), 'perfil profissional deve expor initializer canônico.');
assert(/access\.guardPage/.test(professionalJs), 'perfil profissional deve executar guard profissional antes de montar.');
assert(/skeletonMode:\s*'hard-load'/.test(professionalJs), 'perfil profissional deve reservar skeleton para hard load.');
assert(/preserveReadyDuringHydration:\s*true/.test(professionalJs), 'perfil profissional deve preservar conteúdo pronto durante revalidação interna.');
assert(/hydration\?\.ready/.test(professionalJs) && /hydration\?\.error/.test(professionalJs), 'perfil profissional deve publicar ready e error.');
assert(/professionalInitializationBoundary/.test(professionalJs), 'initializer profissional deve ser idempotente por boundary.');
assert(/'\/perfil-profissional\.html':\s*Object\.freeze/.test(pageHydration), 'page-hydration deve registrar contrato da rota profissional.');
assert(/'\/perfil-profissional\.html',/.test(stableRouter), 'perfil profissional deve participar da barreira de hydration.');
assert(/'\/perfil-profissional\.html':\s*\['DokeInitProfessionalProfile'\]/.test(stableRouter), 'router deve chamar o initializer profissional correto.');

assert(/data-settings-hydration-pending/.test(settingsHtml), 'configurações deve manter pending explícito de conta/contexto.');
assert(!/data-settings-hydration-skeleton/.test(settingsHtml), 'configurações não deve simular dados com skeleton genérico.');
assert(/data-settings-hydration-ready hidden/.test(settingsHtml), 'conteúdo de configurações deve iniciar oculto.');
assert(settingsHtml.indexOf('assets/js/core/session.js') < settingsHtml.indexOf('assets/js/services/account-access-service.js'), 'session.js deve carregar antes do guard em configurações.');
assert(settingsHtml.indexOf('assets/js/services/account-access-service.js') < settingsHtml.indexOf('assets/js/pages/configuracoes.js'), 'guard deve carregar antes do controller de configurações.');
assert(/data-settings-professional-only hidden/.test(settingsHtml), 'itens profissionais devem iniciar ocultos para impedir flash em conta cliente.');
assert(/data-settings-professional-panel[^>]*hidden/.test(settingsHtml), 'painéis profissionais e agenda devem iniciar ocultos.');
assert(/pendingSelectors:\s*'\[data-settings-hydration-pending\]'/.test(settingsJs), 'configurações deve registrar sua superfície pending.');
assert(/skeletonMode:\s*'never'/.test(settingsJs), 'configurações não deve usar skeleton para bootstrap/guard.');
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
assert(!accountAccess.includes(storageName), 'account-access-service não deve acessar storage diretamente.');

async function accountAccessRuntime() {
  function fixture(options = {}) {
    let user = options.user || null;
    const calls = { storage: 0, refresh: 0, allow: 0, fail: 0, redirect: 0, navigation: [] };
    const timers = [];
    const document = { documentElement: { dataset: {} }, body: { dataset: {} } };
    const session = { getCurrentUser() {
      if (options.readError) throw new Error('session unavailable');
      return user;
    } };
    const window = {
      Doke: { session: options.noSession ? null : session },
      DokeAuth: { service: { refreshSession() {
        calls.refresh += 1;
        if (options.refreshError) return Promise.reject(new Error('refresh failed'));
        if (options.refreshPending) return new Promise(() => {});
        if (options.refreshedUser) user = options.refreshedUser;
        return Promise.resolve(options.refreshResult || null);
      } } },
      [storageName]: { getItem() { calls.storage += 1; return options.cachedUser === false ? null : JSON.stringify({ user: { id: 'legacy-only' } }); } },
      setTimeout(callback) { timers.push(callback); },
      location: { pathname: '/configuracoes.html', search: '?tab=account', replace(target) { calls.navigation.push({ target, documentFallback: true }); } }
    };
    window.DokeNavigationLifecycle = {
      guard: { begin() { return 1; }, allow() { calls.allow += 1; }, fail() { calls.fail += 1; }, redirect() { calls.redirect += 1; } },
      navigation: { go(target, settings) { calls.navigation.push({ target, ...settings }); } }
    };
    vm.runInNewContext(accountAccess, { window, document, console });
    return { access: window.Doke.services.accountAccess, calls, window, document, timers };
  }
  const user = { id: 'canonical-test-user' };
  const authenticated = fixture({ user });
  const allowed = await authenticated.access.guardPage();
  assert(allowed.allowed && allowed.user === user && authenticated.calls.allow === 1 && authenticated.calls.refresh === 0 && authenticated.calls.navigation.length === 0, 'sessão canônica autenticada deve permitir sem refresh ou redirect.');

  for (const options of [{}, { noSession: true }, { refreshError: true }, { refreshResult: { user } }]) {
    const denied = fixture(options);
    const result = await denied.access.guardPage();
    const navigation = denied.calls.navigation[0];
    assert(!result.allowed && result.reason === 'auth_required' && result.redirecting && denied.calls.allow === 0 && denied.calls.redirect === 1, 'ausência de sessão canônica deve negar mesmo com cache ou retorno avulso do refresh.');
    assert(navigation?.replace === true && navigation?.forceDocument === true && navigation.target === 'auth/login.html?next=%2Fconfiguracoes.html%3Ftab%3Daccount', 'negação deve preservar replace, documento completo e destino seguro.');
    assert(denied.calls.storage === 0, 'serviço não deve consultar storage diretamente.');
  }
  const refresh = fixture({ refreshedUser: user });
  const refreshed = await refresh.access.guardPage();
  assert(refreshed.allowed && refreshed.user === user && refresh.calls.refresh === 1 && refresh.calls.allow === 1 && refresh.calls.storage === 0, 'refresh deve reler a autoridade canônica antes de permitir.');

  const noRedirect = fixture();
  const denied = await noRedirect.access.guardPage({ redirect: false });
  assert(!denied.allowed && !denied.redirecting && noRedirect.calls.navigation.length === 0 && noRedirect.document.body.dataset.authGuard === 'denied', 'redirect=false deve manter negação sem navegar.');

  const readFailure = fixture({ readError: true });
  let rejected = false;
  try { await readFailure.access.guardPage(); } catch (error) { rejected = error.message === 'session unavailable'; }
  assert(rejected && readFailure.calls.fail === 1 && readFailure.calls.allow === 0 && readFailure.document.body.dataset.authGuard === 'error', 'erro de sessão deve publicar guard.fail sem conceder acesso.');

  const timeout = fixture({ refreshPending: true, cachedUser: false });
  const pending = timeout.access.guardPage();
  await Promise.resolve();
  timeout.timers[0]();
  assert(!(await pending).allowed && timeout.calls.allow === 0, 'timeout de refresh deve negar acesso.');

  const fallback = fixture();
  delete fallback.window.DokeNavigationLifecycle.navigation;
  const fallbackResult = await fallback.access.guardPage();
  assert(!fallbackResult.allowed && fallback.calls.navigation[0]?.documentFallback, 'sem fachada, negação deve preservar location.replace.');
}

accountAccessRuntime().then(() => {
  if (failures.length) {
    console.error('Profile/settings navigation lifecycle contract: FAIL');
    failures.forEach((failure) => console.error('- ' + failure));
    process.exitCode = 1;
  } else {
    console.log('Profile/settings navigation lifecycle contract: PASS (HTML positive/negative and account-access VM cases)');
  }
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

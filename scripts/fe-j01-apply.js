#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function write(file, content) {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), content);
}

function replaceOnce(source, pattern, replacement, label) {
  const next = source.replace(pattern, replacement);
  if (next === source) throw new Error('FE-J01 codemod did not match: ' + label);
  return next;
}

const routeMetadata = `  var ROUTE_METADATA = {
    '/': { safe: true, hydrationBarrier: false, directHydration: false, initializers: [], warmPriority: false, socialPage: true },
    '/index.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitHome'], warmPriority: true, socialPage: true },
    '/resultados.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitSearchResults'], warmPriority: true, socialPage: true },
    '/detalhe-anuncio.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitDetailAd'], warmPriority: false, socialPage: false },
    '/pedidos.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitOrders'], warmPriority: true, socialPage: true },
    '/orcamento.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitBudget'], warmPriority: false, socialPage: false },
    '/pagamento-profissional.html': { safe: true, nativeOnly: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitPayment'], warmPriority: false, socialPage: false },
    '/avaliacao-profissional.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitReview'], warmPriority: false, socialPage: false },
    '/mensagens.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitMessages'], warmPriority: true, socialPage: true },
    '/notificacoes.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitNotifications'], warmPriority: true, socialPage: true },
    '/novidades.html': { safe: true, hydrationBarrier: false, directHydration: false, initializers: ['DokeInitNewsPage'], warmPriority: false, socialPage: false },
    '/comunidade.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitCommunity'], warmPriority: true, socialPage: true },
    '/comunidade-interna.html': { safe: true, hydrationBarrier: false, directHydration: false, initializers: [], warmPriority: false, socialPage: true },
    '/perfil.html': { safe: true, nativeOnly: true, hydrationBarrier: false, directHydration: false, initializers: ['DokeInitProfile'], warmPriority: true, socialPage: false },
    '/meu-perfil.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitOwnerProfile'], warmPriority: false, socialPage: false },
    '/perfil-cliente.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitClientProfile'], warmPriority: false, socialPage: false },
    '/perfil-profissional.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitProfessionalProfile'], warmPriority: false, socialPage: false },
    '/tornar-profissional.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitBecomePro'], warmPriority: false, socialPage: false },
    '/verificacao-profissional.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitProfessionalVerification'], warmPriority: false, socialPage: false },
    '/anunciar-servico.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitPostService'], warmPriority: false, socialPage: false },
    '/carteira.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitWalletPage'], warmPriority: false, socialPage: true },
    '/configuracoes.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitSettings'], warmPriority: false, socialPage: true },
    '/ajuda.html': { safe: true, hydrationBarrier: false, directHydration: false, initializers: ['DokeInitHelpCenter'], warmPriority: true, socialPage: false },
    '/admin.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitAdmin'], warmPriority: false, socialPage: false },
    '/admin-verificacao.html': { safe: true, hydrationBarrier: true, directHydration: false, initializers: ['DokeInitAdminVerification'], warmPriority: false, socialPage: false },
    '/admin-anuncio-revisao.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitAdminAdReview'], warmPriority: false, socialPage: false },
    '/admin-pedidos-operacao.html': { safe: true, hydrationBarrier: true, directHydration: true, initializers: ['DokeInitAdminOrderOperations'], warmPriority: false, socialPage: false }
  };
`;

let registry = read('assets/js/core/navigation-registry.js');
registry = replaceOnce(
  registry,
  /  };\n\n  function clone\(value\) \{/,
  `  };\n\n${routeMetadata}\n  function clone(value) {`,
  'insert route metadata'
);
registry = replaceOnce(
  registry,
  /  function getInternalPaths\(\) \{[\s\S]*?\n  }\n\n  function getPageConfig/,
  `  function getRouteMetadata(value) {
    var path = normalizePath(value);
    var metadata = ROUTE_METADATA[path] || {};
    return Object.assign({
      path: path,
      safe: false,
      nativeOnly: false,
      hydrationBarrier: false,
      directHydration: false,
      initializers: [],
      warmPriority: false,
      socialPage: false
    }, clone(metadata));
  }

  function isSafeRoute(value, adapter) {
    var metadata = getRouteMetadata(value);
    if (adapter === 'social-page') return metadata.socialPage === true;
    return metadata.safe === true;
  }

  function isNativeOnlyRoute(value) {
    return getRouteMetadata(value).nativeOnly === true;
  }

  function requiresHydrationBarrier(value) {
    return getRouteMetadata(value).hydrationBarrier === true;
  }

  function shouldCommitHydrationDirect(value) {
    return getRouteMetadata(value).directHydration === true;
  }

  function getInitializers(value) {
    return getRouteMetadata(value).initializers.slice();
  }

  function getPriorityWarmRoutes() {
    return Object.keys(ROUTE_METADATA).filter(function (route) {
      return ROUTE_METADATA[route].warmPriority === true;
    });
  }

  function getInternalPaths() {
    return Object.keys(ROUTE_METADATA).slice();
  }

  function getPageConfig`,
  'replace registry path helpers'
);
registry = replaceOnce(registry, /version: '20260719-profile-destination-v1'/, "version: '20260728-route-authority-v1'", 'bump registry version');
registry = replaceOnce(
  registry,
  /    getInternalPaths: getInternalPaths,\n    getPageConfig: getPageConfig/,
  `    getInternalPaths: getInternalPaths,
    getRouteMetadata: getRouteMetadata,
    isSafeRoute: isSafeRoute,
    isNativeOnlyRoute: isNativeOnlyRoute,
    requiresHydrationBarrier: requiresHydrationBarrier,
    shouldCommitHydrationDirect: shouldCommitHydrationDirect,
    getInitializers: getInitializers,
    getPriorityWarmRoutes: getPriorityWarmRoutes,
    getPageConfig: getPageConfig`,
  'expose registry route APIs'
);
write('assets/js/core/navigation-registry.js', registry);

let stable = read('assets/js/core/stable-shell-router.js');
stable = replaceOnce(
  stable,
  /  var SAFE_ROUTES = new Set\(\[[\s\S]*?\n  var PRESERVED_BODY_CLASSES = \[/,
  `  var NAVIGATION_REGISTRY = window.DokeNavigationRegistry || null;

  function routeMetadata(value) {
    if (!NAVIGATION_REGISTRY || typeof NAVIGATION_REGISTRY.getRouteMetadata !== 'function') {
      return { safe: false, nativeOnly: true, hydrationBarrier: false, directHydration: false, initializers: [] };
    }
    return NAVIGATION_REGISTRY.getRouteMetadata(value);
  }

  var PRESERVED_BODY_CLASSES = [`,
  'remove stable router route maps'
);
stable = replaceOnce(stable, /var CORE_SCRIPT_RE = \/assets\\\/js\\\/core\\\/(\?:runtime-config\|feature-flags\|rollout-guard\|navigation-lifecycle\|app\|stable-shell-router\|social-page-router\)\\\.js/, "var CORE_SCRIPT_RE = /assets\\/js\\/core\\/(?:runtime-config|feature-flags|rollout-guard|navigation-registry|navigation-lifecycle|app|stable-shell-router|social-page-router)\\.js", 'stable core script registry');
stable = replaceOnce(stable, /  var PRIORITY_WARM_ROUTES = \[[\s\S]*?\n  ];/, `  var PRIORITY_WARM_ROUTES = NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getPriorityWarmRoutes === 'function'
    ? NAVIGATION_REGISTRY.getPriorityWarmRoutes()
    : [];`, 'stable priority routes');
stable = replaceOnce(stable, /return SAFE_ROUTES\.has\(path\) && !NATIVE_ONLY_ROUTES\.has\(path\);/, `var metadata = routeMetadata(path);
      return metadata.safe === true && metadata.nativeOnly !== true;`, 'stable safe route');
stable = replaceOnce(stable, /      '\.nav-link--profile': PROFILE_ACTIVE_PATHS\.has\(normalized\),/, `      '.nav-link--profile': NAVIGATION_REGISTRY && NAVIGATION_REGISTRY.getActiveId(normalized) === 'profile',`, 'stable profile active');
stable = replaceOnce(stable, /    var names = ROUTE_INIT\[path\] \|\| \[];/, `    var names = NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getInitializers === 'function'
      ? NAVIGATION_REGISTRY.getInitializers(path)
      : [];`, 'stable initializers');
stable = replaceOnce(stable, /if \(!HYDRATION_BARRIER_ROUTES\.has\(path\)\)/, `if (!routeMetadata(path).hydrationBarrier)`, 'stable hydration barrier');
stable = replaceOnce(
  stable,
  /  var INTERNAL_DIRECT_HYDRATION_ROUTES = new Set\(\[[\s\S]*?\n  function shouldCommitHydrationRouteDirect\(path\) \{\n    return INTERNAL_DIRECT_HYDRATION_ROUTES\.has\(path\);\n  }/,
  `  function shouldCommitHydrationRouteDirect(path) {
    return routeMetadata(path).directHydration === true;
  }`,
  'stable direct hydration routes'
);
write('assets/js/core/stable-shell-router.js', stable);

let social = read('assets/js/core/social-page-router.js');
social = replaceOnce(
  social,
  /  var SAFE_ROUTES = new Set\(\[[\s\S]*?\n  var CORE_SCRIPT_RE =/,
  `  var NAVIGATION_REGISTRY = window.DokeNavigationRegistry || null;
  var CORE_SCRIPT_RE =`,
  'remove social route maps'
);
social = replaceOnce(social, /\(runtime-config\|feature-flags\|app\|social-page-router\)/, '(runtime-config|feature-flags|navigation-registry|app|social-page-router)', 'social core registry');
social = replaceOnce(
  social,
  /  function normalizePath\(value\) \{\n    var url = new URL\(value \|\| window\.location\.href, window\.location\.href\);\n    return url\.pathname === '\/' \? '\/index\.html' : url\.pathname;\n  }/,
  `  function normalizePath(value) {
    if (NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.normalizePath === 'function') {
      return NAVIGATION_REGISTRY.normalizePath(value);
    }
    var url = new URL(value || window.location.href, window.location.href);
    return url.pathname === '/' ? '/index.html' : url.pathname;
  }`,
  'social normalize path'
);
social = replaceOnce(social, /return SAFE_ROUTES\.has\(path\) && !NATIVE_ONLY_ROUTES\.has\(path\);/, `return Boolean(NAVIGATION_REGISTRY)
        && NAVIGATION_REGISTRY.isSafeRoute(path, 'social-page')
        && !NAVIGATION_REGISTRY.isNativeOnlyRoute(path);`, 'social safe route');
social = replaceOnce(
  social,
  /  function updateActiveNavigation\(path\) \{[\s\S]*?\n  }\n\n  function syncPageScripts/,
  `  function updateActiveNavigation(path) {
    var activeId = NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getActiveId === 'function'
      ? NAVIGATION_REGISTRY.getActiveId(path)
      : '';
    document.querySelectorAll('.sidebar a[href], .bottom-nav a[href], .doke-bottom-nav a[href]').forEach(function (link) {
      var linkId = link.getAttribute('data-nav-id');
      if (!linkId && NAVIGATION_REGISTRY && typeof NAVIGATION_REGISTRY.getActiveId === 'function') {
        linkId = NAVIGATION_REGISTRY.getActiveId(normalizePath(link.href));
      }
      var isActive = Boolean(activeId && linkId === activeId);
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  function syncPageScripts`,
  'social active navigation'
);
write('assets/js/core/social-page-router.js', social);

let shell = read('assets/js/components/mobile-app-shell.js');
shell = replaceOnce(shell, /  var PAGE_CONFIG = \{[\s\S]*?\n  };\n\n  var ICONS =/, '  var ICONS =', 'remove mobile shell page config');
shell = replaceOnce(shell, /    return PAGE_CONFIG\[name\] \|\| \{ key: fallbackKey, active: '', search: false, title: titleFromPageName\(fallbackKey\) };/, `    return { key: fallbackKey, active: '', search: false, title: titleFromPageName(fallbackKey) };`, 'mobile shell generic fallback');
write('assets/js/components/mobile-app-shell.js', shell);

let drawer = read('assets/js/ui/mobile-drawer-standard.js');
drawer = replaceOnce(drawer, /  var FALLBACK_ROUTE_GROUPS = \{[\s\S]*?\n  };\n\n  function routeGroup/, '  function routeGroup', 'remove drawer route map');
drawer = replaceOnce(drawer, /    return FALLBACK_ROUTE_GROUPS\[key\] \|\| key;/, '    return key;', 'drawer generic fallback');
write('assets/js/ui/mobile-drawer-standard.js', drawer);

let app = read('assets/js/core/app.js');
app = replaceOnce(
  app,
  /const REGISTERED_INTERNAL_VIEW_PATHS = Array\.isArray\([\s\S]*?\nconst SIDEBAR_PRIMARY_VIEWS = \[[^\n]*\];/,
  `const INTERNAL_VIEW_PATHS = new Set(Array.isArray(NAVIGATION_REGISTRY?.getInternalPaths?.())
  ? NAVIGATION_REGISTRY.getInternalPaths()
  : []);
const MESSAGES_VIEW_PATH = "/mensagens.html";
const SIDEBAR_PRIMARY_VIEWS = Array.isArray(NAVIGATION_REGISTRY?.getPriorityWarmRoutes?.())
  ? NAVIGATION_REGISTRY.getPriorityWarmRoutes()
  : [];`,
  'app internal route collections'
);
app = replaceOnce(
  app,
  /    const nativeOnlyPaths = new Set\(\[[\s\S]*?\n    return nativeOnlyPaths\.has\(path\);/,
  `    if (!NAVIGATION_REGISTRY || typeof NAVIGATION_REGISTRY.isNativeOnlyRoute !== 'function') return true;
    return NAVIGATION_REGISTRY.isNativeOnlyRoute(path);`,
  'app native routes'
);
write('assets/js/core/app.js', app);

const configPath = 'config/frontend-structural-gates.json';
const config = JSON.parse(read(configPath));
config.baseline.routeRegistryDebtFiles = [];
write(configPath, JSON.stringify(config, null, 2) + '\n');

const ownershipAudit = `#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const registryPath = 'assets/js/core/navigation-registry.js';
const consumers = [
  'assets/js/core/app.js',
  'assets/js/core/stable-shell-router.js',
  'assets/js/core/social-page-router.js',
  'assets/js/components/mobile-app-shell.js',
  'assets/js/ui/mobile-drawer-standard.js'
];
const forbidden = [
  'SAFE_ROUTES', 'NATIVE_ONLY_ROUTES', 'HYDRATION_BARRIER_ROUTES',
  'INTERNAL_DIRECT_HYDRATION_ROUTES', 'PROFILE_ACTIVE_PATHS', 'ROUTE_INIT',
  'PAGE_CONFIG =', 'FALLBACK_ROUTE_GROUPS', 'nativeOnlyPaths = new Set',
  'REGISTERED_INTERNAL_VIEW_PATHS'
];
const requiredApis = [
  'getRouteMetadata', 'isSafeRoute', 'isNativeOnlyRoute',
  'requiresHydrationBarrier', 'shouldCommitHydrationDirect',
  'getInitializers', 'getPriorityWarmRoutes', 'getInternalPaths'
];
const failures = [];
const registry = fs.readFileSync(path.join(ROOT, registryPath), 'utf8');
requiredApis.forEach((api) => {
  if (!registry.includes(api + ': ' + api)) failures.push('Registry does not expose ' + api + '.');
});
consumers.forEach((file) => {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  forbidden.forEach((marker) => {
    if (source.includes(marker)) failures.push(file + ' still owns route metadata marker: ' + marker);
  });
  if (!source.includes('DokeNavigationRegistry')) failures.push(file + ' does not consume DokeNavigationRegistry.');
});
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/frontend-structural-gates.json'), 'utf8'));
if ((config.baseline.routeRegistryDebtFiles || []).length) failures.push('FE-G01 route registry baseline is not empty.');
const reportPath = path.join(ROOT, 'reports/generated/navigation-registry-ownership-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({ status: failures.length ? 'fail' : 'pass', failures, registryPath, consumers, requiredApis }, null, 2) + '\n');
if (failures.length) {
  console.error('[audit:navigation-registry-ownership] failed');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('[audit:navigation-registry-ownership] passed');
`;
write('scripts/audit-navigation-registry-ownership.js', ownershipAudit);

const doc = `# Navigation Registry ownership

The canonical owner for route metadata is \`assets/js/core/navigation-registry.js\`.

It owns:

- route-to-navigation grouping and active paths;
- page shell metadata;
- safe and native-only navigation policy;
- hydration barriers and direct hydration commits;
- route initializer hooks;
- priority warm routes;
- surface membership for sidebar, drawer and bottom navigation.

Consumers may query the registry, but must not maintain complete route maps. When the registry is unavailable, routers must fall back to native navigation instead of recreating metadata locally.

Validation:

\`npm run audit:navigation-registry-ownership\`
`;
write('docs/architecture/navigation-registry-ownership.md', doc);

const packagePath = 'package.json';
const pkg = JSON.parse(read(packagePath));
pkg.scripts['audit:navigation-registry-ownership'] = 'node scripts/audit-navigation-registry-ownership.js';
if (!pkg.scripts['audit:agent-governance'].includes('audit:navigation-registry-ownership')) {
  pkg.scripts['audit:agent-governance'] = pkg.scripts['audit:agent-governance'].replace(
    'npm run audit:navigation-registry-contract',
    'npm run audit:navigation-registry-contract && npm run audit:navigation-registry-ownership'
  );
}
write(packagePath, JSON.stringify(pkg, null, 2) + '\n');

console.log('FE-J01 codemod applied.');

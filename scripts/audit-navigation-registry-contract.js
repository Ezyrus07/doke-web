#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const registryPath = path.join(ROOT, 'assets/js/core/navigation-registry.js');
const reportPath = path.join(ROOT, 'reports/generated/navigation-registry-contract-report.json');
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const registrySource = read('assets/js/core/navigation-registry.js');
const sandbox = {
  URL,
  window: {
    location: {
      origin: 'https://doke.local',
      pathname: '/index.html'
    }
  }
};
sandbox.window.window = sandbox.window;
vm.runInNewContext(registrySource, sandbox, { filename: registryPath });

const registry = sandbox.window.DokeNavigationRegistry;
assert(Boolean(registry), 'DokeNavigationRegistry não foi exposto no window.');

const expectedRoutes = new Map([
  ['/index.html', 'home'],
  ['/resultados.html', 'home'],
  ['/detalhe-anuncio.html', 'home'],
  ['/pedidos.html', 'orders'],
  ['/orcamento.html', 'orders'],
  ['/pagamento-profissional.html', 'orders'],
  ['/avaliacao-profissional.html', 'orders'],
  ['/mensagens.html', 'messages'],
  ['/notificacoes.html', 'notifications'],
  ['/novidades.html', 'notifications'],
  ['/comunidade.html', 'communities'],
  ['/comunidade-interna.html', 'communities'],
  ['/perfil.html', 'profile'],
  ['/meu-perfil.html', 'profile'],
  ['/perfil-cliente.html', 'profile'],
  ['/perfil-profissional.html', 'profile'],
  ['/tornar-profissional.html', 'profile'],
  ['/verificacao-profissional.html', 'profile'],
  ['/anunciar-servico.html', 'profile'],
  ['/carteira.html', 'wallet'],
  ['/configuracoes.html', 'settings'],
  ['/ajuda.html', 'settings']
]);

if (registry) {
  expectedRoutes.forEach((expected, route) => {
    assert(registry.getActiveId(route) === expected, `${route} deveria ativar ${expected}, mas ativou ${registry.getActiveId(route) || 'nada'}.`);
  });

  const drawerIds = registry.getItemsForSurface('mobile-drawer').map((item) => item.id);
  const bottomIds = registry.getItemsForSurface('mobile-bottom').map((item) => item.id);
  ['home', 'orders', 'messages', 'notifications', 'communities', 'profile', 'wallet', 'settings'].forEach((id) => {
    assert(drawerIds.includes(id), `mobile-drawer não inclui ${id}.`);
  });
  ['home', 'orders', 'messages', 'communities', 'profile'].forEach((id) => {
    assert(bottomIds.includes(id), `mobile-bottom não inclui ${id}.`);
  });
  ['notifications', 'wallet', 'settings'].forEach((id) => {
    assert(!bottomIds.includes(id), `mobile-bottom não deveria incluir ${id}.`);
  });
}

const htmlFiles = fs.readdirSync(ROOT)
  .filter((name) => name.endsWith('.html'))
  .sort();

htmlFiles.forEach((file) => {
  const source = read(file);
  const usesShell = [
    'assets/js/core/app.js',
    'assets/js/ui/mobile-drawer-standard.js',
    'assets/js/components/mobile-app-shell.js'
  ].some((needle) => source.includes(needle));
  if (!usesShell) return;

  const scriptTags = Array.from(source.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/g))
    .map((match) => match[1]);
  const registryIndex = scriptTags.findIndex((src) => src.includes('assets/js/core/navigation-registry.js'));
  assert(registryIndex !== -1, `${file} usa shell global sem carregar navigation-registry.js.`);

  ['assets/js/core/app.js', 'assets/js/ui/mobile-drawer-standard.js', 'assets/js/components/mobile-app-shell.js'].forEach((needle) => {
    const index = scriptTags.findIndex((src) => src.includes(needle));
    if (index === -1) return;
    assert(registryIndex < index, `${file} carrega ${needle} antes do navigation-registry.js.`);
  });
});

[
  'assets/js/core/app.js',
  'assets/js/ui/mobile-drawer-standard.js',
  'assets/js/components/mobile-app-shell.js'
].forEach((file) => {
  const source = read(file);
  assert(source.includes('DokeNavigationRegistry'), `${file} ainda não consome DokeNavigationRegistry.`);
});

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify({
  status: failures.length ? 'fail' : 'pass',
  failures,
  checkedRoutes: Array.from(expectedRoutes.entries()).map(([route, active]) => ({ route, active })),
  checkedHtmlFiles: htmlFiles
}, null, 2));

if (failures.length) {
  console.error('[audit:navigation-registry-contract] falhou');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('[audit:navigation-registry-contract] ok');
console.log('- report:', path.relative(ROOT, reportPath));

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
const router = read('assets/js/core/stable-shell-router.js');
const routes = ['/meu-perfil.html', '/perfil-cliente.html', '/perfil-profissional.html'];
for (const route of routes) {
  if (!router.includes(`'${route}'`)) throw new Error(`Rota ausente do commit direto: ${route}`);
}
const pages = [
  'assets/js/pages/owner-profile-experience.js',
  'assets/js/pages/client-profile-experience.js',
  'assets/js/pages/professional-profile-experience.js'
];
for (const file of pages) {
  const source = read(file);
  if (!source.includes('preserveReadyDuringHydration: true')) {
    throw new Error(`Preservação de conteúdo pronto ausente em ${file}`);
  }
  if (!source.includes("skeletonMode: 'hard-load'")) {
    throw new Error(`Skeleton não está restrito a hard load em ${file}`);
  }
}
console.log('profile-navigation-hydration-contract: ok');

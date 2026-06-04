const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const entities = [
  'listing',
  'worker',
  'post',
  'order',
  'message',
  'notification',
  'wallet',
  'profile',
  'community',
];

const requiredFiles = [
  ...entities.map((entity) => `assets/js/contracts/${entity}-contract.js`),
  ...entities.map((entity) => `assets/js/adapters/normalize-${entity}.js`),
  'docs/DATA_CONTRACTS_STAGE61B.md',
  '__PATCH_MANIFEST_STAGE61B.md',
];

const forbiddenNames = /(fix|hotfix|final|polish|parity|rescue|cleanup|adjustment|repair|normalization)/i;
const forbiddenRuntimeTargets = [
  'assets/js/core/stable-shell-router.js',
  'assets/js/core/',
  'assets/css/',
  'index.html',
  'mensagens.html',
  'detalhe-anuncio.html',
  'perfil.html',
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  assert(fs.existsSync(absolute), `Arquivo obrigatório ausente: ${file}`);
  assert(!forbiddenNames.test(path.basename(file)), `Nome de arquivo proibido: ${file}`);
}

for (const entity of entities) {
  const contractPath = `assets/js/contracts/${entity}-contract.js`;
  const adapterPath = `assets/js/adapters/normalize-${entity}.js`;
  const contractSource = read(contractPath);
  const adapterSource = read(adapterPath);

  assert(contractSource.includes('export const'), `Contrato sem export const: ${contractPath}`);
  assert(contractSource.includes('export function'), `Contrato sem export function: ${contractPath}`);
  assert(adapterSource.includes('export function'), `Adapter sem export function: ${adapterPath}`);

  const combined = `${contractSource}\n${adapterSource}`;
  assert(!combined.includes('!important'), `Uso de !important detectado em ${entity}`);
  assert(!/style\s*=/.test(combined), `Inline style detectado em ${entity}`);
  assert(!/document\.querySelector|document\.getElementById|innerHTML\s*=/.test(combined), `Adapter/contract não deve tocar DOM: ${entity}`);
}

for (const target of forbiddenRuntimeTargets) {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) continue;
  const stat = fs.statSync(absolute);
  assert(stat.isFile() || stat.isDirectory(), `Alvo inválido: ${target}`);
}

console.log('Stage 61B audit: PASSED');
console.log(`Entidades verificadas: ${entities.length}`);
console.log(`Arquivos obrigatórios verificados: ${requiredFiles.length}`);

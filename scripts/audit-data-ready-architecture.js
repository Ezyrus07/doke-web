const fs = require('fs');
const path = require('path');

const root = process.cwd();

const requiredFiles = [
  'assets/js/config/app-config.js',
  'assets/js/config/runtime-flags.js',
  'assets/js/state/create-store.js',
  'assets/js/state/page-state.js',
  'assets/js/services/http-client.js',
  'assets/js/services/api-client.js',
  'assets/js/services/auth-service.js',
  'assets/js/services/listings-service.js',
  'assets/js/services/workers-service.js',
  'assets/js/services/posts-service.js',
  'assets/js/services/orders-service.js',
  'assets/js/services/messages-service.js',
  'assets/js/services/notifications-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/profile-service.js',
  'assets/js/services/community-service.js',
  'assets/js/repositories/listings-repository.js',
  'assets/js/repositories/workers-repository.js',
  'assets/js/repositories/posts-repository.js',
  'assets/js/repositories/orders-repository.js',
  'assets/js/repositories/messages-repository.js',
  'assets/js/repositories/notifications-repository.js',
  'assets/js/repositories/wallet-repository.js',
  'assets/js/repositories/profile-repository.js',
  'assets/js/repositories/community-repository.js',
  'assets/js/renderers/render-state.js',
  'assets/js/renderers/render-list.js',
  'assets/js/renderers/render-empty-state.js',
  'assets/js/renderers/render-error-state.js',
  'assets/js/renderers/render-loading-state.js',
  'assets/js/renderers/render-card-list.js',
  'assets/js/controllers/page-controller.js',
  'assets/js/controllers/list-page-controller.js',
  'assets/js/mocks/mock-delay.js',
  'assets/js/mocks/mock-data.js',
  'docs/DATA_READY_FRONTEND_ARCHITECTURE.md'
];

const legacyRuntimeFiles = new Set([
  'assets/js/services/auth-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/profile-service.js',
  'assets/js/services/community-service.js'
]);

const stageFiles = requiredFiles.filter((file) => !legacyRuntimeFiles.has(file)).concat([
  'scripts/audit-data-ready-architecture.js',
  'RODAR_STAGE61A_AUDIT_DATA_READY.cmd',
  '__PATCH_MANIFEST_STAGE61A.md'
]);

const forbiddenRuntimeTouch = [
  'assets/js/core/stable-shell-router.js',
  'assets/js/core/social-page-router.js',
  'assets/js/core/app.js',
  'assets/js/core/page-bootstrap.js',
  'assets/js/components/mobile-app-shell.js'
];

const forbiddenFilenameTerms = /(?:fix|hotfix|final|polish|parity|rescue|cleanup|adjustment|repair|normalization)/i;
const inlineStylePattern = /\.style\s*\.|setAttribute\s*\(\s*['"]style['"]/;
const importantPattern = /!\s*important/;
const exportFunctionPattern = /export\s+(?:async\s+)?function\s+[A-Za-z0-9_]+|export\s+const\s+[A-Za-z0-9_]+/;

const errors = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`Arquivo obrigatório ausente: ${file}`);
  }
}

for (const file of stageFiles) {
  if (!fs.existsSync(path.join(root, file))) continue;
  if (forbiddenFilenameTerms.test(path.basename(file))) {
    errors.push(`Nome de arquivo proibido: ${file}`);
  }

  const source = read(file);

  if (inlineStylePattern.test(source)) {
    errors.push(`Uso de inline style detectado: ${file}`);
  }

  if (importantPattern.test(source)) {
    errors.push(`Uso de prioridade CSS proibida detectado: ${file}`);
  }

  if (file.endsWith('.js') && !file.endsWith('audit-data-ready-architecture.js') && !exportFunctionPattern.test(source)) {
    errors.push(`Módulo sem export nomeado: ${file}`);
  }
}

for (const file of forbiddenRuntimeTouch) {
  if (!fs.existsSync(path.join(root, file))) continue;
  if (stageFiles.includes(file)) {
    errors.push(`Stage não pode tocar runtime sensível: ${file}`);
  }
}

if (errors.length) {
  console.error('Stage 61A audit: FAILED');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Stage 61A audit: PASSED');
console.log(`Arquivos obrigatórios verificados: ${requiredFiles.length}`);
console.log(`Arquivos da stage verificados: ${stageFiles.length}`);

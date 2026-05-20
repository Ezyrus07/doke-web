#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = 'docs/validation/global-cycle-92-product-service-consumer-map-report.json';
const SERVICE_FILES = [
  'assets/js/services/auth-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/search-service.js',
  'assets/js/services/order-service.js',
  'assets/js/services/wallet-service.js',
  'assets/js/services/community-service.js',
  'assets/js/services/profile-service.js'
];
const SCAN_FILES = [
  'assets/js/core/app.js',
  'assets/js/services/domain-data-service.js',
  'assets/js/controllers/controller-data.js',
  'mensagens.html',
  'comunidade.html',
  'pagamento-profissional.html',
  'avaliacao.html'
];

const contracts = {
  'assets/js/services/auth-service.js': ['DokeAuth', 'requireAuth', 'getCurrentUser', 'isAuthenticated'],
  'assets/js/services/message-service.js': ['services.messages', 'listConversations', 'unreadCount'],
  'assets/js/services/notification-service.js': ['services.notifications', 'unreadCount', 'notifications.list'],
  'assets/js/services/search-service.js': ['services.search', 'featured', 'fromLocationSearch', 'getById'],
  'assets/js/services/order-service.js': ['services.orders', 'getById', 'listByUser'],
  'assets/js/services/wallet-service.js': ['services.wallet', 'getSummary', 'listPaymentMethods'],
  'assets/js/services/community-service.js': ['services.communities', 'list', 'getById'],
  'assets/js/services/profile-service.js': ['services.profiles', 'getById', 'getCurrent']
};

const read = (file) => fs.existsSync(path.join(ROOT, file)) ? fs.readFileSync(path.join(ROOT, file), 'utf8') : '';
const containsAny = (text, needles) => needles.filter((needle) => text.includes(needle));

const results = SERVICE_FILES.map((service) => {
  const fileExists = fs.existsSync(path.join(ROOT, service));
  const apis = contracts[service] || [];
  const serviceText = read(service);
  const providedApiMatches = containsAny(serviceText, apis);
  const consumers = SCAN_FILES.filter((file) => file !== service).map((file) => {
    const text = read(file);
    const importedInHtml = file.endsWith('.html') && text.includes(service);
    const matchedApis = containsAny(text, apis);
    return { file, importedInHtml, matchedApis };
  }).filter((consumer) => consumer.importedInHtml || consumer.matchedApis.length > 0);

  return {
    service,
    fileExists,
    providedApiMatches,
    consumerCount: consumers.length,
    consumers,
    removalAllowed: false,
    decision: consumers.length > 0 ? 'keep-consumer-surface-present' : 'keep-shared-service-pending-runtime-validation'
  };
});

const summary = {
  serviceCount: results.length,
  missingFiles: results.filter((item) => !item.fileExists).length,
  servicesWithConsumers: results.filter((item) => item.consumerCount > 0).length,
  servicesWithoutConsumersInScope: results.filter((item) => item.consumerCount === 0).length,
  removalAllowedNow: results.filter((item) => item.removalAllowed).length,
  visualChanges: false,
  jsRemovalPerformed: false
};

const report = {
  cycle: 92,
  name: 'product-service-consumer-map',
  generatedAt: new Date().toISOString(),
  scope: {
    purpose: 'Map service consumers before reducing shared JS in audited pages.',
    removalPerformed: false
  },
  summary,
  results
};

fs.mkdirSync(path.dirname(path.join(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);

if (summary.missingFiles > 0 || summary.removalAllowedNow > 0) {
  console.error(`[cycle-92] Service consumer map failed: missingFiles=${summary.missingFiles}, removalAllowedNow=${summary.removalAllowedNow}`);
  process.exit(1);
}

console.log(`[cycle-92] Service consumer map passed (${summary.servicesWithConsumers}/${summary.serviceCount} with consumers in scope).`);

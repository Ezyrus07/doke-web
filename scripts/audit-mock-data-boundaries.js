const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARKETPLACE_DIR = path.join(ROOT, 'assets/data/mocks/marketplace');
const MOCK_SERVICE = path.join(ROOT, 'assets/js/services/mock-data-boundary.js');
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-28-mock-data-boundaries-report.json');

const collections = [
  {
    file: 'services.json',
    required: ['id', 'kind', 'title', 'category', 'providerId', 'providerName', 'location', 'priceLabel', 'rating', 'reviews', 'image', 'href', 'tags']
  },
  {
    file: 'workers.json',
    required: ['id', 'kind', 'title', 'providerId', 'providerName', 'category', 'image', 'videoUrl', 'duration', 'views', 'likes']
  },
  {
    file: 'publications.json',
    required: ['id', 'kind', 'type', 'title', 'summary', 'authorId', 'authorName', 'image', 'likes', 'comments', 'saves', 'createdAt']
  },
  {
    file: 'reviews.json',
    required: ['id', 'kind', 'serviceId', 'authorName', 'authorInitials', 'rating', 'text', 'date', 'serviceTitle', 'verified']
  }
];

const issues = [];
const summary = [];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    issues.push(`${path.relative(ROOT, filePath)}: JSON inválido (${error.message})`);
    return null;
  }
}

for (const collection of collections) {
  const filePath = path.join(MARKETPLACE_DIR, collection.file);
  if (!fs.existsSync(filePath)) {
    issues.push(`${path.relative(ROOT, filePath)}: arquivo ausente`);
    continue;
  }

  const parsed = readJson(filePath);
  if (!parsed) continue;

  if (!Array.isArray(parsed)) {
    issues.push(`${path.relative(ROOT, filePath)}: deveria ser array`);
    continue;
  }

  if (parsed.length === 0) {
    issues.push(`${path.relative(ROOT, filePath)}: array vazio`);
  }

  parsed.forEach((item, index) => {
    collection.required.forEach((field) => {
      if (!(field in item)) {
        issues.push(`${path.relative(ROOT, filePath)}[${index}]: campo obrigatório ausente '${field}'`);
      }
    });

    if (item.kind && collection.file.replace('.json', '').startsWith(item.kind) === false) {
      const validKinds = {
        'services.json': 'service',
        'workers.json': 'worker',
        'publications.json': 'publication',
        'reviews.json': 'review'
      };
      if (item.kind !== validKinds[collection.file]) {
        issues.push(`${path.relative(ROOT, filePath)}[${index}]: kind esperado '${validKinds[collection.file]}', recebido '${item.kind}'`);
      }
    }
  });

  summary.push({ collection: collection.file, items: parsed.length, requiredFields: collection.required.length });
}

const manifestPath = path.join(MARKETPLACE_DIR, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? readJson(manifestPath) : null;
if (!manifest) {
  issues.push('assets/data/mocks/marketplace/manifest.json: arquivo ausente ou inválido');
} else {
  ['services', 'workers', 'publications', 'reviews'].forEach((key) => {
    if (!manifest.collections || !manifest.collections[key]) {
      issues.push(`manifest.json: coleção '${key}' ausente`);
    }
  });
}

if (!fs.existsSync(MOCK_SERVICE)) {
  issues.push('assets/js/services/mock-data-boundary.js: arquivo ausente');
} else {
  const serviceSource = fs.readFileSync(MOCK_SERVICE, 'utf8');
  ['services', 'workers', 'publications', 'reviews'].forEach((key) => {
    if (!serviceSource.includes(`${key}:`)) {
      issues.push(`mock-data-boundary.js: registry não inclui '${key}'`);
    }
  });
  if (/document\.querySelector|\.innerHTML\s*=|localStorage|sessionStorage|firebase|supabase/i.test(serviceSource)) {
    issues.push('mock-data-boundary.js: serviço de dados não deve manipular DOM, storage ou backend diretamente');
  }
}

const renderersDir = path.join(ROOT, 'assets/js/renderers');
if (fs.existsSync(renderersDir)) {
  const rendererFiles = fs.readdirSync(renderersDir).filter((file) => file.endsWith('.js'));
  rendererFiles.forEach((file) => {
    const source = fs.readFileSync(path.join(renderersDir, file), 'utf8');
    if (/fetch\s*\(|firebase|supabase|localStorage|sessionStorage/i.test(source)) {
      issues.push(`assets/js/renderers/${file}: renderer não deve buscar dados diretamente`);
    }
  });
}

const report = {
  ok: issues.length === 0,
  checkedAt: new Date().toISOString(),
  collections: summary,
  issues
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));

if (issues.length) {
  console.error('Mock data boundary audit failed:');
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log(`Mock data boundary audit passed. Collections checked: ${summary.length}`);

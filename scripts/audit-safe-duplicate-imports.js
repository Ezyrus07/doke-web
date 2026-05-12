const fs = require('fs');
const path = require('path');
const { collectCssImports, normalizeAsset } = require('./lib/css-assets');

const root = process.cwd();
const stableManifestContracts = {
  'index.html': ['assets/css/pages/home.css'],
  'resultados.html': ['assets/css/pages/search-results.css'],
};

const htmlFiles = fs
  .readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name)
  .concat(
    fs.existsSync(path.join(root, 'auth'))
      ? fs
          .readdirSync(path.join(root, 'auth'), { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
          .map((entry) => `auth/${entry.name}`)
      : []
  )
  .sort();

function getDirectStylesheets(html) {
  const tags = [...html.matchAll(/<link\b[^>]*>/gi)].map((match) => match[0]);
  return tags
    .filter((tag) => /\brel\s*=\s*['"][^'"]*stylesheet[^'"]*['"]/i.test(tag))
    .map((tag) => {
      const href = tag.match(/\bhref\s*=\s*['"]([^'"]+)['"]/i);
      return href ? normalizeAsset(href[1]) : null;
    })
    .filter(Boolean);
}

const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    htmlFiles: htmlFiles.length,
    directDuplicateLinks: 0,
    safeDuplicateCandidates: 0,
    enforcedViolations: 0,
  },
  pages: [],
};

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(path.join(root, htmlFile), 'utf8');
  const direct = getDirectStylesheets(html);
  const directCounts = direct.reduce((acc, asset) => {
    acc[asset] = (acc[asset] || 0) + 1;
    return acc;
  }, {});

  const directDuplicates = Object.entries(directCounts)
    .filter(([, count]) => count > 1)
    .map(([asset, count]) => ({ asset, count }));

  const manifests = stableManifestContracts[htmlFile] || [];
  const manifestImports = new Set();
  for (const manifest of manifests) {
    if (!fs.existsSync(path.join(root, manifest))) continue;
    for (const imported of collectCssImports(manifest, root)) {
      manifestImports.add(imported);
    }
  }

  const safeDuplicateCandidates = direct
    .filter((asset) => manifests.length && !manifests.includes(asset) && manifestImports.has(asset))
    .map((asset) => ({ asset, reason: `Already imported by ${manifests.join(', ')}` }));

  const pageReport = {
    html: htmlFile,
    directStylesheets: direct.length,
    directDuplicates,
    safeDuplicateCandidates,
  };

  if (directDuplicates.length || safeDuplicateCandidates.length) {
    report.pages.push(pageReport);
  }

  report.summary.directDuplicateLinks += directDuplicates.length;
  report.summary.safeDuplicateCandidates += safeDuplicateCandidates.length;

  if (safeDuplicateCandidates.length && stableManifestContracts[htmlFile]) {
    report.summary.enforcedViolations += safeDuplicateCandidates.length;
  }
}

const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(
  path.join(validationDir, 'global-cycle-17-safe-duplicate-imports-report.json'),
  JSON.stringify(report, null, 2)
);

if (report.summary.enforcedViolations > 0) {
  console.error('Safe duplicate import audit failed. Remove direct imports already owned by page manifests.');
  for (const page of report.pages) {
    if (!stableManifestContracts[page.html] || !page.safeDuplicateCandidates.length) continue;
    console.error(`- ${page.html}`);
    for (const item of page.safeDuplicateCandidates) {
      console.error(`  ${item.asset} (${item.reason})`);
    }
  }
  process.exit(1);
}

console.log('Safe duplicate import audit passed.');
console.log(`HTML files audited: ${report.summary.htmlFiles}`);
console.log(`Direct duplicate links: ${report.summary.directDuplicateLinks}`);
console.log(`Remaining safe duplicate candidates: ${report.summary.safeDuplicateCandidates}`);

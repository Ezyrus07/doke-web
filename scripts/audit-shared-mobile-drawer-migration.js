const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-119-shared-mobile-drawer-migration-report.json');
const MANIFEST = path.join(ROOT, 'docs', 'validation', 'global-cycle-119-source-removal-manifest.json');
const OLD = 'assets/js/pages/home/drawer.js';
const NEXT = 'assets/js/ui/mobile-drawer.js';
const EXPECTED_PAGES = ['index.html','mensagens.html','comunidade-interna.html','comunidade.html','configuracoes.html','notificacoes.html','pedidos.html'];

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function srcs(html) { return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1].split('?')[0].replace(/^\.\//, '')); }

const pages = EXPECTED_PAGES.map((page) => {
  const html = read(path.join(ROOT, page));
  const scripts = srcs(html);
  return {
    page,
    importsNewDrawer: scripts.includes(NEXT),
    importsOldDrawer: scripts.includes(OLD),
    drawerImportCount: scripts.filter((src) => src === NEXT || src === OLD).length,
  };
});

const newExists = fs.existsSync(path.join(ROOT, NEXT));
const oldExists = fs.existsSync(path.join(ROOT, OLD));
const failures = [];
if (!newExists) failures.push({ risk: 'missing-new-drawer-file', file: NEXT });
pages.forEach((page) => {
  if (!page.importsNewDrawer) failures.push({ page: page.page, risk: 'missing-new-drawer-import' });
  if (page.importsOldDrawer) failures.push({ page: page.page, risk: 'old-drawer-import-still-used' });
  if (page.drawerImportCount !== 1) failures.push({ page: page.page, risk: 'unexpected-drawer-import-count', count: page.drawerImportCount });
});

const manifest = {
  cycle: 119,
  note: 'Partial ZIP application cannot delete old paths automatically. Remove the old source after confirming all pages import the shared drawer path.',
  sourcePathsToRemoveAfterApplyingCycle: oldExists ? [OLD] : [],
  replacementPath: NEXT,
};
fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

const report = {
  cycle: 119,
  name: 'shared mobile drawer migration',
  status: failures.length ? 'failed' : 'passed',
  policy: {
    visualChanges: false,
    behaviorCopiedWithoutLogicChange: true,
    oldPathRemovalManifestCreated: true,
  },
  summary: {
    expectedPageCount: EXPECTED_PAGES.length,
    migratedPageCount: pages.filter((page) => page.importsNewDrawer && !page.importsOldDrawer).length,
    newDrawerExists: newExists,
    oldDrawerExistsAfterMigration: oldExists,
    failureCount: failures.length,
  },
  paths: { from: OLD, to: NEXT },
  pages,
  failures,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) { console.error(`[global-cycle-119] shared mobile drawer migration: failed (${failures.length} failures)`); process.exitCode = 1; }
else console.log(`[global-cycle-119] shared mobile drawer migration: passed (${pages.length} pages)`);

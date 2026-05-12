const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'docs', 'validation', 'global-cycle-116-operational-script-loading-report.json');
const PAGES = ['pedidos.html', 'carteira.html', 'configuracoes.html', 'notificacoes.html'];

function read(file) { return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function scriptTags(html) { return [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi)].map((m) => ({ tag: m[0], src: m[1] })); }
function normalized(tag) { return /\sdefer\b/i.test(tag) || /\stype=["']module["']/i.test(tag) || /\sasync\b/i.test(tag); }

const pages = PAGES.map((page) => {
  const html = read(path.join(ROOT, page));
  const scripts = scriptTags(html).map((script) => ({
    src: script.src.split('?')[0].replace(/^\.\//, ''),
    hasDefer: /\sdefer\b/i.test(script.tag),
    isModule: /\stype=["']module["']/i.test(script.tag),
    isAsync: /\sasync\b/i.test(script.tag),
    normalized: normalized(script.tag),
  }));
  const blocking = scripts.filter((script) => !script.normalized);
  return { page, externalScriptCount: scripts.length, blockingExternalScriptCount: blocking.length, blockingScripts: blocking };
});
const blocking = pages.flatMap((page) => page.blockingScripts.map((script) => ({ page: page.page, src: script.src })));
const report = {
  cycle: 116,
  name: 'operational script loading',
  status: blocking.length ? 'failed' : 'passed',
  policy: { orderPreserved: true, visualChanges: false, moduleMigration: false },
  summary: {
    pageCount: pages.length,
    externalScriptCount: pages.reduce((sum, page) => sum + page.externalScriptCount, 0),
    blockingExternalScriptCount: blocking.length,
  },
  pages,
  blocking,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);
if (blocking.length) {
  console.error(`[global-cycle-116] operational script loading: failed (${blocking.length} blocking scripts)`);
  process.exitCode = 1;
} else {
  console.log(`[global-cycle-116] operational script loading: passed`);
}

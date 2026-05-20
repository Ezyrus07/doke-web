const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const TARGETS = ['index.html','resultados.html','perfil.html','pedidos.html','carteira.html','pagamento-profissional.html','avaliacao.html','configuracoes.html','notificacoes.html','comunidade.html','comunidade.html'];
const failures = [];
const pages = [];
for (const page of TARGETS) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) { failures.push({ page, reason: 'missing-page' }); continue; }
  const html = fs.readFileSync(file, 'utf8');
  const header = (html.match(/<header[\s\S]*?<\/header>/i) || [''])[0];
  const checks = { appTopbar: /app-topbar/.test(header), searchLeft: /data-topbar-left[\s\S]*data-topbar-search-control/.test(header), contextBeforeActions: header.indexOf('data-topbar-context') > -1 && header.indexOf('data-topbar-actions') > header.indexOf('data-topbar-context'), actionsRight: /data-topbar-actions/.test(header) };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  pages.push({ page, checks, status: failed.length ? 'failed' : 'passed' });
  if (failed.length) failures.push({ page, failed });
}
const report = { generatedAt: new Date().toISOString(), cycle: 162, targetCount: TARGETS.length, pages, failures, status: failures.length ? 'failed' : 'passed' };
fs.mkdirSync(path.join(ROOT, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'docs/validation/global-cycle-162-app-topbar-migration-gate-report.json'), JSON.stringify(report, null, 2));
if (failures.length) { console.error('[app-topbar-migration-gate] failed', JSON.stringify(failures, null, 2)); process.exit(1); }
console.log('[app-topbar-migration-gate] passed');

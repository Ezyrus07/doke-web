#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const PAGES = ['index.html','resultados.html','perfil.html','detalhe-anuncio.html','pedidos.html','carteira.html','pagamento-profissional.html','configuracoes.html','notificacoes.html','mensagens.html','comunidade.html','comunidade.html'];
const issues = [];
const rows = [];
function attr(tag,name){ const m = tag && tag.match(new RegExp(name + '="([^"]*)"','i')); return m ? m[1] : ''; }
for (const file of PAGES) {
  const html = fs.readFileSync(path.join(ROOT,file),'utf8');
  const body = html.match(/<body\b[^>]*>/i)?.[0] || '';
  const appShell = html.match(/<div\b[^>]*class="[^"]*\bapp-shell\b[^"]*"[^>]*>/i)?.[0] || '';
  const main = html.match(/<main\b[^>]*class="[^"]*\bpage__content\b[^"]*"[^>]*>/i)?.[0] || '';
  const topbar = html.match(/<header\b[^>]*class="[^"]*\btopbar\b[^"]*"[^>]*>/i)?.[0] || '';
  const row = {file, topbarState: attr(body,'data-shell-topbar-state'), hasTopbar: Boolean(topbar)};
  rows.push(row);
  if (!/data-shell-region="app"/i.test(appShell)) issues.push({file, issue:'missing app shell hook'});
  if (!/data-shell-main\b/i.test(main)) issues.push({file, issue:'missing main shell hook'});
  if (!row.topbarState) issues.push({file, issue:'missing body topbar state'});
  if (topbar) {
    if (!/data-shell-topbar\b/i.test(topbar)) issues.push({file, issue:'missing topbar hook'});
    if (!/\binternal-page-topbar\b/i.test(topbar)) issues.push({file, issue:'missing internal-page-topbar class'});
    if (row.topbarState !== 'present') issues.push({file, issue:'topbar present but body state is not present'});
  } else if (row.topbarState !== 'absent-provisional') {
    issues.push({file, issue:'topbar absent without absent-provisional marker'});
  }
}
const report = {cycle:156, name:'shell-topbar-standardization', generatedAt:new Date().toISOString(), pageCount:PAGES.length, rows, issues, status: issues.length ? 'failed' : 'passed'};
fs.writeFileSync(path.join(ROOT,'docs/validation/global-cycle-156-shell-topbar-standardization-report.json'), JSON.stringify(report,null,2));
if (issues.length) { console.error('[audit:shell-topbar-standardization] failed', issues); process.exit(1); }
console.log('[audit:shell-topbar-standardization] passed');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const PAGES = [
  'index.html','resultados.html','perfil.html','detalhe-anuncio.html','pedidos.html','carteira.html','pagamento-profissional.html','finalizar-pedido.html','avaliacao.html','adicionar-cartao.html','configuracoes.html','notificacoes.html','mensagens.html','comunidade.html','comunidade-interna.html'
];
function read(file){ return fs.readFileSync(path.join(ROOT,file),'utf8'); }
function attr(tag,name){ const m = tag && tag.match(new RegExp(name + '="([^"]*)"','i')); return m ? m[1] : ''; }
const pages = PAGES.map((file) => {
  const html = read(file);
  const body = html.match(/<body\b[^>]*>/i)?.[0] || '';
  const appShell = html.match(/<div\b[^>]*class="[^"]*\bapp-shell\b[^"]*"[^>]*>/i)?.[0] || '';
  const topbar = html.match(/<header\b[^>]*class="[^"]*\btopbar\b[^"]*"[^>]*>/i)?.[0] || '';
  const main = html.match(/<main\b[^>]*class="[^"]*\bpage__content\b[^"]*"[^>]*>/i)?.[0] || '';
  return {
    file,
    bodyClass: attr(body,'class'),
    dataPage: attr(body,'data-page') || attr(body,'data-page-key'),
    topbarState: attr(body,'data-shell-topbar-state') || null,
    hasAppShell: Boolean(appShell),
    appShellHooked: /data-shell-region="app"/i.test(appShell),
    hasTopbar: Boolean(topbar),
    topbarClass: attr(topbar,'class'),
    topbarHooked: /data-shell-topbar\b/i.test(topbar),
    topbarStandardClass: /\binternal-page-topbar\b/i.test(topbar),
    hasMain: Boolean(main),
    mainHooked: /data-shell-main\b/i.test(main)
  };
});
const report = {
  cycle: 154,
  name: 'shell-topbar-map',
  generatedAt: new Date().toISOString(),
  pageCount: pages.length,
  pages,
  summary: {
    withTopbar: pages.filter(p=>p.hasTopbar).length,
    withoutTopbar: pages.filter(p=>!p.hasTopbar).length,
    appShellMissing: pages.filter(p=>!p.hasAppShell).map(p=>p.file),
    topbarMissing: pages.filter(p=>!p.hasTopbar).map(p=>p.file),
    unhookedShell: pages.filter(p=>!p.appShellHooked || !p.mainHooked || (p.hasTopbar && !p.topbarHooked)).map(p=>p.file)
  },
  status: 'passed'
};
fs.writeFileSync(path.join(ROOT,'docs/validation/global-cycle-154-shell-topbar-map-report.json'), JSON.stringify(report,null,2));
console.log(`[audit:shell-topbar-map] ${report.status} (${pages.length} pages)`);

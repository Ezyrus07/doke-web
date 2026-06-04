#!/usr/bin/env node
/* Stage 60E — !important hotspots audit. Read-only. */
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'reports', 'generated');
const EXCLUDED_DIRS = new Set(['.git', 'node_modules', 'docs', 'reports', 'archive']);
function toPosix(p){ return p.replace(/\\/g,'/'); }
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function walk(dir,out=[]){
  let entries=[]; try{ entries=fs.readdirSync(dir,{withFileTypes:true}); }catch{ return out; }
  for(const e of entries){ if(EXCLUDED_DIRS.has(e.name)) continue; const abs=path.join(dir,e.name); if(e.isDirectory()) walk(abs,out); else if(e.name.endsWith('.css')) out.push(abs); }
  return out;
}
function bucket(rel){
  const p=toPosix(rel);
  if(p.includes('/before-after-workers-preview/')) return 'components/before-after-workers-preview';
  if(p.includes('/components/shell/')) return 'components/shell';
  if(p.includes('/components/navigation/')) return 'components/navigation';
  if(p.includes('/patterns/')) return 'patterns';
  if(p.includes('/pages/home') || p.includes('/home-')) return 'pages/home';
  if(p.includes('/pages/mensagens/')) return 'pages/mensagens';
  if(p.includes('/pages/detalhe-anuncio')) return 'pages/detalhe-anuncio';
  if(p.includes('/pages/perfil')) return 'pages/perfil';
  if(p.includes('/pages/')) return 'pages/other';
  if(p.includes('/components/')) return 'components/other';
  if(p.includes('/core/')) return 'core';
  return 'other';
}
function main(){
  ensureDir(OUT_DIR);
  const rows=[];
  for(const abs of walk(path.join(ROOT,'assets'))){
    let text=''; try{text=fs.readFileSync(abs,'utf8');}catch{}
    const count=(text.match(/!important/g)||[]).length;
    if(count) rows.push({file:toPosix(path.relative(ROOT,abs)), count, bucket:bucket(path.relative(ROOT,abs))});
  }
  rows.sort((a,b)=>b.count-a.count || a.file.localeCompare(b.file));
  const byBucket={};
  for(const r of rows){ byBucket[r.bucket]=byBucket[r.bucket]||{files:0,total:0}; byBucket[r.bucket].files++; byBucket[r.bucket].total+=r.count; }
  const md=[];
  md.push('# Stage 60E — !important hotspots audit');
  md.push('');
  md.push('Auditoria somente leitura para orientar a próxima frente de redução de CSS.');
  md.push('');
  md.push(`Gerado em: ${new Date().toISOString()}`);
  md.push('');
  md.push('## Totais'); md.push('');
  md.push(`- arquivos com !important: ${rows.length}`);
  md.push(`- ocorrências totais: ${rows.reduce((s,r)=>s+r.count,0)}`);
  md.push(''); md.push('## Por domínio'); md.push('');
  for(const [b,v] of Object.entries(byBucket).sort((a,b)=>b[1].total-a[1].total)) md.push(`- ${b}: ${v.total} ocorrências em ${v.files} arquivo(s)`);
  md.push(''); md.push('## Top 40 arquivos'); md.push('');
  for(const r of rows.slice(0,40)) md.push(`- \`${r.file}\` — ${r.count}`);
  md.push(''); md.push('## Próxima ação recomendada'); md.push('');
  md.push('Atacar primeiro arquivos com grande concentração e domínio controlado. Não mexer em shell/router/header sem validação visual.');
  fs.writeFileSync(path.join(OUT_DIR,'stage60e-important-hotspots.md'), md.join('\n'),'utf8');
  fs.writeFileSync(path.join(OUT_DIR,'stage60e-important-hotspots.json'), JSON.stringify({generatedAt:new Date().toISOString(), rows, byBucket},null,2),'utf8');
  console.log('[Stage 60E] !important hotspot report generated.');
  console.log(`Files with !important: ${rows.length}`);
  console.log('Report: reports/generated/stage60e-important-hotspots.md');
}
main();

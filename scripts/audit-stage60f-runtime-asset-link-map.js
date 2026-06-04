#!/usr/bin/env node
/* Stage 60F — Runtime asset link map. Read-only. */
const fs = require('fs');
const path = require('path');
const ROOT=process.cwd();
const OUT_DIR=path.join(ROOT,'reports','generated');
function toPosix(p){return p.replace(/\\/g,'/');}
function ensureDir(p){fs.mkdirSync(p,{recursive:true});}
function walk(dir,out=[]){let entries=[];try{entries=fs.readdirSync(dir,{withFileTypes:true});}catch{return out;} for(const e of entries){if(['.git','node_modules','archive','reports','docs'].includes(e.name))continue;const abs=path.join(dir,e.name);if(e.isDirectory())walk(abs,out);else if(e.name.endsWith('.html'))out.push(abs);}return out;}
function main(){
 ensureDir(OUT_DIR);
 const htmls=walk(ROOT);
 const refs=[];
 for(const abs of htmls){
   const rel=toPosix(path.relative(ROOT,abs));
   const text=fs.readFileSync(abs,'utf8');
   for(const m of text.matchAll(/<(?:link|script)[^>]+(?:href|src)=["']([^"']+\.(?:css|js|mjs))(?:\?[^"']*)?["'][^>]*>/gi)){
     let asset=m[1].replace(/^\.\//,'').replace(/^\//,'');
     if(!asset.startsWith('assets/')) continue;
     refs.push({html:rel, asset:toPosix(asset), exists:fs.existsSync(path.join(ROOT,asset))});
   }
 }
 const missing=refs.filter(r=>!r.exists);
 const byAsset={}; for(const r of refs){byAsset[r.asset]=byAsset[r.asset]||[]; byAsset[r.asset].push(r.html);}
 const md=[]; md.push('# Stage 60F — Runtime asset link map'); md.push(''); md.push('Auditoria somente leitura dos assets CSS/JS referenciados diretamente por HTML.'); md.push(''); md.push(`Gerado em: ${new Date().toISOString()}`); md.push('');
 md.push('## Totais'); md.push(''); md.push(`- HTMLs escaneados: ${htmls.length}`); md.push(`- referências CSS/JS runtime: ${refs.length}`); md.push(`- assets únicos referenciados: ${Object.keys(byAsset).length}`); md.push(`- referências quebradas: ${missing.length}`); md.push('');
 if(missing.length){ md.push('## Referências quebradas'); md.push(''); for(const r of missing) md.push(`- \`${r.html}\` -> \`${r.asset}\``); md.push(''); }
 md.push('## Assets mais compartilhados'); md.push('');
 for(const [asset, pages] of Object.entries(byAsset).sort((a,b)=>b[1].length-a[1].length).slice(0,60)) md.push(`- \`${asset}\` — ${pages.length} página(s): ${pages.slice(0,8).join(', ')}${pages.length>8?'...':''}`);
 fs.writeFileSync(path.join(OUT_DIR,'stage60f-runtime-asset-link-map.md'), md.join('\n'),'utf8');
 fs.writeFileSync(path.join(OUT_DIR,'stage60f-runtime-asset-link-map.json'), JSON.stringify({generatedAt:new Date().toISOString(), refs, missing, byAsset},null,2),'utf8');
 console.log('[Stage 60F] Runtime asset link map generated.');
 console.log(`Broken references: ${missing.length}`);
 console.log('Report: reports/generated/stage60f-runtime-asset-link-map.md');
}
main();

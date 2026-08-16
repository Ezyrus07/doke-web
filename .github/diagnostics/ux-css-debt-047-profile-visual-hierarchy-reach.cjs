const fs=require('fs'),path=require('path'),cp=require('child_process'),crypto=require('crypto');
const TARGET='assets/css/pages/profile/visual-hierarchy.css';
const PARENT_SHA='9b691b6f1387987172259db6485c2884604fec5b';
const TARGET_BLOB='7e3b74a06b7c10f1b12744a92a987d0a4c111567';
const EXPECTED_PAGES=['meu-perfil.html','perfil-cliente.html','perfil-profissional.html','perfil.html'];
const EXPECTED_IMPORTER='assets/css/pages/profile-foundation.css';
const assert=(x,m)=>{if(!x)throw new Error(m)};
const sh=c=>cp.execSync(c,{encoding:'utf8'}).trim();
function parse(src){
  const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[],re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
  for(let i=0;i<lines.length;i++){
    const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;
    if(!sel){
      if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}
      else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}
      else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
      else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
    }
    if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}
    depth+=o-c;while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}
  }
  const last=new Map(),dead=[];
  for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important,winnerSelector:l.selector,winnerContext:l.context});if(!l||d.important||!l.important)last.set(k,d);}
  return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};
}
assert(sh('git rev-parse HEAD')===PARENT_SHA,'wrong parent SHA');
assert(sh(`git hash-object ${TARGET}`)===TARGET_BLOB,'target blob drift');
const src=fs.readFileSync(TARGET,'utf8'),p=parse(src);
assert(p.declarations.length===50&&p.dead.length===1,`target drift ${p.declarations.length}/${p.dead.length}`);
const d=p.dead[0];
assert(d.line===23,'dead line drift '+d.line);
assert(d.property==='box-shadow','property drift '+d.property);
assert(d.value==='var(--profile-surface-shadow)','dead value drift '+d.value);
assert(d.winnerLine===205,'winner line drift '+d.winnerLine);
assert(d.winnerValue==='var(--doke-shadow-nested-soft)','winner value drift '+d.winnerValue);
assert(d.selector===d.winnerSelector,'winner selector differs');
assert(d.context===d.winnerContext&&d.context==='','winner context differs');
assert(d.important===false&&d.winnerImportant===false,'importance drift');
assert(d.winnerLine>d.line,'winner not later');
const tracked=new Set(sh("git ls-files -z assets/css | tr '\\0' '\\n'").split('\n').filter(Boolean));
function importsFor(file){const text=fs.readFileSync(file,'utf8'),out=[],re=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;let m;while((m=re.exec(text))){let v=m[1].replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))v=v.replace(/^\/+/, '');else if(!v.startsWith('assets/'))v=path.posix.normalize(path.posix.join(path.posix.dirname(file),v));if(tracked.has(v))out.push(v);}return out;}
const importers=[...tracked].filter(f=>importsFor(f).includes(TARGET)).sort();
assert(JSON.stringify(importers)===JSON.stringify([EXPECTED_IMPORTER]),'direct importer drift '+JSON.stringify(importers));
const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8')),reached=[];
for(const pa of report.pageAssets){const seen=new Set(),stack=[...(pa.css||[]).filter(f=>tracked.has(f))];let hit=false;while(stack.length){const f=stack.pop();if(seen.has(f)||!tracked.has(f))continue;seen.add(f);if(f===TARGET){hit=true;break;}for(const n of importsFor(f))stack.push(n);}if(hit)reached.push(pa.page);}
reached.sort();assert(JSON.stringify(reached)===JSON.stringify(EXPECTED_PAGES),'page reach drift '+JSON.stringify(reached));
for(const page of EXPECTED_PAGES){const html=fs.readFileSync(page,'utf8');assert(html.includes('assets/css/pages/profile-foundation.css'),'foundation link missing '+page);assert(/<body[^>]*class=["'][^"']*profile-page-shell/.test(html),'profile-page-shell missing '+page);assert(/data-profile-contract=["']clean-v1["']/.test(html),'clean-v1 contract missing '+page);}
const finalNewline=/\r?\n$/.test(src),lines=src.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();assert(lines[d.line-1].trim()==='box-shadow: var(--profile-surface-shadow);','source line mismatch');lines.splice(d.line-1,1);fs.writeFileSync(TARGET,lines.join('\n')+(finalNewline?'\n':''));
const after=parse(fs.readFileSync(TARGET,'utf8'));assert(after.declarations.length===49&&after.dead.length===0,`candidate drift ${after.declarations.length}/${after.dead.length}`);
const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='1'&&stat[2]===TARGET,'diff drift '+stat.join(' '));
const buf=fs.readFileSync(TARGET),hash=crypto.createHash('sha256').update(buf).digest('hex');
console.log(`STATIC CASCADE PROOF PASS|line=${d.line}|winnerLine=${d.winnerLine}|sameSelector=1|sameContext=1|sameImportance=1|deadValue=${d.value}|winnerValue=${d.winnerValue}|unconditionalDominance=1`);
console.log(`REACH AUTHORITY PASS|pages=${reached.join(',')}|directImporter=${EXPECTED_IMPORTER}|target=${TARGET}|affectedFamilies=1`);
console.log(`EPHEMERAL CANDIDATE PASS|decl=50->49|dead=1->0|additions=0|deletions=1|hash=${hash}|bytes=${buf.length}`);

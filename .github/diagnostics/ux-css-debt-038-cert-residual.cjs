const fs=require('fs'),path=require('path'),cp=require('child_process');
const assert=(x,m)=>{if(!x)throw new Error(m)};
const report=JSON.parse(fs.readFileSync('reports/generated/active-legacy-structures-report.json','utf8'));
const tracked=cp.execFileSync('git',['ls-files','-z','assets/css'],{encoding:'utf8'}).split('\0').filter(f=>f.endsWith('.css'));
const importRe=/@import\s+(?:url\()?['"]?([^'"\);]+\.css(?:\?[^'"\)]*)?)['"]?\)?/gi;
const normImport=(v,from)=>{v=v.replace(/\?.*$/,'').replace(/^\.\//,'');if(v.startsWith('/'))return v.replace(/^\/+/, '');if(v.startsWith('assets/'))return v;return path.posix.normalize(path.posix.join(path.posix.dirname(from),v));};
const meta=new Map();
for(const f of tracked){const text=fs.readFileSync(f,'utf8'),imports=[];let m;importRe.lastIndex=0;while((m=importRe.exec(text)))imports.push(normImport(m[1],f));meta.set(f,{text,imports,size:Buffer.byteLength(text),important:(text.match(/!important/gi)||[]).length});}
const active=new Set(),todo=[...new Set(report.pageAssets.flatMap(p=>p.css))].filter(f=>meta.has(f));
while(todo.length){const f=todo.pop();if(active.has(f)||!meta.has(f))continue;active.add(f);for(const n of meta.get(f).imports)if(meta.has(n))todo.push(n);}
const high=[...active].filter(f=>{const x=meta.get(f);return x.size>=50000||x.important>=100||x.imports.length>=10;});
function parse(src){const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[],re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();for(let i=0;i<lines.length;i++){const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;if(!sel){if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}}if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}depth+=o-c;while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}}const last=new Map(),dead=[];for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push(d);if(!l||d.important||!l.important)last.set(k,d);}return{declarations:ds.length,dead:dead.length};}
assert(active.size===401,`active drift ${active.size}`);
assert(high.length===37,`high drift ${high.length}`);
const guards=[
['assets/css/pages/pedidos/orders-chat.css',416,0,'029'],
['assets/css/pages/avaliacao-profissional.css',376,0,'030'],
['assets/css/pages/home/mobile-composition.css',166,0,'031'],
['assets/css/pages/home-overlays/before-after-preview.css',419,0,'032'],
['assets/css/pages/carteira/responsive-contract.css',718,0,'033'],
['assets/css/pages/configuracoes.css',681,0,'034'],
['assets/css/pages/comunidade/photo-discovery.css',491,0,'035'],
['assets/css/pages/chat-financial-message-card.css',378,0,'036'],
['assets/css/pages/settings-workspace-contract.css',554,0,'037'],
['assets/css/pages/pedidos/mobile-layout-contract.css',200,0,'038']];
for(const [file,decl,dead,label] of guards){assert(meta.has(file),`${label} missing ${file}`);const p=parse(meta.get(file).text);assert(p.declarations===decl&&p.dead===dead,`${label} drift ${p.declarations}/${p.dead}`);}
const all=[...active].map(file=>{const p=parse(meta.get(file).text);return{file,dead:p.dead,highRisk:high.includes(file)}});
const files=all.filter(r=>r.dead).length,total=all.reduce((a,r)=>a+r.dead,0),highDead=all.filter(r=>r.dead&&r.highRisk).length;
assert(files===36&&total===849&&highDead===0,`residual drift ${files}/${total}/${highDead}`);
console.log('PERMANENT RESIDUAL PASS|active=401|high=37|files=36|dead=849|highDead=0|target=200/0|prior029-037=stable');

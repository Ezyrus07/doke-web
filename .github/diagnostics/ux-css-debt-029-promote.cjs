const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const TARGET=process.env.TARGET_CSS;
const SHA=process.env.TARGET_SHA;
const BLOB=process.env.TARGET_BLOB;
const HASH=process.env.TARGET_HASH;
const sh=(c)=>cp.execSync(c,{encoding:'utf8'}).trim();
const assert=(x,m)=>{if(!x)throw new Error(m)};
function parse(src){
  const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[];
  const re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/;
  const norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();
  for(let i=0;i<lines.length;i++){
    const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;
    if(!sel){
      if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}
      else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}
      else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
      else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}
    }
    if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}
    depth+=o-c;
    while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}
  }
  const last=new Map(),dead=[];
  for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}
  return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};
}
const expected=[
['<global>','body.orders-page-shell .orders-chat-panel','background','var(--orders-chat-surface)','#eef7fd'],
['<global>','body.orders-page-shell .orders-chat-panel__body','gap','13px','16px'],
['<global>','body.orders-page-shell .orders-chat-panel__body','padding','16px 18px 18px','18px 28px 22px'],
['<global>','body.orders-page-shell .orders-chat-row','max-width','min(700px, 82%)','min(620px, 86%)'],
['<global>','body.orders-page-shell .orders-chat-row--me','max-width','min(700px, 78%)','min(620px, 78%)'],
['<global>','body.orders-page-shell .orders-chat-message','border-radius','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-7)','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-20) var(--radius-2xs)'],
['<global>','body.orders-page-shell .orders-chat-message','box-shadow','var(--doke-elevation-surface)','var(--doke-elevation-surface)'],
['<global>','body.orders-page-shell .orders-chat-message--me','border-radius','var(--radius-exact-20) var(--radius-exact-20) var(--radius-exact-7) var(--radius-exact-20)','var(--radius-exact-20) var(--radius-exact-20) var(--radius-2xs) var(--radius-exact-20)'],
['<global>','body.orders-page-shell .orders-chat-message--me','background','linear-gradient(135deg, #25b4a6 0%, var(--orders-chat-success) 100%)','linear-gradient(135deg, #28b9a9 0%, #159e8e 100%)'],
['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel','width','min(100%, 430px)','min(100%, 430px)'],
['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel__body','gap','10px','12px'],
['@media (max-width: 760px)','body.orders-page-shell .orders-chat-panel__body','padding','12px','12px']
];
assert(sh('git rev-parse HEAD')===SHA,'wrong parent SHA');
assert(sh(`git hash-object ${TARGET}`)===BLOB,'parent blob drift');
const before=fs.readFileSync(TARGET,'utf8'),p=parse(before);
assert(p.declarations.length===428,`decl drift ${p.declarations.length}`);
assert(p.dead.length===12,`dead drift ${p.dead.length}`);
const got=p.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);
assert(JSON.stringify(got)===JSON.stringify(expected),'dead rows drift');
const lines=before.split(/\r?\n/);
for(const d of [...p.dead].sort((a,b)=>b.line-a.line)){assert(lines[d.line-1]?.trim().startsWith(d.property+':'),'line mismatch '+d.line);lines.splice(d.line-1,1);}
fs.writeFileSync(TARGET,lines.join('\n'));
const after=fs.readFileSync(TARGET),a=parse(after.toString('utf8'));
assert(a.declarations.length===416&&a.dead.length===0,`after drift ${a.declarations.length}/${a.dead.length}`);
const hash=crypto.createHash('sha256').update(after).digest('hex');
assert(hash===HASH,`candidate hash drift ${hash}`);
assert(sh(`git diff --name-only -- ${TARGET}`)===TARGET,'scope drift');
const n=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);
assert(n[0]==='0'&&n[1]==='12'&&n[2]===TARGET,'numstat drift '+n.join('/'));
sh('git diff --check');
console.log(`PROMOTION CANDIDATE PASS|hash=${hash}|files=1|additions=0|deletions=12|decl=428->416|dead=12->0`);

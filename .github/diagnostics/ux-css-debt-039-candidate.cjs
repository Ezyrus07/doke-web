const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const TARGET=process.env.TARGET_FILE,SHA=process.env.TARGET_SHA,BLOB=process.env.TARGET_BLOB;
const sh=c=>cp.execSync(c,{encoding:'utf8'}).trim();
const assert=(x,m)=>{if(!x)throw new Error(m)};
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
  for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}
  return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};
}
assert(TARGET&&SHA&&BLOB,'missing env');
assert(sh('git rev-parse HEAD')===SHA,'wrong parent SHA');
assert(sh(`git hash-object ${TARGET}`)===BLOB,'parent blob drift');
const beforeText=fs.readFileSync(TARGET,'utf8'),before=parse(beforeText);
assert(before.declarations.length===912,`decl drift ${before.declarations.length}`);
assert(before.dead.length===192,`dead drift ${before.dead.length}`);
assert(new Set(before.dead.map(d=>d.selector)).size===46,'selector drift');
const identical=before.dead.filter(d=>d.value===d.winnerValue&&d.important===d.winnerImportant).length;
assert(identical===48&&before.dead.length-identical===144,`identity drift ${identical}/${before.dead.length-identical}`);
assert(before.dead.every(d=>!d.important&&!d.winnerImportant&&d.winnerLine>d.line),'cascade proof drift');
const contexts=new Map();for(const d of before.dead){const k=d.context||'<global>';contexts.set(k,(contexts.get(k)||0)+1);}
assert(contexts.size===3&&contexts.get('<global>')===166&&contexts.get('@media (max-width: 640px)')===14&&contexts.get('@media (max-width: 720px)')===12,`context drift ${JSON.stringify([...contexts])}`);
const finalNewline=/\r?\n$/.test(beforeText),lines=beforeText.split(/\r?\n/);if(finalNewline&&lines.at(-1)==='')lines.pop();
for(const d of [...before.dead].sort((a,b)=>b.line-a.line)){const line=lines[d.line-1];assert(line&&line.trim().startsWith(`${d.property}:`),`line mismatch ${d.line}`);lines.splice(d.line-1,1);}
const candidate=lines.join('\n')+(finalNewline?'\n':'');fs.writeFileSync(TARGET,candidate);
const after=parse(candidate);assert(after.declarations.length===720&&after.dead.length===0,`candidate drift ${after.declarations.length}/${after.dead.length}`);
assert(sh('git diff --name-only')===TARGET,'scope drift');
const stat=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(stat[0]==='0'&&stat[1]==='192'&&stat[2]===TARGET,`numstat drift ${stat.join('/')}`);
sh('git diff --check');
const bytes=Buffer.byteLength(candidate),hash=crypto.createHash('sha256').update(Buffer.from(candidate)).digest('hex');
console.log(`CANDIDATE BUILD PASS|file=${TARGET}|hash=${hash}|bytes=${bytes}|files=1|additions=0|deletions=192|decl=912->720|dead=192->0|selectors=46|identical=48|changed=144|contexts=166/14/12`);

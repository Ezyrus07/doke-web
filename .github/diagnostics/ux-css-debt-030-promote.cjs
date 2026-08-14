const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const TARGET=process.env.TARGET_CSS,SHA=process.env.TARGET_SHA,BLOB=process.env.TARGET_BLOB,HASH=process.env.TARGET_HASH;
const sh=c=>cp.execSync(c,{encoding:'utf8'}).trim();
const assert=(x,m)=>{if(!x)throw new Error(m)};
function parse(src){const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[],re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();for(let i=0;i<lines.length;i++){const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;if(!sel){if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}}if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}depth+=o-c;while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}}const last=new Map(),dead=[];for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};}
const expected=[
['<global>','.pro-review-success__card','width','min(560px, 100%)','min(520px, 100%)'],
['<global>','.pro-review-success__card','padding','clamp(24px, 4vw, 34px)','clamp(26px, 4vw, 34px) clamp(22px, 4vw, 34px) 28px'],
['<global>','.pro-review-success__card','text-align','center','center'],
['<global>','.pro-review-success__icon','width','64px','52px'],
['<global>','.pro-review-success__icon','height','64px','52px'],
['<global>','.pro-review-success__icon','border-radius','50%','var(--radius-md)'],
['<global>','.pro-review-success__icon svg','width','34px','26px'],
['<global>','.pro-review-success__icon svg','height','34px','26px'],
['<global>','.pro-review-success__card h2','margin','16px 0 8px','0'],
['<global>','.pro-review-success__card h2','font-size','1.7rem','clamp(1.45rem, 3vw, 1.85rem)'],
['<global>','.pro-review-success__card p','line-height','1.56','1.55'],
['<global>','.pro-review-success__badges','display','flex','none'],
['<global>','.pro-review-success__actions','display','flex','grid'],
['<global>','.pro-review-success__actions','gap','12px','14px'],
['<global>','.pro-review-success__actions','margin-top','18px','22px']];
assert(sh('git rev-parse HEAD')===SHA,'wrong parent SHA');
assert(sh(`git hash-object ${TARGET}`)===BLOB,'parent blob drift');
const before=fs.readFileSync(TARGET,'utf8'),p=parse(before);
assert(p.declarations.length===391,`decl drift ${p.declarations.length}`);assert(p.dead.length===15,`dead drift ${p.dead.length}`);
const got=p.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);assert(JSON.stringify(got)===JSON.stringify(expected),'dead rows drift');
const hadFinal=/\r?\n$/.test(before),lines=before.split(/\r?\n/);if(hadFinal&&lines[lines.length-1]==='')lines.pop();
for(const d of [...p.dead].sort((a,b)=>b.line-a.line)){assert(lines[d.line-1]?.trim().startsWith(d.property+':'),'line mismatch '+d.line);lines.splice(d.line-1,1);}fs.writeFileSync(TARGET,lines.join('\n')+(hadFinal?'\n':''));
const after=fs.readFileSync(TARGET),a=parse(after.toString('utf8'));assert(a.declarations.length===376&&a.dead.length===0,`after drift ${a.declarations.length}/${a.dead.length}`);
const hash=crypto.createHash('sha256').update(after).digest('hex');assert(hash===HASH,`candidate hash drift ${hash}`);
assert(sh(`git diff --name-only -- ${TARGET}`)===TARGET,'scope drift');const n=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(n[0]==='0'&&n[1]==='15'&&n[2]===TARGET,'numstat drift '+n.join('/'));sh('git diff --check');
console.log(`PROMOTION CANDIDATE PASS|hash=${hash}|files=1|additions=0|deletions=15|decl=391->376|dead=15->0`);

const fs=require('fs'),cp=require('child_process'),crypto=require('crypto');
const TARGET=process.env.TARGET_CSS,SHA=process.env.TARGET_SHA,BLOB=process.env.TARGET_BLOB,HASH=process.env.TARGET_HASH;
const sh=c=>cp.execSync(c,{encoding:'utf8'}).trim();
const assert=(x,m)=>{if(!x)throw new Error(m)};
function parse(src){const lines=src.split(/\r?\n/);let depth=0,sp=[],ap=[],sel=null;const ds=[],stack=[],re=/^\s*([\w-]+)\s*:\s*(.*?)\s*;\s*$/,norm=p=>p.join(' ').replace(/\{\s*$/,'').replace(/\s+/g,' ').trim();for(let i=0;i<lines.length;i++){const line=lines[i],t=line.trim(),o=(line.match(/\{/g)||[]).length,c=(line.match(/\}/g)||[]).length;if(!sel){if(ap.length){if(t)ap.push(t);if(line.includes('{')){stack.push({type:'at',header:norm(ap),depthBefore:depth});ap=[];}}else if(t.startsWith('@')&&!t.includes(';')){if(line.includes('{'))stack.push({type:'at',header:norm([t]),depthBefore:depth});else ap=[t];}else if(sp.length){if(t)sp.push(t);if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}else if(t&&!t.startsWith('/*')&&!t.startsWith('*')&&t!=='*/'&&t!=='}'&&!t.startsWith('@')&&!line.includes(';')){sp=[t];if(line.includes('{')){sel=norm(sp);sp=[];stack.push({type:'rule',selector:sel,depthBefore:depth});}}}if(sel){const m=line.match(re);if(m){const raw=m[2].trim(),important=/\s*!important\s*$/i.test(raw),context=stack.filter(x=>x.type==='at').map(x=>x.header).join(' || ');ds.push({line:i+1,selector:sel,property:m[1].toLowerCase(),value:raw,important,context});}}depth+=o-c;while(stack.length&&depth<=stack[stack.length-1].depthBefore){const p=stack.pop();if(p.type==='rule')sel=null;}}const last=new Map(),dead=[];for(let i=ds.length-1;i>=0;i--){const d=ds[i],k=`${d.context} >>> ${d.selector} >>> ${d.property}`,l=last.get(k);if(l&&(!d.important||l.important))dead.push({...d,winnerLine:l.line,winnerValue:l.value,winnerImportant:l.important});if(!l||d.important||!l.important)last.set(k,d);}return{declarations:ds,dead:dead.sort((a,b)=>a.line-b.line)};}
const expected=[
['@media (max-width: 560px)','body.home-index-shell','--index-mobile-gutter','var(--doke-mobile-shell-edge, var(--doke-mobile-page-gutter, var(--doke-mobile-page-edge, 18px)))','var(--doke-mobile-shell-edge, var(--doke-mobile-page-gutter, var(--doke-mobile-page-edge, 18px)))'],
['@media (max-width: 560px)','body.home-index-shell','--index-mobile-card-width','min(78vw, 296px)','min(78vw, 296px)'],
['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__form','min-height','var(--control-height-lg)','56px'],
['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__form','height','var(--control-height-lg)','56px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','min-height','var(--control-height-lg)','100%'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','height','var(--control-height-lg)','100%'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','padding','6px 78px 6px 42px','0'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__field','border-radius','var(--radius-exact-17)','0'],
['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','height','100%','100%'],
['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','min-height','0','0'],
['@media (max-width: 560px)','body.home-index-shell .doke-search-panel__input','font-size','15px','14px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__mobile-submit','left','12px','14px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__audio-button','right','50px','56px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','width','42px','46px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','height','var(--control-height-md)','var(--control-height-lg)'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','right','2px','5px'],
['@media (max-width: 560px)','body.home-index-shell .home-search-hero__filter-button','border-radius','var(--radius-exact-15)','var(--radius-exact-15)']];
assert(sh('git rev-parse HEAD')===SHA,'wrong parent SHA');
assert(sh(`git hash-object ${TARGET}`)===BLOB,'parent blob drift');
const before=fs.readFileSync(TARGET,'utf8'),p=parse(before);
assert(p.declarations.length===183,`decl drift ${p.declarations.length}`);assert(p.dead.length===17,`dead drift ${p.dead.length}`);
const got=p.dead.map(d=>[d.context||'<global>',d.selector,d.property,d.value,d.winnerValue]);assert(JSON.stringify(got)===JSON.stringify(expected),'dead rows drift');
const hadFinal=/\r?\n$/.test(before),lines=before.split(/\r?\n/);if(hadFinal&&lines[lines.length-1]==='')lines.pop();
for(const d of [...p.dead].sort((a,b)=>b.line-a.line)){assert(lines[d.line-1]?.trim().startsWith(d.property+':'),'line mismatch '+d.line);lines.splice(d.line-1,1);}fs.writeFileSync(TARGET,lines.join('\n')+(hadFinal?'\n':''));
const after=fs.readFileSync(TARGET),a=parse(after.toString('utf8'));assert(a.declarations.length===166&&a.dead.length===0,`after drift ${a.declarations.length}/${a.dead.length}`);
const hash=crypto.createHash('sha256').update(after).digest('hex');assert(hash===HASH,`candidate hash drift ${hash}`);
assert(Buffer.byteLength(after)===9466,`candidate bytes drift ${Buffer.byteLength(after)}`);
assert(sh(`git diff --name-only -- ${TARGET}`)===TARGET,'scope drift');const n=sh(`git diff --numstat -- ${TARGET}`).split(/\s+/);assert(n[0]==='0'&&n[1]==='17'&&n[2]===TARGET,'numstat drift '+n.join('/'));sh('git diff --check');
console.log(`PROMOTION CANDIDATE PASS|hash=${hash}|bytes=9466|files=1|additions=0|deletions=17|decl=183->166|dead=17->0`);

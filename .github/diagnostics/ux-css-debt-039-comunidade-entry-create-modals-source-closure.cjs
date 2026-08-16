const fs=require('fs');
const cp=require('child_process');
const TARGET='assets/css/pages/comunidade/entry-create-modals.css';
const PAGE='comunidade.html';
const JS='assets/js/pages/comunidade.js';
const SHA=process.env.TARGET_SHA;
const BLOB=process.env.TARGET_BLOB;
const assert=(x,m)=>{if(!x)throw new Error(m)};
const sh=c=>cp.execSync(c,{encoding:'utf8'}).trim();
const grepSources=(term)=>{try{return cp.execFileSync('git',['grep','-n','-F',term,'--','*.html','assets/js'],{encoding:'utf8'}).trim();}catch(e){if(e.status===1)return '';throw e;}};
assert(sh('git rev-parse HEAD')===SHA,'wrong checkpoint');
assert(sh(`git hash-object ${TARGET}`)===BLOB,'target blob drift');
const css=fs.readFileSync(TARGET,'utf8'),html=fs.readFileSync(PAGE,'utf8'),js=fs.readFileSync(JS,'utf8');
const expectedAbsent=[
'.community-action-modal__dialog--create.doke-action-modal__surface',
'.community-action-modal__dialog--create .doke-action-modal__field textarea',
'.community-action-modal__dialog--create .doke-action-modal__body',
'.community-action-modal__dialog--create .doke-action-modal__form',
'.community-action-modal__dialog--create .doke-action-modal__footer',
'.community-action-modal__dialog--create .doke-action-modal__header',
'.community-create-page__back'
];
assert(expectedAbsent.length===7,'absent cardinality drift');
assert(css.includes('.community-action-modal__dialog--create'),'legacy create-modal selector root missing from target');
assert(css.includes('.community-create-page__back'),'legacy back selector root missing from target');
const modalHits=grepSources('community-action-modal__dialog--create');
const backHits=grepSources('community-create-page__back');
assert(modalHits==='','create-modal root became HTML/JS reachable: '+modalHits);
assert(backHits==='','create-page back root became HTML/JS reachable: '+backHits);
assert((html.match(/data-community-create-step="details"/g)||[]).length===1,'details DOM drift');
assert((html.match(/data-community-create-step="members"/g)||[]).length===1,'members DOM drift');
assert((html.match(/data-community-create-step="review"/g)||[]).length===1,'review DOM drift');
assert(html.includes('data-community-create-view'),'create view missing');
assert(js.includes("const createStepKeys = ['details', 'members', 'review'];"),'wizard step runtime drift');
assert(js.includes('const ensureCreateCoverControls = () =>'),'cover runtime drift');
assert(js.includes('class="community-create-member"'),'member injection runtime drift');
assert(js.includes("createForm.dataset.communityCreateCurrentStep = activeKey;"),'current-step runtime drift');
console.log(`SOURCE CLOSURE PASS|absentSelectors=${expectedAbsent.length}|legacyCreateModalHtmlJsHits=0|legacyBackHtmlJsHits=0|runtimeStates=details,members,review,cover,member-injection`);
console.log(`ABSENT CLASSIFICATION|${expectedAbsent.join(' <OR> ')}`);

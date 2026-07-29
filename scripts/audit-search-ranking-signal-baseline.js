'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');const errors=[];
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');const ok=(value,message)=>{if(!value)errors.push(message);};
const evidencePath='docs/validation/SEARCH-001-A06-RANKING-SIGNAL-BASELINE.json';const matrixPath='config/domain-completion-matrix.json';
for(const file of [evidencePath,matrixPath]) ok(fs.existsSync(path.join(root,file)),`missing ${file}`);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
const evidence=JSON.parse(read(evidencePath));const matrix=JSON.parse(read(matrixPath));const search=(matrix.domains||[]).find((item)=>item.id==='SEARCH-001');
ok(evidence.domain==='SEARCH-001'&&evidence.sublot==='SEARCH-A06','invalid evidence identity');
ok(evidence.status==='BASELINE_FROZEN','baseline must remain frozen');
ok(evidence.staging&&evidence.staging.readOnlyInspection===true,'staging inspection must be read-only');
ok(Array.isArray(evidence.signalClassification.eligibleForInitialRanking),'eligible signals missing');
ok(evidence.signalClassification.eligibleForInitialRanking.includes('text_relevance'),'text relevance missing');
ok(evidence.signalClassification.eligibleForInitialRanking.includes('published_order_backed_review_quality'),'order-backed review quality missing');
ok(evidence.signalClassification.observabilityOnly.includes('views_count'),'views must remain observability-only');
ok(evidence.signalClassification.forbiddenUntilHardened.includes('raw_browser_view_count'),'raw browser views must be forbidden');
ok(evidence.targetContract.rankingAuthority==='server_only','ranking authority must be server-only');
ok(evidence.targetContract.rollbackRequired===true,'ranking rollback must be required');
const a11Path='docs/validation/SEARCH-001-A11-FINAL-RECONCILIATION.json';const a11=fs.existsSync(path.join(root,a11Path))?JSON.parse(read(a11Path)):null;const searchA11Complete=Boolean(a11&&a11.status==='COMPLETE_STAGING_GOVERNANCE_RECONCILIATION'&&a11.closure&&a11.closure['SEARCH-B03']==='reconciled_removed_by_SEARCH-A11');
ok(search&&search.userFacingAuthority==='hybrid','SEARCH user-facing authority must remain hybrid');
ok(search&&search.productionGate==='blocked','SEARCH production gate must remain blocked');
if(searchA11Complete){
  ok(search.maturity===4,'SEARCH completed maturity must be staging-operational level 4');
  ok(search.serverAuthority==='canonical','SEARCH completed server authority must be canonical');
  ok(search.stagingEvidence==='staging_operational','SEARCH completed staging evidence must be operational');
  ok(search.securityGate==='partial','SEARCH completed security gate must remain partial');
  ok((search.blockers||[]).length===0,'SEARCH completed blocker set must be empty');
}else{
  ok(search&&search.maturity===3,'SEARCH maturity must remain 3 before A11');
  ok(search&&search.serverAuthority==='partial','SEARCH server authority must remain partial before A11');
  ok(search&&search.stagingEvidence==='staging_canary','SEARCH staging evidence must remain staging_canary before A11');
  ok(search&&search.securityGate==='blocked','SEARCH security gate must remain blocked before A11');
  ok((search&&search.blockers||[]).map((item)=>item.id).join(',')==='SEARCH-B03','SEARCH-B03 must remain the only blocker before A11');
}
ok(evidence.safety.stagingChanged===false&&evidence.safety.productionChanged===false,'baseline cannot mutate environments');
if(errors.length){console.error('[SEARCH-A06] ranking signal baseline audit failed');errors.forEach((error)=>console.error(`- ${error}`));process.exit(1);}console.log('[SEARCH-A06] ranking signal baseline: PASS');

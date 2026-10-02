'use strict';
const fs=require('fs');const path=require('path');const c=JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','ana-a01-analytics-authority-baseline.json'),'utf8'));
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});
['registrationFact','serviceBehaviorMetrics','quoteFunnel','orderFacts','searchObservability','paymentFacts','rehireRetention'].forEach((k)=>check('authority inventory '+k,Boolean(c.currentAuthority[k])));
check('search not funnel authority',c.currentAuthority.searchObservability.behavioralFunnelEligible===false);check('payment non production',c.currentAuthority.paymentFacts.trust==='contract_only_non_production');check('no identity stitch authority',c.authority.identityStitchingAuthority===false);check('no financial metric authority',c.authority.financialMetricAuthority===false);check('no production authority',c.authority.productionAuthority===false);
const ids=new Set(c.findings.map((f)=>f.id));for(let i=1;i<=12;i++)check('finding F'+String(i).padStart(2,'0'),ids.has('ANA-A01-F'+String(i).padStart(2,'0')));
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));if(failed.length)process.exitCode=1;

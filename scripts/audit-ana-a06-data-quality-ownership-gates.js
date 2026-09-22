'use strict';

const fs=require('fs');
const path=require('path');
const gate=require('../backend/modules/analytics/data-quality-gate');
const root=path.resolve(__dirname,'..');
const c=JSON.parse(fs.readFileSync(path.join(root,'config','ana-a06-data-quality-ownership-gates.json'),'utf8'));
const a05=JSON.parse(fs.readFileSync(path.join(root,'config','ana-a05-reconciliation-data-quality.json'),'utf8'));
const matrix=JSON.parse(fs.readFileSync(path.join(root,'config','domain-completion-matrix.json'),'utf8'));
const sql=fs.readFileSync(path.join(root,'supabase','migrations','20260919002100_ana_a05_reconciliation_dimension_hardening.sql'),'utf8');
const checks=[];
const check=(name,value)=>checks.push({name,passed:Boolean(value)});

check('contract id',gate.CONTRACT_ID===c.contractId);
check('repository only',c.scope==='repository_only');
check('maturity unchanged',c.maturity?.before===3&&c.maturity?.after===3);
check('two current runtime metrics',c.requiredRuntimeMetrics?.length===2);
for(const key of c.requiredRuntimeMetrics||[]){
  check('A05 declares '+key,a05.dataQualityMetrics.includes(key));
  check('A05 SQL emits '+key,sql.includes("'"+key+"'"));
}
check('eight pending metrics',c.pendingRuntimeMetrics?.length===8);
check('pending set matches A05 remainder',
  JSON.stringify([...c.pendingRuntimeMetrics].sort())===
  JSON.stringify(a05.dataQualityMetrics.filter((x)=>!c.requiredRuntimeMetrics.includes(x)).sort())
);
for(const p of c.policies||[]){
  check('owner ANA '+p.metricKey,p.ownerDomain==='ANA-001');
  check('source ORD '+p.metricKey,p.sourceDomain==='ORD-001');
  check('minimum sample '+p.metricKey,Number.isInteger(p.minimumSampleCount)&&p.minimumSampleCount>=1);
  check('zero pass threshold '+p.metricKey,p.passMax===0);
  check('zero block threshold '+p.metricKey,p.blockAbove===0);
  check('no-data hold '+p.metricKey,p.noDataState==='hold');
  check('missing hold '+p.metricKey,p.missingState==='hold');
}
check('no runtime read authority',c.authority?.runtimeReadAuthority===false);
check('no alert authority',c.authority?.alertDeliveryAuthority===false);
check('future read authorization exact',c.stagingEvidence?.requiredReadOnlyAuthorization==='authorize-ana-a06-staging-readonly-gate');
check('generic continuation rejected',c.stagingEvidence?.genericContinuationAccepted===false);
Object.entries(c.prohibitedEffects||{}).forEach(([k,v])=>check('effect '+k,v===false));

const ana=(matrix.domains||[]).find((d)=>d.id==='ANA-001');
check('ANA stays 3/6',ana?.maturity===3);
check('A06 config in matrix',ana?.requiredPaths?.includes('config/ana-a06-data-quality-ownership-gates.json'));
check('A06 module in matrix',ana?.requiredPaths?.includes('backend/modules/analytics/data-quality-gate.js'));
check('A06 audit registered',ana?.tests?.includes('audit:ana-a06-data-quality-ownership-gates'));
check('A06 test registered',ana?.tests?.includes('test:ana-a06-data-quality-ownership-gates'));

const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));
if(failed.length)process.exitCode=1;

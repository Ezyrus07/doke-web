'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const contract=JSON.parse(fs.readFileSync(path.join(root,'config','ana-a01-analytics-authority-baseline.json'),'utf8'));
const matrix=JSON.parse(fs.readFileSync(path.join(root,'config','domain-completion-matrix.json'),'utf8'));
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const includes=(n,l,v)=>check(n,Array.isArray(l)&&l.includes(v));
function contains(file,snips){const c=fs.readFileSync(path.join(root,file),'utf8');snips.forEach((s)=>check(file+' contains '+s,c.includes(s)));}
check('contract id',contract.contractId==='ana-a01-analytics-authority-baseline-v1');check('domain',contract.domain==='ANA-001');check('scope',contract.scope==='repository_only');check('status',contract.status==='baseline_complete_runtime_blocked');
check('runtime disabled',contract.runtimeIntegrated===false);check('migration not applied',contract.migrationApplied===false);check('staging not validated',contract.stagingValidated===false);check('12 findings',contract.findings.length===12);check('25 invariants',contract.mandatoryInvariants.length===25);
Object.entries(contract.authority).forEach(([k,v])=>check('authority '+k,['contractAuthority','baselineAuthority'].includes(k)?v===true:v===false));
Object.entries(contract.prohibitedEffects).forEach(([k,v])=>check('effect '+k,v===false));
['ANA-B01','ANA-B02','ANA-B03','LEGAL-B03','PAY-B01','PAY-B03','PAY-B04'].forEach((b)=>includes('blocker '+b,contract.preservedBlockers,b));
const ana=matrix.domains.find((d)=>d.id==='ANA-001');check('ANA still maturity 2',ana&&ana.maturity===2);check('ANA production blocked',ana&&ana.productionGate==='blocked');
contains('supabase/migrations/053_order_transaction_events.sql',['private.order_domain_events','private.order_metric_events','order.requested','order.completed']);
contains('supabase/migrations/039_quote_template_conversion_metrics.sql',['quote_template_funnel_events','submitted']);
contains('supabase/migrations/030_service_catalog_sync_metrics.sql',['service_metric_events']);
contains('supabase/migrations/163_service_search_observability_schema_v2.sql',['actor_class','ranking_version']);
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);console.log(JSON.stringify({contractId:contract.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed,effects:contract.prohibitedEffects},null,2));if(failed.length)process.exitCode=1;

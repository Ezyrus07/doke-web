'use strict';
const fs=require('fs');const path=require('path');const a=require('../backend/modules/analytics/analytics-reconciliation');
const root=path.resolve(__dirname,'..');const c=JSON.parse(fs.readFileSync(path.join(root,'config','ana-a05-reconciliation-data-quality.json'),'utf8'));const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});
check('contract id',a.CONTRACT_ID===c.contractId);check('8 divergence codes',c.divergenceCodes.length===8);check('event key divergence code',c.divergenceCodes.includes('EVENT_KEY_MISMATCH'));check('quality metrics',c.dataQualityMetrics.length>=10);
const pay=fs.readFileSync(path.join(root,'backend/modules/payments/payment-reconciliation-contract.js'),'utf8');check('PAY fingerprint precedent',pay.includes('comparisonFingerprint')&&pay.includes('snapshotHash'));
const rel=fs.readFileSync(path.join(root,'supabase/migrations/087_order_operational_error_budget_schema.sql'),'utf8');check('REL threshold precedent',rel.includes('minimum_samples_1h')&&rel.includes('target_percent'));
const matrix=JSON.parse(fs.readFileSync(path.join(root,'config','domain-completion-matrix.json'),'utf8'));check('maturity scale 2',matrix.maturityScale['2']==='local_functional');check('maturity scale 3',matrix.maturityScale['3']==='staging_canary_or_hybrid');check('maturity scale 4',matrix.maturityScale['4']==='staging_operational');
Object.entries(c.prohibitedEffects).forEach(([k,v])=>check('effect '+k,v===false));
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));if(failed.length)process.exitCode=1;

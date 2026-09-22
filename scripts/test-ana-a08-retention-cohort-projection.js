'use strict';
const r=require('../backend/modules/analytics/retention-cohort-projection');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});const eq=(n,a,b)=>check(n,a===b);
const events=[
 {orderId:'o1',clientId:'c1',eventType:'order.completed',occurredAt:'2026-01-01T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}},
 {orderId:'o2',clientId:'c1',eventType:'order.requested',occurredAt:'2026-01-10T00:00:00Z',dimensions:{serviceCategory:'dev',serviceState:'SP'}},
 {orderId:'o2',clientId:'c1',eventType:'order.completed',occurredAt:'2026-01-20T00:00:00Z',dimensions:{serviceCategory:'dev',serviceState:'SP'}},
 {orderId:'o3',clientId:'c2',eventType:'order.completed',occurredAt:'2026-01-01T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}},
 {orderId:'o3',clientId:'c2',eventType:'order.requested',occurredAt:'2026-01-05T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}},
 {orderId:'o4',clientId:'c3',eventType:'order.completed',occurredAt:'2026-03-20T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}},
 {orderId:'o5',clientId:'c4',eventType:'order.completed',occurredAt:'2026-01-01T00:00:00Z',dimensions:{}},
 {orderId:'o6',clientId:'',eventType:'order.completed',occurredAt:'2026-01-01T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}},
 {orderId:'future',clientId:'c2',eventType:'order.requested',occurredAt:'2026-05-01T00:00:00Z',dimensions:{serviceCategory:'design',serviceState:'BA'}}
];
const through='2026-04-05T00:00:00Z';
const req=r.projectRetentionMetric(events,{metricKey:'retention.repeat_request_30d',dataThrough:through,segment:{serviceCategory:'design',serviceState:'BA'}});
eq('request numerator',req.numerator,1);eq('request denominator',req.denominator,2);eq('request value',req.value,0.5);check('cross category repeat counts',req.crossSegmentRepeatCounts===true);check('same order request ignored',req.numerator===1);check('rehire not inferred',req.rehireInferred===false);
const comp=r.projectRetentionMetric(events,{metricKey:'retention.repeat_completion_90d',dataThrough:through,segment:{serviceCategory:'design',serviceState:'BA'}});
eq('completion numerator',comp.numerator,1);eq('completion denominator',comp.denominator,2);eq('completion value',comp.value,0.5);
const immature=r.projectRetentionMetric(events,{metricKey:'retention.repeat_completion_90d',dataThrough:'2026-02-15T00:00:00Z',segment:{serviceCategory:'design',serviceState:'BA'}});eq('90d immature denominator',immature.denominator,0);eq('zero denominator null',immature.value,null);
const global=r.projectRetentionMetric(events,{metricKey:'retention.repeat_request_30d',dataThrough:through});eq('missing dimensions partial',global.coverageState,'partial');check('missing client counted',global.excluded.missingClientId===1);
const set=r.projectRetentionSet(events,{dataThrough:through,segment:{serviceState:'BA'}});eq('set size',set.length,2);
let bad=false;try{r.projectRetentionMetric(events,{metricKey:'retention.bad',dataThrough:through});}catch(e){bad=e.message==='ANA_RETENTION_METRIC_INVALID';}check('unknown metric rejected',bad);
const failed=checks.filter((x)=>!x.passed).map((x)=>x.name);
console.log(JSON.stringify({contractId:r.CONTRACT_ID,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;

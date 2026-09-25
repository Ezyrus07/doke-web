'use strict';
const s=require('../backend/modules/analytics/immutable-funnel-segmentation');
const checks=[];const check=(n,v)=>checks.push({name:n,passed:Boolean(v)});
const service='00000000-0000-4000-8000-000000000111';
const coverage='2026-09-23T00:06:30.6835Z';
const rows=[
  {serviceId:service,sequenceNo:1,occurredAt:'2026-09-23T00:06:30.6835Z',eligibleAfter:true,dimensionSnapshotAfter:{category:'Limpeza',state:'ba'}},
  {serviceId:service,sequenceNo:2,occurredAt:'2026-09-23T00:10:00Z',eligibleAfter:true,dimensionSnapshotAfter:{categoryId:'17263173-c179-455f-bd43-2c3d9a55a8fd',categorySlug:'limpeza',category:'Limpeza',state:'BA'}},
  {serviceId:service,sequenceNo:3,occurredAt:'2026-09-23T00:10:00Z',eligibleAfter:true,dimensionSnapshotAfter:{categoryId:'27263173-c179-455f-bd43-2c3d9a55a8fd',categorySlug:'reparos',category:'Reparos',state:'sp'}},
  {serviceId:service,sequenceNo:4,occurredAt:'2026-09-23T00:20:00Z',eligibleAfter:false,dimensionSnapshotAfter:null}
];
let r=s.resolveFrozenSegment(rows,{serviceId,occurredAt:'2026-09-23T00:07:00Z',coverageCompleteFrom:coverage});
check('legacy category resolves',r.state==='resolved'&&r.categoryIdentityType==='category'&&r.categoryIdentity==='limpeza'&&r.serviceState==='BA');
r=s.resolveFrozenSegment(rows,{serviceId,occurredAt:'2026-09-23T00:10:00Z',coverageCompleteFrom:coverage});
check('same timestamp uses latest sequence',r.state==='resolved'&&r.sequenceNo===3&&r.categoryIdentityType==='categoryId'&&r.categoryIdentity==='27263173-c179-455f-bd43-2c3d9a55a8fd'&&r.serviceState==='SP');
r=s.resolveFrozenSegment(rows,{serviceId,occurredAt:'2026-09-23T00:21:00Z',coverageCompleteFrom:coverage});
check('ineligible interval unavailable',r.state==='unavailable'&&r.reason==='listing_not_eligible');
r=s.resolveFrozenSegment(rows,{serviceId,occurredAt:'2026-09-23T00:00:00Z',coverageCompleteFrom:coverage});
check('pre coverage unavailable',r.state==='unavailable'&&r.reason==='before_coverage_epoch');
const precedence=s.normalizeCategory({categoryId:'17263173-C179-455F-BD43-2C3D9A55A8FD',categorySlug:'limpeza',category:'Limpeza'});
check('categoryId precedence',precedence.categoryIdentityType==='categoryId'&&precedence.categoryIdentity==='17263173-c179-455f-bd43-2c3d9a55a8fd');
const legacy=s.normalizeCategory({category:'LiMpeza'});
check('legacy token lowercase only',legacy.categoryIdentityType==='category'&&legacy.categoryIdentity==='limpeza');
check('uuid and legacy never equal',s.sameCategoryIdentity(precedence,legacy)===false);
const incomplete=[{serviceId:service,sequenceNo:1,occurredAt:coverage,eligibleAfter:true,dimensionSnapshotAfter:{category:'Limpeza',state:''}}];
r=s.resolveFrozenSegment(incomplete,{serviceId,occurredAt:'2026-09-23T00:07:00Z',coverageCompleteFrom:coverage});
check('incomplete frozen dimensions unavailable',r.state==='unavailable'&&r.reason==='frozen_dimensions_incomplete');
let bad=false;try{s.resolveFrozenSegment([
 {serviceId:service,sequenceNo:1,occurredAt:'2026-09-23T00:08:00Z',eligibleAfter:true,dimensionSnapshotAfter:{category:'A',state:'BA'}},
 {serviceId:service,sequenceNo:2,occurredAt:'2026-09-23T00:07:00Z',eligibleAfter:true,dimensionSnapshotAfter:{category:'B',state:'BA'}}
],{serviceId,occurredAt:'2026-09-23T00:09:00Z',coverageCompleteFrom:coverage});}catch(e){bad=e.message==='ANA_A09_SEGMENT_LEDGER_TIME_ORDER_INVALID';}
check('nonmonotonic ledger fails closed',bad);
bad=false;try{s.validateServiceLedger([
 {serviceId:service,sequenceNo:1,occurredAt:'2026-09-23T00:07:00Z',eligibleAfter:true,dimensionSnapshotAfter:{category:'A',state:'BA'}},
 {serviceId:service,sequenceNo:3,occurredAt:'2026-09-23T00:08:00Z',eligibleAfter:true,dimensionSnapshotAfter:{category:'B',state:'BA'}}
],service);}catch(e){bad=e.message==='ANA_A09_SEGMENT_LEDGER_SEQUENCE_INVALID';}
check('sequence gap fails closed',bad);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:s.CONTRACT_ID,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedCases:failed},null,2));
if(failed.length)process.exitCode=1;

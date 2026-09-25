'use strict';

const CONTRACT_ID='ana-a09-immutable-funnel-segmentation-v1';
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toTime(value,code){
  const ms=Date.parse(value);
  if(!Number.isFinite(ms)) throw new Error(code);
  return ms;
}

function normalizeCategory(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)) return null;
  const categoryId=String(snapshot.categoryId||'').trim();
  if(categoryId){
    return {categoryIdentityType:'categoryId',categoryIdentity:categoryId.toLowerCase()};
  }
  const categorySlug=String(snapshot.categorySlug||'').trim();
  if(categorySlug){
    return {categoryIdentityType:'categorySlug',categoryIdentity:categorySlug.toLowerCase()};
  }
  const category=String(snapshot.category||'').trim();
  if(category){
    return {categoryIdentityType:'category',categoryIdentity:category.toLowerCase()};
  }
  return null;
}

function normalizeState(snapshot){
  if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot)) return null;
  const state=String(snapshot.state||'').trim().toUpperCase();
  return state||null;
}

function validateServiceLedger(rows,serviceId){
  const filtered=(rows||[]).filter(r=>String(r.serviceId??r.service_id)===String(serviceId));
  filtered.sort((a,b)=>Number(a.sequenceNo??a.sequence_no)-Number(b.sequenceNo??b.sequence_no));
  let prevSeq=0;
  let prevTime=-Infinity;
  for(const row of filtered){
    const seq=Number(row.sequenceNo??row.sequence_no);
    if(!Number.isInteger(seq)||seq<=prevSeq) throw new Error('ANA_A09_SEGMENT_LEDGER_SEQUENCE_INVALID');
    const t=toTime(row.occurredAt??row.occurred_at,'ANA_A09_SEGMENT_LEDGER_TIME_INVALID');
    if(t<prevTime) throw new Error('ANA_A09_SEGMENT_LEDGER_TIME_ORDER_INVALID');
    prevSeq=seq;
    prevTime=t;
  }
  return filtered;
}

function resolveFrozenSegment(rows,{serviceId,occurredAt,coverageCompleteFrom}={}){
  if(!serviceId) throw new Error('ANA_A09_SEGMENT_SERVICE_ID_REQUIRED');
  const at=toTime(occurredAt,'ANA_A09_SEGMENT_OCCURRED_AT_INVALID');
  const coverage=toTime(coverageCompleteFrom,'ANA_A09_SEGMENT_COVERAGE_INVALID');
  if(at<coverage) return {state:'unavailable',reason:'before_coverage_epoch'};

  const ledger=validateServiceLedger(rows,serviceId);
  let selected=null;
  for(const row of ledger){
    const t=toTime(row.occurredAt??row.occurred_at,'ANA_A09_SEGMENT_LEDGER_TIME_INVALID');
    if(t<=at) selected=row;
    else break;
  }
  if(!selected) return {state:'unavailable',reason:'no_cat_interval'};
  const eligible=Boolean(selected.eligibleAfter??selected.eligible_after);
  if(!eligible) return {state:'unavailable',reason:'listing_not_eligible'};

  const snapshot=selected.dimensionSnapshotAfter??selected.dimension_snapshot_after;
  const category=normalizeCategory(snapshot);
  const state=normalizeState(snapshot);
  if(!category||!state) return {state:'unavailable',reason:'frozen_dimensions_incomplete'};

  return {
    state:'resolved',
    categoryIdentityType:category.categoryIdentityType,
    categoryIdentity:category.categoryIdentity,
    serviceState:state,
    serviceId:String(serviceId),
    sequenceNo:Number(selected.sequenceNo??selected.sequence_no),
    anchorOccurredAt:new Date(at).toISOString()
  };
}

function sameCategoryIdentity(a,b){
  if(!a||!b) return false;
  return a.categoryIdentityType===b.categoryIdentityType&&a.categoryIdentity===b.categoryIdentity;
}

module.exports={
  CONTRACT_ID,
  UUID_RE,
  normalizeCategory,
  normalizeState,
  validateServiceLedger,
  resolveFrozenSegment,
  sameCategoryIdentity
};

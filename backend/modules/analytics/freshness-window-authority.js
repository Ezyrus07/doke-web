'use strict';

const CONTRACT_ID='ana-a07-freshness-window-authority-v1';
const FRESHNESS_STATES=Object.freeze(['fresh','stale','unavailable']);
const PROJECTION_STATE_BY_FRESHNESS=Object.freeze({fresh:'authoritative',stale:'stale',unavailable:'unavailable'});

function req(value,code){const v=String(value||'').trim();if(!v)throw new Error(code);return v;}
function time(value,code){const n=Date.parse(value||'');if(!Number.isFinite(n))throw new Error(code);return n;}
function isoMs(ms){return new Date(ms).toISOString();}
function revision(value){const n=Number(value==null?1:value);if(!Number.isInteger(n)||n<1)throw new Error('ANA_FRESHNESS_REVISION_INVALID');return n;}
function maxLag(policy){
  if(!policy||policy.maxLagSeconds==null)return null;
  const n=Number(policy.maxLagSeconds);
  if(!Number.isInteger(n)||n<1)throw new Error('ANA_FRESHNESS_POLICY_MAX_LAG_INVALID');
  return n;
}
function unavailable(reason,extra){return Object.freeze({freshnessState:'unavailable',projectionState:'unavailable',reason,...(extra||{})});}
function stale(reason,extra){return Object.freeze({freshnessState:'stale',projectionState:'stale',reason,...(extra||{})});}
function fresh(extra){return Object.freeze({freshnessState:'fresh',projectionState:'authoritative',reason:'WITHIN_POLICY',...(extra||{})});}

function normalizeWindow(row){
  if(!row||typeof row!=='object'||Array.isArray(row))throw new Error('ANA_FRESHNESS_WINDOW_INVALID');
  const windowStart=time(row.windowStart||row.window_start,'ANA_FRESHNESS_WINDOW_START_INVALID');
  const windowEnd=time(row.windowEnd||row.window_end,'ANA_FRESHNESS_WINDOW_END_INVALID');
  const computedAt=time(row.computedAt||row.computed_at,'ANA_FRESHNESS_COMPUTED_AT_INVALID');
  if(windowEnd<=windowStart)throw new Error('ANA_FRESHNESS_WINDOW_INVALID');
  return Object.freeze({
    ...row,
    metricKey:req(row.metricKey||row.metric_key,'ANA_FRESHNESS_METRIC_REQUIRED'),
    metricVersion:req(row.metricVersion||row.metric_version,'ANA_FRESHNESS_METRIC_VERSION_REQUIRED'),
    windowStart:isoMs(windowStart),
    windowEnd:isoMs(windowEnd),
    computedAt:isoMs(computedAt),
    revision:revision(row.revision)
  });
}

function selectCanonicalWindow(candidates,now){
  if(!Array.isArray(candidates))throw new Error('ANA_FRESHNESS_CANDIDATES_INVALID');
  const evaluatedAt=time(now,'ANA_FRESHNESS_NOW_INVALID');
  const rows=candidates.map(normalizeWindow);
  if(rows.length===0)return Object.freeze({selected:null,freshnessState:'unavailable',projectionState:'unavailable',reason:'NO_CANDIDATE_WINDOW'});
  const series=new Set(rows.map((r)=>r.metricKey+'\u0000'+r.metricVersion+'\u0000'+JSON.stringify(r.dimensions||{})));
  if(series.size!==1)throw new Error('ANA_FRESHNESS_SERIES_MIXED');
  const closed=rows.filter((r)=>time(r.windowEnd,'ANA_FRESHNESS_WINDOW_END_INVALID')<=evaluatedAt);
  if(closed.length===0)return Object.freeze({selected:null,freshnessState:'unavailable',projectionState:'unavailable',reason:'NO_CLOSED_WINDOW'});
  closed.sort((a,b)=>{
    const e=time(b.windowEnd,'x')-time(a.windowEnd,'x');if(e)return e;
    const r=b.revision-a.revision;if(r)return r;
    const c=time(b.computedAt,'x')-time(a.computedAt,'x');if(c)return c;
    return String(b.id||'').localeCompare(String(a.id||''));
  });
  if(closed.length>1){
    const a=closed[0],b=closed[1];
    if(a.windowEnd===b.windowEnd&&a.revision===b.revision&&a.computedAt===b.computedAt&&String(a.id||'')!==String(b.id||'')){
      throw new Error('ANA_FRESHNESS_WINDOW_SELECTION_AMBIGUOUS');
    }
  }
  return Object.freeze({selected:closed[0],freshnessState:null,projectionState:null,reason:'LATEST_CLOSED_WINDOW_SELECTED'});
}

function dependencyWatermark(dependencies,windowEnd,now){
  if(!Array.isArray(dependencies)||dependencies.length===0)return unavailable('DEPENDENCY_WATERMARK_MISSING',{dataThrough:null});
  const evaluatedAt=time(now,'ANA_FRESHNESS_NOW_INVALID');
  const end=time(windowEnd,'ANA_FRESHNESS_WINDOW_END_INVALID');
  let minimum=end;
  let sawStale=false;
  const normalized=[];
  for(const dep of dependencies){
    if(!dep||typeof dep!=='object'||Array.isArray(dep))return unavailable('DEPENDENCY_WATERMARK_MISSING',{dataThrough:null});
    const sourceDomain=req(dep.sourceDomain||dep.source_domain,'ANA_FRESHNESS_DEPENDENCY_DOMAIN_REQUIRED');
    const state=String(dep.freshnessState||dep.freshness_state||'fresh').trim().toLowerCase();
    if(!FRESHNESS_STATES.includes(state))throw new Error('ANA_FRESHNESS_DEPENDENCY_STATE_INVALID');
    if(state==='unavailable'||dep.dataThrough==null||dep.data_through==null&&dep.dataThrough==null){
      return unavailable('DEPENDENCY_UNAVAILABLE',{dataThrough:null,sourceDomain});
    }
    const dt=time(dep.dataThrough||dep.data_through,'ANA_FRESHNESS_DEPENDENCY_DATATHROUGH_INVALID');
    if(dt>evaluatedAt)throw new Error('ANA_FRESHNESS_DEPENDENCY_FUTURE_WATERMARK');
    minimum=Math.min(minimum,dt);
    if(state==='stale')sawStale=true;
    normalized.push(Object.freeze({sourceDomain,freshnessState:state,dataThrough:isoMs(dt)}));
  }
  return Object.freeze({
    freshnessState:sawStale?'stale':'fresh',
    projectionState:sawStale?'stale':'authoritative',
    reason:sawStale?'DEPENDENCY_STALE':'DEPENDENCIES_AVAILABLE',
    dataThrough:isoMs(minimum),
    dependencies:Object.freeze(normalized)
  });
}

function evaluateFreshness(snapshot,policy,dependencies,now){
  const s=normalizeWindow(snapshot);
  const evaluatedAt=time(now,'ANA_FRESHNESS_NOW_INVALID');
  const start=time(s.windowStart,'x'),end=time(s.windowEnd,'x');
  if(end>evaluatedAt)return unavailable('WINDOW_NOT_CLOSED',{selectedWindow:s});
  const threshold=maxLag(policy);
  if(threshold==null)return unavailable('POLICY_THRESHOLD_MISSING',{selectedWindow:s,dataThrough:null});
  if(String(s.projectionState||s.projection_state||'').toLowerCase()==='unavailable')return unavailable('SNAPSHOT_UNAVAILABLE',{selectedWindow:s,dataThrough:null});

  const deps=dependencyWatermark(dependencies,s.windowEnd,now);
  if(deps.freshnessState==='unavailable')return unavailable(deps.reason,{selectedWindow:s,dataThrough:null});
  const declared=time(s.dataThrough||s.data_through,'ANA_FRESHNESS_DATATHROUGH_INVALID');
  if(declared>evaluatedAt)throw new Error('ANA_FRESHNESS_FUTURE_DATATHROUGH');
  if(declared>end)throw new Error('ANA_FRESHNESS_DATATHROUGH_AFTER_WINDOW');
  const dependencyThrough=time(deps.dataThrough,'ANA_FRESHNESS_DEPENDENCY_DATATHROUGH_INVALID');
  if(declared>dependencyThrough)return unavailable('DATATHROUGH_EXCEEDS_DEPENDENCY_WATERMARK',{selectedWindow:s,dataThrough:isoMs(dependencyThrough)});
  const through=Math.min(declared,dependencyThrough,end);
  const lag=Math.max(0,Math.floor((evaluatedAt-through)/1000));
  const base={selectedWindow:s,dataThrough:isoMs(through),freshnessLagSeconds:lag,maxLagSeconds:threshold};

  if(through<=start)return unavailable('WINDOW_COVERAGE_UNAVAILABLE',base);
  if(through<end)return stale('WINDOW_PARTIALLY_COVERED',base);
  if(deps.freshnessState==='stale'||String(s.projectionState||s.projection_state||'').toLowerCase()==='stale')return stale('UPSTREAM_STALE',base);
  if(lag>threshold)return stale('MAX_LAG_EXCEEDED',base);
  return fresh(base);
}

function evaluateLatestWindow(candidates,policy,dependencies,now){
  const selection=selectCanonicalWindow(candidates,now);
  if(!selection.selected)return selection;
  return evaluateFreshness(selection.selected,policy,dependencies,now);
}

module.exports=Object.freeze({
  CONTRACT_ID,
  FRESHNESS_STATES,
  PROJECTION_STATE_BY_FRESHNESS,
  normalizeWindow,
  selectCanonicalWindow,
  dependencyWatermark,
  evaluateFreshness,
  evaluateLatestWindow
});

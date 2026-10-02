'use strict';
const crypto=require('node:crypto');
const CONTRACT_ID='ana-a11-liquidity-policy-approval-envelope-v1';
const SCHEMA_ID='ana-a11-liquidity-policy-approval-evidence-v1';
const DOMAIN='ANA-001';
const METRIC_KEY='liquidity.active_service_seconds';
const METRIC_VERSION='v1';
const DERIVATION_CONTRACT_ID='ana-a11-liquidity-freshness-policy-derivation-v1';
const SERIES_CONTRACT_ID='ana-a11-liquidity-series-orchestration-v1';
const SCHEDULER_MECHANISM='supabase_pg_cron_database_local';
const TOP_LEVEL_FIELDS=['schemaId','approvalId','approvalChannel','approvalActorRole','authorizationDigestSha256','approvedAt','environment','repositoryHead','matrixVersion','domain','metricKey','metricVersion','derivationContractId','seriesContractId','schedulerMechanism','lifecycle','policyIdentity','approvedParameters','boundaries','evidenceDigestSha256'];
const APPROVED_PARAMETER_FIELDS=['windowStepSeconds','projectionDelaySloSeconds','windowAnchor','maxCatchUpWindowsPerInvocation','derivedMaxLagSeconds','effectiveFrom','effectiveUntil'];
const BOUNDARY_FIELDS=['policyInsertAuthorized','activationInvocationLimit','schedulerActivationAuthorized','productionAuthorized','browserAnalyticsActivationAuthorized','anonymousIdentityStitchingAuthorized','pullRequestMergeAuthorized'];
const sha256=(v)=>crypto.createHash('sha256').update(String(v),'utf8').digest('hex');
function sortValue(v){if(Array.isArray(v))return v.map(sortValue);if(v&&typeof v==='object')return Object.keys(v).sort().reduce((o,k)=>(o[k]=sortValue(v[k]),o),{});return v;}
const stableStringify=(v)=>JSON.stringify(sortValue(v));
function fail(ok,code,msg){if(!ok){const e=new Error(msg||code);e.code=code;throw e;}}
function exactKeys(v,keys,code,label){fail(v&&typeof v==='object'&&!Array.isArray(v),code,label+' must be object');fail(JSON.stringify(Object.keys(v).sort())===JSON.stringify([...keys].sort()),code,label+' fields mismatch');}
function utc(v,code,label){fail(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(v),code,label+' must be UTC');const t=Date.parse(v);fail(Number.isFinite(t),code,label+' invalid');return t;}
function hash(v,code,label){fail(typeof v==='string'&&/^[0-9a-f]{64}$/.test(v),code,label+' must be sha256');}
function buildPolicyId(r){fail(Number.isInteger(r)&&r>0,'ANA_A11_APPROVAL_POLICY_ID_INVALID');return 'ana-a11-liquidity-v1-r'+r;}
function buildApprovalId(r,d){hash(d,'ANA_A11_APPROVAL_AUTHORIZATION_DIGEST_INVALID','authorizationDigestSha256');return 'ana-a11-liquidity-approval-r'+r+'-'+d.slice(0,12);}
function deriveMaxLag(s,d){fail(Number.isInteger(s)&&s>0&&Number.isInteger(d)&&d>=0,'ANA_A11_APPROVAL_VALUES_INVALID');const v=s+d;fail(Number.isSafeInteger(v)&&v>=1&&v<=2147483647,'ANA_A11_APPROVAL_VALUES_INVALID');return v;}
function evidenceDigest(e){const b={...e};delete b.evidenceDigestSha256;return sha256(stableStringify(b));}
function validateCompletedApprovalEvidence(e){
 exactKeys(e,TOP_LEVEL_FIELDS,'ANA_A11_APPROVAL_SCHEMA_INVALID','evidence');
 fail(e.schemaId===SCHEMA_ID&&e.approvalChannel==='chat_explicit_authorization'&&e.approvalActorRole==='project_owner','ANA_A11_APPROVAL_SCHEMA_INVALID');
 hash(e.authorizationDigestSha256,'ANA_A11_APPROVAL_AUTHORIZATION_DIGEST_INVALID','authorizationDigestSha256');
 const approved=utc(e.approvedAt,'ANA_A11_APPROVAL_TIME_INVALID','approvedAt');
 fail(e.environment==='staging','ANA_A11_APPROVAL_SCOPE_INVALID');
 fail(typeof e.repositoryHead==='string'&&/^[0-9a-f]{40}$/.test(e.repositoryHead),'ANA_A11_APPROVAL_BINDING_INVALID');
 fail(typeof e.matrixVersion==='string'&&/^\d+\.\d+\.\d+$/.test(e.matrixVersion),'ANA_A11_APPROVAL_BINDING_INVALID');
 fail(e.domain===DOMAIN&&e.metricKey===METRIC_KEY&&e.metricVersion===METRIC_VERSION,'ANA_A11_APPROVAL_SCOPE_INVALID');
 fail(e.derivationContractId===DERIVATION_CONTRACT_ID&&e.seriesContractId===SERIES_CONTRACT_ID&&e.schedulerMechanism===SCHEDULER_MECHANISM,'ANA_A11_APPROVAL_SCOPE_INVALID');
 exactKeys(e.lifecycle,['mode'],'ANA_A11_APPROVAL_LIFECYCLE_INVALID','lifecycle');fail(e.lifecycle.mode==='initial','ANA_A11_APPROVAL_LIFECYCLE_INVALID');
 exactKeys(e.policyIdentity,['revision','policyId'],'ANA_A11_APPROVAL_POLICY_ID_INVALID','policyIdentity');fail(e.policyIdentity.revision===1,'ANA_A11_APPROVAL_POLICY_ID_INVALID');fail(e.policyIdentity.policyId===buildPolicyId(1)&&e.approvalId===buildApprovalId(1,e.authorizationDigestSha256),'ANA_A11_APPROVAL_POLICY_ID_INVALID');
 exactKeys(e.approvedParameters,APPROVED_PARAMETER_FIELDS,'ANA_A11_APPROVAL_VALUES_INVALID','approvedParameters');
 const p=e.approvedParameters;fail(p.derivedMaxLagSeconds===deriveMaxLag(p.windowStepSeconds,p.projectionDelaySloSeconds),'ANA_A11_APPROVAL_DERIVATION_MISMATCH');
 fail(Number.isInteger(p.maxCatchUpWindowsPerInvocation)&&p.maxCatchUpWindowsPerInvocation>0,'ANA_A11_APPROVAL_VALUES_INVALID');
 const anchor=utc(p.windowAnchor,'ANA_A11_APPROVAL_TIME_INVALID','windowAnchor');const from=utc(p.effectiveFrom,'ANA_A11_APPROVAL_TIME_INVALID','effectiveFrom');
 fail(anchor<=from,'ANA_A11_APPROVAL_GRID_INVALID');fail(from>=approved,'ANA_A11_APPROVAL_EFFECTIVE_WINDOW_INVALID');fail((from-anchor)%(p.windowStepSeconds*1000)===0,'ANA_A11_APPROVAL_GRID_INVALID');fail(p.effectiveUntil===null,'ANA_A11_APPROVAL_EFFECTIVE_WINDOW_INVALID');
 exactKeys(e.boundaries,BOUNDARY_FIELDS,'ANA_A11_APPROVAL_BOUNDARY_INVALID','boundaries');
 fail(e.boundaries.policyInsertAuthorized===true&&e.boundaries.activationInvocationLimit===1,'ANA_A11_APPROVAL_BOUNDARY_INVALID');
 fail(e.boundaries.schedulerActivationAuthorized===false&&e.boundaries.productionAuthorized===false&&e.boundaries.browserAnalyticsActivationAuthorized===false&&e.boundaries.anonymousIdentityStitchingAuthorized===false&&e.boundaries.pullRequestMergeAuthorized===false,'ANA_A11_APPROVAL_BOUNDARY_INVALID');
 hash(e.evidenceDigestSha256,'ANA_A11_APPROVAL_EVIDENCE_DIGEST_INVALID','evidenceDigestSha256');fail(e.evidenceDigestSha256===evidenceDigest(e),'ANA_A11_APPROVAL_EVIDENCE_DIGEST_INVALID');return e;
}
function buildCompletedApprovalEvidence(i){
 const d=deriveMaxLag(i.windowStepSeconds,i.projectionDelaySloSeconds),r=i.revision;
 const e={schemaId:SCHEMA_ID,approvalId:buildApprovalId(r,i.authorizationDigestSha256),approvalChannel:'chat_explicit_authorization',approvalActorRole:'project_owner',authorizationDigestSha256:i.authorizationDigestSha256,approvedAt:i.approvedAt,environment:'staging',repositoryHead:i.repositoryHead,matrixVersion:i.matrixVersion,domain:DOMAIN,metricKey:METRIC_KEY,metricVersion:METRIC_VERSION,derivationContractId:DERIVATION_CONTRACT_ID,seriesContractId:SERIES_CONTRACT_ID,schedulerMechanism:SCHEDULER_MECHANISM,lifecycle:{mode:'initial'},policyIdentity:{revision:r,policyId:buildPolicyId(r)},approvedParameters:{windowStepSeconds:i.windowStepSeconds,projectionDelaySloSeconds:i.projectionDelaySloSeconds,windowAnchor:i.windowAnchor,maxCatchUpWindowsPerInvocation:i.maxCatchUpWindowsPerInvocation,derivedMaxLagSeconds:d,effectiveFrom:i.effectiveFrom,effectiveUntil:i.effectiveUntil},boundaries:{policyInsertAuthorized:true,activationInvocationLimit:1,schedulerActivationAuthorized:false,productionAuthorized:false,browserAnalyticsActivationAuthorized:false,anonymousIdentityStitchingAuthorized:false,pullRequestMergeAuthorized:false},evidenceDigestSha256:null};
 e.evidenceDigestSha256=evidenceDigest(e);return validateCompletedApprovalEvidence(e);
}
module.exports={CONTRACT_ID,SCHEMA_ID,TOP_LEVEL_FIELDS,APPROVED_PARAMETER_FIELDS,BOUNDARY_FIELDS,sha256,stableStringify,buildPolicyId,buildApprovalId,deriveMaxLag,evidenceDigest,buildCompletedApprovalEvidence,validateCompletedApprovalEvidence};

'use strict';
const crypto=require('node:crypto');

const CONTRACT_ID='ana-a07-a09-funnel-freshness-policy-activation-envelope-v1';
const SCHEMA_ID='ana-a07-a09-funnel-freshness-policy-activation-approval-evidence-v1';
const DOMAIN='ANA-001';
const POLICY_SET_ID='ana-a07-a09-funnel-v1-r1';
const METRIC_VERSION='v1';
const TOP_LEVEL_FIELDS=['schemaId','approvalId','approvalChannel','approvalActorRole','authorizationDigestSha256','approvedAt','environment','repositoryHead','matrixVersion','domain','policySetId','revision','metricVersion','metricCount','approvedParameters','policies','boundaries','evidenceDigestSha256'];
const APPROVED_PARAMETER_FIELDS=['windowReferenceSeconds','projectionDelayBudgetSeconds','maxLagSeconds','effectiveFrom','effectiveUntil'];
const POLICY_FIELDS=['policyId','metricKey','metricVersion','sourceDomains','maxLagSeconds','effectiveFrom','effectiveUntil'];
const BOUNDARY_FIELDS=['envelopeRepositoryWriteAuthorized','policyActivationInvocationAuthorized','policyPersistenceAuthorized','snapshotPublicationAuthorized','runtimeProjectionAuthorityAuthorized','runtimeSnapshotAuthorityAuthorized','cronOrSchedulerAuthorized','productionAuthorized','pullRequestMergeAuthorized','readyForReviewAuthorized'];
const EXPECTED_POLICIES=[{"policyId":"ana-a07-a09-funnel-search-ctr-v1-r1","metricKey":"funnel.search_ctr","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-impression-click-v1-r1","metricKey":"funnel.impression_to_click","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-click-detail-v1-r1","metricKey":"funnel.click_to_detail","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-detail-budget-v1-r1","metricKey":"funnel.detail_to_budget_cta","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-budget-quote-start-v1-r1","metricKey":"funnel.budget_cta_to_quote_started","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-quote-start-complete-v1-r1","metricKey":"funnel.quote_started_to_completed","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-quote-complete-submit-v1-r1","metricKey":"funnel.quote_completed_to_submitted","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360},{"policyId":"ana-a07-a09-funnel-submit-order-v1-r1","metricKey":"funnel.quote_submitted_to_order_requested","metricVersion":"v1","sourceDomains":["ANA-001","ORD-001"],"maxLagSeconds":360}];

const sha256=(value)=>crypto.createHash('sha256').update(String(value),'utf8').digest('hex');
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object')return Object.keys(value).sort().reduce((out,key)=>(out[key]=sortValue(value[key]),out),{});return value;}
const stableStringify=(value)=>JSON.stringify(sortValue(value));
function fail(ok,code,message){if(!ok){const error=new Error(message||code);error.code=code;throw error;}}
function exactKeys(value,keys,code,label){fail(value&&typeof value==='object'&&!Array.isArray(value),code,label+' must be object');fail(JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),code,label+' fields mismatch');}
function utc(value,code,label){fail(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value),code,label+' must be UTC');const time=Date.parse(value);fail(Number.isFinite(time),code,label+' invalid');return time;}
function hash(value,code,label){fail(typeof value==='string'&&/^[0-9a-f]{64}$/.test(value),code,label+' must be sha256');}
function buildApprovalId(digest){hash(digest,'ANA_A07_A09_FUNNEL_ENVELOPE_AUTHORIZATION_DIGEST_INVALID','authorizationDigestSha256');return 'ana-a07-a09-funnel-approval-r1-'+digest.slice(0,12);}
function evidenceDigest(evidence){const body={...evidence};delete body.evidenceDigestSha256;return sha256(stableStringify(body));}

function validateCompletedApprovalEvidence(evidence){
  exactKeys(evidence,TOP_LEVEL_FIELDS,'ANA_A07_A09_FUNNEL_ENVELOPE_SCHEMA_INVALID','evidence');
  fail(evidence.schemaId===SCHEMA_ID&&evidence.approvalChannel==='chat_explicit_authorization'&&evidence.approvalActorRole==='project_owner','ANA_A07_A09_FUNNEL_ENVELOPE_SCHEMA_INVALID');
  hash(evidence.authorizationDigestSha256,'ANA_A07_A09_FUNNEL_ENVELOPE_AUTHORIZATION_DIGEST_INVALID','authorizationDigestSha256');
  const approvedAt=utc(evidence.approvedAt,'ANA_A07_A09_FUNNEL_ENVELOPE_TIME_INVALID','approvedAt');
  fail(evidence.environment==='staging'&&evidence.domain===DOMAIN,'ANA_A07_A09_FUNNEL_ENVELOPE_SCOPE_INVALID');
  fail(typeof evidence.repositoryHead==='string'&&/^[0-9a-f]{40}$/.test(evidence.repositoryHead),'ANA_A07_A09_FUNNEL_ENVELOPE_BINDING_INVALID');
  fail(typeof evidence.matrixVersion==='string'&&/^\d+\.\d+\.\d+$/.test(evidence.matrixVersion),'ANA_A07_A09_FUNNEL_ENVELOPE_BINDING_INVALID');
  fail(evidence.policySetId===POLICY_SET_ID&&evidence.revision===1&&evidence.metricVersion===METRIC_VERSION&&evidence.metricCount===8,'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_SET_INVALID');
  fail(evidence.approvalId===buildApprovalId(evidence.authorizationDigestSha256),'ANA_A07_A09_FUNNEL_ENVELOPE_APPROVAL_ID_INVALID');

  exactKeys(evidence.approvedParameters,APPROVED_PARAMETER_FIELDS,'ANA_A07_A09_FUNNEL_ENVELOPE_VALUES_INVALID','approvedParameters');
  const params=evidence.approvedParameters;
  fail(params.windowReferenceSeconds===300&&params.projectionDelayBudgetSeconds===60&&params.maxLagSeconds===360,'ANA_A07_A09_FUNNEL_ENVELOPE_VALUES_INVALID');
  fail(params.maxLagSeconds===params.windowReferenceSeconds+params.projectionDelayBudgetSeconds,'ANA_A07_A09_FUNNEL_ENVELOPE_DERIVATION_MISMATCH');
  const effectiveFrom=utc(params.effectiveFrom,'ANA_A07_A09_FUNNEL_ENVELOPE_TIME_INVALID','effectiveFrom');
  fail(effectiveFrom>=approvedAt&&params.effectiveUntil===null,'ANA_A07_A09_FUNNEL_ENVELOPE_EFFECTIVE_WINDOW_INVALID');

  fail(Array.isArray(evidence.policies)&&evidence.policies.length===8,'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_CARDINALITY_INVALID');
  evidence.policies.forEach((policy,index)=>{
    exactKeys(policy,POLICY_FIELDS,'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_INVALID','policy');
    const expected=EXPECTED_POLICIES[index];
    fail(policy.policyId===expected.policyId&&policy.metricKey===expected.metricKey&&policy.metricVersion===expected.metricVersion,'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_INVALID');
    fail(JSON.stringify(policy.sourceDomains)===JSON.stringify(expected.sourceDomains),'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_INVALID');
    fail(policy.maxLagSeconds===360&&policy.effectiveFrom===params.effectiveFrom&&policy.effectiveUntil===null,'ANA_A07_A09_FUNNEL_ENVELOPE_POLICY_INVALID');
  });

  exactKeys(evidence.boundaries,BOUNDARY_FIELDS,'ANA_A07_A09_FUNNEL_ENVELOPE_BOUNDARY_INVALID','boundaries');
  fail(evidence.boundaries.envelopeRepositoryWriteAuthorized===true,'ANA_A07_A09_FUNNEL_ENVELOPE_BOUNDARY_INVALID');
  ['policyActivationInvocationAuthorized','policyPersistenceAuthorized','snapshotPublicationAuthorized','runtimeProjectionAuthorityAuthorized','runtimeSnapshotAuthorityAuthorized','cronOrSchedulerAuthorized','productionAuthorized','pullRequestMergeAuthorized','readyForReviewAuthorized']
    .forEach((key)=>fail(evidence.boundaries[key]===false,'ANA_A07_A09_FUNNEL_ENVELOPE_BOUNDARY_INVALID'));

  hash(evidence.evidenceDigestSha256,'ANA_A07_A09_FUNNEL_ENVELOPE_EVIDENCE_DIGEST_INVALID','evidenceDigestSha256');
  fail(evidence.evidenceDigestSha256===evidenceDigest(evidence),'ANA_A07_A09_FUNNEL_ENVELOPE_EVIDENCE_DIGEST_INVALID');
  return evidence;
}

function buildCompletedApprovalEvidence(input){
  const policies=EXPECTED_POLICIES.map((policy)=>({...policy,effectiveFrom:input.effectiveFrom,effectiveUntil:null}));
  const evidence={
    schemaId:SCHEMA_ID,
    approvalId:buildApprovalId(input.authorizationDigestSha256),
    approvalChannel:'chat_explicit_authorization',
    approvalActorRole:'project_owner',
    authorizationDigestSha256:input.authorizationDigestSha256,
    approvedAt:input.approvedAt,
    environment:'staging',
    repositoryHead:input.repositoryHead,
    matrixVersion:input.matrixVersion,
    domain:DOMAIN,
    policySetId:POLICY_SET_ID,
    revision:1,
    metricVersion:METRIC_VERSION,
    metricCount:8,
    approvedParameters:{windowReferenceSeconds:300,projectionDelayBudgetSeconds:60,maxLagSeconds:360,effectiveFrom:input.effectiveFrom,effectiveUntil:null},
    policies,
    boundaries:{envelopeRepositoryWriteAuthorized:true,policyActivationInvocationAuthorized:false,policyPersistenceAuthorized:false,snapshotPublicationAuthorized:false,runtimeProjectionAuthorityAuthorized:false,runtimeSnapshotAuthorityAuthorized:false,cronOrSchedulerAuthorized:false,productionAuthorized:false,pullRequestMergeAuthorized:false,readyForReviewAuthorized:false},
    evidenceDigestSha256:null
  };
  evidence.evidenceDigestSha256=evidenceDigest(evidence);
  return validateCompletedApprovalEvidence(evidence);
}

module.exports={CONTRACT_ID,SCHEMA_ID,DOMAIN,POLICY_SET_ID,METRIC_VERSION,TOP_LEVEL_FIELDS,APPROVED_PARAMETER_FIELDS,POLICY_FIELDS,BOUNDARY_FIELDS,EXPECTED_POLICIES,sha256,stableStringify,buildApprovalId,evidenceDigest,buildCompletedApprovalEvidence,validateCompletedApprovalEvidence};

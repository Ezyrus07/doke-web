'use strict';
const crypto=require('node:crypto');
const SCHEMA_ID='ana-a07-a09-funnel-freshness-policy-activation-invocation-evidence-v1';
const CONTRACT_ID='ana-a07-a09-funnel-freshness-policy-activation-invocation-v1';
const POLICY_SET_ID='ana-a07-a09-funnel-v1-r1';
const DOMAIN='ANA-001';
const TOP_LEVEL_FIELDS=['schemaId','activationApprovalId','approvalChannel','approvalActorRole','authorizationDigestSha256','approvedAt','environment','repositoryHead','matrixVersion','domain','activationContractId','policySetId','approvalEnvelopeEvidenceDigestSha256','runtimeEnforcementEvidenceBlobSha','effectiveFrom','effectiveUntil','boundaries','evidenceDigestSha256'];
const BOUNDARY_FIELDS=['policyInsertAuthorized','activationInvocationLimit','snapshotPublicationAuthorized','runtimeProjectionAuthorityAuthorized','runtimeSnapshotAuthorityAuthorized','cronOrSchedulerAuthorized','productionAuthorized','pullRequestMergeAuthorized','readyForReviewAuthorized'];
const APPROVAL_ENVELOPE_DIGEST='9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5';
const RUNTIME_EVIDENCE_BLOB_SHA='118ca5f948f93ca09c7a7305d1b230880fa98630';
const EFFECTIVE_FROM='2026-09-24T14:00:00Z';
const sha256=(value)=>crypto.createHash('sha256').update(String(value),'utf8').digest('hex');
function sortValue(value){if(Array.isArray(value))return value.map(sortValue);if(value&&typeof value==='object')return Object.keys(value).sort().reduce((out,key)=>(out[key]=sortValue(value[key]),out),{});return value;}
const stableStringify=(value)=>JSON.stringify(sortValue(value));
function fail(ok,code,message){if(!ok){const error=new Error(message||code);error.code=code;throw error;}}
function exactKeys(value,keys,code,label){fail(value&&typeof value==='object'&&!Array.isArray(value),code,label+' must be object');fail(JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort()),code,label+' fields mismatch');}
function hash(value,code,label){fail(typeof value==='string'&&/^[0-9a-f]{64}$/.test(value),code,label+' must be sha256');}
function utc(value,code,label){fail(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z$/.test(value),code,label+' must be UTC');fail(Number.isFinite(Date.parse(value)),code,label+' invalid');}
function approvalId(digest){hash(digest,'ANA_A07_A09_ACTIVATION_APPROVAL_AUTH_DIGEST_INVALID','authorizationDigestSha256');return 'ana-a07-a09-funnel-activation-approval-r1-'+digest.slice(0,12);}
function evidenceDigest(evidence){const body={...evidence};delete body.evidenceDigestSha256;return sha256(stableStringify(body));}
function validateCompletedActivationApprovalEvidence(evidence,rawAuthorization){
  exactKeys(evidence,TOP_LEVEL_FIELDS,'ANA_A07_A09_ACTIVATION_APPROVAL_SCHEMA_INVALID','evidence');
  fail(evidence.schemaId===SCHEMA_ID&&evidence.approvalChannel==='chat_explicit_authorization'&&evidence.approvalActorRole==='project_owner','ANA_A07_A09_ACTIVATION_APPROVAL_SCHEMA_INVALID');
  hash(evidence.authorizationDigestSha256,'ANA_A07_A09_ACTIVATION_APPROVAL_AUTH_DIGEST_INVALID','authorizationDigestSha256');
  fail(evidence.authorizationDigestSha256===sha256(rawAuthorization),'ANA_A07_A09_ACTIVATION_APPROVAL_AUTH_DIGEST_MISMATCH');
  fail(evidence.activationApprovalId===approvalId(evidence.authorizationDigestSha256),'ANA_A07_A09_ACTIVATION_APPROVAL_ID_INVALID');
  utc(evidence.approvedAt,'ANA_A07_A09_ACTIVATION_APPROVAL_TIME_INVALID','approvedAt');
  utc(evidence.effectiveFrom,'ANA_A07_A09_ACTIVATION_APPROVAL_TIME_INVALID','effectiveFrom');
  fail(evidence.environment==='staging'&&evidence.domain===DOMAIN,'ANA_A07_A09_ACTIVATION_APPROVAL_SCOPE_INVALID');
  fail(evidence.activationContractId===CONTRACT_ID&&evidence.policySetId===POLICY_SET_ID,'ANA_A07_A09_ACTIVATION_APPROVAL_SCOPE_INVALID');
  fail(typeof evidence.repositoryHead==='string'&&/^[0-9a-f]{40}$/.test(evidence.repositoryHead),'ANA_A07_A09_ACTIVATION_APPROVAL_BINDING_INVALID');
  fail(typeof evidence.matrixVersion==='string'&&/^\d+\.\d+\.\d+$/.test(evidence.matrixVersion),'ANA_A07_A09_ACTIVATION_APPROVAL_BINDING_INVALID');
  fail(evidence.approvalEnvelopeEvidenceDigestSha256===APPROVAL_ENVELOPE_DIGEST,'ANA_A07_A09_ACTIVATION_APPROVAL_ENVELOPE_BINDING_INVALID');
  fail(evidence.runtimeEnforcementEvidenceBlobSha===RUNTIME_EVIDENCE_BLOB_SHA,'ANA_A07_A09_ACTIVATION_APPROVAL_RUNTIME_BINDING_INVALID');
  fail(evidence.effectiveFrom===EFFECTIVE_FROM&&evidence.effectiveUntil===null,'ANA_A07_A09_ACTIVATION_APPROVAL_WINDOW_INVALID');
  exactKeys(evidence.boundaries,BOUNDARY_FIELDS,'ANA_A07_A09_ACTIVATION_APPROVAL_BOUNDARY_INVALID','boundaries');
  fail(evidence.boundaries.policyInsertAuthorized===true&&evidence.boundaries.activationInvocationLimit===1,'ANA_A07_A09_ACTIVATION_APPROVAL_BOUNDARY_INVALID');
  ['snapshotPublicationAuthorized','runtimeProjectionAuthorityAuthorized','runtimeSnapshotAuthorityAuthorized','cronOrSchedulerAuthorized','productionAuthorized','pullRequestMergeAuthorized','readyForReviewAuthorized'].forEach((key)=>fail(evidence.boundaries[key]===false,'ANA_A07_A09_ACTIVATION_APPROVAL_BOUNDARY_INVALID'));
  hash(evidence.evidenceDigestSha256,'ANA_A07_A09_ACTIVATION_APPROVAL_EVIDENCE_DIGEST_INVALID','evidenceDigestSha256');
  fail(evidence.evidenceDigestSha256===evidenceDigest(evidence),'ANA_A07_A09_ACTIVATION_APPROVAL_EVIDENCE_DIGEST_INVALID');
  return evidence;
}
module.exports={SCHEMA_ID,CONTRACT_ID,POLICY_SET_ID,DOMAIN,TOP_LEVEL_FIELDS,BOUNDARY_FIELDS,APPROVAL_ENVELOPE_DIGEST,RUNTIME_EVIDENCE_BLOB_SHA,EFFECTIVE_FROM,sha256,stableStringify,approvalId,evidenceDigest,validateCompletedActivationApprovalEvidence};

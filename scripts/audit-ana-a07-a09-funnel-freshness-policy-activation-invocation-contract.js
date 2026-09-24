#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const c=json('config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
const envelope=json('config/ana-a07-a09-funnel-freshness-policy-activation-envelope.json');
const candidate=json('config/ana-a07-a09-funnel-freshness-policy-candidate.json');
const runtimeEvidence=json('reports/generated/ana-a07-a09-funnel-freshness-policy-runtime-enforcement-staging-evidence.json');
const matrix=json('config/domain-completion-matrix.json');
const pkg=json('package.json');
const workflow=read('.github/workflows/ana-a07-a09-funnel-freshness-policy-activation-envelope.yml');
const doc=read('docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-INVOCATION-CONTRACT.md');

assert.equal(c.contractId,'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1');
assert.equal(c.scope,'repository_only_authorization_contract');
assert.equal(c.status,'pending_explicit_activation_approval_repository_authorization');
assert.equal(c.createdAgainst.repositoryHead,'0a8d9cbcb49c68b250cec2b76180c50a02515202');
assert.equal(c.createdAgainst.matrixVersion,'1.3.132');
assert.equal(c.createdAgainst.runtimeEnforcementEvidenceBlobSha,'118ca5f948f93ca09c7a7305d1b230880fa98630');
assert.equal(c.createdAgainst.stagingRuntimeEnforcementMigrationVersion,'20260924141356');
assert.equal(c.createdAgainst.validation044,'PASS');

assert.equal(c.fixedBindings.policySetId,envelope.policySet.policySetId);
assert.equal(c.fixedBindings.metricCount,envelope.policySet.metricCount);
assert.equal(c.fixedBindings.maxLagSeconds,envelope.policySet.maxLagSeconds);
assert.equal(c.fixedBindings.effectiveFrom,envelope.policySet.approvedEffectiveFrom);
assert.equal(c.fixedBindings.effectiveUntil,envelope.policySet.approvedEffectiveUntil);
assert.equal(c.fixedBindings.approvalEnvelopeEvidenceDigestSha256,envelope.approvalEvidence.evidenceDigestSha256);
assert.equal(c.fixedBindings.runtimeEnforcementEvidenceBlobSha,c.createdAgainst.runtimeEnforcementEvidenceBlobSha);
assert.equal(runtimeEvidence.validation,'044 PASS');
assert.equal(runtimeEvidence.policyState.freshnessPolicyRowsPersisted,0);
assert.equal(envelope.authority.runtimeEnvelopeEnforcementAuthority,true);
assert.equal(envelope.authority.activationInvocationAuthority,false);
assert.equal(envelope.authority.policyPersistenceAuthority,false);

assert.equal(c.activationApprovalAuthorization.genericProceedIsAuthorization,false);
assert.equal(c.activationApprovalAuthorization.valuesMayBeInferred,false);
assert.equal(c.activationApprovalAuthorization.authorizationHeadMustMatchCurrentPrHead,true);
assert(c.activationApprovalAuthorization.template.includes('head=<CURRENT_PR_HEAD>'));
assert(c.activationApprovalAuthorization.template.includes('approvalEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5'));
assert(c.activationApprovalAuthorization.template.includes('runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630'));

assert(c.successorRequirements.canonicalFunctionName.length<=63);
assert.equal(c.successorRequirements.canonicalFunctionName,'private.activate_a09_funnel_policy_approved_v1');
assert.equal(c.successorRequirements.exactPolicyInsertCardinality,8);
assert.equal(c.successorRequirements.createdInThisLot,false);
assert.equal(c.successorRequirements.snapshotWriteAllowed,false);
assert.equal(c.successorRequirements.cronCreationAllowed,false);
assert.equal(c.successorRequirements.legacyTombstoneMustRemain,true);

assert.equal(c.authority.repositoryContractAuthority,true);
Object.entries(c.authority).filter(([key])=>key!=='repositoryContractAuthority')
  .forEach(([key,value])=>assert.equal(value,false,'authority false: '+key));
Object.entries(c.prohibitedEffects).forEach(([key,value])=>assert.equal(value,false,'effect false: '+key));
assert.equal(c.pendingTemplate.policyInsertAuthorized,false);
assert.equal(c.pendingTemplate.activationInvocationLimit,0);

assert.equal(candidate.activationInvocationContract.contractPath,'config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
assert.equal(candidate.activationInvocationContract.status,'pending_explicit_activation_approval_repository_authorization');
assert.equal(envelope.activationInvocationContract.contractPath,'config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json');
assert.equal(envelope.activationInvocationContract.status,'pending_explicit_activation_approval_repository_authorization');

const ana=matrix.domains.find((domain)=>domain.id==='ANA-001');
assert(ana);
assert(ana.nextActions.some((action)=>action.includes('Obtain explicit ANA-A07/A09 repository-only activation-approval authorization')));
assert.equal(pkg.scripts['audit:ana-a07-a09-funnel-freshness-policy-activation-invocation-contract'],'node scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.js');
assert.equal(pkg.scripts['test:ana-a07-a09-funnel-freshness-policy-activation-invocation-contract'],'node scripts/test-ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.js');
[
  'config/ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.json','docs/ANA-A07-A09-FUNNEL-FRESHNESS-POLICY-ACTIVATION-INVOCATION-CONTRACT.md','scripts/audit-ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.js','scripts/test-ana-a07-a09-funnel-freshness-policy-activation-invocation-contract.js',
  'npm run audit:ana-a07-a09-funnel-freshness-policy-activation-invocation-contract',
  'npm run test:ana-a07-a09-funnel-freshness-policy-activation-invocation-contract'
].forEach((fragment)=>assert(workflow.includes(fragment),'workflow missing '+fragment));
[
  'Generic `prossiga` is not authorization',
  'No successor is created in this lot',
  'It does **not** authorize applying that migration to staging',
  'freshnessPolicyRowsPersisted=0'
].forEach((fragment)=>assert(doc.includes(fragment),'docs missing '+fragment));

console.log('ANA-A07/A09 activation-invocation authorization contract audit passed.');

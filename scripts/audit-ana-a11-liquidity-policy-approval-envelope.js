#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const json=(p)=>JSON.parse(read(p));

const c=json('config/ana-a11-liquidity-policy-approval-envelope.json');
const d=json('config/ana-a11-liquidity-freshness-policy-derivation.json');
const pkg=json('package.json');
const wf=read('.github/workflows/ana-a11-liquidity-freshness-policy-derivation.yml');
const doc=read('docs/ANA-A11-LIQUIDITY-FRESHNESS-POLICY-DERIVATION.md');
const historicalMig=read('supabase/migrations/20260923025000_ana_a11_liquidity_policy_activation.sql');
const enforcementMig=read('supabase/migrations/20260923030000_ana_a11_liquidity_policy_approval_runtime_enforcement.sql');
const enforcementValidation=read('supabase/tests/039_ana_a11_liquidity_policy_approval_runtime_enforcement_validation.sql');
const lib=require('./lib/ana-a11-liquidity-policy-approval-envelope');

assert.equal(c.contractId,'ana-a11-liquidity-policy-approval-envelope-v1');
assert.equal(c.createdAgainst.repositoryHead,'3c544b7aa395a6f637127473ce3f605b6970a24d');
assert.equal(c.createdAgainst.matrixVersion,'1.3.132');
assert.equal(c.createdAgainst.authorization,'authorize-ana-a11-policy-approval-envelope-repository-only head=3c544b7aa395a6f637127473ce3f605b6970a24d matrix=v1.3.132');
assert.equal(c.status,'runtime_enforcement_staging_validated_values_unset_activation_unauthorized');
assert.equal(c.policyIdentity.initialRevisionRequired,1);
assert.equal(c.policyIdentity.policyIdDerivedNotHumanSelected,true);
assert.equal(c.effectiveWindowSemantics.initialEffectiveUntilMustBeNull,true);
assert.deepEqual(c.approvalEvidenceSchema.exactTopLevelFields,lib.TOP_LEVEL_FIELDS);
assert.deepEqual(c.approvalEvidenceSchema.exactApprovedParameterFields,lib.APPROVED_PARAMETER_FIELDS);
assert.deepEqual(c.approvalEvidenceSchema.exactBoundaryFields,lib.BOUNDARY_FIELDS);

Object.entries(c.pendingTemplate).forEach(([k,v])=>{
  if(!['activationInvocationLimit','policyInsertAuthorized','schedulerActivationAuthorized','productionAuthorized','browserAnalyticsActivationAuthorized','anonymousIdentityStitchingAuthorized','pullRequestMergeAuthorized'].includes(k)){
    assert.equal(v,null,'pending value must be null: '+k);
  }
});
assert.equal(c.pendingTemplate.activationInvocationLimit,0);
assert.equal(c.pendingTemplate.policyInsertAuthorized,false);

assert.equal(c.authority.repositoryContractAuthority,true);
assert.equal(c.authority.runtimeEnforcementCandidateAuthority,true);
Object.entries(c.authority)
  .filter(([k])=>!['repositoryContractAuthority','runtimeEnforcementCandidateAuthority','runtimeEnforcementAppliedAuthority'].includes(k))
  .forEach(([k,v])=>assert.equal(v,false,'authority false: '+k));
Object.entries(c.prohibitedEffects).forEach(([k,v])=>assert.equal(v,false,'effect false: '+k));

assert.equal(c.databaseBoundary.envelopeSchemaEnforcedByDatabase,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.status,'staging_applied_validated');
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.additiveMigration,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.editsHistoricalMigration,false);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.legacyActivationTombstonedWhenApplied,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.authorizationDigestVerifiedInDatabase,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.evidenceDigestVerifiedInDatabase,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.stagingApplied,true);
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.stagingMigrationVersion,'20260923135957');
assert.equal(c.databaseBoundary.runtimeEnforcementCandidate.validation039Passed,true);
assert.equal(c.databaseBoundary.runtimeEnforcementEvidence.rollbackOnlyCanary.rolledBack,true);
assert.equal(c.authority.runtimeEnforcementAppliedAuthority,true);

assert(historicalMig.includes("pg_catalog.jsonb_typeof(p_approval_evidence) <> 'object'"));
assert(!historicalMig.includes(c.approvalEvidenceSchemaId));

[
  'private.canonicalize_analytics_json_v1',
  'private.validate_analytics_cat_liquidity_policy_approval_envelope_v1',
  'private.activate_analytics_cat_liquidity_policy_approved_v1',
  'DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED',
  'DOKE_ANALYTICS_POLICY_APPROVAL_BINDING_MISMATCH',
  'DOKE_ANALYTICS_POLICY_APPROVAL_AUTHORIZATION_MISMATCH',
  'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH',
  'DOKE_ANALYTICS_POLICY_APPROVAL_DIGEST_MISMATCH',
  'extensions.digest',
  'authorizationDigestSha256',
  'evidenceDigestSha256',
  'analytics_metric_publication_policies_v1',
  'analytics_metric_freshness_policies_v1'
].forEach((fragment)=>assert(enforcementMig.includes(fragment),'runtime enforcement candidate missing: '+fragment));
assert(!enforcementMig.includes('pg_catalog.extract'));
assert(!enforcementMig.toLowerCase().includes('cron.schedule('));
assert(!enforcementMig.includes('run_analytics_cat_liquidity_catch_up_v1'));

[
  'DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED',
  'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID',
  'has_function_privilege',
  'rollback;'
].forEach((fragment)=>assert(enforcementValidation.includes(fragment),'039 validation missing: '+fragment));

assert.equal(d.authority.policyApprovalEnvelopeContractAuthority,true);
assert.equal(d.authority.policyApprovalEnvelopeRuntimeEnforcementCandidateAuthority,true);
assert.equal(d.authority.policyApprovalEnvelopeRuntimeEnforcementAuthority,true);
assert.equal(d.currentDecision.policyApprovalEnvelopeComplete,false);
assert.equal(d.currentDecision.policyInsertAuthorized,false);
assert.equal(d.policyApprovalEnvelopeContract.contractId,c.contractId);
assert.equal(d.policyApprovalEnvelopeContract.databaseRuntimeEnforcement,true);
assert.equal(d.policyApprovalEnvelopeContract.runtimeEnforcementCandidate.currentStagingApplied,true);
assert.equal(d.policyApprovalEnvelopeContract.runtimeEnforcementCandidate.stagingMigrationVersion,'20260923135957');

assert.equal(pkg.scripts['audit:ana-a11-liquidity-policy-approval-envelope'],'node scripts/audit-ana-a11-liquidity-policy-approval-envelope.js');
assert.equal(pkg.scripts['test:ana-a11-liquidity-policy-approval-envelope'],'node scripts/test-ana-a11-liquidity-policy-approval-envelope.js');

[
  'config/ana-a11-liquidity-policy-approval-envelope.json',
  'scripts/lib/ana-a11-liquidity-policy-approval-envelope.js',
  'scripts/audit-ana-a11-liquidity-policy-approval-envelope.js',
  'scripts/test-ana-a11-liquidity-policy-approval-envelope.js',
  'supabase/migrations/20260923030000_ana_a11_liquidity_policy_approval_runtime_enforcement.sql',
  'supabase/tests/039_ana_a11_liquidity_policy_approval_runtime_enforcement_validation.sql',
  'npm run audit:ana-a11-liquidity-policy-approval-envelope',
  'npm run test:ana-a11-liquidity-policy-approval-envelope'
].forEach(x=>assert(wf.includes(x),'workflow missing '+x));

assert(wf.includes('permissions:\n  contents: read'));
['contents: write','pull-requests: write','git push','psql ','supabase db','cron.schedule(']
  .forEach(x=>assert(!wf.includes(x),'workflow capability forbidden '+x));

[
  'approval evidence envelope',
  'generic `prossiga` is not approval',
  'repository candidate — approval-envelope runtime enforcement',
  'DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED',
  'staging closure — approval-envelope runtime enforcement'
].forEach(x=>assert(doc.toLowerCase().includes(x.toLowerCase()),'docs missing '+x));

console.log('ANA-A11 liquidity policy approval envelope audit passed.');

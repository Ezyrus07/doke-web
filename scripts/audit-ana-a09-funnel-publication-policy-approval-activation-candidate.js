'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');const json=(p)=>JSON.parse(read(p));
const c=json('config/ana-a09-funnel-publication-policy-approval-activation-candidate.json');
const orchestration=json('config/ana-a09-funnel-snapshot-publication-orchestration-candidate.json');
const staging=json('reports/generated/ana-a09-funnel-snapshot-publication-orchestration-staging-evidence.json');
const freshness=json('config/ana-a07-a09-funnel-freshness-policy-candidate.json');
const matrix=json('config/domain-completion-matrix.json');
const migration=read('supabase/migrations/20260929133000_ana_a09_funnel_publication_policy_approval_activation_candidate.sql');
const validation=read('supabase/tests/055_ana_a09_funnel_publication_policy_approval_activation_candidate_validation.sql');
const docs=read('docs/ANA-A09-FUNNEL-PUBLICATION-POLICY-APPROVAL-ACTIVATION-CANDIDATE.md');
const workflow=read('.github/workflows/ana-a09-canonical-funnel-projection.yml');
const handoff=json('reports/generated/ana-a09-funnel-publication-policy-approval-activation-candidate-handoff.json');
const checks=[];const check=(n,x)=>checks.push({name:n,passed:Boolean(x)});
const expected=[{"policyId":"ana-a07-a09-funnel-budget-quote-start-v1-r1","metricKey":"funnel.budget_cta_to_quote_started","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-click-detail-v1-r1","metricKey":"funnel.click_to_detail","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-detail-budget-v1-r1","metricKey":"funnel.detail_to_budget_cta","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-impression-click-v1-r1","metricKey":"funnel.impression_to_click","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-quote-complete-submit-v1-r1","metricKey":"funnel.quote_completed_to_submitted","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-quote-start-complete-v1-r1","metricKey":"funnel.quote_started_to_completed","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-submit-order-v1-r1","metricKey":"funnel.quote_submitted_to_order_requested","metricVersion":"v1"},{"policyId":"ana-a07-a09-funnel-search-ctr-v1-r1","metricKey":"funnel.search_ctr","metricVersion":"v1"}];

check('candidate identity',c.contractId==='ana-a09-funnel-publication-policy-approval-activation-candidate-v1'&&c.approvalEvidenceSchemaId==='ana-a09-funnel-publication-policy-activation-approval-evidence-v1'&&c.domain==='ANA-001');
check('authorization exact',c.sourceHead==='56f46d7cd943e523a98ec95744c37380c18cd48e'&&c.matrixVersion==='1.3.132'&&c.authorization?.digestSha256==='b7d38a1ec069d1d13f32cdb935477901e66ceee59ccda8ad513955f3a085f43d'&&c.authorization?.publicationPolicyPersistenceAuthority===false&&c.authorization?.stagingAuthority===false);
check('source blobs exact',c.sourceBindings?.orchestrationConfigBlobSha==='2c99eaac6c03c29fbefe5973ae70b9160ee053d6'&&c.sourceBindings?.stagingStructureEvidenceBlobSha==='0fa5595dd8b0c0ba925ff46fb7c3dbe0bc150595'&&c.sourceBindings?.funnelFreshnessConfigBlobSha==='8b9ef1b01de43852101a9021da2423c4269079ba'&&c.sourceBindings?.orchestrationMigrationBlobSha==='01a6d7208a9d4d288eb9995325707d0ccdc9a3a6'&&c.sourceBindings?.validation054BlobSha==='906629533492eec6be83441e51554d6eee4a3a97');
check('staging structure certified',staging.validation054?.status==='PASS'&&staging.postflight?.funnelPublicationPolicyCount===0&&staging.postflight?.funnelCronCount===0&&staging.postflight?.candidateFunctionCount===4);
check('freshness authority active',freshness.policySet?.metricCount===8&&freshness.policySet?.proposedMaxLagSeconds===360&&freshness.persistentActivation?.policyRowsPersisted===8);
check('fixed policy semantics',c.policySet?.metricCount===8&&c.policySet?.windowStepSeconds===300&&c.policySet?.projectionDelaySloSeconds===60&&c.policySet?.derivedMaxLagSeconds===360&&c.policySet?.maxCatchUpWindowsPerInvocation===3);
check('temporal values unselected',c.policySet?.windowAnchor===null&&c.policySet?.effectiveFrom===null&&c.policySet?.windowAnchorSelectedNow===false&&c.policySet?.effectiveFromSelectedNow===false);
check('policy identities exact',JSON.stringify(c.policySet?.policies)===JSON.stringify(expected)&&c.candidate?.reusesExistingFreshnessPolicyIds===true);
check('future approval required',c.approvalContract?.futureAuthorizationMustSpecifyWindowAnchor===true&&c.approvalContract?.futureAuthorizationMustSpecifyEffectiveFrom===true&&c.approvalContract?.activationInvocationLimit===1);

check('migration candidate functions',migration.includes('validate_analytics_a09_funnel_publication_policy_approval_v1')&&migration.includes('activate_analytics_a09_funnel_publication_policy_approved_v1'));
check('migration no static insert execution',!/^\s*insert\s+into\s+private\.analytics_metric_publication_policies_v1/im.test(migration.split('create or replace function')[0]||''));
check('migration inserts exact eight only inside activator',(migration.match(/ana-a07-a09-funnel-[a-z-]+-v1-r1/g)||[]).length>=16&&migration.includes('get diagnostics v_rows=row_count')&&migration.includes('if v_rows<>8'));
check('migration freshness authority check',migration.includes('DOKE_ANALYTICS_A09_PUBLICATION_FRESHNESS_AUTHORITY_REQUIRED')&&migration.includes('private.analytics_metric_freshness_policies_v1'));
check('migration replay reject',migration.includes('DOKE_ANALYTICS_A09_PUBLICATION_POLICY_OVERLAP'));
check('migration no snapshot or cron calls',!migration.includes('append_analytics_metric_snapshot_v1(')&&!migration.includes('cron.schedule('));
check('private grants closed',(migration.match(/revoke all privileges on function private\./g)||[]).length>=2);

check('validation rollback only',validation.trim().startsWith('-- ANA-A09 validation 055')&&validation.includes('\nbegin;')&&validation.trim().endsWith('rollback;'));
check('validation transient eight',validation.includes('VALIDATION_055_TRANSIENT_POLICY_CARDINALITY_INVALID')&&validation.includes('v_funnel_transient<>8'));
check('validation preserves a11 snapshots cron',validation.includes('VALIDATION_055_SIDE_EFFECT_BOUNDARY_INVALID')&&validation.includes('v_a11_after<>v_a11_before')&&validation.includes('v_snapshots_after<>v_snapshots_before')&&validation.includes('v_cron_after<>v_cron_before'));
check('validation exercises replay rejection',validation.includes('VALIDATION_055_REPLAY_NOT_REJECTED'));
check('docs authority closed',docs.includes('publicationPolicyPersistenceAuthority = `false`')&&docs.includes('ANA remains **3/6**'));
check('workflow wired',workflow.includes('supabase/migrations/20260929133000_ana_a09_funnel_publication_policy_approval_activation_candidate.sql')&&workflow.includes('supabase/tests/055_ana_a09_funnel_publication_policy_approval_activation_candidate_validation.sql')&&workflow.includes('scripts/audit-ana-a09-funnel-publication-policy-approval-activation-candidate.js')&&workflow.includes('scripts/test-ana-a09-funnel-publication-policy-approval-activation-candidate.js')&&workflow.includes('Publication policy approval candidate audit')&&workflow.includes('Publication policy approval candidate conformance'));
check('handoff bound',handoff.contractId===c.contractId&&handoff.sourceHead==='56f46d7cd943e523a98ec95744c37380c18cd48e'&&handoff.candidate?.migrationBlobSha===c.candidate?.migrationBlobSha&&handoff.candidate?.validationBlobSha===c.candidate?.validationBlobSha);
check('no authority promotion',c.authorization?.snapshotMutationAuthority===false&&c.authorization?.runtimeSnapshotAuthority===false&&c.authorization?.snapshotPublicationAuthority===false&&c.authorization?.schedulerAuthority===false&&c.prohibitedEffects?.maturityPromotion===false);
check('matrix maturity unchanged',(matrix.domains||[]).find(d=>d.id==='ANA-001')?.maturity===3);

const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));
if(failed.length)process.exitCode=1;

'use strict';
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');const json=(p)=>JSON.parse(read(p));
const c=json('config/ana-a09-funnel-snapshot-publication-orchestration-candidate.json');
const projection=json('config/ana-a09-canonical-funnel-projection.json');
const freshness=json('config/ana-a07-a09-funnel-freshness-policy-candidate.json');
const replay=json('reports/generated/ana-a09-canonical-funnel-snapshot-replay-canary-staging-evidence.json');
const append=json('config/ana-a09-canonical-funnel-snapshot-append-invocation-contract.json');
const matrix=json('config/domain-completion-matrix.json');
const migration=read('supabase/migrations/20260929121600_ana_a09_funnel_snapshot_publication_orchestration_candidate.sql');
const validation=read('supabase/tests/054_ana_a09_funnel_snapshot_publication_orchestration_candidate_validation.sql');
const docs=read('docs/ANA-A09-FUNNEL-SNAPSHOT-PUBLICATION-ORCHESTRATION-CANDIDATE.md');
const workflow=read('.github/workflows/ana-a09-canonical-funnel-projection.yml');
const handoff=json('reports/generated/ana-a09-funnel-snapshot-publication-orchestration-candidate-handoff.json');
const stagingEvidence=json('reports/generated/ana-a09-funnel-snapshot-publication-orchestration-staging-evidence.json');
const checks=[];const check=(n,x)=>checks.push({name:n,passed:Boolean(x)});

check('candidate identity',c.contractId==='ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'&&c.domain==='ANA-001'&&c.front==='ANA-A09');
check('authorized source head',c.sourceHead==='0deddb7a8924fdda72ff12e032f70c6944d64224'&&c.matrixVersion==='1.3.132'&&c.authorization?.digestSha256==='82dfb786bb14366984ad91860cf6ffb02ec49b5a4fc087077662ee8a20a77d04');
check('source blobs exact',
  c.sourceBindings?.a09ProjectionConfig?.blobSha==='2ea7cdd6d3864da26ba29813ef78c8cc85392f56'&&
  c.sourceBindings?.funnelFreshnessConfig?.blobSha==='8b9ef1b01de43852101a9021da2423c4269079ba'&&
  c.sourceBindings?.replayCanaryEvidence?.blobSha==='3dd8511d84e25d08115a3b8f04cb186452f7fb5e'&&
  c.sourceBindings?.appendInvocationConfig?.blobSha==='5bda6bfbd4199fc29e9342abced71e0d2e2b053c'&&
  c.sourceBindings?.a11PublicationPolicyBase?.blobSha==='a42e584513078e0c4127dd367ca56ad36615a07d'&&
  c.sourceBindings?.a11PlannerReference?.blobSha==='dd39a22a9e04b32f2e550bc5d7c5637f8f9ea6b8'&&
  c.sourceBindings?.a11ExecutorReference?.blobSha==='25d57899a058711210fde5b4945d3db2de751dcf'&&
  c.sourceBindings?.a11SchedulerReference?.blobSha==='3e18ce8809ba3abed374354720783c7f77bec4d0');
check('upstream projection authority',projection.authority?.runtimeProjectionAuthority===true&&projection.authority?.runtimeSnapshotAuthority===false&&projection.authority?.snapshotPublicationAuthority===false);
check('freshness policy active',freshness.policySet?.policySetId==='ana-a07-a09-funnel-v1-r1'&&freshness.policySet?.metricCount===8&&freshness.policySet?.proposedWindowStepSeconds===300&&freshness.policySet?.proposedProjectionDelayBudgetSeconds===60&&freshness.policySet?.proposedMaxLagSeconds===360);
check('replay certified',replay.execution?.status==='PASS'&&replay.execution?.processedCount===8&&replay.execution?.appendedCount===0&&replay.execution?.noChangeCount===8&&replay.execution?.committedSnapshotWrites===0);
check('append contract remains closed',append.authority?.runtimeProjectionAuthority===true&&append.authority?.runtimeSnapshotAuthority===false&&append.authority?.snapshotPublicationAuthority===false&&append.authority?.schedulerAuthority===false);
check('single publication authority',c.candidate?.createsSecondPublicationAuthority===false&&c.candidate?.publicationPolicyTable==='private.analytics_metric_publication_policies_v1'&&c.publicationAuthorityGeneralization?.existingTableReused===true);
check('a11 preserved by contract',c.candidate?.preservesA11===true&&c.candidate?.a11FunctionsReplaced===false&&c.candidate?.a11PolicyRowMutatedByCandidate===false);
check('bounded values exact',c.candidate?.metricCount===8&&c.candidate?.windowStepSeconds===300&&c.candidate?.projectionDelaySloSeconds===60&&c.candidate?.derivedMaxLagSeconds===360&&c.candidate?.maxCatchUpWindowsPerInvocation===3&&c.candidate?.maxSnapshotAppendAttemptsPerInvocation===24);
check('late facts stay a05',c.candidate?.automaticLateFactRevision===false&&c.candidate?.lateFactRevisionAuthority==='ANA-A05');

check('migration does not create second policy table',!migration.includes('create table')&&!migration.includes('CREATE TABLE'));
check('migration generalizes old constraints',migration.includes('drop constraint if exists analytics_metric_publication_derivation_contract_check')&&migration.includes('drop constraint if exists analytics_metric_publication_series_contract_check')&&migration.includes('analytics_metric_publication_contract_scope_check'));
check('migration preserves a11 scope',migration.includes("metric_key = 'liquidity.active_service_seconds'")&&migration.includes("derivation_contract_id = 'ana-a11-liquidity-freshness-policy-derivation-v1'")&&migration.includes("series_contract_id = 'ana-a11-liquidity-series-orchestration-v1'"));
check('migration has exact a09 contract',migration.includes("derivation_contract_id = 'ana-a07-a09-funnel-freshness-policy-candidate-v1'")&&migration.includes("series_contract_id = 'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'")&&["funnel.budget_cta_to_quote_started","funnel.click_to_detail","funnel.detail_to_budget_cta","funnel.impression_to_click","funnel.quote_completed_to_submitted","funnel.quote_started_to_completed","funnel.quote_submitted_to_order_requested","funnel.search_ctr"].every(k=>migration.includes("'"+k+"'")));
check('candidate functions present',[
  'current_analytics_a09_funnel_publication_policy_set_v1',
  'plan_analytics_a09_funnel_windows_v1',
  'run_analytics_a09_funnel_window_v1',
  'run_analytics_a09_funnel_catch_up_v1'
].every(n=>migration.includes(n)));
check('candidate no policy persistence',!/insert\s+into\s+private\.analytics_metric_publication_policies_v1/i.test(migration)&&!/update\s+private\.analytics_metric_publication_policies_v1/i.test(migration)&&!/delete\s+from\s+private\.analytics_metric_publication_policies_v1/i.test(migration));
check('candidate no cron activation',!migration.includes('cron.schedule(')&&!migration.includes('activate_analytics_a09_funnel_scheduler'));
check('private grants closed',(migration.match(/revoke all privileges on function private\./g)||[]).length>=4&&!/grant\s+execute\s+on\s+function\s+private\.current_analytics_a09_funnel/i.test(migration));
check('planner bounded and missing-only',migration.includes('where w.materialized_count<8')&&migration.includes('limit v_max_catch_up')&&migration.includes("'maxSnapshotAppendAttempts',24"));
check('validation rollback only',validation.trim().startsWith('-- ANA-A09 validation 054')&&validation.includes('\nbegin;')&&validation.trim().endsWith('rollback;'));
check('validation does not invoke mutation functions',!validation.includes(':=private.run_analytics_a09_funnel_window_v1')&&!validation.includes(':=private.run_analytics_a09_funnel_catch_up_v1'));
check('validation preserves a11',validation.includes("'ana-a11-liquidity-v1-r1'")&&validation.includes('VALIDATION_054_A11_PRESERVATION_FAILED'));
check('docs boundaries',docs.includes('creates **no scheduler activation function and no cron job**')&&docs.includes('ANA remains **3/6**')&&docs.includes('Staging structural evidence'));
check('workflow candidate wired',workflow.includes('supabase/migrations/20260929121600_ana_a09_funnel_snapshot_publication_orchestration_candidate.sql')&&workflow.includes('supabase/tests/054_ana_a09_funnel_snapshot_publication_orchestration_candidate_validation.sql')&&workflow.includes('scripts/audit-ana-a09-funnel-snapshot-publication-orchestration-candidate.js')&&workflow.includes('scripts/test-ana-a09-funnel-snapshot-publication-orchestration-candidate.js')&&workflow.includes('Publication orchestration candidate audit')&&workflow.includes('Publication orchestration candidate conformance'));
check('handoff bound',handoff.contractId===c.contractId&&handoff.sourceHead==='0deddb7a8924fdda72ff12e032f70c6944d64224'&&handoff.candidate?.migrationBlobSha===c.candidate?.migrationBlobSha&&handoff.candidate?.validationBlobSha===c.candidate?.validationBlobSha);
check('no authority promotion',c.authorization?.stagingAuthority===false&&c.authorization?.runtimeSnapshotAuthority===false&&c.authorization?.snapshotPublicationAuthority===false&&c.authorization?.schedulerAuthority===false&&c.prohibitedEffects?.maturityPromotion===false);
check('matrix maturity unchanged',(matrix.domains||[]).find(d=>d.id==='ANA-001')?.maturity===3);


check('staging evidence identity',stagingEvidence.evidenceId==='ana-a09-funnel-snapshot-publication-orchestration-staging-evidence-v1'&&stagingEvidence.contractId===c.contractId&&stagingEvidence.authorizedRepositoryHead==='dc52c24d4bf71b8e29529538189e7c682d47ce83'&&stagingEvidence.matrixVersion==='1.3.132');
check('staging migration exact',stagingEvidence.migration?.repositoryVersion==='20260929121600'&&stagingEvidence.migration?.appliedStagingVersion==='20260929125652'&&stagingEvidence.migration?.status==='APPLIED'&&stagingEvidence.sourceBindings?.migrationBlobSha==='01a6d7208a9d4d288eb9995325707d0ccdc9a3a6');
check('validation 054 staging pass',stagingEvidence.validation054?.status==='PASS'&&stagingEvidence.validation054?.rollbackOnly===true&&stagingEvidence.validation054?.mutationCapableA09FunctionInvoked===false&&stagingEvidence.sourceBindings?.validationBlobSha==='906629533492eec6be83441e51554d6eee4a3a97');
check('a11 preserved in staging',stagingEvidence.postflight?.a11PublicationPolicyCount===1&&stagingEvidence.postflight?.a11SchedulerCount===1&&stagingEvidence.invariants?.preserveA11===true);
check('a09 remains inactive after structural staging',stagingEvidence.postflight?.funnelPublicationPolicyCount===0&&stagingEvidence.postflight?.funnelCronCount===0&&stagingEvidence.postflight?.a09GlobalSnapshotCount===8&&stagingEvidence.postflight?.snapshotWriteCount===0);
check('candidate functions closed in staging',stagingEvidence.postflight?.candidateFunctionCount===4&&stagingEvidence.postflight?.candidateFunctionsOwner==='postgres'&&stagingEvidence.postflight?.anonExecute===false&&stagingEvidence.postflight?.authenticatedExecute===false&&stagingEvidence.postflight?.serviceRoleExecute===false);
check('staging evidence bound to config',c.stagingStructureEvidence?.evidencePath==='reports/generated/ana-a09-funnel-snapshot-publication-orchestration-staging-evidence.json'&&c.stagingStructureEvidence?.evidenceBlobSha==='0fa5595dd8b0c0ba925ff46fb7c3dbe0bc150595'&&c.stagingStructureEvidence?.validationStatus==='PASS'&&c.stagingStructureEvidence?.snapshotWriteCount===0);
check('reconciliation authority consumed',stagingEvidence.reconciliation?.authorizationDigestSha256==='1005173681776fcf6b9af072281c9e02e283884cdf5ad77db296c21e0702d7fd'&&stagingEvidence.reconciliation?.repositoryWriteAuthority===true&&stagingEvidence.reconciliation?.stagingAuthority===false&&stagingEvidence.reconciliation?.productionAuthority===false);
const failed=checks.filter(x=>!x.passed).map(x=>x.name);
console.log(JSON.stringify({contractId:c.contractId,total:checks.length,passed:checks.length-failed.length,failed:failed.length,status:failed.length?'failed':'passed',failedChecks:failed},null,2));
if(failed.length)process.exitCode=1;

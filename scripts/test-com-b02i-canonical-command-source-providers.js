'use strict';

const assert=require('assert');
const fs=require('fs');
const path=require('path');
const p=require('../backend/modules/communities/community-command-source-providers');
const r=require('../backend/modules/communities/community-command-source-repository-contract');

const ACTOR='11111111-1111-4111-8111-111111111111';
const TARGET='22222222-2222-4222-8222-222222222222';
const COMMUNITY='33333333-3333-4333-8333-333333333333';
const REQUEST='44444444-4444-4444-8444-444444444444';
const REQUEST2='55555555-5555-4555-8555-555555555555';
const INTENT='a'.repeat(64);const IDEM='b'.repeat(64);

function snapshot(revision=1){return {schemaVersion:1,source:'canonical_server',complete:true,id:COMMUNITY,revision,status:'active',visibility:'public',joinPolicy:'open',ownerId:ACTOR,managerIds:[ACTOR],memberIds:[ACTOR],members:[{userId:ACTOR,status:'active',roleIds:['owner','member']}],roles:[{id:'owner',system:true,permissions:{manageRoles:true,manageChannels:true,pinMessages:true,deleteMessages:true,addMembers:true,removeMembers:true,moderateMembers:true}},{id:'moderator',system:true,permissions:{manageChannels:true,pinMessages:true,deleteMessages:true,addMembers:true,removeMembers:true,moderateMembers:true}},{id:'member',system:true,permissions:{}}],sanctions:[],channels:[],invitations:[],joinRequests:[],contentItems:[],subscriptions:[]};}
function accepted(contract,reason,extra={}){return {contractId:contract,decision:'accept',reason,identity:{intentFingerprint:INTENT},...extra};}

async function main(){
  const context=p.sourceCanonicalCommandContext({stateEnvelope:{communityId:COMMUNITY,revision:1,visibility:'public',joinPolicy:'open',projection:{commandContext:snapshot(1)}}});
  assert.equal(context.decision,'canonical_command_context_sourced');
  assert.equal(p.sourceCanonicalCommandContext({stateEnvelope:{communityId:COMMUNITY,revision:1,visibility:'public',joinPolicy:'open',projection:{commandContext:{...snapshot(1),source:'client'}}}}).decision,'blocked_repository_only');

  const identity={actorId:ACTOR,clientRequestId:REQUEST,idempotencyKey:IDEM,intentFingerprint:INTENT};
  const fresh=p.sourceIdempotencyClaimState({identity,rpcResult:{claimed:true,claimState:'new',intentFingerprint:INTENT,priorRecord:null}});
  assert.equal(fresh.claimResult.claimState,'new');
  const existing=p.sourceIdempotencyClaimState({identity,rpcResult:{claimed:true,claimState:'existing',intentFingerprint:INTENT,priorRecord:{...identity,outcome:{decision:'accepted'}}}});
  assert.equal(existing.claimResult.claimState,'existing');
  assert.equal(p.sourceIdempotencyClaimState({identity,rpcResult:{claimed:true,claimState:'existing',intentFingerprint:INTENT,priorRecord:null}}).decision,'blocked_repository_only');

  const allocated=p.allocateServerCommunityUuid({intentFingerprint:INTENT},()=>COMMUNITY);
  assert.equal(allocated.decision,'server_community_uuid_allocated');
  assert.equal(allocated.allocationProof.source,'server_generated_uuid');

  const create=p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.membership,evaluatorResult:accepted(p.ROUTE_CONTRACTS.membership,'COMMUNITY_CREATE_CONTRACT_ACCEPTED'),command:'create_community',communityId:COMMUNITY,actorId:ACTOR,expectedRevision:0,intentFingerprint:INTENT,payload:{slug:'doke-builders',visibility:'public',joinPolicy:'open'},currentProjection:{}});
  assert.equal(create.decision,'domain_mutation_plan_sourced');
  assert.equal(create.mutationPlan.nextRevision,1);
  assert.equal(create.mutationPlan.projection.commandContext.ownerId,ACTOR);

  const join=p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.membership,evaluatorResult:accepted(p.ROUTE_CONTRACTS.membership,'PUBLIC_JOIN_ACCEPTED',{membershipRole:'member'}),command:'join_public',communityId:COMMUNITY,actorId:TARGET,expectedRevision:1,intentFingerprint:INTENT,payload:{},currentProjection:{commandContext:snapshot(1)}});
  assert(join.mutationPlan.projection.commandContext.memberIds.includes(TARGET));

  const role=p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.governance,evaluatorResult:accepted(p.ROUTE_CONTRACTS.governance,'ROLE_CREATE_ACCEPTED',{roleId:'role-abc',permissions:{manageChannels:true}}),command:'create_role',communityId:COMMUNITY,actorId:ACTOR,expectedRevision:1,intentFingerprint:INTENT,payload:{name:'Channel Manager',permissions:{manageChannels:true}},currentProjection:{commandContext:snapshot(1)}});
  assert(role.mutationPlan.projection.commandContext.roles.some(x=>x.id==='role-abc'));

  const channel=p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.content,evaluatorResult:accepted(p.ROUTE_CONTRACTS.content,'CREATE_CHANNEL_CONTRACT_ACCEPTED',{channelId:'channel-abc'}),command:'create_channel',communityId:COMMUNITY,actorId:ACTOR,expectedRevision:1,intentFingerprint:INTENT,payload:{name:'Geral',type:'text',slowModeSeconds:0,allowedRoleIds:['member'],sendRoleIds:['member']},currentProjection:{commandContext:snapshot(1)}});
  assert(channel.mutationPlan.projection.commandContext.channels.some(x=>x.id==='channel-abc'));
  const msg=p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.content,evaluatorResult:accepted(p.ROUTE_CONTRACTS.content,'MESSAGE_SEND_CONTRACT_ACCEPTED',{contentId:'message-abc',initialState:'accepted_pending_persistence'}),command:'send_message',communityId:COMMUNITY,actorId:ACTOR,expectedRevision:2,intentFingerprint:INTENT,payload:{text:'hello',attachmentRefs:[]},channelId:'channel-abc',currentProjection:{commandContext:channel.mutationPlan.projection.commandContext}});
  assert(msg.mutationPlan.projection.commandContext.contentItems.some(x=>x.id==='message-abc'));
  assert.equal(p.produceDomainMutationPlan({evaluatorContractId:p.ROUTE_CONTRACTS.content,evaluatorResult:{contractId:p.ROUTE_CONTRACTS.content,decision:'reject'},command:'send_message',communityId:COMMUNITY,actorId:ACTOR,expectedRevision:1,intentFingerprint:INTENT,payload:{},currentProjection:{commandContext:snapshot(1)}}).decision,'blocked_repository_only');

  const calls=[];const fake={authority:'server_service_role',async rpc(name,args){calls.push({name,args});return name===r.RPC.claimIdempotencyKeyV2?{data:{claimed:true,claimState:'new',intentFingerprint:INTENT,priorRecord:null},error:null}:{data:{revision:2,eventHash:'c'.repeat(64),outcomeRecorded:true},error:null};}};
  const repo=r.createCommandSourceRepository(fake);
  await repo.claimIdempotencyKey(identity);
  await repo.createCommunityProjectionOutcome({...identity,communityId:COMMUNITY,visibility:'public',joinPolicy:'open',eventType:'community.membership.create_community',eventHash:'c'.repeat(64),payload:{},projection:{},outcome:{decision:'accept'}});
  await repo.commitEventProjectionOutcome({actorId:ACTOR,clientRequestId:REQUEST2,idempotencyKey:IDEM,intentFingerprint:INTENT,communityId:COMMUNITY,expectedRevision:1,eventType:'community.membership.join_public',eventHash:'d'.repeat(64),payload:{},projection:{},outcome:{decision:'accept'}});
  assert.deepEqual(calls.map(x=>x.name),['com_claim_idempotency_key_v2','com_create_community_projection_outcome_v1','com_commit_event_projection_outcome_v2']);

  const sql=fs.readFileSync(path.join(__dirname,'../backend/modules/communities/sql/com-b02i-command-sources.sql'),'utf8');
  for(const token of ["'claimState'",'com_claim_idempotency_key_v2','com_create_community_projection_outcome_v1','com_commit_event_projection_outcome_v2','outcome jsonb','IDEMPOTENCY_OUTCOME_ALREADY_RECORDED'])assert(sql.includes(token),`SQL token missing: ${token}`);
  assert(sql.includes('intentionally outside supabase/migrations'));

  const b02h=require('../backend/modules/communities/community-command-context-projection-composition-contract');
  assert.equal(b02h.composeIdempotencyContext({identity,claimResult:fresh.claimResult}).decision,'idempotency_new_claim_proven');
  assert.equal(b02h.resolveCommunityIdentity({command:'create_community',intentFingerprint:INTENT,allocatedCommunityId:allocated.allocatedCommunityId,allocationProof:allocated.allocationProof}).decision,'create_community_uuid_bound');
  const envelope=b02h.assembleDeterministicPersistenceEnvelope({actorId:ACTOR,communityId:COMMUNITY,expectedRevision:0,command:'create_community',intentFingerprint:INTENT,evaluatorContractId:p.ROUTE_CONTRACTS.membership,evaluatorResult:{contractId:p.ROUTE_CONTRACTS.membership,decision:'accept'},mutationPlan:create.mutationPlan});
  assert.equal(envelope.decision,'deterministic_persistence_envelope_assembled');

  const certification=p.evaluateBoundaryCertification({predecessorContractId:'com-b02h-canonical-command-context-projection-composition-v1',predecessorHead:'4ded7870d05427ee72f901c242fc133b182657b1',b02hCertificationRunId:31980775196,repositoryV2DefinitionPresent:true,repositoryV2Applied:false,canonicalContextSourceDefined:true,claimStateSourceDefined:true,uuidAllocatorDefined:true,domainMutationPlanProducerDefined:true,handlersChanged:false,runtimeActivated:false,remoteExecution:false,migrationApplied:false});
  assert.equal(certification.ready,true);assert.equal(certification.decision,'repository_only_command_sources_certifiable');
  console.log('COM-B02I canonical command source providers: PASS');
}

main().catch(error=>{console.error(error);process.exitCode=1;});

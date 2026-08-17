'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'com-b02i-canonical-command-source-providers-v1';
const BOUNDARY_ID = 'COM-B02I';
const PREDECESSOR_CONTRACT_ID = 'com-b02h-canonical-command-context-projection-composition-v1';
const PREDECESSOR_HEAD = '4ded7870d05427ee72f901c242fc133b182657b1';

const ROUTE_CONTRACTS = Object.freeze({
  membership: 'com-a02-canonical-discovery-membership-v1',
  governance: 'com-a03-governance-discipline-ledger-v1',
  content: 'com-a04-content-realtime-rate-limit-v1'
});
const DOMAIN_BY_CONTRACT = Object.freeze(Object.fromEntries(Object.entries(ROUTE_CONTRACTS).map(([domain, contractId]) => [contractId, domain])));
const SYSTEM_PERMISSIONS = Object.freeze(['pinMessages','deleteMessages','addMembers','removeMembers','editCommunity','manageRoles','manageChannels','mentionRoles','bypassSlowMode','moderateMembers']);

function isObject(value){return Boolean(value)&&typeof value==='object'&&!Array.isArray(value);}
function isUuid(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isUuidV4(value){return typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);}
function isSha256(value){return typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);}
function stable(value){if(Array.isArray(value))return value.map(stable);if(!isObject(value))return value;return Object.keys(value).sort().reduce((out,key)=>{out[key]=stable(value[key]);return out;},{});}
function clone(value){return value===undefined?undefined:JSON.parse(JSON.stringify(value));}
function freeze(value){if(!value||typeof value!=='object'||Object.isFrozen(value))return value;Object.values(value).forEach(freeze);return Object.freeze(value);}
function sha256(value){return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');}
function blocked(reason,details={}){return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:'blocked_repository_only',reason,details,runtimeActivationAuthority:false,handlerMutationAuthority:false,repositoryRemoteExecutionAuthority:false,networkAuthority:false,credentialReadAuthority:false,migrationApplicationAuthority:false,identityLifecycleRemoteAuthority:false,productionAuthority:false});}

function assertCanonicalSnapshot(snapshot,communityId,revision){
  if(!isObject(snapshot))return 'CERTIFIED_COMMAND_CONTEXT_REQUIRED';
  if(snapshot.schemaVersion!==1||snapshot.source!=='canonical_server'||snapshot.complete!==true)return 'COMMAND_CONTEXT_PROVENANCE_REQUIRED';
  if(!isUuid(snapshot.id)||snapshot.id!==communityId)return 'COMMAND_CONTEXT_COMMUNITY_UUID_MISMATCH';
  if(!Number.isSafeInteger(snapshot.revision)||snapshot.revision!==revision||snapshot.revision<1)return 'COMMAND_CONTEXT_REVISION_MISMATCH';
  if(snapshot.status!=='active')return 'ACTIVE_COMMAND_CONTEXT_REQUIRED';
  if(!['public','private','invite_only'].includes(snapshot.visibility))return 'VALID_COMMAND_CONTEXT_VISIBILITY_REQUIRED';
  if(!['open','request','invite_only'].includes(snapshot.joinPolicy))return 'VALID_COMMAND_CONTEXT_JOIN_POLICY_REQUIRED';
  if(!isUuid(snapshot.ownerId))return 'COMMAND_CONTEXT_OWNER_UUID_REQUIRED';
  for(const key of ['memberIds','managerIds','members','roles','sanctions','channels','invitations','joinRequests','contentItems','subscriptions'])if(!Array.isArray(snapshot[key]))return `COMMAND_CONTEXT_COLLECTION_REQUIRED:${key}`;
  return null;
}

function sourceCanonicalCommandContext(input){
  if(!isObject(input)||!isObject(input.stateEnvelope))return blocked('CANONICAL_STATE_ENVELOPE_REQUIRED');
  const state=input.stateEnvelope;
  if(!isUuid(state.communityId)||!Number.isSafeInteger(state.revision)||state.revision<1||!isObject(state.projection))return blocked('CANONICAL_STATE_ENVELOPE_REQUIRED');
  const snapshot=state.projection.commandContext;
  const invalid=assertCanonicalSnapshot(snapshot,state.communityId,state.revision);
  if(invalid)return blocked(invalid);
  if(snapshot.visibility!==state.visibility||snapshot.joinPolicy!==state.joinPolicy)return blocked('COMMAND_CONTEXT_STATE_ENVELOPE_MISMATCH');
  return freeze({contractId:CONTRACT_ID,decision:'canonical_command_context_sourced',source:'projection.commandContext',sourceContractId:CONTRACT_ID,snapshot:clone(stable(snapshot)),runtimeActivationAuthority:false,mutationAuthorized:false});
}

function sourceIdempotencyClaimState(input){
  if(!isObject(input)||!isObject(input.identity)||!isObject(input.rpcResult))return blocked('IDEMPOTENCY_SOURCE_PACKET_REQUIRED');
  const identity=input.identity;
  if(!isUuid(identity.actorId)||!isUuid(identity.clientRequestId)||!isSha256(identity.idempotencyKey)||!isSha256(identity.intentFingerprint))return blocked('CANONICAL_IDEMPOTENCY_IDENTITY_REQUIRED');
  const result=input.rpcResult;
  if(result.claimed!==true||result.intentFingerprint!==identity.intentFingerprint)return blocked('IDEMPOTENCY_SOURCE_FINGERPRINT_MISMATCH');
  if(!['new','existing'].includes(result.claimState))return blocked('IDEMPOTENCY_SOURCE_CLAIM_STATE_REQUIRED');
  if(result.claimState==='new'){
    if(result.priorRecord!==null&&result.priorRecord!==undefined)return blocked('NEW_CLAIM_PRIOR_RECORD_PROHIBITED');
    return freeze({contractId:CONTRACT_ID,decision:'idempotency_claim_state_sourced',claimResult:{claimed:true,claimState:'new',intentFingerprint:identity.intentFingerprint},priorRecord:null,persistenceMayContinue:true,runtimeActivationAuthority:false});
  }
  const prior=result.priorRecord;
  if(!isObject(prior)||prior.actorId!==identity.actorId||prior.clientRequestId!==identity.clientRequestId||prior.idempotencyKey!==identity.idempotencyKey||prior.intentFingerprint!==identity.intentFingerprint||!Object.prototype.hasOwnProperty.call(prior,'outcome'))return blocked('EXISTING_CLAIM_CANONICAL_PRIOR_OUTCOME_REQUIRED');
  return freeze({contractId:CONTRACT_ID,decision:'idempotency_claim_state_sourced',claimResult:{claimed:true,claimState:'existing',intentFingerprint:identity.intentFingerprint},priorRecord:clone(stable(prior)),persistenceMayContinue:false,runtimeActivationAuthority:false});
}

function allocateServerCommunityUuid(input,uuidFactory=crypto.randomUUID){
  if(!isObject(input)||!isSha256(input.intentFingerprint))return blocked('COMMUNITY_UUID_INTENT_FINGERPRINT_REQUIRED');
  if(typeof uuidFactory!=='function')return blocked('SERVER_UUID_FACTORY_REQUIRED');
  const allocatedCommunityId=uuidFactory();
  if(!isUuidV4(allocatedCommunityId))return blocked('SERVER_UUID_V4_REQUIRED');
  return freeze({contractId:CONTRACT_ID,decision:'server_community_uuid_allocated',allocatedCommunityId,allocationProof:{source:'server_generated_uuid',intentFingerprint:input.intentFingerprint,communityId:allocatedCommunityId,allocatorContractId:CONTRACT_ID},remoteIdentityLifecycleExecuted:false,mutationAuthorized:false,runtimeActivationAuthority:false});
}

function allPermissions(value){const source=isObject(value)?value:{};return SYSTEM_PERMISSIONS.reduce((out,key)=>{out[key]=source[key]===true;return out;},{});}
function systemRoles(){const owner=SYSTEM_PERMISSIONS.reduce((out,key)=>{out[key]=true;return out;},{});return [{id:'owner',system:true,name:'Owner',permissions:owner},{id:'moderator',system:true,name:'Moderator',permissions:{pinMessages:true,deleteMessages:true,addMembers:true,removeMembers:true,editCommunity:false,manageRoles:false,manageChannels:true,mentionRoles:true,bypassSlowMode:true,moderateMembers:true}},{id:'member',system:true,name:'Member',permissions:allPermissions({})}];}
function upsertBy(array,key,value){const list=Array.isArray(array)?array:[];const index=list.findIndex(item=>item&&item[key]===value[key]);if(index===-1)list.push(value);else list[index]=value;return list;}
function memberRecord(snapshot,userId){return snapshot.members.find(member=>member&&member.userId===userId)||null;}
function ensureMember(snapshot,userId,roleIds=['member']){const current=memberRecord(snapshot,userId);const next=current||{userId,status:'active',roleIds:[]};next.status='active';next.roleIds=Array.from(new Set(['member'].concat(next.roleIds||[],roleIds||[])));upsertBy(snapshot.members,'userId',next);}
function recalc(snapshot){
  snapshot.members=snapshot.members.filter(member=>member&&member.status==='active'&&isUuid(member.userId));
  snapshot.memberIds=Array.from(new Set(snapshot.members.map(member=>member.userId)));
  const roleMap=new Map(snapshot.roles.map(role=>[role.id,role]));const managerIds=new Set([snapshot.ownerId]);
  for(const member of snapshot.members){const ids=Array.isArray(member.roleIds)?member.roleIds:[];if(ids.includes('owner')||ids.includes('moderator'))managerIds.add(member.userId);for(const id of ids){const role=roleMap.get(id);if(role&&role.permissions&&(role.permissions.addMembers||role.permissions.removeMembers||role.permissions.manageRoles))managerIds.add(member.userId);}}
  snapshot.managerIds=Array.from(managerIds);return snapshot;
}

function transitionMembership(snapshot,input){
  const {command,actorId,targetUserId,payload,evaluatorResult,intentFingerprint}=input;const target=targetUserId||actorId;
  if(command==='join_public')ensureMember(snapshot,actorId);
  else if(command==='request_join')upsertBy(snapshot.joinRequests,'requesterId',{requesterId:actorId,status:'pending',intentFingerprint,requestedAt:input.now||null});
  else if(command==='cancel_join_request'){const item=snapshot.joinRequests.find(x=>x.requesterId===actorId);if(!item)throw new Error('MUTATION_PLAN_JOIN_REQUEST_REQUIRED');item.status='cancelled';}
  else if(command==='invite_member')upsertBy(snapshot.invitations,'inviteeId',{inviteeId:target,inviterId:actorId,status:'pending',expiresAt:payload.expiresAt,intentFingerprint});
  else if(command==='revoke_invite'){const item=snapshot.invitations.find(x=>x.inviteeId===target&&x.status==='pending');if(!item)throw new Error('MUTATION_PLAN_INVITATION_REQUIRED');item.status='revoked';}
  else if(command==='accept_invite'||command==='reject_invite'){const item=snapshot.invitations.find(x=>x.inviteeId===actorId&&x.status==='pending');if(!item)throw new Error('MUTATION_PLAN_INVITATION_REQUIRED');item.status=command==='accept_invite'?'accepted':'rejected';if(command==='accept_invite')ensureMember(snapshot,actorId);}
  else if(command==='approve_join_request'||command==='reject_join_request'){const item=snapshot.joinRequests.find(x=>x.requesterId===target&&x.status==='pending');if(!item)throw new Error('MUTATION_PLAN_JOIN_REQUEST_REQUIRED');item.status=command==='approve_join_request'?'approved':'rejected';if(command==='approve_join_request')ensureMember(snapshot,target);}
  else if(command==='leave_community')snapshot.members=snapshot.members.filter(member=>member.userId!==actorId);
  else throw new Error(`MUTATION_PLAN_MEMBERSHIP_COMMAND_UNSUPPORTED:${command}`);
  if(evaluatorResult.membershipRole&&target)ensureMember(snapshot,target,[evaluatorResult.membershipRole]);return recalc(snapshot);
}

function transitionGovernance(snapshot,input){
  const {command,actorId,targetUserId,targetRoleId,payload,evaluatorResult,intentFingerprint}=input;
  if(command==='create_role'||command==='update_role'){
    const roleId=evaluatorResult.roleId||targetRoleId;if(typeof roleId!=='string')throw new Error('MUTATION_PLAN_ROLE_ID_REQUIRED');
    const existing=snapshot.roles.find(role=>role.id===roleId);upsertBy(snapshot.roles,'id',{...(existing||{}),id:roleId,system:false,name:String(payload.name||'').replace(/\s+/g,' ').trim(),permissions:allPermissions(evaluatorResult.permissions||payload.permissions)});
  }else if(command==='delete_role')snapshot.roles=snapshot.roles.filter(role=>role.id!==evaluatorResult.roleId&&role.id!==targetRoleId);
  else if(command==='assign_role'||command==='revoke_role'){
    const member=memberRecord(snapshot,targetUserId);if(!member)throw new Error('MUTATION_PLAN_TARGET_MEMBER_REQUIRED');const roleId=evaluatorResult.roleId||targetRoleId;const roles=new Set(member.roleIds||[]);if(command==='assign_role')roles.add(roleId);else roles.delete(roleId);roles.add('member');member.roleIds=Array.from(roles);
  }else if(['apply_ban','apply_mute','apply_restriction'].includes(command)){
    const sanctionId=evaluatorResult.sanctionId;if(typeof sanctionId!=='string')throw new Error('MUTATION_PLAN_SANCTION_ID_REQUIRED');upsertBy(snapshot.sanctions,'id',{id:sanctionId,type:evaluatorResult.sanctionType||command.replace('apply_',''),state:evaluatorResult.sanctionState||'active',targetUserId,actorId,reason:payload.reason,expiresAt:evaluatorResult.expiresAt||null,intentFingerprint});
  }else if(['lift_ban','lift_mute','lift_restriction','expire_sanction'].includes(command)){
    const sanctionId=evaluatorResult.sanctionId||(input.sanction&&input.sanction.id);const sanction=snapshot.sanctions.find(item=>item.id===sanctionId);if(!sanction)throw new Error('MUTATION_PLAN_SANCTION_REQUIRED');sanction.state=evaluatorResult.sanctionState||(command==='expire_sanction'?'expired':'lifted');sanction.closedBy=actorId;sanction.closedReason=payload.reason||null;
  }else throw new Error(`MUTATION_PLAN_GOVERNANCE_COMMAND_UNSUPPORTED:${command}`);
  return recalc(snapshot);
}

function transitionContent(snapshot,input){
  const {command,actorId,channelId,payload,evaluatorResult,intentFingerprint}=input;
  if(command==='create_channel')upsertBy(snapshot.channels,'id',{id:evaluatorResult.channelId,revision:1,status:'active',name:String(payload.name||'').replace(/^#+/,'').replace(/\s+/g,' ').trim(),type:payload.type,slowModeSeconds:Number(payload.slowModeSeconds||0),allowedRoleIds:Array.from(new Set(payload.allowedRoleIds||[])),sendRoleIds:Array.from(new Set(payload.sendRoleIds||[])),readOnly:payload.readOnly===true,blockLinks:payload.blockLinks===true});
  else if(command==='update_channel'){const channel=snapshot.channels.find(item=>item.id===channelId);if(!channel)throw new Error('MUTATION_PLAN_CHANNEL_REQUIRED');channel.revision=Number(channel.revision||0)+1;for(const key of ['name','type','slowModeSeconds','readOnly','blockLinks'])if(Object.prototype.hasOwnProperty.call(payload,key))channel[key]=payload[key];if(Object.prototype.hasOwnProperty.call(payload,'allowedRoleIds'))channel.allowedRoleIds=Array.from(new Set(payload.allowedRoleIds||[]));if(Object.prototype.hasOwnProperty.call(payload,'sendRoleIds'))channel.sendRoleIds=Array.from(new Set(payload.sendRoleIds||[]));}
  else if(command==='archive_channel'){const channel=snapshot.channels.find(item=>item.id===channelId);if(!channel)throw new Error('MUTATION_PLAN_CHANNEL_REQUIRED');channel.status='archived';channel.revision=Number(channel.revision||0)+1;}
  else if(command==='send_message'||command==='publish_post')upsertBy(snapshot.contentItems,'id',{id:evaluatorResult.contentId,type:command==='send_message'?'message':'post',communityId:snapshot.id,channelId,authorId:actorId,revision:1,state:evaluatorResult.initialState,pinned:false,text:payload.text,attachmentRefs:Array.from(payload.attachmentRefs||[]),intentFingerprint});
  else if(command==='edit_message'||command==='edit_post'){const content=snapshot.contentItems.find(item=>item.id===input.contentId);if(!content)throw new Error('MUTATION_PLAN_CONTENT_REQUIRED');content.text=payload.text;if(Object.prototype.hasOwnProperty.call(payload,'attachmentRefs'))content.attachmentRefs=Array.from(payload.attachmentRefs||[]);content.revision=evaluatorResult.nextRevision||Number(content.revision||0)+1;}
  else if(command==='delete_message'||command==='delete_post'){const content=snapshot.contentItems.find(item=>item.id===input.contentId);if(!content)throw new Error('MUTATION_PLAN_CONTENT_REQUIRED');content.state=evaluatorResult.nextState||'removed';content.revision=Number(content.revision||0)+1;}
  else if(command==='pin_message'||command==='unpin_message'){const content=snapshot.contentItems.find(item=>item.id===input.contentId);if(!content)throw new Error('MUTATION_PLAN_CONTENT_REQUIRED');content.pinned=evaluatorResult.pinned===true;content.revision=Number(content.revision||0)+1;}
  else if(command==='subscribe_realtime'){const envelope=evaluatorResult.subscriptionEnvelope;if(!isObject(envelope))throw new Error('MUTATION_PLAN_SUBSCRIPTION_ENVELOPE_REQUIRED');const subscriptionKey=sha256({actorId,communityId:snapshot.id,channelId:envelope.channelId||null,topics:envelope.topics||[]});upsertBy(snapshot.subscriptions,'subscriptionKey',{subscriptionKey,actorId,channelId:envelope.channelId||null,topics:Array.from(envelope.topics||[]),expiresAt:envelope.expiresAt,state:'active'});}
  else if(command==='unsubscribe_realtime')snapshot.subscriptions=snapshot.subscriptions.filter(item=>!(item.actorId===actorId&&(input.channelId?item.channelId===input.channelId:true)));
  else throw new Error(`MUTATION_PLAN_CONTENT_COMMAND_UNSUPPORTED:${command}`);
  return snapshot;
}

function createInitialSnapshot(input){
  if(input.command!=='create_community')throw new Error('CREATE_COMMUNITY_COMMAND_REQUIRED');if(input.expectedRevision!==0)throw new Error('CREATE_COMMUNITY_EXPECTED_REVISION_ZERO_REQUIRED');if(!isUuid(input.communityId)||!isUuid(input.actorId))throw new Error('CREATE_COMMUNITY_UUIDS_REQUIRED');if(!['public','private','invite_only'].includes(input.payload.visibility))throw new Error('CREATE_COMMUNITY_VISIBILITY_REQUIRED');if(!['open','request','invite_only'].includes(input.payload.joinPolicy))throw new Error('CREATE_COMMUNITY_JOIN_POLICY_REQUIRED');
  return recalc({schemaVersion:1,source:'canonical_server',complete:true,id:input.communityId,revision:1,status:'active',visibility:input.payload.visibility,joinPolicy:input.payload.joinPolicy,ownerId:input.actorId,managerIds:[input.actorId],memberIds:[input.actorId],members:[{userId:input.actorId,status:'active',roleIds:['owner','member']}],roles:systemRoles(),sanctions:[],channels:[],invitations:[],joinRequests:[],contentItems:[],subscriptions:[]});
}

function produceDomainMutationPlan(input){
  if(!isObject(input))return blocked('MUTATION_PLAN_SOURCE_PACKET_REQUIRED');const domain=DOMAIN_BY_CONTRACT[input.evaluatorContractId];if(!domain)return blocked('CERTIFIED_EVALUATOR_CONTRACT_REQUIRED');
  if(!isObject(input.evaluatorResult)||input.evaluatorResult.contractId!==input.evaluatorContractId||input.evaluatorResult.decision!=='accept')return blocked('ACCEPTED_EVALUATOR_RESULT_REQUIRED');
  if(!isUuid(input.communityId)||!isUuid(input.actorId)||!Number.isSafeInteger(input.expectedRevision)||input.expectedRevision<0)return blocked('MUTATION_PLAN_CANONICAL_IDENTITY_REQUIRED');
  if(!isSha256(input.intentFingerprint)||!isObject(input.payload))return blocked('MUTATION_PLAN_INTENT_AND_PAYLOAD_REQUIRED');
  if(!isObject(input.evaluatorResult.identity)||input.evaluatorResult.identity.intentFingerprint!==input.intentFingerprint)return blocked('EVALUATOR_INTENT_FINGERPRINT_BINDING_REQUIRED');
  if(!isObject(input.currentProjection))return blocked('CURRENT_PROJECTION_REQUIRED');
  let snapshot;
  try{
    if(input.command==='create_community'){if(domain!=='membership')return blocked('CREATE_COMMUNITY_MEMBERSHIP_CONTRACT_REQUIRED');snapshot=createInitialSnapshot(input);}
    else{const current=clone(input.currentProjection.commandContext);const invalid=assertCanonicalSnapshot(current,input.communityId,input.expectedRevision);if(invalid)return blocked(invalid);const transitionInput={...input,targetUserId:input.targetUserId||null,targetRoleId:input.targetRoleId||null,channelId:input.channelId||null,contentId:input.contentId||(input.content&&input.content.id)||null,sanction:input.sanction||null};snapshot=domain==='membership'?transitionMembership(current,transitionInput):domain==='governance'?transitionGovernance(current,transitionInput):transitionContent(current,transitionInput);snapshot.revision=input.expectedRevision+1;}
  }catch(error){return blocked('DOMAIN_MUTATION_PLAN_SOURCE_REJECTED',{code:error.message});}
  const projection=clone(stable(input.currentProjection));projection.commandContext=stable(snapshot);const eventType=`community.${domain}.${input.command}`;
  const eventPayload=stable({contractId:CONTRACT_ID,domain,command:input.command,actorId:input.actorId,communityId:input.communityId,evaluatorReason:input.evaluatorResult.reason,evaluatorIdentity:input.evaluatorResult.identity||null,targetUserId:input.targetUserId||null,targetRoleId:input.targetRoleId||null,channelId:input.channelId||null,contentId:input.contentId||(input.content&&input.content.id)||input.evaluatorResult.contentId||null,sanctionId:input.evaluatorResult.sanctionId||(input.sanction&&input.sanction.id)||null,payload:stable(input.payload)});
  const mutationPlan=freeze({sourceContractId:input.evaluatorContractId,producerContractId:CONTRACT_ID,command:input.command,communityId:input.communityId,expectedRevision:input.expectedRevision,nextRevision:input.expectedRevision+1,intentFingerprint:input.intentFingerprint,eventType,payload:eventPayload,projection});
  return freeze({contractId:CONTRACT_ID,decision:'domain_mutation_plan_sourced',domain,mutationPlan,mutationExecuted:false,mutationAuthorized:false,runtimeActivationAuthority:false});
}

function evaluateBoundaryCertification(packet){
  const input=isObject(packet)?packet:{};const blockers=[];const req=(condition,code)=>{if(!condition)blockers.push(code);};
  req(input.predecessorContractId===PREDECESSOR_CONTRACT_ID,'B02H_PREDECESSOR_CONTRACT_REQUIRED');req(input.predecessorHead===PREDECESSOR_HEAD,'B02H_CERTIFIED_HEAD_REQUIRED');req(input.b02hCertificationRunId===31980775196,'B02H_CERTIFICATION_RUN_REQUIRED');req(input.repositoryV2DefinitionPresent===true,'IDEMPOTENCY_V2_REPOSITORY_DEFINITION_REQUIRED');req(input.repositoryV2Applied===false,'REPOSITORY_V2_MUST_REMAIN_UNAPPLIED');req(input.canonicalContextSourceDefined===true,'CANONICAL_CONTEXT_SOURCE_REQUIRED');req(input.claimStateSourceDefined===true,'CLAIM_STATE_SOURCE_REQUIRED');req(input.uuidAllocatorDefined===true,'UUID_ALLOCATOR_REQUIRED');req(input.domainMutationPlanProducerDefined===true,'DOMAIN_MUTATION_PLAN_PRODUCER_REQUIRED');req(input.handlersChanged===false,'B02F_HANDLERS_MUST_REMAIN_FROZEN');req(input.runtimeActivated===false,'RUNTIME_MUST_REMAIN_INACTIVE');req(input.remoteExecution===false,'REMOTE_EXECUTION_MUST_REMAIN_ABSENT');req(input.migrationApplied===false,'MIGRATION_APPLICATION_MUST_REMAIN_ABSENT');
  const ready=blockers.length===0;return freeze({contractId:CONTRACT_ID,boundaryId:BOUNDARY_ID,decision:ready?'repository_only_command_sources_certifiable':'repository_only_command_sources_blocked',ready,blockers,canonicalContextSourceDefined:ready,claimStateSourceDefined:ready,uuidAllocatorDefined:ready,domainMutationPlanProducerDefined:ready,repositoryV2DefinitionPresent:ready,repositoryV2Applied:false,handlerMutationAuthority:false,runtimeActivationAuthority:false,remoteExecutionAuthority:false,networkAuthority:false,credentialReadAuthority:false,migrationApplicationAuthority:false,identityLifecycleRemoteAuthority:false,productionAuthority:false,nextAction:'request_separate_repository_only_authority_for_b02f_handler_composition_against_b02i_sources_without_runtime_activation_or_remote_execution'});
}

module.exports=Object.freeze({CONTRACT_ID,BOUNDARY_ID,PREDECESSOR_CONTRACT_ID,PREDECESSOR_HEAD,ROUTE_CONTRACTS,sourceCanonicalCommandContext,sourceIdempotencyClaimState,allocateServerCommunityUuid,produceDomainMutationPlan,evaluateBoundaryCertification});

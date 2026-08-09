#!/usr/bin/env node
'use strict';

const r3a = require('../backend/modules/communities/community-realtime-private-auth-r3a');

const HARD_BLOCK = 'DOKE_COM_B03C_R3A_STAGING_AUTHORIZATION_NOT_DEFINED';

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildTerms({ userId, topic }) {
  const uid = `(select auth.uid()) = ${sqlLiteral(userId)}::uuid`;
  const topicDirect = `realtime.topic() = ${sqlLiteral(topic)}`;
  const topicSelect = `(select realtime.topic()) = ${sqlLiteral(topic)}`;
  const extensionEq = `realtime.messages.extension = 'presence'`;
  const extensionIn = `realtime.messages.extension in ('presence')`;
  return { uid, topicDirect, topicSelect, extensionEq, extensionIn };
}

function buildPredicate(caseId, context) {
  if (!r3a.ISOLATION_CASES.includes(caseId)) {
    throw Object.assign(new Error('DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE'), { code: 'DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE' });
  }
  const t = buildTerms(context);
  switch (caseId) {
    case 'control_true': return 'true';
    case 'uid_topic_direct': return `${t.uid} and ${t.topicDirect}`;
    case 'uid_extension_eq': return `${t.uid} and ${t.extensionEq}`;
    case 'topic_extension_direct': return `${t.topicDirect} and ${t.extensionEq}`;
    case 'full_current_direct': return `${t.uid} and ${t.topicDirect} and ${t.extensionEq}`;
    case 'full_topic_select_wrapper': return `${t.uid} and ${t.topicSelect} and ${t.extensionEq}`;
    case 'full_topic_select_extension_in': return `${t.uid} and ${t.topicSelect} and ${t.extensionIn}`;
    case 'full_docs_canonical_exists':
      return `exists (select 1 where ${t.uid} and ${t.topicSelect} and ${t.extensionIn})`;
    default:
      throw Object.assign(new Error('DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE'), { code: 'DOKE_COM_B03C_R3A_UNKNOWN_ISOLATION_CASE' });
  }
}

function buildIsolationPlan({ userId, topic }) {
  if (!userId || !topic) {
    throw Object.assign(new Error('DOKE_COM_B03C_R3A_PLAN_CONTEXT_REQUIRED'), { code: 'DOKE_COM_B03C_R3A_PLAN_CONTEXT_REQUIRED' });
  }
  return r3a.ISOLATION_CASES.map((caseId, index) => ({
    index,
    caseId,
    transport: 'channel_presence',
    axis: 'read_join',
    sameTopicRequired: true,
    freshRealtimeClientRequired: true,
    selectPredicate: buildPredicate(caseId, { userId, topic }),
    insertControlPredicate: 'true',
    writeActionAllowed: false
  }));
}

function assertRepositoryOnlyExecutionBoundary(env = process.env) {
  if (env.COM_B03C_R3A_ALLOW_STAGING || env.COM_B03C_R3A_AUTHORIZATION || env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_DB_PASSWORD) {
    throw Object.assign(new Error(HARD_BLOCK), { code: HARD_BLOCK });
  }
  throw Object.assign(new Error(HARD_BLOCK), { code: HARD_BLOCK });
}

function main() {
  assertRepositoryOnlyExecutionBoundary(process.env);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.code || HARD_BLOCK}\n`);
    process.exitCode = 2;
  }
}

module.exports = Object.freeze({
  HARD_BLOCK,
  sqlLiteral,
  buildTerms,
  buildPredicate,
  buildIsolationPlan,
  assertRepositoryOnlyExecutionBoundary
});

#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const readiness = require('../backend/modules/communities/community-realtime-publication-subscription-readiness');
const config = require('../config/com-b03b-realtime-publication-authenticated-subscription-staging-execution-readiness.json');

const ROOT = path.resolve(__dirname, '..');
const executorPath = path.join(ROOT, 'scripts/execute-com-b03b-realtime-publication-authenticated-subscription-staging-canary.js');
const verifierPath = path.join(ROOT, 'scripts/verify-com-b03b-realtime-publication-authenticated-subscription-staging-canary-evidence.js');
const workflowPath = path.join(ROOT, '.github/workflows/com-b03b-realtime-publication-authenticated-subscription-staging-canary.yml');
const executor = fs.readFileSync(executorPath, 'utf8');
const verifier = fs.readFileSync(verifierPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');
let assertions = 0;
function check(value, message) { assertions += 1; assert.ok(value, message); }
function equal(actual, expected, message) { assertions += 1; assert.equal(actual, expected, message); }
function deep(actual, expected, message) { assertions += 1; assert.deepEqual(actual, expected, message); }

equal(config.contractId, 'com-b03b-realtime-publication-authenticated-subscription-staging-execution-readiness-v1');
equal(config.scope, 'repository_only_preinstalled_executor');
equal(config.authorization.requiredPhrase, readiness.REQUIRED_AUTHORIZATION_PHRASE);
equal(config.authorization.received, true);
equal(config.authorization.consumed, false);
equal(config.authorization.executionAttempted, false);
equal(config.authorization.singleUse, true);
equal(config.authorization.reusableAfterFailure, false);
deep([...config.canary.scope].sort(), ['channel_presence', 'channel_typing', 'community_posts']);
deep(config.canary.excludedTopics, ['channel_messages']);
equal(config.canary.privateChannelsOnly, true);
equal(config.canary.serverVerifiedSessionRequired, true);
equal(config.canary.publicRealtimeChannelAllowed, false);
equal(config.canary.persistentDomainMutationAllowed, false);
equal(config.authorityBeforeTrigger.stagingReadAuthority, false);
equal(config.authorityBeforeTrigger.stagingMutationAuthority, false);
equal(config.authorityBeforeTrigger.realtimePublicationAuthority, false);
equal(config.authorityBeforeTrigger.realtimeSubscriptionAuthority, false);
equal(config.authorityBeforeTrigger.productionAuthority, false);
equal(config.authorityBeforeTrigger.pullRequestMergeAuthority, false);

const authorization = readiness.evaluateStagingCanaryAuthorization({
  authorizationPhrase: config.authorization.requiredPhrase,
  targetEnvironment: config.target.environment,
  projectId: config.target.projectId,
  branch: config.target.branch,
  pullRequest: config.target.pullRequest,
  authorizationConsumed: false,
  executionAttempted: false,
  privateChannelsOnly: config.canary.privateChannelsOnly,
  serverVerifiedSessionRequired: config.canary.serverVerifiedSessionRequired,
  publicRealtimeChannelAllowed: config.canary.publicRealtimeChannelAllowed,
  persistentDomainMutationAllowed: config.canary.persistentDomainMutationAllowed,
  scope: config.canary.scope
});
equal(authorization.decision, 'authorized_for_single_bounded_staging_canary');
deep([...authorization.scope].sort(), ['channel_presence', 'channel_typing', 'community_posts']);
deep(authorization.excludedTopics, ['channel_messages']);

check(executor.indexOf("requireEnvironment(env); // No staging/network calls occur before secret/config fail-closed checks.") !== -1, 'secret preflight must precede staging access');
check(executor.indexOf('DOKE_STAGING_CLIENT_PASSWORD') !== -1, 'canonical canary password required');
check(executor.indexOf('cliente@doke.local') !== -1, 'canonical synthetic persona required');
check(executor.indexOf('realtime.messages') !== -1, 'Realtime Authorization boundary required');
check(executor.indexOf('realtime.topic()') !== -1, 'topic-bound RLS required');
check(executor.indexOf("extension in ('broadcast','presence')") !== -1, 'extension-bound RLS required');
check(executor.indexOf("realtime.send($1::jsonb, 'INSERT'") !== -1, 'database-originated private broadcast required');
check(executor.indexOf("topic: 'community_posts'") !== -1, 'community_posts envelope required');
check(executor.indexOf("topic: 'channel_presence'") !== -1, 'presence scope required');
check(executor.indexOf("topic: 'channel_typing'") !== -1, 'typing scope required');
check(executor.indexOf('DOKE_COM_B03B_CHANNEL_MESSAGES_PROHIBITED') !== -1, 'channel_messages fail-closed guard required');
check(executor.indexOf('dropPolicies') !== -1 && executor.indexOf('finally') !== -1, 'temporary policy cleanup required');
check(executor.indexOf('PERSISTENT_DOMAIN_MUTATION_DETECTED') !== -1, 'domain residue check required');
check(executor.indexOf('ANON_PRIVATE_SUBSCRIPTION_UNEXPECTEDLY_ALLOWED') !== -1, 'anonymous negative test required');
check(executor.indexOf('runtimeDeployed: false') !== -1 && executor.indexOf('productionChanged: false') !== -1, 'deployment/production guard required');
check(!/SUPABASE_(ACCESS_TOKEN|DB_PASSWORD)\s*=/.test(executor), 'secrets must not be embedded');
check(verifier.indexOf('channelMessagesExcluded') !== -1, 'evidence verifier must enforce exclusion');
check(verifier.indexOf('temporaryPoliciesRemoved') !== -1, 'evidence verifier must enforce cleanup');
check(workflow.indexOf("paths:\n      - 'config/com-b03b-realtime-publication-authenticated-subscription-staging-trigger.json'") !== -1, 'push must be trigger-scoped');
check(workflow.indexOf('github.run_attempt == 1') !== -1, 'workflow rerun must be blocked');
check(workflow.indexOf('secrets.DOKE_STAGING_CLIENT_PASSWORD') !== -1, 'workflow must inject canary credential only at canary job');
check(workflow.indexOf('environment: staging') !== -1, 'staging environment boundary required');

console.log(`COM-B03B staging execution readiness passed: ${assertions}/${assertions}`);

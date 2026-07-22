const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const operations = [
  'get_account_onboarding_state',
  'complete_account_onboarding',
  'update_account_profile',
  'create_transaction_notification',
  'update_own_notification_state',
  'save_professional_profile_setup',
  'save_professional_verification_draft',
  'reopen_own_professional_identity_verification',
  'list_service_moderation_history',
  'submit_service_for_review',
  'save_wallet_bank_account',
  'request_wallet_withdrawal',
  'open_wallet_dispute',
  'respond_wallet_dispute',
];

const dispatcher = read('supabase/migrations/135_self_service_operation_dispatcher.sql');
const lockdown = read('supabase/migrations/136_self_service_direct_rpc_lockdown.sql');
const edge = read('supabase/functions/self-service-operations/index.ts');
const edgeOps = read('supabase/functions/self-service-operations/operations.mjs');
const bootstrap = read('assets/js/core/supabase-config.js');

assert(dispatcher.includes('execute_self_service_operation_internal'), 'Dispatcher RPC is missing.');
assert(dispatcher.includes("set_config('request.jwt.claim.sub'"), 'Dispatcher must reconstruct auth.uid().');
assert(dispatcher.includes('p_actor_id uuid'), 'Dispatcher must receive the server-derived actor id.');
assert(dispatcher.includes('to service_role'), 'Dispatcher must be service-role-only.');
assert(dispatcher.includes('from public, anon, authenticated'), 'Dispatcher browser grants must be revoked.');

assert(edge.includes('authClient.auth.getUser()'), 'Edge Function must validate the bearer JWT.');
assert(edge.includes('p_actor_id: actor.id'), 'Actor id must come from auth.getUser().');
assert(!edge.includes('p_actor_id: body'), 'Actor id must never come from the request body.');
assert(edge.includes('execute_self_service_operation_internal'), 'Edge Function must call the service-role dispatcher.');
assert(edge.includes('verify') || edge.includes('getUser'), 'Edge Function authentication contract missing.');

for (const operation of operations) {
  assert(edgeOps.includes(`'${operation}'`), `Edge allowlist is missing ${operation}.`);
  assert(dispatcher.includes(`when '${operation}'`), `Dispatcher is missing ${operation}.`);
  assert(lockdown.includes(`public.${operation}`), `Direct RPC lockdown is missing ${operation}.`);
}

assert(bootstrap.includes('SELF_SERVICE_FUNCTION = "self-service-operations"'), 'Shared browser gateway name is missing.');
assert(bootstrap.includes('invokeSelfService'), 'Shared browser invocation helper is missing.');
assert(bootstrap.includes('client.functions.invoke'), 'Shared helper must call an Edge Function.');

const browserFiles = [
  'assets/js/services/onboarding-service.js',
  'assets/js/services/profile-service.js',
  'assets/js/services/professional-profile-setup-service.js',
  'assets/js/services/professional-identity-verification-service.js',
  'assets/js/repositories/notifications-repository.js',
  'assets/js/repositories/services-repository.js',
  'assets/js/repositories/finance-repository.js',
];
const browserSource = browserFiles.map(read).join('\n');
assert(browserSource.includes('invokeSelfService'), 'Browser repositories must use the shared Edge gateway.');
for (const operation of operations) {
  const directRpcPattern = new RegExp(`\\.rpc\\(\\s*['\"]${operation}['\"]`);
  assert(!directRpcPattern.test(browserSource), `Browser still calls privileged RPC directly: ${operation}.`);
}

console.log(`Self-service Edge authority contract passed (${operations.length} operations).`);

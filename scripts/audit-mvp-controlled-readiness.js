#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const failures = [];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function pass(message) {
  console.log('✓ ' + message);
}

function fail(message) {
  failures.push(message);
  console.error('✗ ' + message);
}

function expectFile(file) {
  if (exists(file)) {
    pass(file + ' exists');
    return read(file);
  }
  fail(file + ' is missing');
  return '';
}

function expectIncludes(file, content, tokens) {
  tokens.forEach((token) => {
    if (content.includes(token)) pass(file + ' contains ' + token);
    else fail(file + ' missing ' + token);
  });
}

function expectScript(packageJson, name, commandFragment) {
  const scripts = packageJson.scripts || {};
  if (!scripts[name]) {
    fail('package.json missing script ' + name);
    return;
  }
  if (commandFragment && !scripts[name].includes(commandFragment)) {
    fail('package.json script ' + name + ' does not call ' + commandFragment);
    return;
  }
  pass('package.json script ' + name + ' registered');
}

function collectFiles(dir, predicate) {
  const absolute = path.join(ROOT, dir);
  if (!fs.existsSync(absolute)) return [];
  const output = [];
  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (!predicate || predicate(full)) output.push(path.relative(ROOT, full).replace(/\\/g, '/'));
    }
  }
  return output;
}

function assertNoDirectBackendCalls() {
  const checkedRoots = ['assets/js/pages', 'assets/js/controllers', 'assets/js/renderers'];
  const forbidden = [
    /fetch\s*\(\s*['"`]\s*\/auth\//,
    /fetch\s*\(\s*['"`]\s*\/users\//,
    /fetch\s*\(\s*['"`]\s*\/profiles\//,
    /fetch\s*\(\s*['"`]\s*\/orders\b/,
    /fetch\s*\(\s*['"`]\s*\/conversations\b/,
    /fetch\s*\(\s*['"`]\s*\/notifications\b/,
    /fetch\s*\(\s*['"`]\s*\/wallet\b/,
    /fetch\s*\(\s*['"`]\s*\/withdrawals\b/,
    /fetch\s*\(\s*['"`]\s*\/disputes\b/,
    /supabase\.from\s*\(/,
    /createClient\s*\([^)]*supabase/i
  ];
  const files = checkedRoots.flatMap((rootDir) => collectFiles(rootDir, (file) => file.endsWith('.js')));
  const offenders = [];
  files.forEach((file) => {
    const source = read(file);
    forbidden.forEach((pattern) => {
      if (pattern.test(source)) offenders.push(file + ' matches ' + pattern);
    });
  });
  if (offenders.length) offenders.forEach(fail);
  else pass('pages/controllers/renderers do not call Doke backend endpoints directly');
}

const packageJson = JSON.parse(read('package.json'));
expectScript(packageJson, 'audit:mvp-controlled-readiness', 'audit-mvp-controlled-readiness.js');
[
  'audit:data-provider-flags',
  'audit:auth-real-contract',
  'audit:identity-profile-contract',
  'audit:orders-api-contract',
  'audit:messages-api-contract',
  'audit:notifications-api-contract',
  'audit:wallet-api-contract',
  'audit:security-permission-contract'
].forEach((scriptName) => expectScript(packageJson, scriptName));

const contractFile = 'assets/js/contracts/mvp-controlled-flow-contract.js';
const contract = expectFile(contractFile);
expectIncludes(contractFile, contract, [
  'Doke.mvpControlledFlowContract',
  'happy_path_release',
  'dispute_release_professional',
  'dispute_refund_client',
  'withdrawal_approved',
  'withdrawal_declined',
  'client_admin_denied',
  'professional_cross_scope_denied',
  'readinessGates',
  'roleMatrix'
]);

const permissions = expectFile('assets/js/core/permissions.js');
expectIncludes('assets/js/core/permissions.js', permissions, [
  'assertResourceAccess',
  'assertAdminAction',
  'auditSecurityEvent',
  'listSecurityAuditEvents',
  'canAccessOrder',
  'canAccessConversation',
  'canAccessNotification',
  'canAccessWalletOwner',
  'canResolveDispute',
  'canResolveWithdrawal'
]);

const repositoryBoundary = expectFile('assets/js/services/repository-boundary.js');
expectIncludes('assets/js/services/repository-boundary.js', repositoryBoundary, [
  'getDataProviderStatus',
  'configureProvider',
  'canUseProvider',
  'setProvider',
  'create',
  'update',
  'remove',
  'action'
]);

const serviceContracts = {
  'assets/js/services/auth-service.js': ['getAuthProviderStatus', 'signIn', 'register', 'currentSession', 'signOut', 'getCurrentIdentity'],
  'assets/js/services/orders-service.js': ['getOrdersProviderStatus', 'create', 'listForCurrentUser', 'getById', 'accept', 'decline', 'quote', 'start', 'complete', 'updateStatus'],
  'assets/js/services/message-service.js': ['getMessagesProviderStatus', 'listConversations', 'getConversationById', 'createConversationForOrder', 'updateConversationOrder', 'sendMessage', 'markAsRead', 'unreadCount'],
  'assets/js/services/notification-service.js': ['getNotificationsProviderStatus', 'listLocal', 'create', 'markAsRead', 'dismiss', 'markAllAsRead', 'unreadCount'],
  'assets/js/services/wallet-service.js': ['getWalletProviderStatus', 'getWallet', 'listTransactions', 'listAuditEvents', 'requestWithdraw', 'resolveWithdraw', 'openDispute', 'respondDispute', 'resolveDispute']
};
Object.entries(serviceContracts).forEach(([file, tokens]) => expectIncludes(file, expectFile(file), tokens));

expectIncludes('assets/js/services/orders-service.js', read('assets/js/services/orders-service.js'), ['assertOrderTransitionAccess', 'security.canAccessOrder']);
expectIncludes('assets/js/services/message-service.js', read('assets/js/services/message-service.js'), ['assertConversationAccess', 'security.canAccessConversation']);
expectIncludes('assets/js/services/notification-service.js', read('assets/js/services/notification-service.js'), ['assertNotificationAccess', 'security.canAccessNotification']);
expectIncludes('assets/js/services/wallet-service.js', read('assets/js/services/wallet-service.js'), ['assertWalletOwner', 'assertAdminAction']);

assertNoDirectBackendCalls();

[
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/DATA-READY-CONTRACTS.md',
  'docs/VALIDATION.md'
].forEach((file) => {
  const content = expectFile(file);
  expectIncludes(file, content, ['Sprint 14', 'audit:mvp-controlled-readiness']);
});

if (failures.length) {
  console.error('\nMVP controlled readiness audit failed with ' + failures.length + ' issue(s).');
  process.exit(1);
}

console.log('\nMVP controlled readiness audit passed.');

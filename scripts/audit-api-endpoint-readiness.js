#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(absolute, 'utf8');
}

function requireSnippet(file, snippet) {
  const source = read(file);
  if (!source.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
}

function requireJson(file) {
  const source = read(file);
  try {
    return JSON.parse(source);
  } catch (error) {
    failures.push(`${file} is invalid JSON: ${error.message}`);
    return null;
  }
}

function safeRequire(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const registry = safeRequire('backend/shared/http/route-registry.js');
const loader = safeRequire('backend/shared/http/module-route-loader.js');
const actions = requireJson('backend/shared/contracts/api-actions.json');
const packageJson = requireJson('package.json');

if (registry) {
  const routes = registry.listRoutes ? registry.listRoutes() : [];
  const routeNames = routes.map((route) => route.name);
  const requiredRoutes = [
    'auth.login',
    'auth.register',
    'auth.session',
    'users.current',
    'profiles.current',
    'orders.list',
    'orders.create',
    'orders.accept',
    'orders.decline',
    'orders.quote',
    'messages.send',
    'messages.markRead',
    'notifications.list',
    'notifications.read',
    'wallet.summary',
    'wallet.transactions',
    'wallet.saveBankAccount',
    'withdrawals.request',
    'withdrawals.approve',
    'withdrawals.decline',
    'disputes.open',
    'disputes.respond',
    'disputes.release',
    'disputes.refund',
    'receipts.get',
    'auditEvents.list'
  ];

  requiredRoutes.forEach((name) => {
    if (!routeNames.includes(name)) failures.push(`route registry missing route: ${name}`);
  });

  routes.forEach((route) => {
    ['name', 'method', 'path', 'module', 'handler', 'scope'].forEach((key) => {
      if (!route[key]) failures.push(`${route.name || '(unknown route)'} missing ${key}`);
    });
    if (!Array.isArray(route.allowedRoles) || route.allowedRoles.length === 0) {
      failures.push(`${route.name} must declare allowedRoles`);
    }
    if (route.serviceRoleRequired && !route.allowedRoles.some((role) => role === 'support' || role === 'admin')) {
      failures.push(`${route.name} requires service role but does not allow support/admin`);
    }
  });

  if (actions && Array.isArray(actions.serverActions)) {
    actions.serverActions.forEach((action) => {
      const route = routes.find((candidate) => candidate.name === action.name);
      if (!route) {
        failures.push(`API action ${action.name} is not represented in route registry`);
        return;
      }
      if (route.method !== action.method) failures.push(`${action.name} method mismatch: ${route.method} !== ${action.method}`);
      if (route.path !== action.path) failures.push(`${action.name} path mismatch: ${route.path} !== ${action.path}`);
      if (route.scope !== action.scope) failures.push(`${action.name} scope mismatch: ${route.scope} !== ${action.scope}`);
      if (route.idempotencyRequired !== action.idempotencyRequired) failures.push(`${action.name} idempotency mismatch`);
      if (route.auditRequired !== action.auditRequired) failures.push(`${action.name} audit mismatch`);
      action.allowedRoles.forEach((role) => {
        if (!route.allowedRoles.includes(role)) failures.push(`${action.name} missing role in route registry: ${role}`);
      });
    });
  }
}

if (loader && registry) {
  const moduleRoutes = loader.listModuleRoutes ? loader.listModuleRoutes() : [];
  if (moduleRoutes.length !== registry.listRoutes().length) {
    failures.push('module route loader must expose every route from route registry');
  }
}

[
  'backend/shared/http/create-action-handler.js',
  'backend/shared/security/backend-permission-contract.js',
  'backend/shared/security/idempotency-contract.js',
  'backend/shared/security/audit-event-contract.js',
  'backend/shared/database/supabase-service-client.js',
  'backend/modules/auth/route-handlers.js',
  'backend/modules/orders/route-handlers.js',
  'backend/modules/messaging/route-handlers.js',
  'backend/modules/notifications/route-handlers.js',
  'backend/modules/wallet/route-handlers.js',
  'backend/modules/admin/route-handlers.js',
  'supabase/tests/001_rls_matrix_validation.sql',
  'supabase/tests/002_idempotency_and_audit_validation.sql',
  'supabase/tests/003_policy_negative_cases.sql'
].forEach((file) => read(file));

requireSnippet('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md', 'supabase db reset');
requireSnippet('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md', 'RLS matrix');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'backend/shared/http/route-registry.js');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'x-idempotency-key');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 16');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:api-endpoint-readiness');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'docs/API-ENDPOINT-READINESS.md');
requireSnippet('docs/VALIDATION.md', 'audit:api-endpoint-readiness');
requireSnippet('docs/SUPABASE-BACKEND-READINESS.md', 'Sprint 16');

if (!packageJson || !packageJson.scripts || packageJson.scripts['audit:api-endpoint-readiness'] !== 'node scripts/audit-api-endpoint-readiness.js') {
  failures.push('package.json missing audit:api-endpoint-readiness script.');
}

if (failures.length) {
  console.error('API endpoint readiness audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('API endpoint readiness audit passed.');
console.log('Backend endpoints are registered as framework-neutral contracts; frontend provider remains gated.');

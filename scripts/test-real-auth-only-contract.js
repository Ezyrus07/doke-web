#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const auth = read('assets/js/services/auth-service.js');
const legacy = read('assets/js/core/auth-service.js');
const users = read('assets/js/repositories/users-repository.js');
const header = read('assets/js/core/header-auth-surface-early.js');
const login = read('auth/login.html');
const signup = read('auth/cadastro.html');
const mockUsers = JSON.parse(read('assets/data/mock-users.json'));

for (const token of ['signInWithPassword', 'signUp', 'isSupabaseAuthRequired', 'login local/demo está desativado']) {
  if (!auth.includes(token)) failures.push(`auth-service missing ${token}`);
}

if (!legacy.includes('AUTH-A08_RETIRED_AUTHORITY')) {
  failures.push('legacy auth path is not marked as the AUTH-A08 retired authority tombstone');
}
for (const forbidden of [
  '(function',
  'localStorage.',
  'sessionStorage.',
  'createClient(',
  'window.DokeAuth',
  'signInWithPassword',
  'signUp(',
  'requestRecovery',
  'resetPassword'
]) {
  if (legacy.includes(forbidden)) failures.push(`retired auth tombstone still contains executable authority token: ${forbidden}`);
}
for (const marker of ['doke.auth.session.v2', 'doke.auth.users.v1', 'doke.auth.recovery.v1']) {
  if (!legacy.includes(marker)) failures.push(`retired auth tombstone is missing documented legacy marker: ${marker}`);
}

for (const token of [
  'Authentication, registration and password authority belong exclusively to Supabase Auth.',
  'const withoutCredentials',
  'const loadSeededUsers = async () => []',
  'DEMO_IDENTIFIERS'
]) {
  if (!users.includes(token)) failures.push(`users-repository missing ${token}`);
}
for (const forbidden of [
  'const create =',
  'const hashPassword =',
  'const updatePassword =',
  'passwordHash: await',
  'return `plain:${value}`',
  '\n    create,',
  '\n    hashPassword,',
  '\n    updatePassword,'
]) {
  if (users.includes(forbidden)) failures.push(`users-repository still contains retired local credential authority: ${forbidden.trim()}`);
}
for (const token of ['purgeLegacyDemoAuth', 'isDemoIdentity']) {
  if (!header.includes(token)) failures.push(`header early auth missing ${token}`);
}
if (!Array.isArray(mockUsers) || mockUsers.length !== 0) failures.push('mock-users.json must be empty');

for (const [file, html] of [['auth/login.html', login], ['auth/cadastro.html', signup]]) {
  if (!html.includes('@supabase/supabase-js@2')) failures.push(`${file} missing Supabase SDK`);
  if (!html.includes('assets/js/core/supabase-config.js')) failures.push(`${file} missing Supabase config`);
  for (const forbidden of ['auth-social', 'Continuar com Google', 'Continuar com Facebook', 'Continuar com Apple']) {
    if (html.includes(forbidden)) failures.push(`${file} still advertises unconfigured provider control: ${forbidden}`);
  }
}

if (!/<input\b[^>]*id=["']email-login["'][^>]*type=["']email["']/i.test(login)) {
  failures.push('auth/login.html must expose an email input as the canonical login identifier');
}
for (const forbidden of ['E-mail ou telefone', '99999-9999', 'data-phone-mask']) {
  if (login.includes(forbidden)) failures.push(`auth/login.html still advertises unconfigured phone login: ${forbidden}`);
}

if (failures.length) {
  console.error('Real auth only contract failed:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Real auth only contract passed.');
console.log('- dormant browser authority is a non-executable tombstone');
console.log('- local user data is read-only and credential-free');
console.log('- login is email-only');
console.log('- unconfigured OAuth controls are absent from login and signup');

#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const errors = [];

const files = Object.freeze({
  signup: 'auth/cadastro.html',
  canonicalService: 'assets/js/services/auth-service.js',
  registrationAuthority: 'assets/js/services/auth-registration-authority.js',
  controller: 'assets/js/pages/auth.js',
  migration: 'supabase/migrations/146_auth_registration_username_authority.sql',
  validation: 'supabase/tests/015_auth_registration_username_authority_validation.sql',
  runtimeTest: 'scripts/test-auth-registration-username-runtime.js'
});

for (const file of Object.values(files)) {
  if (!fs.existsSync(path.join(root, file))) errors.push(`Missing AUTH-A04 file: ${file}`);
}

if (!errors.length) {
  const signup = read(files.signup);
  const sources = Array.from(signup.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi))
    .map((match) => match[1].split('?')[0].replace(/^\.\.\//, ''));
  const expectedOrder = [
    files.canonicalService,
    files.registrationAuthority,
    files.controller
  ];

  let previousIndex = -1;
  for (const file of expectedOrder) {
    const index = sources.indexOf(file);
    if (index === -1) errors.push(`${files.signup} does not load ${file}`);
    if (index !== -1 && index <= previousIndex) errors.push(`${files.signup} loads ${file} outside AUTH-A04 order`);
    previousIndex = Math.max(previousIndex, index);
  }

  const authority = read(files.registrationAuthority);
  for (const token of [
    "version: 'AUTH-A04'",
    "client.rpc('check_username_availability'",
    'authority_unavailable',
    'signup race',
    'ns.registrationAuthority = api;',
    'ns.checkUsernameAvailability = checkUsernameAvailability;',
    'ns.register = register;'
  ]) {
    if (!authority.includes(token)) errors.push(`${files.registrationAuthority} missing token: ${token}`);
  }
  for (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', 'access_token', 'refresh_token', 'service_role']) {
    if (authority.includes(forbidden)) errors.push(`${files.registrationAuthority} contains forbidden persistence/credential token: ${forbidden}`);
  }

  const canonical = read(files.canonicalService);
  for (const token of ['signUp', 'options: { data: { name, handle', 'pendingConfirmation']) {
    if (!canonical.includes(token)) errors.push(`${files.canonicalService} missing registration token: ${token}`);
  }

  const controller = read(files.controller);
  for (const token of ['checkUsernameAvailability(handle)', 'authService.register({ name, handle: usernameCheck.handle']) {
    if (!controller.includes(token)) errors.push(`${files.controller} missing signup authority consumer token: ${token}`);
  }

  const migration = read(files.migration);
  for (const token of [
    'public.normalize_username',
    'public.is_reserved_username',
    'public.is_valid_username',
    'public.check_username_availability',
    'trg_enforce_user_profile_username',
    'zz_enforce_requested_auth_username_doke',
    'DOKE_IDENTITY_USERNAME_TAKEN',
    'grant execute on function public.check_username_availability(text) to anon, authenticated, service_role'
  ]) {
    if (!migration.includes(token)) errors.push(`${files.migration} missing authority token: ${token}`);
  }
  if (migration.includes('grant all')) errors.push(`${files.migration} cannot grant broad privileges`);

  const validation = read(files.validation);
  for (const token of ['begin;', 'AUTH_A04_SIGNUP_RACE_NOT_BLOCKED', 'AUTH_A04_RESERVED_SIGNUP_NOT_BLOCKED', 'rollback;']) {
    if (!validation.includes(token)) errors.push(`${files.validation} missing validation token: ${token}`);
  }
}

if (errors.length) {
  console.error('AUTH-A04 registration authority audit failed:');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(JSON.stringify({
  authA04RegistrationAuthority: true,
  canonicalSignupOrder: true,
  realAvailabilityRpc: true,
  transactionalRaceGuard: true,
  browserPersistenceAdded: false,
  sqlRollbackValidation: true
}));

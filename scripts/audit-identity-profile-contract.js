#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  'assets/js/core/session.js',
  'assets/js/services/auth-service.js',
  'assets/js/repositories/users-repository.js',
  'assets/js/services/api-repository-provider.js',
  'assets/js/contracts/identity-profile-contract.js',
  'docs/AUTH-INTEGRATION-CONTRACT.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/API-ADAPTER-CONTRACT.md'
];

const requiredTerms = {
  'assets/js/core/session.js': ['normalizeProfile', 'getCurrentProfile', 'profiles:', 'publicProfileUrl'],
  'assets/js/services/auth-service.js': ['currentUser', 'currentProfile', 'refreshCurrentIdentity', 'updateCurrentProfile', 'getCurrentIdentity'],
  'assets/js/repositories/users-repository.js': ['PROFILE_STORAGE_KEY', 'updateCurrentUser', 'updateCurrentProfile', 'normalizeProfile'],
  'assets/js/services/api-repository-provider.js': ['currentUser', 'currentProfile', 'profiles', '/profiles/me'],
  'assets/js/contracts/identity-profile-contract.js': ['identityProfileContract', 'normalizeIdentity', '/users/me', '/profiles/me'],
  'docs/AUTH-INTEGRATION-CONTRACT.md': ['Sprint 12B', '/users/me', '/profiles/me'],
  'docs/BACKEND-INTEGRATION-PLAN.md': ['Sprint 12B', 'Usuários e perfis'],
  'docs/API-ADAPTER-CONTRACT.md': ['Sprint 12B', 'profiles']
};

let failed = false;
for (const file of requiredFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    console.error(`[identity-profile-contract] missing file: ${file}`);
    failed = true;
    continue;
  }
  const content = fs.readFileSync(full, 'utf8');
  for (const term of requiredTerms[file] || []) {
    if (!content.includes(term)) {
      console.error(`[identity-profile-contract] ${file} missing required term: ${term}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('[identity-profile-contract] OK');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const auth = read('assets/js/services/auth-service.js');
const users = read('assets/js/repositories/users-repository.js');
const header = read('assets/js/core/header-auth-surface-early.js');
const mockUsers = JSON.parse(read('assets/data/mock-users.json'));
for (const token of ['signInWithPassword', 'signUp', 'isSupabaseAuthRequired', 'login local/demo está desativado']) {
  if (!auth.includes(token)) failures.push(`auth-service missing ${token}`);
}
for (const token of ['const FALLBACK_USERS = Object.freeze([])', 'const loadSeededUsers = async () => []', 'DEMO_IDENTIFIERS']) {
  if (!users.includes(token)) failures.push(`users-repository missing ${token}`);
}
for (const token of ['purgeLegacyDemoAuth', 'isDemoIdentity']) {
  if (!header.includes(token)) failures.push(`header early auth missing ${token}`);
}
if (!Array.isArray(mockUsers) || mockUsers.length !== 0) failures.push('mock-users.json must be empty');
for (const file of ['auth/login.html', 'auth/cadastro.html']) {
  const html = read(file);
  if (!html.includes('@supabase/supabase-js@2')) failures.push(`${file} missing Supabase SDK`);
  if (!html.includes('assets/js/core/supabase-config.js')) failures.push(`${file} missing Supabase config`);
}
if (failures.length) {
  console.error('Real auth only contract failed:');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('Real auth only contract passed.');

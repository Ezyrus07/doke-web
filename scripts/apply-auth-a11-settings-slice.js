#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(root, file), content.replace(/\r\n/g, '\n'));
}

function replaceOnce(source, search, replacement, label) {
  const first = source.indexOf(search);
  if (first === -1) throw new Error(`Missing ${label}`);
  if (source.indexOf(search, first + search.length) !== -1) throw new Error(`Ambiguous ${label}`);
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

function replaceRegexOnce(source, pattern, replacement, label) {
  const matches = source.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g')) || [];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, received ${matches.length}`);
  return source.replace(pattern, replacement);
}

function updateProfileService() {
  const file = 'assets/js/services/profile-service.js';
  let source = read(file);

  source = replaceOnce(
    source,
    "  var canonicalProfileCache = null;\n  var canonicalProfileUserId = '';\n",
    "  var canonicalProfileCache = null;\n  var canonicalProfileUserId = '';\n  var canonicalSettingsCache = null;\n  var canonicalSettingsUserId = '';\n",
    'profile settings cache declaration'
  );

  source = replaceOnce(
    source,
    "\n  function authService() {\n    return window.DokeAuth && window.DokeAuth.service ? window.DokeAuth.service : null;\n  }\n",
    '\n',
    'profile authService helper'
  );

  const profileEventBlock = "  function dispatchProfileEvent(type, user, profile) {\n    window.dispatchEvent(new CustomEvent(type, {\n      detail: {\n        userId: user.id,\n        profileId: profile && profile.id,\n        profile: profile || null,\n        source: 'server',\n        reconciled: true\n      }\n    }));\n  }\n";

  const settingsHelpers = `${profileEventBlock}\n  function normalizeCanonicalSettings(identityState, user) {\n    var state = identityState && typeof identityState === 'object' ? identityState : {};\n    var expectedUserId = String(user && user.id || '');\n    var stateUserId = String(state.userId || '');\n    var settings = state.settings;\n\n    if (!expectedUserId || !settings || typeof settings !== 'object' || Array.isArray(settings)) {\n      throw reconciliationError('O servidor não devolveu configurações canônicas válidas.', 'DOKE_SETTINGS_RECONCILIATION_INVALID');\n    }\n    if (stateUserId && stateUserId !== expectedUserId) {\n      throw reconciliationError('As configurações devolvidas não pertencem à sessão atual.', 'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH');\n    }\n\n    return Object.freeze(Object.assign({}, settings));\n  }\n\n  function cacheCanonicalSettings(settings, userId) {\n    canonicalSettingsCache = settings || null;\n    canonicalSettingsUserId = settings ? String(userId || '') : '';\n    return canonicalSettingsCache;\n  }\n\n  function getCachedSettings(user) {\n    if (!user || String(user.id || '') !== canonicalSettingsUserId) return null;\n    return canonicalSettingsCache;\n  }\n\n  function dispatchSettingsEvent(type, user, settings) {\n    window.dispatchEvent(new CustomEvent(type, {\n      detail: {\n        userId: user.id,\n        settings: settings || {},\n        source: 'server',\n        reconciled: true\n      }\n    }));\n  }\n`;
  source = replaceOnce(source, profileEventBlock, settingsHelpers, 'profile event helper');

  const oldSettings = `  function getCurrentSettings() {\n    var user = currentUser();\n    if (!user || !user.id) return Promise.resolve({});\n    if (usesSupabaseProvider()) return Promise.resolve(user.settings || {});\n    var repository = usersRepository();\n    if (!repository || typeof repository.getCurrentSettings !== 'function') return Promise.resolve(user.settings || {});\n    return Promise.resolve(repository.getCurrentSettings(user.id));\n  }\n\n  function updateCurrentSettings(settings) {\n    var user = currentUser();\n    var auth = authService();\n    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));\n    if (usesSupabaseProvider()) {\n      if (!auth || typeof auth.updateCurrentUser !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));\n      return auth.updateCurrentUser({ settings: settings || {} }).then(function (updatedUser) { return updatedUser.settings || {}; });\n    }\n    var repository = usersRepository();\n    if (!repository || typeof repository.updateCurrentSettings !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));\n    return repository.updateCurrentSettings(user.id, settings || {}).then(function (updatedUser) {\n      if (Doke.session && typeof Doke.session.setCurrentUser === 'function') Doke.session.setCurrentUser(updatedUser);\n      return updatedUser.settings || {};\n    });\n  }\n`;

  const newSettings = `  function getCurrentSettings() {\n    var user = currentUser();\n    if (!user || !user.id) return Promise.resolve({});\n    var cachedSettings = getCachedSettings(user);\n    if (cachedSettings) return Promise.resolve(cachedSettings);\n    if (usesSupabaseProvider()) return Promise.resolve(user.settings || {});\n    var repository = usersRepository();\n    if (!repository || typeof repository.getCurrentSettings !== 'function') return Promise.resolve(user.settings || {});\n    return Promise.resolve(repository.getCurrentSettings(user.id));\n  }\n\n  function refreshCurrentSettings() {\n    var user = currentUser();\n    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para atualizar as preferências.'));\n    if (!usesSupabaseProvider()) return getCurrentSettings();\n\n    return invokeSelfService('get_account_identity_state', {}).then(function (identityState) {\n      var settings = normalizeCanonicalSettings(identityState, user);\n      cacheCanonicalSettings(settings, user.id);\n      dispatchSettingsEvent('doke:settings-reconciled', user, settings);\n      return settings;\n    });\n  }\n\n  function updateCurrentSettings(settings) {\n    var user = currentUser();\n    if (!user || !user.id) return Promise.reject(new Error('Entre na sua conta para salvar as preferências.'));\n    if (usesSupabaseProvider()) {\n      return invokeSelfService('update_account_settings', { p_settings: settings || {} }).then(function (identityState) {\n        var nextSettings = normalizeCanonicalSettings(identityState, user);\n        cacheCanonicalSettings(nextSettings, user.id);\n        dispatchSettingsEvent('doke:settings-updated', user, nextSettings);\n        return nextSettings;\n      });\n    }\n    var repository = usersRepository();\n    if (!repository || typeof repository.updateCurrentSettings !== 'function') return Promise.reject(new Error('Persistência das preferências indisponível.'));\n    return repository.updateCurrentSettings(user.id, settings || {}).then(function (updatedUser) {\n      if (Doke.session && typeof Doke.session.setCurrentUser === 'function') Doke.session.setCurrentUser(updatedUser);\n      return updatedUser.settings || {};\n    });\n  }\n`;
  source = replaceOnce(source, oldSettings, newSettings, 'profile settings authority block');
  source = replaceOnce(
    source,
    '    getCurrentSettings: getCurrentSettings,\n    updateCurrentSettings: updateCurrentSettings,',
    '    getCurrentSettings: getCurrentSettings,\n    refreshCurrentSettings: refreshCurrentSettings,\n    updateCurrentSettings: updateCurrentSettings,',
    'profile settings exports'
  );

  write(file, source);
}

function updateAuthService() {
  const file = 'assets/js/services/auth-service.js';
  let source = read(file);

  source = replaceOnce(source, "  const DELAY_MS = 120;\n", '', 'auth delay constant');
  source = replaceOnce(source, "  const delay = (ms = DELAY_MS) => new Promise((resolve) => root.setTimeout(resolve, ms));\n", '', 'auth delay helper');
  source = replaceOnce(source, "  const getUsersRepository = () => ns.repositories?.users || null;\n", '', 'auth users repository helper');

  source = replaceRegexOnce(
    source,
    /\n  const toPublicUser = \(user\) => \{[\s\S]*?\n  const reconcileSupabaseSession =/,
    '\n  const reconcileSupabaseSession =',
    'auth legacy public-user session builders'
  );

  source = replaceRegexOnce(
    source,
    /\n  const updateCurrentUser = async \(patch = \{\}\) => \{[\s\S]*?\n  const getSession =/,
    '\n  const getSession =',
    'auth settings mutation facade'
  );

  source = replaceRegexOnce(
    source,
    /\n  const setSessionForUser = \(user, options = \{\}\) => \{[\s\S]*?\n  const login =/,
    '\n  const login =',
    'auth mock session writer'
  );

  source = replaceOnce(source, '    updateCurrentUser,\n', '', 'auth API updateCurrentUser export');
  write(file, source);
}

function updateSessionAuthority() {
  const file = 'assets/js/services/auth-session-authority.js';
  let source = read(file);

  source = replaceRegexOnce(
    source,
    /\n  const identityMutationError = \(\) => \{[\s\S]*?\n\n  const resolveLoginRedirect =/,
    '\n  const resolveLoginRedirect =',
    'session identity mutation facade'
  );
  source = replaceOnce(source, '    updateCurrentUser,\n', '', 'session authority API updateCurrentUser');
  source = replaceOnce(source, '      updateCurrentUser,\n', '', 'session facade updateCurrentUser');
  source = replaceOnce(source, '    ns.updateCurrentUser = updateCurrentUser;\n    delete ns.updateCurrentProfile;\n', '    delete ns.updateCurrentUser;\n    delete ns.updateCurrentProfile;\n', 'session namespace mutation retirement');
  write(file, source);
}

function updateSessionRuntime() {
  const file = 'tests/auth/test-auth-session-lifecycle-runtime.js';
  let source = read(file);
  const oldContract = `for (const token of [\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  "keys.length === 1 && keys[0] === 'settings'",\n  'updateCurrentUser'\n]) {\n  assert(sessionAuthoritySource.includes(token), \`Session authority is missing identity guard token: \${token}\`);\n}\n\n  assert(authServiceSource.includes("keys.length !== 1 || keys[0] !== 'settings'"), 'Canonical auth service is missing the settings-only mutation guard.');\n  assert(!authServiceSource.includes('updateCurrentProfile'), 'Canonical auth service still exposes updateCurrentProfile.');`;
  const newContract = `for (const retired of ['updateCurrentUser', 'updateCurrentProfile']) {\n  assert(!authServiceSource.includes(retired), \`Canonical auth service still exposes retired mutation facade: \${retired}.\`);\n  assert(!sessionAuthoritySource.includes('const ' + retired), \`Session authority still implements retired mutation facade: \${retired}.\`);\n  assert(!sessionAuthoritySource.includes(retired + ','), \`Session authority still publishes retired mutation facade: \${retired}.\`);\n}\n  assert(sessionAuthoritySource.includes('delete ns.updateCurrentUser;'), 'Session authority does not actively retire updateCurrentUser.');\n  assert(!authServiceSource.includes('updateCurrentProfile'), 'Canonical auth service still exposes updateCurrentProfile.');`;
  source = replaceOnce(source, oldContract, newContract, 'session runtime mutation contract');

  const oldRuntime = `await expectCode(\n  () => runtime.window.DokeAuth.service.updateCurrentUser({ email: 'forbidden@staging.example' }),\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY'\n);\nassert.strictEqual(\n  typeof runtime.window.DokeAuth.service.updateCurrentProfile,`;
  const newRuntime = `assert.strictEqual(\n  typeof runtime.window.DokeAuth.service.updateCurrentUser,\n  'undefined',\n  'Retired user mutation facade remains on DokeAuth.service.'\n);\nassert.strictEqual(\n  typeof runtime.window.DokeAuth.updateCurrentUser,\n  'undefined',\n  'Retired user mutation facade remains on DokeAuth.'\n);\nassert.strictEqual(\n  typeof runtime.window.DokeAuth.service.updateCurrentProfile,`;
  source = replaceOnce(source, oldRuntime, newRuntime, 'session runtime facade assertion');
  write(file, source);
}

function updateSessionAudit() {
  const file = 'scripts/audit-auth-session-contracts.js';
  let source = read(file);
  source = replaceOnce(
    source,
    "  'ns.service = facade;',\n  'DOKE_AUTH_IDENTITY_MUTATION_REQUIRES_REMOTE_AUTHORITY',\n  'updateCurrentUser'\n",
    "  'ns.service = facade;'\n",
    'session audit required mutation tokens'
  );
  source = replaceOnce(
    source,
    "for (const retired of ['updateCurrentProfile']) {",
    "for (const retired of ['updateCurrentProfile', 'updateCurrentUser']) {",
    'session audit retired facade list'
  );
  source = replaceOnce(
    source,
    "}\nfor (const forbidden of ['localStorage.setItem'",
    "}\nif (!sessionAuthoritySource.includes('delete ns.updateCurrentUser;')) errors.push(`${SESSION_AUTHORITY} does not actively retire updateCurrentUser`);\nfor (const forbidden of ['localStorage.setItem'",
    'session audit namespace retirement'
  );
  write(file, source);
}

function writeSettingsRuntime() {
  const file = 'tests/auth/test-auth-settings-reconciliation-runtime.js';
  const content = `#!/usr/bin/env node\n'use strict';\n\nconst fs = require('fs');\nconst path = require('path');\nconst vm = require('vm');\nconst assert = require('assert');\n\nconst root = path.resolve(__dirname, '../..');\nconst profileSource = fs.readFileSync(path.join(root, 'assets/js/services/profile-service.js'), 'utf8');\nconst authSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');\nconst sessionAuthoritySource = fs.readFileSync(path.join(root, 'assets/js/services/auth-session-authority.js'), 'utf8');\n\nfunction createRuntime() {\n  const user = {\n    id: '00000000-0000-4000-8000-000000000012',\n    name: 'Gabriel Antonio',\n    handle: 'gabrielantonio',\n    role: 'client',\n    type: 'client',\n    settings: { notifications: { messages: true }, privacy: { publicProfile: true } }\n  };\n  const session = { provider: 'supabase', user };\n  const calls = [];\n  const events = [];\n  let setCurrentUserCalls = 0;\n  let handler = async (action) => {\n    if (action === 'update_account_settings') {\n      return {\n        userId: user.id,\n        settings: { notifications: { messages: false }, privacy: { publicProfile: false } },\n        updatedAt: '2026-07-26T02:00:00.000Z'\n      };\n    }\n    if (action === 'get_account_identity_state') {\n      return { userId: user.id, settings: { notifications: { messages: true }, privacy: { publicProfile: false } }, profile: {} };\n    }\n    throw new Error('Unexpected action: ' + action);\n  };\n\n  const window = {\n    Doke: {\n      services: {},\n      session: {\n        getCurrentUser() { return user; },\n        getSession() { return session; },\n        setCurrentUser() {\n          setCurrentUserCalls += 1;\n          throw new Error('Supabase settings reconciliation must not rewrite the session manually.');\n        }\n      }\n    },\n    DokeAuth: { repositories: { users: {} }, service: {} },\n    DokeSupabase: {\n      getClient() { return null; },\n      invokeSelfService(action, params) {\n        calls.push({ action, params });\n        return Promise.resolve().then(() => handler(action, params));\n      }\n    },\n    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },\n    dispatchEvent(event) { events.push(event); return true; }\n  };\n  window.window = window;\n  const sandbox = {\n    window,\n    document: { documentElement: { setAttribute() {} } },\n    CustomEvent: function CustomEvent(type, options = {}) { this.type = type; this.detail = options.detail; },\n    FileReader: function FileReader() {},\n    Promise, Object, Array, String, Number, Boolean, Math, Date, RegExp, Error, console\n  };\n  vm.createContext(sandbox);\n  vm.runInContext(profileSource, sandbox, { filename: 'profile-service.js' });\n  return {\n    service: window.Doke.services.profile,\n    user, session, calls, events,\n    getSetCurrentUserCalls: () => setCurrentUserCalls,\n    setHandler(next) { handler = next; }\n  };\n}\n\nasync function main() {\n  assert(!profileSource.includes('authService()'), 'Profile settings still depend on the auth facade.');\n  assert(!profileSource.includes('auth.updateCurrentUser'), 'Profile settings still call the auth mutation facade.');\n  assert(!authSource.includes('updateCurrentUser'), 'Canonical auth service still exposes updateCurrentUser.');\n  assert(!sessionAuthoritySource.includes('const updateCurrentUser'), 'Session authority still implements updateCurrentUser.');\n  assert(sessionAuthoritySource.includes('delete ns.updateCurrentUser;'), 'Session authority does not actively retire updateCurrentUser.');\n\n  const runtime = createRuntime();\n  const before = JSON.stringify(runtime.session);\n  const settings = await runtime.service.updateCurrentSettings({\n    notifications: { messages: false },\n    privacy: { publicProfile: false },\n    account: { email: 'forbidden@example.test' },\n    role: 'admin'\n  });\n\n  assert.strictEqual(runtime.calls[0].action, 'update_account_settings');\n  assert.deepStrictEqual(runtime.calls[0].params.p_settings.account, { email: 'forbidden@example.test' });\n  assert.strictEqual(settings.notifications.messages, false);\n  assert.strictEqual(settings.privacy.publicProfile, false);\n  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'account'), false, 'Server-filtered protected settings were restored by the browser.');\n  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'role'), false, 'Server-filtered role was restored by the browser.');\n  assert.strictEqual(JSON.stringify(runtime.session), before, 'Settings success rewrote the public session snapshot.');\n  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);\n  assert.strictEqual(runtime.events.at(-1).type, 'doke:settings-updated');\n  assert.strictEqual(runtime.events.at(-1).detail.source, 'server');\n  assert.strictEqual((await runtime.service.getCurrentSettings()).notifications.messages, false);\n\n  const eventCount = runtime.events.length;\n  runtime.setHandler(async () => {\n    const error = new Error('DOKE_SETTINGS_SECTION_INVALID');\n    error.code = 'DOKE_SETTINGS_SECTION_INVALID';\n    throw error;\n  });\n  await assert.rejects(\n    runtime.service.updateCurrentSettings({ privacy: 'invalid' }),\n    (error) => error && error.code === 'DOKE_SETTINGS_SECTION_INVALID'\n  );\n  assert.strictEqual(JSON.stringify(runtime.session), before, 'Failed settings mutation changed the public session.');\n  assert.strictEqual(runtime.events.length, eventCount, 'Failed settings mutation emitted a success event.');\n  assert.strictEqual((await runtime.service.getCurrentSettings()).notifications.messages, false, 'Failed settings mutation replaced the canonical cache.');\n\n  runtime.setHandler(async () => ({ userId: '00000000-0000-4000-8000-000000000099', settings: { privacy: {} } }));\n  await assert.rejects(\n    runtime.service.updateCurrentSettings({ privacy: {} }),\n    (error) => error && error.code === 'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH'\n  );\n  assert.strictEqual(runtime.events.length, eventCount, 'Settings subject mismatch emitted a success event.');\n\n  runtime.setHandler(async (action) => {\n    assert.strictEqual(action, 'get_account_identity_state');\n    return { userId: runtime.user.id, settings: { notifications: { messages: true }, privacy: { publicProfile: false } }, profile: {} };\n  });\n  const refreshed = await runtime.service.refreshCurrentSettings();\n  assert.strictEqual(refreshed.notifications.messages, true);\n  assert.strictEqual(runtime.events.at(-1).type, 'doke:settings-reconciled');\n  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);\n\n  console.log('AUTH-A11 settings reconciliation runtime passed.');\n  console.log('- settings mutation uses the narrow self-service authority');\n  console.log('- server filtering is authoritative and session snapshots are not rewritten');\n  console.log('- remote failure and subject mismatch preserve prior canonical settings');\n}\n\nmain().catch((error) => {\n  console.error('AUTH-A11 settings reconciliation runtime failed:');\n  console.error(error && error.stack || error);\n  process.exit(1);\n});\n`;
  write(file, content);
}

function rewriteProfileAudit() {
  const file = 'scripts/audit-auth-profile-reconciliation-contract.js';
  const content = `#!/usr/bin/env node\n'use strict';\n\nconst fs = require('fs');\nconst path = require('path');\n\nconst root = path.resolve(__dirname, '..');\nconst files = {\n  profile: 'assets/js/services/profile-service.js',\n  auth: 'assets/js/services/auth-service.js',\n  session: 'assets/js/services/auth-session-authority.js',\n  operations: 'supabase/functions/self-service-operations/operations.mjs',\n  migration: 'supabase/migrations/147_identity_profile_reconciliation_authority.sql',\n  validation: 'supabase/tests/016_identity_profile_reconciliation_authority_validation.sql',\n  profileRuntime: 'tests/auth/test-auth-profile-reconciliation-runtime.js',\n  settingsRuntime: 'tests/auth/test-auth-settings-reconciliation-runtime.js'\n};\nconst errors = [];\n\nfunction read(key) {\n  const file = files[key];\n  const full = path.join(root, file);\n  if (!fs.existsSync(full)) { errors.push('Missing AUTH-A11 file: ' + file); return ''; }\n  return fs.readFileSync(full, 'utf8');\n}\nfunction requireTokens(source, file, tokens) {\n  for (const token of tokens) if (!source.includes(token)) errors.push(file + ' missing AUTH-A11 token: ' + token);\n}\nfunction forbidTokens(source, file, tokens) {\n  for (const token of tokens) if (source.includes(token)) errors.push(file + ' contains forbidden AUTH-A11 token: ' + token);\n}\n\nconst profile = read('profile');\nconst auth = read('auth');\nconst session = read('session');\nconst operations = read('operations');\nconst migration = read('migration');\nconst validation = read('validation');\nread('profileRuntime');\nread('settingsRuntime');\n\nrequireTokens(profile, files.profile, [\n  "invokeSelfService('update_account_profile_reconciled'",\n  "invokeSelfService('update_account_settings'",\n  "invokeSelfService('get_account_identity_state'",\n  'normalizeCanonicalProfile',\n  'normalizeCanonicalSettings',\n  'refreshCurrentProfile',\n  'refreshCurrentSettings',\n  'DOKE_PROFILE_RECONCILIATION_SUBJECT_MISMATCH',\n  'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH',\n  "source: 'server'",\n  'reconciled: true'\n]);\nforbidTokens(profile, files.profile, [\n  'client.auth.updateUser',\n  '.catch(function () { return null; })',\n  "setCurrentUser(nextUser, { provider: 'supabase'",\n  'auth.updateCurrentUser',\n  'function authService()'\n]);\nforbidTokens(auth, files.auth, ['updateCurrentUser', "provider: 'mock'"]);\nforbidTokens(session, files.session, ['const updateCurrentUser', 'updateCurrentUser,']);\nrequireTokens(session, files.session, ['delete ns.updateCurrentUser;']);\nrequireTokens(operations, files.operations, ["'update_account_profile_reconciled'", "'update_account_settings'"]);\nrequireTokens(migration, files.migration, [\n  "when 'update_account_profile_reconciled' then",\n  'perform public.update_account_profile(',\n  'v_result := public.get_account_identity_state();',\n  "when 'get_account_identity_state' then",\n  "when 'update_account_settings' then"\n]);\nrequireTokens(validation, files.validation, [\n  "'update_account_profile_reconciled'",\n  "'update_account_settings'",\n  'AUTH_A11_RECONCILED_PROFILE_SUBJECT_MISMATCH',\n  'AUTH_A11_PROVIDER_METADATA_NOT_RECONCILED',\n  'AUTH_A11_PROTECTED_SETTING_ACCEPTED',\n  'AUTH_A11_PROTECTED_IDENTITY_MUTATED',\n  'rollback;'\n]);\n\nif (errors.length) {\n  console.error('AUTH-A11 profile/settings reconciliation audit failed:');\n  errors.forEach((error) => console.error('- ' + error));\n  process.exit(1);\n}\nconsole.log('AUTH-A11 profile/settings reconciliation audit passed.');\nconsole.log('- profile and settings mutations are server-authoritative');\nconsole.log('- browser auth mutation facades and Supabase session rewrites are absent');\nconsole.log('- migration, Edge allowlist and rollback validation are aligned');\n`;
  write(file, content);
}

function updateDomainAudit() {
  const file = 'scripts/audit-domain-services.js';
  let source = read(file);
  source = replaceOnce(
    source,
    "'assets/js/services/profile-service.js': ['services.profile', 'getCurrentProfile', 'refreshCurrentProfile'],",
    "'assets/js/services/profile-service.js': ['services.profile', 'getCurrentProfile', 'refreshCurrentProfile', 'refreshCurrentSettings'],",
    'domain profile contract'
  );
  source = replaceOnce(
    source,
    "execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-profile-reconciliation-runtime.js')], {\n  cwd: root,\n  stdio: 'inherit'\n});\n",
    "execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-profile-reconciliation-runtime.js')], {\n  cwd: root,\n  stdio: 'inherit'\n});\nexecFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-settings-reconciliation-runtime.js')], {\n  cwd: root,\n  stdio: 'inherit'\n});\n",
    'domain settings runtime chain'
  );
  write(file, source);
}

updateProfileService();
updateAuthService();
updateSessionAuthority();
updateSessionRuntime();
updateSessionAudit();
writeSettingsRuntime();
rewriteProfileAudit();
updateDomainAudit();

console.log('AUTH-A11 settings authority codemod applied.');

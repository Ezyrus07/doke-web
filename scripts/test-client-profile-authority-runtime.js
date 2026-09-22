#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const identityService = require('../backend/modules/auth/identity-service');
const profileServiceCode = fs.readFileSync(path.join(__dirname, '../assets/js/services/profile-service.js'), 'utf8');

function createSupabaseFixture(rows) {
  const selections = [];
  return {
    selections,
    auth: {
      async getUser() {
        return { data: { user: rows.authUser || null }, error: null };
      }
    },
    from(table) {
      return {
        select(columns) {
          selections.push({ table, columns });
          return {
            eq(column, value) {
              assert.strictEqual(column, table === 'users' ? 'id' : 'user_id');
              assert.strictEqual(value, rows.authUser.id);
              return {
                async maybeSingle() {
                  return { data: rows[table] || null, error: null };
                }
              };
            }
          };
        }
      };
    }
  };
}

function createPublicProfileServiceFixture(options = {}) {
  const calls = [];
  const rows = {
    user_profiles: options.profileRow || null,
    public_profile_role_projection: options.roleRow || null
  };
  const client = {
    from(table) {
      return {
        select(columns) {
          calls.push({ table, columns });
          return {
            eq(column, value) {
              assert.strictEqual(column, 'user_id');
              assert.strictEqual(value, options.requestedId);
              return {
                async maybeSingle() {
                  if (options.errorTable === table) {
                    return { data: null, error: new Error('remote read failed: ' + table) };
                  }
                  return { data: rows[table] || null, error: null };
                }
              };
            }
          };
        }
      };
    }
  };
  const localProfile = {
    id: 'local-fallback',
    userId: options.requestedId,
    role: 'client',
    name: 'Local stale profile'
  };
  const targetWindow = {
    Doke: {
      session: {
        getCurrentUser() { return null; },
        getSession() { return options.anonymous ? null : { provider: 'supabase' }; }
      }
    },
    DOKE_SUPABASE_CONFIG: options.anonymous ? { enabled: true, url: 'https://staging.example.test', anonKey: 'anon-test-key' } : undefined,
    DokeSupabase: {
      getClient() { return client; },
      invokeSelfService() { return Promise.reject(new Error('unexpected self-service call')); }
    },
    DokeAuth: {
      repositories: {
        users: {
          async findById() {
            return { id: options.requestedId, profile: localProfile };
          }
        }
      }
    },
    dispatchEvent() {}
  };
  const context = {
    window: targetWindow,
    document: { documentElement: { setAttribute() {} } },
    FileReader: function FileReader() {},
    CustomEvent: function CustomEvent() {},
    console,
    Promise,
    Date,
    Math,
    String,
    Object,
    Array,
    Error,
    Boolean,
    Number,
    RegExp,
    Set
  };
  vm.runInNewContext(profileServiceCode, context);
  return { service: targetWindow.Doke.services.profile, calls };
}

(async () => {
  const clientProfile = identityService.normalizeProfile(
    { user_id: 'client-1', display_name: 'Cliente Doke' },
    { id: 'client-1', role: 'client', email: 'client@example.com' },
    null,
    { orders_count: 7, average_rating: 4.25, reviews_count: 3 }
  );
  assert.strictEqual(clientProfile.rating, 4.25);
  assert.strictEqual(clientProfile.ordersCount, 7);
  assert.strictEqual(clientProfile.reviewsCount, 3);

  const professionalProfile = identityService.normalizeProfile(
    { user_id: 'professional-1', display_name: 'Profissional Doke' },
    { id: 'professional-1', role: 'professional', email: 'pro@example.com' },
    { average_rating: 4.9, reviews_count: 21, completed_orders_count: 18 },
    { orders_count: 4, average_rating: 3.5, reviews_count: 2 }
  );
  assert.strictEqual(professionalProfile.rating, 4.9);
  assert.strictEqual(professionalProfile.reviewsCount, 21);
  assert.strictEqual(professionalProfile.completedOrdersCount, 18);

  const fixture = createSupabaseFixture({
    authUser: {
      id: 'client-1',
      email: 'client@example.com',
      app_metadata: { role: 'client' },
      user_metadata: { role: 'admin' }
    },
    users: { id: 'client-1', email: 'client@example.com', role: 'client', status: 'active' },
    user_profiles: { user_id: 'client-1', display_name: 'Cliente Doke' },
    professional_profiles: null,
    client_profiles: { user_id: 'client-1', orders_count: 7, average_rating: 4.25, reviews_count: 3 }
  });

  const identity = await identityService.readCurrentIdentity(fixture, { id: 'client-1' });
  assert.strictEqual(identity.user.role, 'client', 'Forged user_metadata role must not affect identity authority.');
  assert.strictEqual(identity.profile.reviewsCount, 3);
  assert(fixture.selections.some((item) => item.table === 'client_profiles' && item.columns === 'user_id,orders_count,average_rating,reviews_count,updated_at'));

  const publicClientFixture = createPublicProfileServiceFixture({
    requestedId: 'client-public-1',
    profileRow: {
      user_id: 'client-public-1',
      display_name: 'Cliente Público',
      username: 'cliente.publico',
      city: 'Salvador',
      state: 'BA',
      role: 'professional'
    },
    roleRow: { user_id: 'client-public-1', role: 'client' }
  });
  const publicClient = await publicClientFixture.service.getById('client-public-1');
  assert.strictEqual(publicClient.role, 'client', 'Public role must come only from the canonical role projection.');
  assert.strictEqual(publicClient.type, 'client');
  assert.strictEqual(publicClient.name, 'Cliente Público');
  assert(publicClientFixture.calls.some((item) => item.table === 'user_profiles'));
  assert(publicClientFixture.calls.some((item) => item.table === 'public_profile_role_projection'));

  const anonymousClientFixture = createPublicProfileServiceFixture({
    requestedId: 'anonymous-client-1',
    anonymous: true,
    profileRow: {
      user_id: 'anonymous-client-1',
      display_name: 'Cliente Anônimo'
    },
    roleRow: { user_id: 'anonymous-client-1', role: 'client' }
  });
  const anonymousClient = await anonymousClientFixture.service.getById('anonymous-client-1');
  assert.strictEqual(anonymousClient.role, 'client', 'Anonymous public profile reads must use the configured Supabase authority.');
  assert(anonymousClientFixture.calls.some((item) => item.table === 'user_profiles'));
  assert(anonymousClientFixture.calls.some((item) => item.table === 'public_profile_role_projection'));

  const publicProfessionalFixture = createPublicProfileServiceFixture({
    requestedId: 'professional-public-1',
    profileRow: { user_id: 'professional-public-1', display_name: 'Profissional Público' },
    roleRow: { user_id: 'professional-public-1', role: 'professional' }
  });
  const publicProfessional = await publicProfessionalFixture.service.getById('professional-public-1');
  assert.strictEqual(publicProfessional.role, 'professional');

  const missingRoleFixture = createPublicProfileServiceFixture({
    requestedId: 'suspended-public-1',
    profileRow: { user_id: 'suspended-public-1', display_name: 'Perfil Suspenso' },
    roleRow: null
  });
  assert.strictEqual(await missingRoleFixture.service.getById('suspended-public-1'), null);

  const invalidIdFixture = createPublicProfileServiceFixture({
    requestedId: 'user_001',
    anonymous: true,
    profileRow: null,
    roleRow: null
  });
  assert.strictEqual(
    await invalidIdFixture.service.getById('user_001'),
    null,
    'Non-UUID public profile ids must fail closed before a remote query.'
  );
  assert.strictEqual(invalidIdFixture.calls.length, 0, 'Invalid public ids must not reach Supabase UUID filters.');

  const invalidRoleFixture = createPublicProfileServiceFixture({
    requestedId: 'admin-public-1',
    profileRow: { user_id: 'admin-public-1', display_name: 'Operador' },
    roleRow: { user_id: 'admin-public-1', role: 'admin' }
  });
  assert.strictEqual(await invalidRoleFixture.service.getById('admin-public-1'), null);

  const failingRemoteFixture = createPublicProfileServiceFixture({
    requestedId: 'client-error-1',
    profileRow: { user_id: 'client-error-1', display_name: 'Cliente Erro' },
    roleRow: { user_id: 'client-error-1', role: 'client' },
    errorTable: 'public_profile_role_projection'
  });
  await assert.rejects(
    failingRemoteFixture.service.getById('client-error-1'),
    /remote read failed: public_profile_role_projection/
  );

  console.log(JSON.stringify({
    clientMetricsNormalized: true,
    professionalMetricsPreserved: true,
    forgedMetadataIgnored: true,
    ownerProjectionSelected: true,
    publicClientRoleProjected: true,
    anonymousPublicClientProjected: true,
    publicProfessionalRoleProjected: true,
    missingProjectionFailsClosed: true,
    invalidPublicIdFailsClosed: true,
    remoteErrorsDoNotFallback: true
  }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

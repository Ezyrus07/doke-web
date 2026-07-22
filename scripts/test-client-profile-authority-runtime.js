#!/usr/bin/env node
'use strict';

const assert = require('assert');
const identityService = require('../backend/modules/auth/identity-service');

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

  console.log(JSON.stringify({
    clientMetricsNormalized: true,
    professionalMetricsPreserved: true,
    forgedMetadataIgnored: true,
    ownerProjectionSelected: true
  }));
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

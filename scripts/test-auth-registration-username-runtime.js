#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

(async () => {
  let taken = false;
  let baseRegisterShouldFail = false;
  let registeredPayload = null;
  const rpcCalls = [];
  const dispatched = [];

  const window = {
    DOKE_SUPABASE_CONFIG: {
      enabled: true,
      url: 'https://example.supabase.co',
      anonKey: 'anon-key'
    },
    DokeAuth: {
      checkUsernameAvailability: async (value) => ({
        handle: String(value || '').toLowerCase(),
        available: true,
        reason: ''
      }),
      register: async (payload) => {
        registeredPayload = payload;
        if (baseRegisterShouldFail) {
          taken = true;
          throw new Error('Database error saving new user');
        }
        return {
          id: 'user-auth-a04',
          name: payload.name,
          handle: payload.handle,
          pendingConfirmation: true
        };
      }
    },
    DokeSupabase: {
      getClient: () => ({
        rpc: async (name, params) => {
          rpcCalls.push({ name, params });
          assert.strictEqual(name, 'check_username_availability');
          const username = String(params?.p_username || '');
          return {
            data: [{
              username,
              valid: true,
              available: !taken,
              reason: taken ? 'taken' : 'available'
            }],
            error: null
          };
        }
      })
    }
  };

  const document = {
    dispatchEvent(event) {
      dispatched.push(event);
      return true;
    }
  };

  window.window = window;

  const context = vm.createContext({
    window,
    document,
    console,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  });

  vm.runInContext(
    fs.readFileSync('assets/js/services/auth-registration-authority.js', 'utf8'),
    context,
    { filename: 'assets/js/services/auth-registration-authority.js' }
  );

  const authority = window.DokeAuth.registrationAuthority;
  assert(authority, 'Registration authority must be exposed.');
  assert.strictEqual(authority.version, 'AUTH-A04');
  assert.strictEqual(authority.normalizeUsername('@Gábríel.Antonio'), 'gabriel.antonio');
  assert.strictEqual(authority.isValidUsername('gabriel.antonio'), true);
  assert.strictEqual(authority.isValidUsername('admin'), false);

  const reserved = await window.DokeAuth.checkUsernameAvailability('@Admin');
  assert.strictEqual(reserved.available, false);
  assert.strictEqual(reserved.reasonCode, 'reserved');
  assert.strictEqual(rpcCalls.length, 0, 'Reserved names must fail before network access.');

  const available = await window.DokeAuth.checkUsernameAvailability('@Gábríel.Antonio');
  assert.strictEqual(available.username, 'gabriel.antonio');
  assert.strictEqual(available.valid, true);
  assert.strictEqual(available.available, true);
  assert.strictEqual(available.authority, 'supabase');

  const created = await window.DokeAuth.register({
    name: 'Gabriel Antonio',
    handle: '@Gábríel.Antonio',
    email: 'gabriel@example.com',
    password: 'Senha@123'
  });
  assert.strictEqual(created.pendingConfirmation, true);
  assert.strictEqual(registeredPayload.handle, 'gabriel.antonio');
  assert.strictEqual(registeredPayload.role, 'client');

  baseRegisterShouldFail = true;
  taken = false;
  await assert.rejects(
    window.DokeAuth.register({
      name: 'Outra Pessoa',
      handle: 'corrida.usuario',
      email: 'outra@example.com',
      password: 'Senha@123'
    }),
    /acabou de ser escolhido por outra pessoa/,
    'A signup race must be translated to a deterministic username conflict.'
  );

  window.DokeSupabase.getClient = () => null;
  const unavailable = await window.DokeAuth.checkUsernameAvailability('novo.usuario');
  assert.strictEqual(unavailable.available, false);
  assert.strictEqual(unavailable.reasonCode, 'authority_unavailable');

  assert(dispatched.some((event) => event.type === 'doke:auth-registration-authority-ready'));

  console.log(JSON.stringify({
    authority: 'supabase',
    canonicalNormalization: true,
    reservedNamesBlockedClientSide: true,
    availabilityRpcUsed: true,
    registrationPayloadCanonical: true,
    signupRaceMapped: true,
    confirmationStatePreserved: true,
    authorityUnavailableFailsClosed: true
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

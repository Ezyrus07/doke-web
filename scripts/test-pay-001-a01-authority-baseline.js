'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'assets/js/services/payment-service.js'), 'utf8');

function loadScenario(options) {
  const settings = Object.assign({
    apiActive: false,
    apiReady: false,
    sandboxActive: false,
    repositoryProvider: 'mock',
    fallbackActive: true,
    localFinancialSimulation: true
  }, options || {});

  const document = {
    addEventListener() {},
    dispatchEvent() {},
    documentElement: { setAttribute() {} }
  };

  const Doke = {
    services: {},
    repositories: {
      payments: {
        getProviderStatus() {
          return {
            provider: settings.repositoryProvider,
            fallbackActive: settings.fallbackActive,
            localFinancialSimulation: settings.localFinancialSimulation
          };
        }
      },
      messages: {},
      wallet: {}
    },
    financeRepository: {
      isSandboxEnabled() { return settings.sandboxActive; }
    },
    repositoryBoundary: {
      getDataProviderStatus() {
        return {
          activeProvider: settings.apiActive ? 'api' : 'mock',
          apiReady: settings.apiReady
        };
      }
    },
    session: {
      getCurrentUser() { return null; }
    }
  };

  const window = { Doke };
  window.window = window;

  vm.runInNewContext(source, {
    window,
    document,
    CustomEvent: function CustomEvent() {},
    console,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    JSON,
    Error,
    setTimeout,
    clearTimeout
  }, { filename: 'payment-service.js' });

  return window.Doke.services.payments;
}

const api = loadScenario({ apiActive: true, apiReady: true, sandboxActive: true });
assert.equal(api.getPaymentsProviderStatus().activeProvider, 'api');
assert.equal(api.getPaymentsProviderStatus().paymentsApiActive, true);
assert.equal(api.shouldUsePaymentsApi(), true);

const sandbox = loadScenario({ apiActive: false, apiReady: false, sandboxActive: true });
assert.equal(sandbox.getPaymentsProviderStatus().activeProvider, 'supabase-sandbox');
assert.equal(sandbox.getPaymentsProviderStatus().financeSandboxActive, true);
assert.equal(sandbox.shouldUsePaymentsApi(), false);

const local = loadScenario({ apiActive: false, apiReady: false, sandboxActive: false, repositoryProvider: 'mock' });
const localStatus = local.getPaymentsProviderStatus();
assert.equal(localStatus.activeProvider, 'mock');
assert.equal(localStatus.fallbackProvider, 'local-mock');
assert.equal(localStatus.localFinancialSimulation, true);
assert.equal(localStatus.paymentsApiActive, false);
assert.equal(localStatus.financeSandboxActive, false);

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'config/pay-001-a01-authority-baseline.json'), 'utf8'));
assert.equal(config.authority.realMoneyAuthority, 'none');
assert.equal(config.authority.pspSelected, false);
assert.equal(config.authority.localSimulationIsProductionAuthority, false);
assert.equal(config.authority.sandboxAuthority, 'staging_synthetic_only');

console.log('PAY-A01 provider decision runtime test passed.');

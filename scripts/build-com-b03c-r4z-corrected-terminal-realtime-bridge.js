#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const r4gExecutor = require('./execute-com-b03c-r4g-presence-only-terminal-observation-envelope');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function buildCorrectedTerminalRealtimeBridge({
  createClient,
  url,
  publishableKey,
  timeoutMs = 5000,
  observeSubscribeChannel = r4gExecutor.observeSubscribeChannel,
  trace = null
} = {}) {
  if (typeof createClient !== 'function' || !url || !publishableKey) {
    fail('DOKE_COM_B03C_R4Z_REALTIME_BRIDGE_CONFIG_REQUIRED');
  }
  if (typeof observeSubscribeChannel !== 'function') {
    fail('DOKE_COM_B03C_R4Z_OBSERVER_REQUIRED');
  }
  if (trace !== null && typeof trace !== 'function') {
    fail('DOKE_COM_B03C_R4Z_TRACE_CALLBACK_INVALID');
  }

  const emit = (event) => {
    if (trace) trace(event);
  };

  return Object.freeze({
    async runPresenceOnlyProbe({ userId, accessToken, topic } = {}) {
      if (!userId || !accessToken || !topic) {
        fail('DOKE_COM_B03C_R4Z_PRESENCE_PROBE_INPUT_REQUIRED');
      }

      const client = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      if (!client?.realtime || typeof client.realtime.setAuth !== 'function') {
        fail('DOKE_COM_B03C_R4Z_REALTIME_CLIENT_INVALID');
      }

      await client.realtime.setAuth(accessToken);
      let channel = null;
      try {
        channel = client.channel(topic, {
          config: {
            private: true,
            presence: {
              enabled: true,
              key: crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 16)
            }
          }
        });
        channel.on('presence', { event: 'sync' }, () => channel.presenceState());

        emit('observation_started');
        const outcome = await observeSubscribeChannel(channel, timeoutMs);
        emit('observation_settled');
        return outcome;
      } finally {
        if (channel && typeof client.removeChannel === 'function') {
          emit('cleanup_started');
          await client.removeChannel(channel).catch(() => {});
          emit('cleanup_finished');
        }
      }
    }
  });
}

module.exports = {
  buildCorrectedTerminalRealtimeBridge
};

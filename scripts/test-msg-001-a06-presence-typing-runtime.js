'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const repositoryModule = require(path.resolve(__dirname, '../assets/js/repositories/messages-presence-repository.js'));

function createHarness() {
  let clock = 1000;
  let channelConfig = null;
  let topic = null;
  let removed = false;
  let sent = [];
  let tracked = [];
  let state = {};
  const handlers = new Map();
  const timers = new Map();
  let timerId = 0;

  const channel = {
    on(type, filter, callback) {
      handlers.set(`${type}:${filter.event}`, callback);
      return this;
    },
    subscribe(callback) {
      callback('SUBSCRIBED');
      return this;
    },
    track(payload) {
      tracked.push(payload);
      state.self = [payload];
      return Promise.resolve('ok');
    },
    send(payload) {
      sent.push(payload);
      return Promise.resolve('ok');
    },
    presenceState() {
      return state;
    },
    unsubscribe() {
      removed = true;
      return Promise.resolve('ok');
    },
  };

  const client = {
    channel(nextTopic, nextConfig) {
      topic = nextTopic;
      channelConfig = nextConfig;
      return channel;
    },
    removeChannel(active) {
      assert.equal(active, channel);
      removed = true;
      return Promise.resolve('ok');
    },
  };

  return {
    client,
    now: () => clock,
    setTimeout(callback, delay) {
      const id = ++timerId;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    randomUUID: () => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    setClock(value) { clock = value; },
    setState(value) { state = value; },
    emit(type, event, payload) {
      const handler = handlers.get(`${type}:${event}`);
      assert.ok(handler, `missing ${type}:${event} handler`);
      handler(payload);
    },
    runTimers() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach((timer) => timer.callback());
    },
    get topic() { return topic; },
    get channelConfig() { return channelConfig; },
    get removed() { return removed; },
    get sent() { return sent; },
    get tracked() { return tracked; },
  };
}

async function main() {
  const disabledHarness = createHarness();
  const disabled = repositoryModule.create({
    client: disabledHarness.client,
    config: { messagesPresenceEnabled: false },
    now: disabledHarness.now,
    randomUUID: disabledHarness.randomUUID,
  });
  assert.deepEqual(await disabled.connect({}), { connected: false, reason: 'feature-disabled' });
  assert.equal(disabled.getStatus().status, 'disabled');

  const invalidHarness = createHarness();
  const invalid = repositoryModule.create({
    client: invalidHarness.client,
    config: { messagesPresenceEnabled: true },
    now: invalidHarness.now,
    randomUUID: invalidHarness.randomUUID,
  });
  await assert.rejects(
    invalid.connect({ sessionId: 'fixture-user', conversationId: 'fixture-conversation' }),
    (error) => error.code === 'DOKE_MESSAGES_PRESENCE_CANONICAL_SESSION_REQUIRED',
  );
  assert.equal(invalidHarness.topic, null, 'fixtures must not open a remote channel');

  const harness = createHarness();
  const presenceEvents = [];
  const typingEvents = [];
  const statuses = [];
  const repository = repositoryModule.create({
    client: harness.client,
    config: {
      messagesPresenceEnabled: true,
      messagesPresenceChannelPrefix: 'doke:conversation:',
      messagesPresenceTypingTtlMs: 6000,
      messagesPresenceTypingThrottleMs: 1000,
    },
    now: harness.now,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
    randomUUID: harness.randomUUID,
  });

  const sessionId = '11111111-1111-4111-8111-111111111111';
  const conversationId = '22222222-2222-4222-8222-222222222222';
  const result = await repository.connect({
    sessionId,
    conversationId,
    onPresence: (event) => presenceEvents.push(event),
    onTyping: (event) => typingEvents.push(event),
    onStatus: (event) => statuses.push(event.status),
  });

  assert.equal(result.connected, true);
  assert.equal(harness.topic, `doke:conversation:${conversationId}:ephemeral`);
  assert.equal(harness.channelConfig.config.private, true);
  assert.equal(harness.channelConfig.config.broadcast.ack, true);
  assert.equal(harness.channelConfig.config.broadcast.self, false);
  assert.equal(harness.tracked.length, 1);
  assert.equal(harness.tracked[0].connectionId, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.ok(statuses.includes('connected'));

  harness.setState({
    self: [{ connectionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', visibility: 'visible' }],
    other: [{ connectionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', visibility: 'visible' }],
  });
  harness.emit('presence', 'sync');
  assert.deepEqual(presenceEvents.at(-1), { online: 1, away: 0, total: 1 });

  harness.emit('broadcast', 'typing', {
    payload: {
      conversationId,
      connectionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      active: true,
      expiresAt: 7000,
    },
  });
  assert.deepEqual(typingEvents.at(-1), { active: true, count: 1 });
  harness.runTimers();
  assert.deepEqual(typingEvents.at(-1), { active: false, count: 0 });

  assert.equal(await repository.setTyping(true), true);
  assert.equal(await repository.setTyping(true), false, 'typing broadcasts must be throttled');
  assert.equal(harness.sent.length, 1);
  assert.equal(harness.sent[0].type, 'broadcast');
  assert.equal(harness.sent[0].event, 'typing');
  assert.equal(harness.sent[0].payload.conversationId, conversationId);

  await repository.disconnect();
  assert.equal(harness.removed, true);
  assert.equal(repository.getStatus().status, 'idle');
  assert.equal(repository.getStatus().localPersistence, false);

  console.log('MSG-A06 presence and typing runtime test passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

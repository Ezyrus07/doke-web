'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/repositories/orders-repository.js'), 'utf8');
const primary = 'doke.orders.local.v1';
const legacy = 'doke.orders';
function boot(fail) {
  const storage = new Map();
  const context = { console, Promise, Date, JSON, Object, Array, document: { addEventListener() {} },
    localStorage: { getItem: key => storage.get(key) || null, setItem(key, value) {
      if (fail(key, value)) throw new Error('Storage unavailable');
      storage.set(key, value);
    } }, Doke: { runtimeConfig: { environment: 'local', ordersProvider: 'mock' } } };
  context.window = context;
  vm.runInNewContext(source, context);
  return { repository: context.Doke.repositories.orders, storage };
}
const order = { id: 'demo-order', clientId: 'demo-client', professionalId: 'demo-professional', serviceId: 'demo-service', status: 'pending' };
(async () => {
  const blocked = boot(key => key === primary);
  await assert.rejects(async () => blocked.repository.saveMock(order), /salvar.*pedido/i);
  assert.equal(blocked.storage.has(primary), false);
  assert.equal(blocked.storage.has(legacy), false);
  let unavailable = true;
  const recovery = boot(() => unavailable);
  await assert.rejects(async () => recovery.repository.saveMock(order));
  unavailable = false;
  await recovery.repository.saveMock(order);
  assert.equal(recovery.repository.readLocal().length, 1);
  assert.equal(JSON.parse(recovery.storage.get(primary))[0].id, order.id);
  const mirrorFailure = boot(key => key === legacy);
  mirrorFailure.storage.set(legacy, JSON.stringify([order]));
  await mirrorFailure.repository.saveMock({ ...order, status: 'accepted' });
  assert.equal(mirrorFailure.repository.readLocal()[0].status, 'accepted', 'stale compatibility mirror must not override persisted status');
  const quota = boot((_key, value) => value.includes('data:image'));
  await quota.repository.saveMock({ ...order, attachments: [{id:'photo',name:'photo.png',url:'data:image/png;base64,AA',type:'image/png'}] });
  assert.equal(quota.repository.readLocal()[0].attachments[0].url, '');
  console.log('PASS: failed write, recovery, canonical precedence, attachment quota fallback (4 cases)');
})().catch(error => { console.error(error); process.exitCode = 1; });

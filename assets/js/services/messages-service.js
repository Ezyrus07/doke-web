import { getMockCollection, getMockItem } from '../mocks/mock-data.js';
import { mockDelay } from '../mocks/mock-delay.js';

export function createMessagesService({ adapter = null, delayMs = 0 } = {}) {
  async function list(params = {}) {
    if (adapter?.list) return adapter.list(params);
    if (delayMs > 0) await mockDelay(delayMs);
    return getMockCollection('messages');
  }

  async function getById(id) {
    if (adapter?.getById) return adapter.getById(id);
    if (delayMs > 0) await mockDelay(delayMs);
    return getMockItem('messages', id);
  }

  return Object.freeze({
    list,
    getById
  });
}

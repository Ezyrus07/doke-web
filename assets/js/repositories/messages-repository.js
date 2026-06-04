import { createMessagesService } from '../services/messages-service.js';

export function createMessagesRepository({ service = createMessagesService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

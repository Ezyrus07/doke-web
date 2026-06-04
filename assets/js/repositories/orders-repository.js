import { createOrdersService } from '../services/orders-service.js';

export function createOrdersRepository({ service = createOrdersService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

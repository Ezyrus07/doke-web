import { createListingsService } from '../services/listings-service.js';

export function createListingsRepository({ service = createListingsService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

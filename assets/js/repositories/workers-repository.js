import { createWorkersService } from '../services/workers-service.js';

export function createWorkersRepository({ service = createWorkersService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

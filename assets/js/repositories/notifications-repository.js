import { createNotificationsService } from '../services/notifications-service.js';

export function createNotificationsRepository({ service = createNotificationsService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

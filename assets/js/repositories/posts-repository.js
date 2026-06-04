import { createPostsService } from '../services/posts-service.js';

export function createPostsRepository({ service = createPostsService() } = {}) {
  return Object.freeze({
    list: (params) => service.list(params),
    getById: (id) => service.getById(id)
  });
}

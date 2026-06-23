// Stage 61B: stable frontend data contract for post entities.
export const postContract = Object.freeze({
  entity: 'post',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'author', 'caption', 'media', 'stats', 'createdAt', 'visibility']),
});

export function getPostContract() {
  return postContract;
}

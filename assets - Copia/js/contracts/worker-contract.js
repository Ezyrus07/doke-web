// Stage 61B: stable frontend data contract for worker entities.
export const workerContract = Object.freeze({
  entity: 'worker',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'title', 'author', 'videoUrl', 'thumbnailUrl', 'duration', 'stats', 'createdAt']),
});

export function getWorkerContract() {
  return workerContract;
}

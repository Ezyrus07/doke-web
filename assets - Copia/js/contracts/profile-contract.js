// Stage 61B: stable frontend data contract for profile entities.
export const profileContract = Object.freeze({
  entity: 'profile',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'name', 'handle', 'avatarUrl', 'coverUrl', 'bio', 'metrics', 'location', 'roles']),
});

export function getProfileContract() {
  return profileContract;
}

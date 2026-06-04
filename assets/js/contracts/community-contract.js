// Stage 61B: stable frontend data contract for community entities.
export const communityContract = Object.freeze({
  entity: 'community',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'name', 'slug', 'description', 'avatarUrl', 'coverUrl', 'metrics', 'membership', 'createdAt']),
});

export function getCommunityContract() {
  return communityContract;
}

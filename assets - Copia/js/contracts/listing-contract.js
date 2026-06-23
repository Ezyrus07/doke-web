// Stage 61B: stable frontend data contract for listing entities.
export const listingContract = Object.freeze({
  entity: 'listing',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'title', 'description', 'price', 'location', 'imageUrl', 'rating', 'owner', 'category', 'createdAt']),
});

export function getListingContract() {
  return listingContract;
}

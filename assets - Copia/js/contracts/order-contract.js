// Stage 61B: stable frontend data contract for order entities.
export const orderContract = Object.freeze({
  entity: 'order',
  version: 1,
  required: Object.freeze(['id']),
  fields: Object.freeze(['id', 'title', 'status', 'customer', 'professional', 'schedule', 'amount', 'createdAt']),
});

export function getOrderContract() {
  return orderContract;
}

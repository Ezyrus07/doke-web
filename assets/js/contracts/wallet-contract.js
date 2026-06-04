// Stage 61B: stable frontend data contract for wallet entities.
export const walletContract = Object.freeze({
  entity: 'wallet',
  version: 1,
  required: Object.freeze(['balance', 'currency']),
  fields: Object.freeze(['balance', 'available', 'pending', 'currency', 'movements', 'updatedAt']),
});

export function getWalletContract() {
  return walletContract;
}

// Stage 61B: normalize external/mock data before it reaches renderers.
export function normalizeWallet(raw = {}) {
  return {
    balance: Number(raw.balance ?? 0),
    available: Number(raw.available ?? raw.balance ?? 0),
    pending: Number(raw.pending ?? 0),
    currency: String(raw.currency ?? 'BRL'),
    movements: Array.isArray(raw.movements) ? raw.movements : [],
    updatedAt: raw.updatedAt ?? null,
  };
}

export function normalizeWalletMovements(items = []) {
  return Array.isArray(items) ? items : [];
}

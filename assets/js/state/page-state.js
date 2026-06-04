import { createStore } from './create-store.js';

export const pageStatus = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  READY: 'ready',
  EMPTY: 'empty',
  ERROR: 'error'
});

export function createPageState(initialState = {}) {
  return createStore({
    status: pageStatus.IDLE,
    data: null,
    items: [],
    error: null,
    meta: {},
    ...initialState
  });
}

export function resolvePageStatus({ items, data, error, loading } = {}) {
  if (loading) return pageStatus.LOADING;
  if (error) return pageStatus.ERROR;
  if (Array.isArray(items)) return items.length > 0 ? pageStatus.READY : pageStatus.EMPTY;
  return data ? pageStatus.READY : pageStatus.EMPTY;
}

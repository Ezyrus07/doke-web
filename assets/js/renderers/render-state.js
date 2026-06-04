import { pageStatus } from '../state/page-state.js';
import { renderLoadingState } from './render-loading-state.js';
import { renderEmptyState } from './render-empty-state.js';
import { renderErrorState } from './render-error-state.js';

export function renderState(root, state, renderReady) {
  if (!root) return null;

  if (state.status === pageStatus.LOADING) return renderLoadingState(root, state);
  if (state.status === pageStatus.ERROR) return renderErrorState(root, state.error);
  if (state.status === pageStatus.EMPTY) return renderEmptyState(root, state);

  return typeof renderReady === 'function' ? renderReady(root, state) : root;
}

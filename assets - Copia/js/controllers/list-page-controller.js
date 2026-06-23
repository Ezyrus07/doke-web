import { createPageController } from './page-controller.js';
import { renderCardList } from '../renderers/render-card-list.js';

export function createListPageController({ root, repository, createCard, store } = {}) {
  return createPageController({
    root,
    store,
    load: (params) => repository?.list?.(params) ?? [],
    renderReady: (target, state) => renderCardList(target, state.items, createCard)
  });
}

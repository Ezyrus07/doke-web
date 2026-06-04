import { renderList } from './render-list.js';

export function renderCardList(root, items = [], createCard) {
  return renderList(root, items, (item, index) => {
    const card = createCard?.(item, index);
    if (!card) return null;
    card.dataset.dataReadyItem = String(item?.id ?? index);
    return card;
  });
}

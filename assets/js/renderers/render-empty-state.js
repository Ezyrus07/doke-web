export function renderEmptyState(root, { message = 'Nenhum item encontrado.' } = {}) {
  if (!root) return null;

  const empty = document.createElement('p');
  empty.className = 'u-data-state doke-empty-state doke-list-state';
  empty.dataset.listState = 'empty';
  empty.setAttribute('role', 'status');
  empty.setAttribute('aria-live', 'polite');
  empty.textContent = message;
  root.replaceChildren(empty);
  return empty;
}

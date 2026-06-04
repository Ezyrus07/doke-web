export function renderEmptyState(root, { message = 'Nenhum item encontrado.' } = {}) {
  if (!root) return null;

  const empty = document.createElement('p');
  empty.className = 'u-data-state';
  empty.textContent = message;
  root.replaceChildren(empty);
  return empty;
}

export function renderLoadingState(root, { message = 'Carregando...' } = {}) {
  if (!root) return null;

  const node = document.createElement('p');
  node.className = 'u-data-state';
  node.textContent = message;
  root.replaceChildren(node);
  return node;
}

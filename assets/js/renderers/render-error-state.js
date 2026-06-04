export function renderErrorState(root, error = null) {
  if (!root) return null;

  const node = document.createElement('p');
  node.className = 'u-data-state';
  node.textContent = error?.message || 'Não foi possível carregar os dados.';
  root.replaceChildren(node);
  return node;
}

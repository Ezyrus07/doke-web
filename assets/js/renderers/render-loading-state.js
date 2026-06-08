export function renderLoadingState(root, { message = 'Carregando...', preserveLayout = false } = {}) {
  if (!root) return null;

  const shouldPreserveLayout = preserveLayout || root.dataset.loadingContract === 'preserve-layout';

  root.setAttribute('aria-busy', 'true');
  root.dataset.viewState = 'loading';

  if (shouldPreserveLayout && root.children.length > 0) {
    const status = root.querySelector('[data-loading-status]') || document.createElement('p');
    status.className = 'u-data-state doke-loading-state';
    status.dataset.loadingStatus = 'true';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = message;

    if (!status.parentElement) {
      status.hidden = true;
      root.appendChild(status);
    }

    return status;
  }

  const node = document.createElement('p');
  node.className = 'u-data-state doke-loading-state';
  node.dataset.loadingStatus = 'true';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.textContent = message;
  root.replaceChildren(node);
  return node;
}

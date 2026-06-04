export function renderList(root, items = [], renderItem) {
  if (!root || typeof renderItem !== 'function') return null;

  const fragment = document.createDocumentFragment();
  items.forEach((item, index) => {
    const node = renderItem(item, index);
    if (node) fragment.append(node);
  });

  root.replaceChildren(fragment);
  return root;
}

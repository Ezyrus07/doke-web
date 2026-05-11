(() => {
  const root = document.querySelector('[data-detail-page-root]');
  if (!root) return;

  const gallery = root.querySelector('[data-detail-gallery]');
  if (gallery) {
    const main = gallery.querySelector('[data-gallery-main]');
    const thumbs = [...gallery.querySelectorAll('[data-gallery-thumb]')];

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const nextSrc = thumb.getAttribute('data-gallery-thumb');
        if (!nextSrc || !main) return;
        main.src = nextSrc;
        thumbs.forEach((item) => item.classList.toggle('is-active', item === thumb));
      });
    });
  }

  root.querySelectorAll('[data-detail-favorite]').forEach((button) => {
    button.addEventListener('click', () => {
      const active = button.classList.toggle('is-active');
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  });
})();


const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

const mainImage = qs('[data-gallery-main]');
const thumbs = qsa('[data-gallery-thumb]');
const lightbox = qs('[data-lightbox]');
const lightboxImage = qs('[data-lightbox-image]');
const budgetModal = qs('[data-budget-modal]');
const saveButton = qs('[data-save-toggle]');
const followButton = qs('[data-follow-toggle]');

const setGalleryImage = (src, alt) => {
  if (!mainImage) return;
  mainImage.src = src;
  mainImage.alt = alt || '';
  if (lightboxImage) {
    lightboxImage.src = src;
    lightboxImage.alt = alt || '';
  }
  thumbs.forEach((thumb) => thumb.classList.toggle('is-active', thumb.dataset.src === src));
};

thumbs.forEach((thumb) => thumb.addEventListener('click', () => setGalleryImage(thumb.dataset.src, thumb.dataset.alt)));

qsa('[data-lightbox-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!lightbox || !mainImage || !lightboxImage) return;
    lightbox.hidden = false;
    lightboxImage.src = mainImage.src;
    lightboxImage.alt = mainImage.alt;
    document.body.style.overflow = 'hidden';
  });
});

qsa('[data-lightbox-close]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!lightbox) return;
    lightbox.hidden = true;
    document.body.style.overflow = '';
  });
});

qsa('[data-budget-open]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!budgetModal) return;
    budgetModal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
});

qsa('[data-budget-close]').forEach((trigger) => {
  trigger.addEventListener('click', () => {
    if (!budgetModal) return;
    budgetModal.hidden = true;
    document.body.style.overflow = '';
  });
});

qsa('.detail-faq__item').forEach((item) => {
  const trigger = qs('.detail-faq__trigger', item);
  const symbol = trigger?.lastElementChild;
  trigger?.addEventListener('click', () => {
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    if (symbol) symbol.textContent = open ? '-' : '+';
  });
});

qsa('[data-review-filter]').forEach((chip) => {
  chip.addEventListener('click', () => {
    qsa('[data-review-filter]').forEach((node) => node.classList.remove('is-active'));
    chip.classList.add('is-active');
    const group = chip.dataset.reviewFilter;
    qsa('.detail-review').forEach((card) => {
      if (group === 'all') {
        card.hidden = false;
        return;
      }
      card.hidden = !card.dataset.reviewGroup?.includes(group);
    });
  });
});

saveButton?.addEventListener('click', () => {
  const active = saveButton.getAttribute('aria-pressed') === 'true';
  saveButton.setAttribute('aria-pressed', String(!active));
  saveButton.textContent = active ? 'Salvar' : 'Salvo';
});

followButton?.addEventListener('click', () => {
  const active = followButton.getAttribute('aria-pressed') === 'true';
  followButton.setAttribute('aria-pressed', String(!active));
  followButton.textContent = active ? 'Seguir profissional' : 'Seguindo';
});

qs('.detail-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const submit = qs('.detail-form .detail-button--primary');
  if (submit) {
    submit.disabled = true;
    submit.textContent = 'Solicitacao enviada';
  }
});

qsa('.detail-strip__item, .detail-room, .detail-offer-item, .detail-review, .detail-feature').forEach((node) => {
  node.tabIndex = 0;
});

const openSidebar = () => document.body.classList.add('sidebar-open');
const closeSidebar = () => document.body.classList.remove('sidebar-open');

qs('[data-sidebar-open]')?.addEventListener('click', openSidebar);
document.addEventListener('click', (event) => {
  if (window.innerWidth > 1024) return;
  if (event.target.closest('.sidebar') || event.target.closest('[data-sidebar-open]')) return;
  closeSidebar();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeSidebar();
    if (lightbox && !lightbox.hidden) {
      lightbox.hidden = true;
      document.body.style.overflow = '';
    }
    if (budgetModal && !budgetModal.hidden) {
      budgetModal.hidden = true;
      document.body.style.overflow = '';
    }
  }
});

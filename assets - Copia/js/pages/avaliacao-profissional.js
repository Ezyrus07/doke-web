(function () {
  'use strict';

  const root = document.querySelector('[data-pro-review-page]');
  if (!root) return;

  const starGroup = root.querySelector('[data-star-group]');
  const ratingLabel = root.querySelector('[data-rating-label]');
  const summaryRating = root.querySelector('[data-summary-rating]');
  const tagButtons = Array.from(root.querySelectorAll('[data-review-tag]'));
  const submitButton = root.querySelector('[data-review-submit]');
  const modal = document.querySelector('[data-review-modal]');

  let selectedRating = 5;

  function updateRating(value) {
    selectedRating = value;
    if (!starGroup) return;

    Array.from(starGroup.querySelectorAll('[data-rating]')).forEach((button) => {
      const buttonRating = Number(button.dataset.rating);
      const active = buttonRating <= value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(buttonRating === value));
    });

    const label = value >= 5 ? 'excelente' : value >= 4 ? 'muito bom' : value >= 3 ? 'regular' : 'precisa melhorar';
    if (ratingLabel) ratingLabel.textContent = `${value},0 ${label}`;
    if (summaryRating) summaryRating.textContent = `${value},0`;
  }

  function openModal() {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pro-review-modal-open');
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pro-review-modal-open');
  }

  if (starGroup) {
    starGroup.addEventListener('click', (event) => {
      const button = event.target.closest('[data-rating]');
      if (!button) return;
      updateRating(Number(button.dataset.rating) || 5);
    });
  }

  root.querySelectorAll('[data-mini-rating]').forEach((group) => {
    const buttons = Array.from(group.querySelectorAll('button'));
    function setMini(value) {
      buttons.forEach((button, index) => button.classList.toggle('is-active', index < value));
    }
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => setMini(index + 1));
    });
    setMini(5);
  });

  tagButtons.forEach((button) => {
    button.addEventListener('click', () => {
      button.classList.toggle('is-selected');
    });
  });


  root.querySelectorAll('[data-topic-comment-toggle]').forEach((button) => {
    const criterion = button.closest('.pro-review-criterion');
    const comment = criterion ? criterion.querySelector('.pro-review-topic-comment') : null;

    button.addEventListener('click', () => {
      if (!comment) return;
      const isHidden = comment.hidden;
      comment.hidden = !isHidden;
      button.setAttribute('aria-expanded', String(isHidden));
      button.textContent = isHidden ? 'Remover comentário' : 'Adicionar comentário';

      if (isHidden) {
        const textarea = comment.querySelector('textarea');
        if (textarea) textarea.focus();
      }
    });
  });

  if (submitButton) {
    submitButton.addEventListener('click', openModal);
  }

  if (modal) {
    modal.addEventListener('click', (event) => {
      const closeTrigger = event.target.closest('[data-review-close]');
      const actionLink = event.target.closest('.pro-review-success__actions a[href]');

      if (closeTrigger || actionLink) {
        closeModal();
      }
    });
  }

  window.addEventListener('pagehide', closeModal);
  window.addEventListener('beforeunload', closeModal);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
  });

  updateRating(selectedRating);
})();

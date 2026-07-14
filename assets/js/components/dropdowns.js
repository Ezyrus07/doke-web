(function () {
  'use strict';

  const selector = '[data-doke-dropdown]';

  function closeDropdown(dropdown, returnFocus) {
    const trigger = dropdown.querySelector('[data-doke-dropdown-trigger]');
    dropdown.classList.remove('is-open');
    trigger?.setAttribute('aria-expanded', 'false');
    if (returnFocus) trigger?.focus();
  }

  function closeOthers(current) {
    document.querySelectorAll(`${selector}.is-open`).forEach((dropdown) => {
      if (dropdown !== current) closeDropdown(dropdown, false);
    });
  }

  document.querySelectorAll(selector).forEach((dropdown) => {
    const trigger = dropdown.querySelector('[data-doke-dropdown-trigger]');
    const menu = dropdown.querySelector('[data-doke-dropdown-menu]');
    if (!trigger || !menu) return;

    trigger.addEventListener('click', () => {
      const willOpen = !dropdown.classList.contains('is-open');
      closeOthers(dropdown);
      dropdown.classList.toggle('is-open', willOpen);
      trigger.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) menu.querySelector('[role="option"], [role="menuitem"]')?.focus();
    });

    menu.addEventListener('click', (event) => {
      const option = event.target.closest('[role="option"]');
      const action = event.target.closest('[role="menuitem"]');
      if (option) {
        menu.querySelectorAll('[role="option"]').forEach((item) => {
          const selected = item === option;
          item.classList.toggle('is-selected', selected);
          item.setAttribute('aria-selected', String(selected));
        });
        const value = trigger.querySelector('[data-doke-dropdown-value]');
        if (value) value.textContent = option.dataset.value || option.textContent.trim();
      }
      if (option || action) closeDropdown(dropdown, true);
    });

    dropdown.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDropdown(dropdown, true);
      }
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!event.target.closest(selector)) closeOthers(null);
  });
})();

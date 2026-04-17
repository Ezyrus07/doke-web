const navLinks = Array.from(document.querySelectorAll('[data-settings-target]'));
const panels = Array.from(document.querySelectorAll('[data-settings-panel]'));
const switches = Array.from(document.querySelectorAll('.settings-switch'));
const saveButtons = Array.from(document.querySelectorAll('[data-settings-save]'));
const focusButtons = Array.from(document.querySelectorAll('[data-settings-focus]'));

const toast = document.createElement('div');
toast.className = 'settings-save-toast';
toast.textContent = 'Configurações salvas localmente.';
document.body.appendChild(toast);

let toastTimer = null;
const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 2200);
};

const activatePanel = (target) => {
  navLinks.forEach((link) => link.classList.toggle('is-active', link.dataset.settingsTarget === target));
  panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.settingsPanel === target));
};

navLinks.forEach((link) => {
  link.addEventListener('click', () => activatePanel(link.dataset.settingsTarget));
});

focusButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.settingsFocus;
    activatePanel(target);
    document.querySelector(`[data-settings-panel="${target}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

switches.forEach((toggle) => {
  toggle.addEventListener('click', () => {
    const nextState = !toggle.classList.contains('is-on');
    toggle.classList.toggle('is-on', nextState);
    toggle.setAttribute('aria-pressed', String(nextState));
  });
});

saveButtons.forEach((button) => {
  button.addEventListener('click', () => showToast('Preferências salvas com sucesso.'));
});

const quickSearchInput = document.getElementById('settings-quick-search');
quickSearchInput?.addEventListener('input', () => {
  const value = quickSearchInput.value.trim().toLowerCase();
  if (!value) {
    panels.forEach((panel) => panel.removeAttribute('hidden'));
    return;
  }

  panels.forEach((panel) => {
    const match = panel.textContent.toLowerCase().includes(value);
    panel.hidden = !match;
  });
});

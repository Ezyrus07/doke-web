/**
 * Configurações Page - Tab/Panel Management
 * Version 2.0 - Updated for new HTML structure
 */

(function() {
  'use strict';

  // =========== Tab Switching =========== */
  const initSettingsTabs = () => {
    const sidebarItems = document.querySelectorAll('.settings-sidebar__item');
    const mobileNavItems = document.querySelectorAll('.settings-mobile-nav__item');
    const panels = document.querySelectorAll('.settings-panel');

    const allTabButtons = [...sidebarItems, ...mobileNavItems];

    allTabButtons.forEach(button => {
      button.addEventListener('click', function() {
        const panelName = this.getAttribute('data-settings-tab');
        if (!panelName) return;

        // Remove active state from all buttons
        allTabButtons.forEach(btn => btn.classList.remove('is-active'));

        // Add active state to clicked button
        this.classList.add('is-active');

        // Hide all panels with animation
        panels.forEach(panel => panel.classList.remove('is-active'));

        // Show the corresponding panel
        const activePanel = document.querySelector(`[data-settings-panel="${panelName}"]`);
        if (activePanel) {
          activePanel.classList.add('is-active');
          // Smooth scroll to content on mobile
          if (window.innerWidth < 960) {
            activePanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });
  };

  // =========== Toast Notifications =========== */
  const createToast = () => {
    const toast = document.createElement('div');
    toast.className = 'settings-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: linear-gradient(135deg, #2d75ff 0%, #1e5ad9 100%);
      color: white;
      padding: 14px 20px;
      border-radius: 10px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 8px 20px rgba(45, 117, 255, 0.3);
      animation: slideInToast 0.3s ease;
      max-width: 90vw;
    `;
    document.body.appendChild(toast);
    return toast;
  };

  let currentToast = null;
  const showToast = (message, type = 'success') => {
    if (currentToast) currentToast.remove();

    const toast = createToast();
    toast.textContent = message;

    if (type === 'error') {
      toast.style.background = 'linear-gradient(135deg, #ff6b6b 0%, #d32f2f 100%)';
    } else if (type === 'warning') {
      toast.style.background = 'linear-gradient(135deg, #ffa726 0%, #f57c00 100%)';
    }

    currentToast = toast;
    setTimeout(() => {
      toast.style.animation = 'slideOutToast 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // =========== Toggle Switches =========== */
  const initToggleSwitches = () => {
    const toggleSwitches = document.querySelectorAll('.toggle-switch__input');

    toggleSwitches.forEach(switchInput => {
      switchInput.addEventListener('change', function() {
        const isChecked = this.checked;
        const parentItem = this.closest('.settings-toggle-item');
        const setting = parentItem?.querySelector('h3')?.textContent || 'Setting';

        showToast(`${setting} ${isChecked ? 'ativado' : 'desativado'}`);

        // Save to localStorage for persistence
        const settingKey = `doke_setting_${setting.toLowerCase().replace(/\s+/g, '_')}`;
        localStorage.setItem(settingKey, isChecked);
      });
    });
  };

  // =========== Form Handlers =========== */
  const initFormHandlers = () => {
    // Generic form save handler
    const saveButtons = document.querySelectorAll('.settings-card__footer .button--primary');

    saveButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const form = this.closest('.settings-card');

        if (form) {
          const inputs = form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="password"]');
          const hasChanges = Array.from(inputs).some(input => input.value !== input.defaultValue);

          if (!hasChanges && inputs.length > 0) {
            showToast('Nenhuma alteração detectada', 'warning');
            return;
          }

          // Simulate save
          setTimeout(() => {
            showToast('Alterações salvas com sucesso!', 'success');
            // Reset form state
            inputs.forEach(input => input.defaultValue = input.value);
          }, 600);
        }
      });
    });
  };

  // =========== Action Buttons =========== */
  const initActionButtons = () => {
    // Upload avatar
    const uploadButtons = document.querySelectorAll('.settings-avatar-upload .button--secondary');
    uploadButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Funcionalidade de upload será implementada', 'info');
      });
    });

    // Remove avatar
    const removeAvatarButtons = document.querySelectorAll('.settings-avatar-upload .button--ghost');
    removeAvatarButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Remover sua foto de perfil?')) {
          showToast('Foto de perfil removida', 'success');
        }
      });
    });

    // Add payment method
    const addPaymentButtons = document.querySelectorAll('[data-settings-panel="payment"] .button--primary');
    addPaymentButtons.forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Redirecionando para adicionar método de pagamento...', 'info');
      });
    });

    // Remove payment methods
    document.querySelectorAll('.settings-payment-item .button--ghost').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        const method = this.closest('.settings-payment-item')?.querySelector('h3')?.textContent || 'Método';
        if (confirm(`Remover ${method}?`)) {
          this.closest('.settings-payment-item').style.animation = 'slideOutToast 0.3s ease';
          setTimeout(() => this.closest('.settings-payment-item').remove(), 300);
          showToast(`${method} removido`, 'success');
        }
      });
    });

    // Download invoice
    document.querySelectorAll('.settings-invoice-list .button--ghost').forEach(button => {
      button.addEventListener('click', function(e) {
        e.preventDefault();
        showToast('Iniciando download da fatura...', 'info');
      });
    });

    // Deactivate account
    const deactivateButton = document.querySelector('[data-settings-panel="privacy"] .settings-card--danger .button--secondary');
    if (deactivateButton) {
      deactivateButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('Tem certeza que deseja desativar sua conta?\n\nVocê poderá reativar-la posteriormente acessando seu email.')) {
          showToast('Processando desativação da conta...', 'warning');
        }
      });
    }

    // Delete account
    const deleteButton = document.querySelector('[data-settings-panel="privacy"] .settings-card--danger .button--danger');
    if (deleteButton) {
      deleteButton.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('AVISO: Esto ato é IRREVERSÍVEL!\n\nTodos os seus dados serão deletados permanentemente.\n\nTem certeza?')) {
          showToast('Processando exclusão permanente da conta...', 'error');
        }
      });
    }
  };

  // =========== Keyboard Navigation =========== */
  const initKeyboardNavigation = () => {
    const sidebarItems = document.querySelectorAll('.settings-sidebar__item');
    const allButtons = Array.from(sidebarItems);

    allButtons.forEach((button, index) => {
      button.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (index + 1) % allButtons.length;
          allButtons[nextIndex].focus();
          allButtons[nextIndex].click();
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = (index - 1 + allButtons.length) % allButtons.length;
          allButtons[prevIndex].focus();
          allButtons[prevIndex].click();
        }
      });
    });
  };

  // =========== Load Saved Settings =========== */
  const loadSavedSettings = () => {
    const toggleSwitches = document.querySelectorAll('.toggle-switch__input');

    toggleSwitches.forEach(switchInput => {
      const parentItem = switchInput.closest('.settings-toggle-item');
      const settingName = parentItem?.querySelector('h3')?.textContent || '';
      const settingKey = `doke_setting_${settingName.toLowerCase().replace(/\s+/g, '_')}`;

      const savedValue = localStorage.getItem(settingKey);
      if (savedValue !== null) {
        switchInput.checked = savedValue === 'true';
      }
    });
  };

  // =========== Search Functionality =========== */
  const initSearch = () => {
    const searchInput = document.querySelector('.topbar-search--subtle input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        if (query.length > 0) {
          // Add search highlighting logic here
          console.log('Searching:', query);
        }
      });
    }
  };

  // =========== Initialize All =========== */
  const init = () => {
    // Add animation keyframes
    if (!document.querySelector('style[data-settings-animations]')) {
      const style = document.createElement('style');
      style.dataset.settingsAnimations = true;
      style.textContent = `
        @keyframes slideInToast {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutToast {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(400px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }

    initSettingsTabs();
    initToggleSwitches();
    initFormHandlers();
    initActionButtons();
    initKeyboardNavigation();
    initSearch();
    loadSavedSettings();
  };

  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
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

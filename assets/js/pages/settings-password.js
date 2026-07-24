/* Doke AUTH-A05 settings password controller. */
(function () {
  'use strict';

  const DIALOG_ID = 'doke-password-change-dialog';

  const createDialog = () => {
    const existing = document.getElementById(DIALOG_ID);
    if (existing) return existing;

    const dialog = document.createElement('dialog');
    dialog.id = DIALOG_ID;
    dialog.className = 'doke-password-dialog';
    dialog.setAttribute('aria-labelledby', `${DIALOG_ID}-title`);
    dialog.innerHTML = `
      <form class="doke-password-dialog__form" method="dialog" data-password-change-form>
        <header class="doke-password-dialog__header">
          <div>
            <span class="doke-password-dialog__eyebrow">Segurança da conta</span>
            <h2 class="doke-password-dialog__title" id="${DIALOG_ID}-title">Alterar senha</h2>
            <p class="doke-password-dialog__description">Confirme sua senha atual antes de definir uma nova.</p>
          </div>
          <button class="doke-icon-btn doke-icon-btn--soft" type="button" data-password-dialog-close aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>
          </button>
        </header>

        <div class="doke-password-dialog__fields">
          <label class="doke-password-dialog__field" for="settings-current-password">
            <span>Senha atual</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-current-password" type="password" autocomplete="current-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-current-password" aria-label="Mostrar senha">👁</button>
            </div>
          </label>

          <label class="doke-password-dialog__field" for="settings-new-password">
            <span>Nova senha</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-new-password" type="password" autocomplete="new-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-new-password" aria-label="Mostrar senha">👁</button>
            </div>
          </label>

          <label class="doke-password-dialog__field" for="settings-new-password-confirmation">
            <span>Confirmar nova senha</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-new-password-confirmation" type="password" autocomplete="new-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-new-password-confirmation" aria-label="Mostrar senha">👁</button>
            </div>
          </label>
        </div>

        <p class="doke-password-dialog__note">Use ao menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo. As outras sessões serão encerradas.</p>
        <p class="doke-password-dialog__feedback" data-password-feedback role="status" aria-live="polite" hidden></p>

        <div class="doke-password-dialog__actions">
          <button class="doke-btn doke-btn--ghost" type="button" data-password-dialog-close>Cancelar</button>
          <button class="doke-btn doke-btn--primary" type="submit" data-password-change-submit aria-busy="false">Alterar senha</button>
        </div>
      </form>
    `;

    document.body.appendChild(dialog);

    const form = dialog.querySelector('[data-password-change-form]');
    const feedback = dialog.querySelector('[data-password-feedback]');
    const submit = dialog.querySelector('[data-password-change-submit]');
    const currentPassword = dialog.querySelector('#settings-current-password');
    const newPassword = dialog.querySelector('#settings-new-password');
    const confirmation = dialog.querySelector('#settings-new-password-confirmation');

    const clear = () => {
      form.reset();
      feedback.hidden = true;
      feedback.textContent = '';
      feedback.removeAttribute('data-tone');
      submit.disabled = false;
      submit.setAttribute('aria-busy', 'false');
      submit.textContent = 'Alterar senha';
      dialog.querySelectorAll('input[type="text"]').forEach((input) => { input.type = 'password'; });
    };

    const setFeedback = (tone, message) => {
      feedback.hidden = !message;
      feedback.textContent = message || '';
      if (message) feedback.dataset.tone = tone;
      else feedback.removeAttribute('data-tone');
    };

    dialog.querySelectorAll('[data-password-dialog-close]').forEach((button) => {
      button.addEventListener('click', () => dialog.close('cancel'));
    });

    dialog.querySelectorAll('[data-password-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const input = dialog.querySelector(`#${button.dataset.passwordToggle}`);
        if (!input) return;
        const reveal = input.type === 'password';
        input.type = reveal ? 'text' : 'password';
        button.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
      });
    });

    dialog.addEventListener('close', clear);
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close('backdrop');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const current = String(currentPassword.value || '');
      const next = String(newPassword.value || '');
      const repeated = String(confirmation.value || '');

      if (!current || !next || !repeated) {
        setFeedback('error', 'Preencha a senha atual e confirme a nova senha.');
        return;
      }
      if (next !== repeated) {
        setFeedback('error', 'A confirmação não coincide com a nova senha.');
        confirmation.focus();
        return;
      }
      if (!window.DokeAuth?.passwordAuthority?.isStrongPassword?.(next)) {
        setFeedback('error', 'Use ao menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo.');
        newPassword.focus();
        return;
      }

      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Alterando...';
      setFeedback('success', 'Confirmando sua identidade...');

      try {
        await window.DokeAuth.changePassword({ currentPassword: current, newPassword: next });
        setFeedback('success', 'Senha alterada. As outras sessões foram encerradas.');
        currentPassword.value = '';
        newPassword.value = '';
        confirmation.value = '';
        window.setTimeout(() => dialog.close('success'), 1100);
      } catch (error) {
        setFeedback('error', error?.message || 'Não foi possível alterar a senha.');
        submit.disabled = false;
        submit.setAttribute('aria-busy', 'false');
        submit.textContent = 'Alterar senha';
      }
    });

    return dialog;
  };

  const bind = () => {
    document.querySelectorAll('[data-settings-change-password]').forEach((button) => {
      if (button.dataset.passwordChangeBound === 'true') return;
      button.dataset.passwordChangeBound = 'true';
      button.addEventListener('click', () => {
        const dialog = createDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        dialog.querySelector('#settings-current-password')?.focus();
      });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  document.addEventListener('doke:stable-route-ready', bind);
  document.addEventListener('doke:route-ready', bind);
})();

/* Doke AUTH-A05/A06 settings security controller.
   Responsibility: password changes and explicit provider-authoritative session actions. */
(function () {
  'use strict';

  const PASSWORD_DIALOG_ID = 'doke-password-change-dialog';
  const GLOBAL_LOGOUT_DIALOG_ID = 'doke-global-logout-dialog';
  const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

  const createPasswordDialog = () => {
    const existing = document.getElementById(PASSWORD_DIALOG_ID);
    if (existing) return existing;

    const dialog = document.createElement('dialog');
    dialog.id = PASSWORD_DIALOG_ID;
    dialog.className = 'doke-password-dialog';
    dialog.setAttribute('aria-labelledby', `${PASSWORD_DIALOG_ID}-title`);
    dialog.innerHTML = `
      <form class="doke-password-dialog__form" method="dialog" data-password-change-form>
        <header class="doke-password-dialog__header">
          <div>
            <span class="doke-password-dialog__eyebrow">Segurança da conta</span>
            <h2 class="doke-password-dialog__title" id="${PASSWORD_DIALOG_ID}-title">Alterar senha</h2>
            <p class="doke-password-dialog__description">Confirme sua senha atual antes de definir uma nova.</p>
          </div>
          <button class="doke-close-button doke-icon-btn doke-icon-btn--soft" type="button" data-password-dialog-close aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>
          </button>
        </header>

        <div class="doke-password-dialog__fields">
          <label class="doke-password-dialog__field" for="settings-current-password">
            <span>Senha atual</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-current-password" type="password" autocomplete="current-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-current-password" aria-label="Mostrar senha">${eyeIcon}</button>
            </div>
          </label>

          <label class="doke-password-dialog__field" for="settings-new-password">
            <span>Nova senha</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-new-password" type="password" autocomplete="new-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-new-password" aria-label="Mostrar senha">${eyeIcon}</button>
            </div>
          </label>

          <label class="doke-password-dialog__field" for="settings-new-password-confirmation">
            <span>Confirmar nova senha</span>
            <div class="doke-password-dialog__input-wrap">
              <input class="doke-input" id="settings-new-password-confirmation" type="password" autocomplete="new-password" required>
              <button class="doke-password-dialog__toggle doke-icon-btn doke-icon-btn--flat" type="button" data-password-toggle="settings-new-password-confirmation" aria-label="Mostrar senha">${eyeIcon}</button>
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

  const resolvePasswordTriggers = () => {
    const direct = Array.from(document.querySelectorAll('[data-settings-change-password]'));
    if (direct.length) return direct;

    const securityPanel = document.querySelector('[data-settings-panel="security"]');
    const passwordRow = Array.from(securityPanel?.querySelectorAll('.settings-list-item') || [])
      .find((row) => row.querySelector('h2')?.textContent.trim().toLowerCase() === 'senha');
    const button = passwordRow?.querySelector('button');
    if (!button) return [];

    button.dataset.settingsChangePassword = '';
    const description = passwordRow.querySelector('p');
    if (description) description.textContent = 'Confirme sua senha atual para alterar a credencial e encerrar outras sessões.';
    return [button];
  };

  const getSessionFeedback = () => {
    const existing = document.querySelector('[data-settings-session-feedback]');
    if (existing) return existing;
    const securityPanel = document.querySelector('[data-settings-panel="security"]');
    const sessionSection = securityPanel?.querySelector('[aria-labelledby="settings-security-session-title"]');
    if (!sessionSection) return null;
    const feedback = document.createElement('p');
    feedback.className = 'settings-form-message';
    feedback.dataset.settingsSessionFeedback = '';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    feedback.hidden = true;
    sessionSection.appendChild(feedback);
    return feedback;
  };

  const setSessionFeedback = (tone, message) => {
    const feedback = getSessionFeedback();
    if (!feedback) return;
    feedback.hidden = !message;
    feedback.textContent = message || '';
    if (message) feedback.dataset.state = tone;
    else feedback.removeAttribute('data-state');
  };

  const sessionActionDescriptor = (scope) => {
    if (scope === 'others') {
      return {
        method: 'signOutOtherSessions',
        loading: 'Encerrando...',
        success: 'As outras sessões foram encerradas. Este dispositivo continua conectado.',
        redirect: false
      };
    }
    if (scope === 'global') {
      return {
        method: 'signOutAllSessions',
        loading: 'Encerrando todas...',
        success: '',
        redirect: true
      };
    }
    return {
      method: 'signOutCurrentDevice',
      loading: 'Saindo...',
      success: '',
      redirect: true
    };
  };

  const runSessionAction = async (button, scope) => {
    const authority = window.DokeAuth?.sessionAuthority;
    const descriptor = sessionActionDescriptor(scope);
    const operation = authority?.[descriptor.method];
    if (typeof operation !== 'function') {
      setSessionFeedback('error', 'A autoridade de sessão ainda não está disponível. Recarregue a página e tente novamente.');
      return false;
    }

    const originalLabel = button.dataset.sessionOriginalLabel || button.textContent.trim();
    button.dataset.sessionOriginalLabel = originalLabel;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = descriptor.loading;
    setSessionFeedback('pending', scope === 'others' ? 'Revogando as outras sessões...' : 'Encerrando a sessão com segurança...');

    try {
      await operation.call(authority, descriptor.redirect
        ? { redirect: true, redirectTo: 'auth/login.html' }
        : { redirect: false });
      if (descriptor.success) setSessionFeedback('success', descriptor.success);
      return true;
    } catch (error) {
      setSessionFeedback('error', error?.message || 'Não foi possível concluir a operação de sessão.');
      return false;
    } finally {
      if (!descriptor.redirect || document.visibilityState !== 'hidden') {
        button.disabled = false;
        button.setAttribute('aria-busy', 'false');
        button.textContent = originalLabel;
      }
    }
  };

  const createGlobalLogoutDialog = () => {
    const existing = document.getElementById(GLOBAL_LOGOUT_DIALOG_ID);
    if (existing) return existing;

    const dialog = document.createElement('dialog');
    dialog.id = GLOBAL_LOGOUT_DIALOG_ID;
    dialog.className = 'doke-password-dialog';
    dialog.setAttribute('aria-labelledby', `${GLOBAL_LOGOUT_DIALOG_ID}-title`);
    dialog.innerHTML = `
      <section class="doke-password-dialog__form">
        <header class="doke-password-dialog__header">
          <div>
            <span class="doke-password-dialog__eyebrow">Ação de segurança</span>
            <h2 class="doke-password-dialog__title" id="${GLOBAL_LOGOUT_DIALOG_ID}-title">Encerrar todas as sessões?</h2>
            <p class="doke-password-dialog__description">Este dispositivo também será desconectado. Você precisará entrar novamente onde a conta estiver aberta.</p>
          </div>
          <button class="doke-close-button doke-icon-btn doke-icon-btn--soft" type="button" data-global-logout-cancel aria-label="Fechar">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17"></path></svg>
          </button>
        </header>
        <p class="doke-password-dialog__note">A revogação impede novas renovações das sessões existentes. Tokens de acesso já emitidos podem permanecer válidos até a expiração definida pelo provedor.</p>
        <div class="doke-password-dialog__actions">
          <button class="doke-btn doke-btn--ghost" type="button" data-global-logout-cancel>Cancelar</button>
          <button class="doke-btn doke-btn--danger" type="button" data-global-logout-confirm aria-busy="false">Encerrar todas</button>
        </div>
      </section>
    `;
    document.body.appendChild(dialog);

    dialog.querySelectorAll('[data-global-logout-cancel]').forEach((button) => {
      button.addEventListener('click', () => dialog.close('cancel'));
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close('backdrop');
    });
    dialog.querySelector('[data-global-logout-confirm]')?.addEventListener('click', async (event) => {
      const button = event.currentTarget;
      const completed = await runSessionAction(button, 'global');
      if (!completed) dialog.close('error');
    });

    return dialog;
  };

  const createSessionRow = ({ scope, title, description, label, danger = false }) => {
    const row = document.createElement('div');
    row.className = 'settings-list-item';
    row.dataset.settingsSessionScopeRow = scope;
    const copy = document.createElement('div');
    const heading = document.createElement('h2');
    const paragraph = document.createElement('p');
    const button = document.createElement('button');

    heading.textContent = title;
    paragraph.textContent = description;
    copy.append(heading, paragraph);

    button.type = 'button';
    button.className = danger
      ? 'settings-action settings-action--danger doke-btn doke-btn--danger'
      : 'settings-action settings-action--secondary doke-btn doke-btn--ghost';
    button.dataset.settingsSessionAction = scope;
    button.textContent = label;
    row.append(copy, button);
    return row;
  };

  const bindSessionAction = (button) => {
    if (!button || button.dataset.settingsSessionBound === 'true') return;
    button.dataset.settingsSessionBound = 'true';
    button.addEventListener('click', async () => {
      const scope = button.dataset.settingsSessionAction || 'local';
      if (scope === 'global') {
        const dialog = createGlobalLogoutDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        dialog.querySelector('[data-global-logout-confirm]')?.focus();
        return;
      }
      await runSessionAction(button, scope);
    });
  };

  const enhanceSessionControls = () => {
    const securityPanel = document.querySelector('[data-settings-panel="security"]');
    const summary = securityPanel?.querySelector('[data-settings-session-summary]');
    const currentRow = summary?.closest('.settings-list-item');
    if (!currentRow) return [];

    let localButton = currentRow.querySelector('[data-settings-session-action="local"]');
    const oldButton = currentRow.querySelector('[data-settings-sign-out]');
    if (!localButton && oldButton) {
      localButton = oldButton.cloneNode(true);
      oldButton.replaceWith(localButton);
      localButton.removeAttribute('data-settings-sign-out');
      localButton.dataset.settingsSessionAction = 'local';
      localButton.textContent = 'Sair deste dispositivo';
    }

    currentRow.dataset.settingsSessionScopeRow = 'local';
    currentRow.querySelector('h2')?.replaceChildren('Sessão neste dispositivo');

    const parent = currentRow.parentElement;
    if (!parent) return localButton ? [localButton] : [];

    let othersRow = parent.querySelector('[data-settings-session-scope-row="others"]');
    if (!othersRow) {
      othersRow = createSessionRow({
        scope: 'others',
        title: 'Outras sessões',
        description: 'Encerre os outros acessos e mantenha apenas este dispositivo conectado.',
        label: 'Encerrar outras sessões'
      });
      currentRow.insertAdjacentElement('afterend', othersRow);
    }

    let globalRow = parent.querySelector('[data-settings-session-scope-row="global"]');
    if (!globalRow) {
      globalRow = createSessionRow({
        scope: 'global',
        title: 'Todas as sessões',
        description: 'Desconecte a conta deste dispositivo e de todos os demais acessos.',
        label: 'Encerrar todas',
        danger: true
      });
      othersRow.insertAdjacentElement('afterend', globalRow);
    }

    const buttons = [
      localButton,
      othersRow.querySelector('[data-settings-session-action="others"]'),
      globalRow.querySelector('[data-settings-session-action="global"]')
    ].filter(Boolean);
    buttons.forEach(bindSessionAction);
    getSessionFeedback();
    return buttons;
  };

  const bind = () => {
    resolvePasswordTriggers().forEach((button) => {
      if (button.dataset.passwordChangeBound === 'true') return;
      button.dataset.passwordChangeBound = 'true';
      button.addEventListener('click', () => {
        const dialog = createPasswordDialog();
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        dialog.querySelector('#settings-current-password')?.focus();
      });
    });
    enhanceSessionControls();
  };

  window.DokeSettingsPassword = Object.freeze({
    bind,
    createDialog: createPasswordDialog,
    createPasswordDialog,
    createGlobalLogoutDialog,
    enhanceSessionControls,
    runSessionAction
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
  document.addEventListener('doke:auth-session-authority-ready', bind);
  document.addEventListener('doke:stable-route-ready', bind);
  document.addEventListener('doke:route-ready', bind);
})();

/* Doke AUTH-A05 password pages controller. */
(function () {
  'use strict';

  const auth = window.DokeAuth || {};
  const boot = window.DOKE_AUTH_RECOVERY_BOOT || {};
  const search = new URLSearchParams(window.location.search || '');
  const resetIntent = boot.requested === true || search.get('mode') === 'reset';
  const requestView = document.querySelector('[data-auth-recovery-request-view]');
  const resetView = document.querySelector('[data-auth-recovery-reset-view]');

  const setFeedback = (element, tone, message) => {
    if (!element) return;
    element.textContent = message || '';
    element.className = message
      ? `auth-feedback auth-feedback--${tone}`
      : 'auth-feedback is-hidden';
  };

  const setLoading = (button, loading, label) => {
    if (!button) return;
    if (!button.dataset.defaultLabel) button.dataset.defaultLabel = button.textContent.trim();
    button.disabled = loading;
    button.setAttribute('aria-busy', String(loading));
    button.textContent = loading ? label : button.dataset.defaultLabel;
  };

  const showRequestView = () => {
    requestView?.removeAttribute('hidden');
    resetView?.setAttribute('hidden', '');
  };

  const showResetView = () => {
    requestView?.setAttribute('hidden', '');
    resetView?.removeAttribute('hidden');
  };

  if (resetIntent) showResetView();
  else showRequestView();

  document.querySelectorAll('[data-toggle-password]').forEach((button) => {
    if (button.dataset.passwordToggleBound === 'true') return;
    button.dataset.passwordToggleBound = 'true';
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.togglePassword || '');
      if (!input) return;
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.setAttribute('aria-label', reveal ? 'Ocultar senha' : 'Mostrar senha');
    });
  });

  const requestForm = document.querySelector('[data-auth-password-recovery]');
  if (requestForm && requestForm.dataset.passwordRequestBound !== 'true') {
    requestForm.dataset.passwordRequestBound = 'true';
    const emailInput = document.getElementById('recovery-email');
    const feedback = requestForm.querySelector('[data-auth-feedback]');
    const submit = requestForm.querySelector('[data-auth-submit]');

    requestForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = String(emailInput?.value || '').trim();
      if (!email) {
        setFeedback(feedback, 'error', 'Digite o e-mail cadastrado.');
        emailInput?.focus();
        return;
      }

      try {
        setLoading(submit, true, 'Enviando link...');
        setFeedback(feedback, 'success', 'Preparando uma recuperação segura...');
        const result = await auth.requestPasswordRecovery({ email });
        setFeedback(feedback, 'success', result.message);
        requestForm.dataset.authRecoveryRequested = 'true';
      } catch (error) {
        setFeedback(feedback, 'error', error?.message || 'Não foi possível enviar o link de recuperação.');
      } finally {
        setLoading(submit, false, 'Enviar link seguro');
      }
    });
  }

  const resetForm = document.querySelector('[data-auth-password-reset]');
  if (resetForm && resetIntent && resetForm.dataset.passwordResetBound !== 'true') {
    resetForm.dataset.passwordResetBound = 'true';
    const feedback = resetForm.querySelector('[data-auth-feedback]');
    const submit = resetForm.querySelector('[data-auth-submit]');
    const passwordInput = document.getElementById('reset-password');
    const confirmationInput = document.getElementById('reset-password-confirmation');
    const fields = resetForm.querySelector('[data-auth-reset-fields]');
    const invalidPanel = resetForm.querySelector('[data-auth-reset-invalid]');
    let renderedState = '';
    let submitting = false;

    const renderInvalid = (message) => {
      fields?.setAttribute('hidden', '');
      submit?.setAttribute('hidden', '');
      if (submit) submit.disabled = true;
      invalidPanel?.removeAttribute('hidden');
      setFeedback(feedback, 'error', message || 'Este link é inválido ou expirou. Solicite uma nova recuperação de senha.');
    };

    const readState = () => auth.passwordAuthority?.getRecoveryState?.() || { status: 'invalid', active: false };
    const renderState = () => {
      const context = readState();
      const key = `${context.status}:${context.message || ''}`;
      if (key === renderedState) return;
      renderedState = key;
      if (context.status === 'checking') {
        fields?.setAttribute('hidden', '');
        submit?.setAttribute('hidden', '');
        if (submit) submit.disabled = true;
        invalidPanel?.setAttribute('hidden', '');
        setFeedback(feedback, 'success', 'Validando seu link de recuperação...');
      } else if (context.status === 'ready' && context.active) {
        fields?.removeAttribute('hidden');
        submit?.removeAttribute('hidden');
        if (submit) submit.disabled = submitting;
        invalidPanel?.setAttribute('hidden', '');
        setFeedback(feedback, '', '');
        passwordInput?.focus();
      } else if (context.status === 'completed') {
        fields?.setAttribute('hidden', '');
        submit?.setAttribute('hidden', '');
        invalidPanel?.setAttribute('hidden', '');
      } else {
        renderInvalid(context.message);
      }
    };
    const onRecoveryState = () => {
      if (resetForm.isConnected === false) {
        document.removeEventListener('doke:auth-password-state', onRecoveryState);
        return;
      }
      // DOM events trigger rendering; only the authority can grant readiness.
      renderState();
    };
    document.addEventListener('doke:auth-password-state', onRecoveryState);
    window.addEventListener('pagehide', () => document.removeEventListener('doke:auth-password-state', onRecoveryState), { once: true });

    resetForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting || !readState().active) return;
      const password = String(passwordInput?.value || '');
      const confirmation = String(confirmationInput?.value || '');
      if (!password || !confirmation) {
        setFeedback(feedback, 'error', 'Preencha e confirme a nova senha.');
        return;
      }
      if (password !== confirmation) {
        setFeedback(feedback, 'error', 'As senhas não coincidem.');
        confirmationInput?.focus();
        return;
      }
      if (!auth.passwordAuthority?.isStrongPassword?.(password)) {
        setFeedback(feedback, 'error', 'Use ao menos 8 caracteres, letras maiúsculas e minúsculas, número e símbolo.');
        return;
      }

      try {
        submitting = true;
        setLoading(submit, true, 'Redefinindo senha...');
        await auth.completePasswordRecovery({ newPassword: password });
        setFeedback(feedback, 'success', 'Senha redefinida. Entre novamente com a nova senha.');
        fields?.setAttribute('hidden', '');
        submit?.setAttribute('hidden', '');
        window.setTimeout(() => window.location.replace('login.html?reason=password_changed'), 900);
      } catch (error) {
        setFeedback(feedback, 'error', error?.message || 'Não foi possível redefinir a senha.');
      } finally {
        submitting = false;
        setLoading(submit, false, 'Salvar nova senha');
      }
    });

    const verification = auth.initializePasswordRecovery();
    renderState();
    Promise.resolve(verification).then(renderState).catch(() => {
      renderInvalid('Não foi possível validar o link de recuperação.');
    });
  }
})();

/* Doke Login Controller
   Responsibility: wire auth forms to the Auth Service when a login page exists.
   Does not create visual dependencies and safely no-ops outside login pages. */
(function () {
  const ns = (window.DokeAuth = window.DokeAuth || {});

  const selectors = {
    form: '[data-auth-login-form], form[data-login-form], form.login-form',
    email: '[data-auth-email], input[type="email"], input[name="email"]',
    password: '[data-auth-password], input[type="password"], input[name="password"]',
    error: '[data-auth-error]',
    submit: '[data-auth-submit], button[type="submit"]'
  };

  const setError = (form, message = '') => {
    let error = form.querySelector(selectors.error);
    if (!error) {
      error = document.createElement('p');
      error.dataset.authError = '';
      error.setAttribute('role', 'alert');
      error.hidden = true;
      form.appendChild(error);
    }

    error.textContent = message;
    error.hidden = !message;
  };

  const setLoading = (form, loading) => {
    form.dataset.authLoading = String(loading);
    form.querySelectorAll(selectors.submit).forEach((button) => {
      button.disabled = loading;
    });
  };

  const bind = () => {
    const form = document.querySelector(selectors.form);
    if (!form || !ns.service) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setError(form, '');
      setLoading(form, true);

      try {
        const email = form.querySelector(selectors.email)?.value;
        const password = form.querySelector(selectors.password)?.value;
        await ns.service.login({ email, password });
        window.location.assign(form.dataset.authSuccessUrl || '../index.html');
      } catch (error) {
        setError(form, error.message || 'Não foi possível entrar agora.');
      } finally {
        setLoading(form, false);
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();

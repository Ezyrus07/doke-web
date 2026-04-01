(function(){
  const protectedPages = new Set(['carteira.html','conta-bancaria.html','adicionar-cartao.html']);
  const current = window.location.pathname.split('/').pop();
  const SESSION_KEY = 'doke.auth.session';

  function hasSession(){
    try {
      return Boolean(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY));
    } catch (_) {
      return false;
    }
  }

  if (protectedPages.has(current) && !hasSession()) {
    document.documentElement.classList.add('auth-guard-pending');
  }

  window.DokeAuthGuard = {
    hasSession
  };
})();

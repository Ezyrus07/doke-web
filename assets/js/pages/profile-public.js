(function () {
  const init = () => {
    const root = document.querySelector('[data-profile-page]');
    const key = document.body.dataset.profileKey;
    const profile = window.DokeProfileData?.[key];
    if (!root || !profile || !window.DokeProfileRenderer) return;
    window.DokeProfileRenderer.mount(root, profile);
  };

  window.DokeInitPublicProfile = init;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

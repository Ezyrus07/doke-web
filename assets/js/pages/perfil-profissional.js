(function () {
  const init = () => {
    const root = document.querySelector('[data-owner-profile-page]');
    const profile = window.DokeProfileData?.professionalOwner;

    if (root && profile && window.DokeProfileRenderer) {
      window.DokeProfileRenderer.mount(root, profile);
    }

    const profileButtons = document.querySelectorAll('[data-profile-view-trigger]');
    profileButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextView = button.dataset.profileViewTrigger;
        if (nextView === 'owner' || nextView === 'visitor') {
          document.body.dataset.profileView = nextView;
        }
      });
    });

    const headerButtons = document.querySelectorAll('.owner-profile-header__button, .profile-action');
    headerButtons.forEach((button) => {
      button.addEventListener('mouseenter', () => button.classList.add('is-hovered'));
      button.addEventListener('mouseleave', () => button.classList.remove('is-hovered'));
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

(function () {
  const body = document.body;
  const profileButtons = document.querySelectorAll('[data-profile-view-trigger]');

  profileButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextView = button.dataset.profileViewTrigger;
      if (nextView === 'owner' || nextView === 'visitor') {
        body.dataset.profileView = nextView;
      }
    });
  });
})();

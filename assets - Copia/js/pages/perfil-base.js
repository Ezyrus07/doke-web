(function () {
  const body = document.body;
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const type = params.get('type');

  if (view === 'owner' || view === 'visitor') {
    body.dataset.profileView = view;
  }

  if (type === 'professional' || type === 'personal') {
    body.dataset.profileType = type;
  }

  const tabs = Array.from(document.querySelectorAll('[data-profile-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-profile-panel]'));

  function activatePanel(name) {
    tabs.forEach((tab) => {
      const active = tab.dataset.profileTab === name;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });

    panels.forEach((panel) => {
      const active = panel.dataset.profilePanel === name;
      panel.hidden = !active;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => activatePanel(tab.dataset.profileTab));
  });

  const initialPanel = body.dataset.profileInitialPanel || params.get('panel');
  if (tabs.length) {
    if (initialPanel && tabs.some((tab) => tab.dataset.profileTab === initialPanel)) {
      activatePanel(initialPanel);
    } else {
      activatePanel(tabs[0].dataset.profileTab);
    }
  }
})();

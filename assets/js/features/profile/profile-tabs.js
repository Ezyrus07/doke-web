window.DokeProfileTabs = {
  bind(tabs, onChange) {
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const key = tab.dataset.profileTab;
        if (!key || typeof onChange !== 'function') return;
        onChange(key);
      });
    });
  },
  sync(tabs, labels, activeKey) {
    tabs.forEach((tab) => {
      const key = tab.dataset.profileTab;
      tab.textContent = labels[key] || key;
      tab.hidden = !labels[key];
      tab.classList.toggle('is-active', key === activeKey);
    });
  }
};

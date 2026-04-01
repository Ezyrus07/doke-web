const tabs = Array.from(document.querySelectorAll('[data-profile-tab]'));
const panels = Array.from(document.querySelectorAll('[data-profile-panel]'));

document.querySelectorAll('.profile-action, .profile-section__head a').forEach((element) => {
  element.addEventListener('click', (event) => {
    if (element.tagName === 'A' && element.getAttribute('href') === '#') event.preventDefault();
  });
});

function activatePanel(name){
  tabs.forEach((tab)=> tab.classList.toggle('is-active', tab.dataset.profileTab === name));
  panels.forEach((panel)=> {
    const active = panel.dataset.profilePanel === name;
    panel.classList.toggle('is-active', active);
    panel.hidden = !active;
  });
}

tabs.forEach((tab)=> {
  tab.addEventListener('click', ()=> activatePanel(tab.dataset.profileTab));
});

activatePanel('anuncios');

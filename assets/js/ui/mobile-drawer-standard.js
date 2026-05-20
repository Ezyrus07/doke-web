/* Stage 19 — Standard mobile drawer runtime */
(function(){
  if(window.__DokeMobileDrawerStandardStage19)return;
  window.__DokeMobileDrawerStandardStage19=true;

  const icon={
    home:'<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5"></path><path d="M5.5 9.5V20h13V9.5"></path></svg>',
    orders:'<svg viewBox="0 0 24 24"><path d="M7 5.5h10"></path><path d="M7 9.5h10"></path><path d="M7 13.5h6"></path><path d="M5 4h14v16H5z"></path></svg>',
    messages:'<svg viewBox="0 0 24 24"><path d="M4 6h16v10H8l-4 4V6z"></path><path d="M8 10h8"></path><path d="M8 13h5"></path></svg>',
    notifications:'<svg viewBox="0 0 24 24"><path d="M12 4.75a4 4 0 0 0-4 4v2.1c0 .7-.24 1.38-.68 1.92L5.9 14.5h12.2l-1.42-1.73a3 3 0 0 1-.68-1.92v-2.1a4 4 0 0 0-4-4Z"></path><path d="M10 17.2a2.3 2.3 0 0 0 4 0"></path></svg>',
    community:'<svg viewBox="0 0 24 24"><circle cx="8" cy="10" r="2.5"></circle><circle cx="16" cy="9" r="2.5"></circle><path d="M3.5 18c.8-2.4 2.8-3.8 5.5-3.8S13.7 15.6 14.5 18"></path><path d="M12.5 18c.6-1.9 2.1-3.1 4.3-3.1 2 0 3.6 1.1 4.2 3.1"></path></svg>',
    profile:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 19c1.2-3.2 3.7-4.8 7-4.8s5.8 1.6 7 4.8"></path></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.2"></circle><path d="M12 3.8v2.1"></path><path d="M12 18.1v2.1"></path><path d="m18.2 5.8-1.5 1.5"></path><path d="m7.3 16.7-1.5 1.5"></path><path d="M20.2 12h-2.1"></path><path d="M5.9 12H3.8"></path><path d="m18.2 18.2-1.5-1.5"></path><path d="m7.3 7.3-1.5-1.5"></path></svg>',
    logout:'<svg viewBox="0 0 24 24"><path d="M15 7.5V5.8A1.8 1.8 0 0 0 13.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h5.4a1.8 1.8 0 0 0 1.8-1.8v-1.7"></path><path d="M10 12h10"></path><path d="m17 8 3 4-3 4"></path></svg>',
    close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>'
  };

  const cleanPath=(value)=>String(value||'').split('?')[0].split('#')[0].split('/').pop().toLowerCase()||'index.html';
  const routeGroup=(path)=>{
    const current=cleanPath(path);
    if(current==='detalhe-anuncio.html'||current==='resultados.html')return'index.html';
    if(['pagamento-profissional.html','avaliacao.html'].includes(current))return'pedidos.html';
    return current;
  };
  const drawerItem=({href,label,iconName,badge,button})=>{
    const tag=button?'button':'a';
    const attrs=button?'type="button" data-profile-logout':'href="'+href+'"';
    return '<'+tag+' class="home-mobile-drawer__item'+(button?' home-mobile-drawer__item--button':'')+'" '+attrs+'><span class="home-mobile-drawer__item-icon" aria-hidden="true">'+icon[iconName]+'</span><span class="home-mobile-drawer__item-label">'+label+'</span>'+(badge?'<span class="home-mobile-drawer__item-badge">'+badge+'</span>':'')+'</'+tag+'>';
  };
  const drawerMarkup=()=>'<div class="home-mobile-drawer__backdrop" data-mobile-home-menu-close></div><div class="home-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Menu da conta"><div class="home-mobile-drawer__header"><a class="home-mobile-drawer__profile" href="perfil.html?mode=owner&panel=posts"><span class="home-mobile-drawer__avatar">DK</span><span class="home-mobile-drawer__profile-copy"><strong>Gabriel</strong><span>Editar meu perfil</span></span><span class="home-mobile-drawer__profile-arrow" aria-hidden="true"></span></a><button class="home-mobile-drawer__close" type="button" data-mobile-home-menu-close aria-label="Fechar menu lateral">'+icon.close+'</button></div><div class="home-mobile-drawer__content"><nav class="home-mobile-drawer__nav" aria-label="Menu principal mobile">'+drawerItem({href:'index.html',label:'Início',iconName:'home'})+drawerItem({href:'pedidos.html',label:'Pedidos',iconName:'orders'})+drawerItem({href:'mensagens.html',label:'Mensagens',iconName:'messages'})+drawerItem({href:'notificacoes.html',label:'Notificações',iconName:'notifications',badge:'3'})+drawerItem({href:'comunidade.html',label:'Comunidade',iconName:'community'})+'</nav><div class="home-mobile-drawer__divider" aria-hidden="true"></div><nav class="home-mobile-drawer__nav" aria-label="Conta">'+drawerItem({href:'perfil.html?mode=owner&panel=posts',label:'Meu perfil',iconName:'profile'})+drawerItem({href:'configuracoes.html',label:'Configurações',iconName:'settings'})+drawerItem({label:'Sair',iconName:'logout',button:true})+'</nav></div></div>';
  const syncActive=(drawer)=>{
    const active=routeGroup(location.pathname);
    drawer.querySelectorAll('.home-mobile-drawer__item[href]').forEach((link)=>{
      const matched=routeGroup(link.getAttribute('href'))===active||(active==='perfil.html'&&routeGroup(link.getAttribute('href'))==='perfil.html');
      link.classList.toggle('home-mobile-drawer__item--active',matched);
      if(matched)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    });
  };
  const ensureDrawer=()=>{
    let drawer=document.querySelector('[data-mobile-home-drawer]');
    if(!drawer){drawer=document.createElement('aside');document.body.appendChild(drawer);}
    drawer.className='home-mobile-drawer';
    drawer.setAttribute('data-mobile-home-drawer','');
    drawer.hidden=true;
    drawer.setAttribute('aria-hidden','true');
    drawer.innerHTML=drawerMarkup();
    syncActive(drawer);
    return drawer;
  };
  const init=()=>{
    const drawer=ensureDrawer();
    const isMobile=()=>innerWidth<=1024;
    const setOpen=(open)=>{
      if(open)syncActive(drawer);
      drawer.hidden=false;
      drawer.classList.toggle('is-open',open);
      drawer.setAttribute('aria-hidden',String(!open));
      document.body.classList.toggle('mobile-home-drawer-open',open);
      document.body.classList.toggle('doke-mobile-drawer-open',open);
      if(!open)setTimeout(()=>{if(!drawer.classList.contains('is-open'))drawer.hidden=true;},260);
    };
    document.addEventListener('click',(event)=>{
      const openTrigger=event.target.closest('[data-mobile-home-menu-open],[data-sidebar-open],.mobile-toggle,.home-mobile-hero__profile,.orders-page-header__hero-profile,.settings-mobile-header__profile,.detail-topbar__menu');
      if(openTrigger&&isMobile()){event.preventDefault();event.stopPropagation();setOpen(true);return;}
      if(event.target.closest('[data-mobile-home-menu-close]')){event.preventDefault();event.stopPropagation();setOpen(false);return;}
      const panel=drawer.querySelector('.home-mobile-drawer__panel');
      if(drawer.classList.contains('is-open')&&panel&&!panel.contains(event.target))setOpen(false);
    },true);
    document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&drawer.classList.contains('is-open'))setOpen(false);});
    addEventListener('resize',()=>{if(!isMobile()&&drawer.classList.contains('is-open'))setOpen(false);});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

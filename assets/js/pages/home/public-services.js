(function () {
  'use strict';
  var Doke = window.Doke || (window.Doke = {});
  window.DokeHomePublicServicesAbort?.abort();
  window.DokeHomePublicServicesAbort = new AbortController();
  function root() { return document.querySelector('[data-state-boundary="index"]'); }
  function render(items) {
    var scope=root(); if(!scope) return 0;
    var services=(Array.isArray(items)?items:[]).filter(function(item){return String(item && item.status || 'active').toLowerCase()==='active';});
    var featured=scope.querySelector('[data-home-list="featured-services"]');
    var more=scope.querySelector('[data-home-list="more-services"]');
    var moreSection=scope.querySelector('[data-home-list-region="more-services"]');
    var empty=scope.querySelector('[data-home-services-empty]');
    if(featured){featured.textContent='';services.slice(0,6).forEach(function(item){featured.appendChild(Doke.publicServiceCard.create(item));});}
    if(more){more.textContent='';services.slice(6).forEach(function(item){more.appendChild(Doke.publicServiceCard.create(item,{results:true}));});}
    if(empty) empty.hidden=services.length>0;
    if(moreSection) moreSection.hidden=services.length<=6;
    document.dispatchEvent(new CustomEvent('doke:home-services-rendered',{detail:{count:services.length}}));
    return services.length;
  }
  var refreshPromise=null;
  function refresh() {
    if(refreshPromise) return refreshPromise;
    var api=Doke.services && Doke.services.services;
    if(!api || typeof api.list!=='function') return Promise.resolve(render([]));
    var repository=Doke.repositories && Doke.repositories.services;
    if(repository && typeof repository.clearCache==='function') repository.clearCache();
    refreshPromise=api.list({status:'active',fresh:true,sort:'updated_desc'}).then(render).finally(function(){refreshPromise=null;});
    return refreshPromise;
  }
  function init() {
    var scope=root(); if(!scope) return Promise.resolve(0);
    if(scope.dataset.publicServicesBound!=='true'){
      scope.dataset.publicServicesBound='true';
      scope.addEventListener('doke:index-data-ready',function(event){render(event.detail && event.detail.data && event.detail.data.services);});
      document.addEventListener('doke:supabase-sdk-ready',function(){refresh();},{signal:window.DokeHomePublicServicesAbort?.signal});
    }
    var last=Doke.indexDataController && Doke.indexDataController.lastPayload;
    if(last && last.data) render(last.data.services);
    return refresh();
  }
  Doke.homePublicServices=Object.freeze({init:init,refresh:refresh,render:render});
})();

(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function trimProfileBottom(){
    if(!(document.body && document.body.dataset.page === "perfil")) return;

    document.documentElement.classList.add("doke-profile-trim-enabled");

    document.querySelectorAll(".dp-section.dp-section--hidden").forEach((el) => {
      if(el instanceof HTMLElement){
        el.style.display = "none";
        el.style.height = "0";
        el.style.minHeight = "0";
      }
    });
  }

  ready(() => {
    trimProfileBottom();
    setTimeout(trimProfileBottom, 250);
    setTimeout(trimProfileBottom, 900);

    if("MutationObserver" in window){
      const mo = new MutationObserver(() => {
        clearTimeout(window.__dokeProfileTrimTimer);
        window.__dokeProfileTrimTimer = setTimeout(trimProfileBottom, 80);
      });
      mo.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
    }
  });
})();
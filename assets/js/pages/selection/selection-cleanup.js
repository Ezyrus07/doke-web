(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function norm(value){
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function looksLikeSelectionPanel(el){
    const t = norm(el.textContent);
    return (
      t.includes("selecionar visiveis") ||
      t.includes("selecao manual") ||
      t.includes("limpar selecionados") ||
      t.includes("abrir pedido") ||
      t.includes("abrir conversa")
    );
  }

  function cleanSelectionPanels(){
    document.querySelectorAll("section, div, aside").forEach((el) => {
      if(!(el instanceof HTMLElement)) return;
      if(!looksLikeSelectionPanel(el)) return;

      const hasButtonCount = el.querySelectorAll("button, a, [role='button']").length >= 3;
      if(!hasButtonCount) return;

      el.classList.add("doke-selection-cleaned");

      let parent = el.parentElement;
      for(let i = 0; parent && i < 4; i++, parent = parent.parentElement){
        const box = parent.getBoundingClientRect();
        if(box.width > 700 || box.height > 230){
          parent.classList.add("doke-selection-host-cleaned");
        }
      }
    });

    const hasSelection = !!document.querySelector(".doke-selection-cleaned");
    if(!hasSelection) return;

    const clearButtons = Array.from(document.querySelectorAll("button,a,[role='button']")).filter((el) => {
      const t = norm(el.textContent);
      return t === "limpar filtros" || t.includes("limpar filtros");
    });

    clearButtons.forEach((el, index) => {
      if(index > 0 && el instanceof HTMLElement) el.style.display = "none";
    });
  }

  ready(() => {
    cleanSelectionPanels();
    setTimeout(cleanSelectionPanels, 250);
    setTimeout(cleanSelectionPanels, 900);

    if("MutationObserver" in window){
      const mo = new MutationObserver(() => {
        clearTimeout(window.__dokeSelectionCleanTimer);
        window.__dokeSelectionCleanTimer = setTimeout(cleanSelectionPanels, 80);
      });
      mo.observe(document.body, {childList:true, subtree:true});
    }
  });
})();
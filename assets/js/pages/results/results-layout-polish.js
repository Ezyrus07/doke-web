(function(){
  function ready(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, {once:true});
    else fn();
  }

  function normText(value){
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function nearestSection(el){
    return el && (el.closest("section") || el.closest("main") || document.body);
  }

  function markBeforeAfterSections(){
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,.section-title,.result-title,.results-title"));
    headings.forEach((h) => {
      const t = normText(h.textContent);
      if(!(t.includes("antes e depois") || t.includes("antes x depois"))) return;

      const section = nearestSection(h);
      if(!section) return;
      section.setAttribute("data-doke-beforeafter-results", "1");

      section
        .querySelectorAll(".results-grid,.cards-grid,.before-after-list,.doke-beforeafter-list,.ba-grid,.grid,.lista-cards-premium")
        .forEach((grid) => {
          if(grid instanceof HTMLElement) grid.classList.add("doke-before-after-results-grid");
        });
    });

    document.querySelectorAll(".before-after-card,.doke-beforeafter-card,.ba-card").forEach((card) => {
      const section = nearestSection(card);
      if(section) section.setAttribute("data-doke-beforeafter-results", "1");

      const parent = card.parentElement;
      if(parent) parent.classList.add("doke-before-after-results-grid");
    });
  }

  function fixResultsCards(){
    const container = document.getElementById("container-resultados");
    if(container) container.classList.add("doke-results-grid-polished");

    document.querySelectorAll("#container-resultados > *").forEach((card) => {
      if(card instanceof HTMLElement){
        card.style.margin = "0";
        card.style.transform = "none";
        card.style.left = "auto";
        card.style.right = "auto";
      }
    });
  }

  function apply(){
    markBeforeAfterSections();
    fixResultsCards();
  }

  ready(() => {
    apply();
    setTimeout(apply, 250);
    setTimeout(apply, 900);

    if("MutationObserver" in window){
      const mo = new MutationObserver(() => {
        clearTimeout(window.__dokeResultsGridPolishTimer);
        window.__dokeResultsGridPolishTimer = setTimeout(apply, 80);
      });
      mo.observe(document.body, {childList:true, subtree:true});
    }
  });
})();
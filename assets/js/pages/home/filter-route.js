(() => {
  /* Home filters must open inside index.html. This file intentionally blocks
     any legacy route-to-resultados behavior and delegates to the inline panel. */
  const key = "__DOKE_HOME_FILTER_ROUTE_INLINE_V2__";
  if (window[key]) return;
  window[key] = true;

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("home-index-shell")) return;
    const trigger = event.target instanceof Element
      ? event.target.closest("[data-more-filters-toggle], .filter-toggle, .btn-toggle-filtros")
      : null;
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();

    const source = trigger.dataset.moreFiltersSource || "tabs";
    const api = window.DokeHomeFiltersApi;
    if (api?.open) {
      const isOpen = trigger.getAttribute("aria-expanded") === "true";
      if (isOpen) api.close?.();
      else api.open(source);
    }
  }, true);
})();

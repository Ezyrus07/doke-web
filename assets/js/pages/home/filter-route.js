(() => {
  const key = "__DOKE_HOME_FILTER_ROUTE__";
  if (window[key]) return;
  window[key] = true;

  const buildResultsUrl = () => {
    const params = new URLSearchParams();
    params.set("filters", "open");
    params.set("source", "home");

    const input = document.querySelector("#inputBusca, [data-home-search-input], .home-search-hero input[type='search'], .home-search-hero input[type='text']");
    const query = input instanceof HTMLInputElement ? input.value.trim() : "";
    if (query) params.set("q", query);

    return `resultados.html?${params.toString()}`;
  };

  const shouldRoute = (target) => {
    if (!(target instanceof Element)) return false;
    return Boolean(target.closest("[data-more-filters-toggle], .filter-toggle, .btn-toggle-filtros"));
  };

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("home-index-shell")) return;
    if (!shouldRoute(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    const url = buildResultsUrl();
    if (typeof window.__DOKE_V2_NAVIGATE__ === "function") {
      try { window.__DOKE_V2_NAVIGATE__(url); return; } catch (_e) {}
    }
    window.location.href = url;
  }, true);
})();
